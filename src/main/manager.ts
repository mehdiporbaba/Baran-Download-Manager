import { Notification, app, nativeTheme, shell, clipboard } from 'electron'
import { randomUUID } from 'node:crypto'
import { existsSync } from 'node:fs'
import { promises as fs } from 'node:fs'
import { basename, join, relative, isAbsolute } from 'node:path'
import type {
  AddDownloadInput,
  AddTorrentInput,
  DownloadTask,
  GlobalStats,
  MainEvent,
  ProbeResult,
  Settings,
  SpeedSample,
  TaskKind,
  TaskStatus
} from '@shared/types'
import { Store } from './store'
import {
  GlobalThrottle,
  categoryFor,
  ensureDir,
  guessNameFromUrl,
  isYoutubeUrl,
  sanitizeFileName
} from './util'
import { HttpEngine, type EngineHost, type TaskHandle } from './engines/http'
import { YoutubeEngine } from './engines/youtube'
import { TorrentEngine } from './engines/torrent'
import { applyLaunchAtStartup } from './autostart'
import { isDue, validateStartAt } from '../shared/scheduling'
import { proxyConfiguration } from '../shared/network-policy'

interface ManagerDeps {
  store: Store
  emit: (event: MainEvent) => void
}

const ACTIVE: TaskStatus[] = ['connecting', 'downloading', 'verifying']
const RESUMABLE: TaskStatus[] = ['paused', 'error', 'canceled']

export class DownloadManager implements EngineHost {
  readonly store: Store
  readonly http: HttpEngine
  readonly youtube: YoutubeEngine
  readonly torrent: TorrentEngine
  readonly throttle = new GlobalThrottle()
  private emit: (event: MainEvent) => void
  private tasks = new Map<string, DownloadTask>()
  private controllers = new Map<string, AbortController>()
  private autoNames = new Set<string>()
  private resumeFlags = new Set<string>()
  private lastDownloaded = new Map<string, number>()
  private history: SpeedSample[] = []
  private ticker: NodeJS.Timeout | null = null
  private toolStatus = {
    ytdlp: { available: false } as { available: boolean; version?: string; path?: string },
    ffmpeg: { available: false } as { available: boolean; path?: string }
  }
  private shuttingDown = false
  private lastStatsEmit = 0
  private torrentPayloads = new Map<string, { data?: Buffer; file?: number[] }>()

  constructor(deps: ManagerDeps) {
    this.store = deps.store
    this.emit = deps.emit
    this.http = new HttpEngine(this)
    this.youtube = new YoutubeEngine(this)
    this.torrent = new TorrentEngine(this)
  }

  settings(): Settings {
    return this.store.settings
  }

  async init(): Promise<void> {
    const saved = this.store.tasks
    const autoResume = this.store.settings.autoResume
    for (const raw of saved) {
      const task: DownloadTask = {
        ...raw,
        speed: 0,
        eta: 0,
        connections: 0,
        error: raw.status === 'error' ? raw.error : undefined
      }
      if (ACTIVE.includes(task.status) || task.status === 'queued') {
        if (task.status === 'queued' || autoResume) {
          task.status = 'queued'
        } else {
          task.status = 'paused'
        }
      }
      this.tasks.set(task.id, task)
      this.lastDownloaded.set(task.id, task.downloaded)
    }
    this.throttle.setLimit(this.store.settings.globalSpeedLimit)
    this.ticker = setInterval(() => this.tick(), 1000)
    void this.refreshTools()
    void this.torrent.init().catch(() => undefined)
    this.torrent.setLimit(this.store.settings.torrentDownloadLimit, this.store.settings.torrentUploadLimit)
    setTimeout(() => this.schedule(), 700)
  }

  private async refreshTools(): Promise<void> {
    try {
      const status = await this.youtube.status()
      this.toolStatus = status
    } catch {
      this.toolStatus = {
        ytdlp: { available: false },
        ffmpeg: { available: false }
      }
    }
    this.emitStats(true)
  }

  list(): DownloadTask[] {
    return [...this.tasks.values()].sort((a, b) => b.order - a.order)
  }

  get(id: string): DownloadTask | undefined {
    return this.tasks.get(id)
  }

  patch(task: DownloadTask, patch: Partial<DownloadTask>): void {
    const wasCompleted = task.status === 'completed'
    Object.assign(task, patch)
    task.updatedAt = Date.now()
    if (patch.fileName && this.autoNames.has(task.id)) task.name = patch.fileName
    if (patch.fileName) task.category = categoryFor(patch.fileName)
    if (!wasCompleted && task.status === 'completed') this.handleCompleted(task)
    this.persistSoon()
    this.emit({ type: 'task:update', task })
    if (wasCompleted !== (task.status === 'completed')) this.emitStats(true)
  }

  private handleCompleted(task: DownloadTask): void {
    task.speed = 0
    task.eta = 0
    task.connections = 0
    if (this.store.settings.notifyOnComplete && Notification.isSupported()) {
      try {
        new Notification({
          title: 'Download complete',
          body: task.name,
          silent: false
        }).show()
      } catch {
        /* ignore */
      }
    }
    void this.store.flush()
  }

  toast(level: 'info' | 'success' | 'error', message: string): void {
    this.emit({ type: 'toast', level, message })
  }

  async probe(url: string, headers?: Record<string, string>): Promise<ProbeResult> {
    const probe = await this.http.probe(url, headers || {})
    return {
      url,
      finalUrl: probe.finalUrl,
      fileName: probe.fileName,
      size: probe.size,
      resumable: probe.resumable,
      contentType: probe.contentType,
      headers: probe.headers
    }
  }

  async addDownload(input: AddDownloadInput): Promise<DownloadTask> {
    const startAt = validateStartAt(input.startAt)
    const rawUrl = (input.url || '').trim()
    if (!rawUrl) throw new Error('URL is empty')
    if (/^magnet:/i.test(rawUrl)) return this.addTorrent({ uri: rawUrl, dir: input.dir, startAt })
    let url: string
    try {
      url = new URL(rawUrl).toString()
    } catch {
      throw new Error('This does not look like a valid URL')
    }
    const scheme = new URL(url).protocol
    if (!['http:', 'https:', 'ftp:'].includes(scheme)) {
      throw new Error(`Unsupported protocol: ${scheme}`)
    }

    const kind: TaskKind =
      input.kind === 'youtube' || (input.kind !== 'http' && isYoutubeUrl(url))
        ? 'youtube'
        : 'http'

    const dir = input.dir?.trim() || this.store.settings.downloadDir
    await ensureDir(dir)

    const fallbackName = guessNameFromUrl(url)
    const fileName = sanitizeFileName(
      input.fileName ||
        (kind === 'youtube'
          ? `${sanitizeFileName(input.title || 'video')}.${input.youtube?.audioOnly ? 'm4a' : 'mp4'}`
          : fallbackName)
    )

    const task: DownloadTask = {
      startAt,
      id: randomUUID(),
      kind,
      url,
      name: input.title || fileName,
      fileName,
      dir,
      status: 'queued',
      size: 0,
      downloaded: 0,
      speed: 0,
      eta: 0,
      connections: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      headers: input.headers,
      thumbnail: input.thumbnail,
      maxConnections: input.connections,
      category: categoryFor(fileName),
      order: this.nextOrder()
    }
    this.autoNames.add(task.id)
    if (kind === 'youtube') {
      this.autoNames.delete(task.id)
      task.name = input.title || fileName
      task.youtube = {
        title: input.title || fileName,
        uploader: input.youtube?.uploader,
        duration: input.youtube?.duration,
        thumbnail: input.thumbnail,
        quality: input.youtube?.quality,
        formatId: input.youtube?.selector || 'bestvideo*+bestaudio/best',
        audioOnly: !!input.youtube?.audioOnly,
        audioFormat: input.youtube?.audioFormat,
        subtitles: input.youtube?.subtitles,
        embedThumbnail: input.youtube?.thumbnail,
        videoId: input.youtube?.videoId,
        playlistIndex: input.youtube?.playlistIndex,
        playlistCount: input.youtube?.playlistCount
      }
    }
    this.tasks.set(task.id, task)
    this.lastDownloaded.set(task.id, 0)
    this.emit({ type: 'task:add', task })
    this.emitStats(true)
    this.persistSoon()
    this.schedule()
    return task
  }

  async addTorrent(input: AddTorrentInput): Promise<DownloadTask> {
    const startAt = validateStartAt(input.startAt)
    const dir = input.dir?.trim() || this.store.settings.downloadDir
    await ensureDir(dir)
    let name = input.name?.replace(/\.torrent$/i, '') || 'Torrent'
    let uri = input.uri?.trim() || ''
    if (/^magnet:/i.test(uri)) {
      const dn = /[?&]dn=([^&]+)/.exec(uri)?.[1]
      if (dn) name = decodeURIComponent(dn.replace(/\+/g, ' '))
    }
    if (!uri && !input.data) throw new Error('No torrent source provided')
    if (/^https?:/i.test(uri) && /\.torrent($|\?)/i.test(uri)) name = guessNameFromUrl(uri).replace(/\.torrent$/i, '')

    const task: DownloadTask = {
      startAt,
      id: randomUUID(),
      kind: 'torrent',
      url: uri || `file:${input.name || 'torrent'}`,
      name: sanitizeFileName(name),
      fileName: sanitizeFileName(name),
      dir,
      status: 'queued',
      size: 0,
      downloaded: 0,
      speed: 0,
      eta: 0,
      connections: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      category: 'other',
      order: this.nextOrder(),
      torrent: {
        infoHash: '',
        peers: 0,
        seeds: 0,
        uploadSpeed: 0,
        uploaded: 0,
        ratio: 0,
        files: [],
        sequential: input.sequential ?? true,
        seeding: false
      }
    }
    // Persist imported torrent bytes before a scheduled job can outlive this process.
    if (input.data) {
      if (input.data.length > 48 * 1024 * 1024) throw new Error('Torrent file exceeds 32 MB')
      const sourceDirectory = join(app.getPath('userData'), 'torrent-inputs')
      await ensureDir(sourceDirectory)
      const sourcePath = join(sourceDirectory, `${task.id}.torrent`)
      await fs.writeFile(sourcePath, Buffer.from(input.data, 'base64'))
      task.torrent!.torrentFile = sourcePath
    }
    // Stash the payload for the first engine start; persisted path supports restarts.
    this.torrentPayloads.set(task.id, {
      data: input.data ? Buffer.from(input.data, 'base64') : undefined,
      file: input.fileIndices
    })
    this.tasks.set(task.id, task)
    this.lastDownloaded.set(task.id, 0)
    this.emit({ type: 'task:add', task })
    this.emitStats(true)
    this.persistSoon()
    this.schedule()
    return task
  }

  private nextOrder(): number {
    const orders = [...this.tasks.values()].map((t) => t.order)
    return (orders.length ? Math.max(...orders) : 0) + 1
  }

  private persistSoon(): void {
    this.store.tasks = this.list()
  }

  private schedule(): void {
    if (this.shuttingDown) return
    const active = [...this.tasks.values()].filter((t) => ACTIVE.includes(t.status)).length
    const limit = Math.max(1, this.store.settings.maxConcurrent)
    let slots = limit - active
    if (slots <= 0) return
    const queued = [...this.tasks.values()]
      .filter((t) => isDue(t))
      .sort((a, b) => a.order - b.order)
    for (const task of queued) {
      if (slots <= 0) break
      if (this.controllers.has(task.id)) continue
      slots--
      void this.startTask(task)
    }
  }

  private async startTask(task: DownloadTask): Promise<void> {
    if (this.controllers.has(task.id) || this.shuttingDown) return
    const controller = new AbortController()
    this.controllers.set(task.id, controller)
    const handle: TaskHandle = {
      task,
      signal: controller.signal,
      patch: (patch) => this.patch(task, patch),
      toast: (level, message) => this.toast(level, message)
    }
    this.patch(task, { status: 'connecting', error: undefined, speed: 0, eta: 0 })
    this.emitStats(true)
    try {
      if (task.kind === 'http') {
        const resume = this.resumeFlags.has(task.id) || task.downloaded > 0
        await this.http.start(handle, resume)
      } else if (task.kind === 'youtube') {
        const yt = task.youtube
        await this.youtube.start(handle, {
          audioOnly: !!yt?.audioOnly,
          extractAudio: yt?.audioFormat === 'mp3',
          subtitles: !!yt?.subtitles,
          thumbnail: !!yt?.embedThumbnail
        })
      } else {
        const payload = this.torrentPayloads.get(task.id)
        this.torrentPayloads.delete(task.id)
        await this.torrent.startOrResume(handle, {
          uri: task.url,
          data: payload?.data,
          torrentFile: task.torrent?.torrentFile,
          sequential: task.torrent?.sequential ?? true,
          fileIndices: payload?.file
        })
      }
    } catch (err) {
      if (!controller.signal.aborted) {
        this.patch(task, {
          status: 'error',
          error: (err as Error).message || 'Download failed',
          speed: 0,
          eta: 0,
          connections: 0
        })
      }
    } finally {
      this.controllers.delete(task.id)
      this.resumeFlags.delete(task.id)
      if (task.status === 'downloading' || task.status === 'connecting') {
        if (task.kind !== 'torrent' || this.torrent.status() !== 'ready') {
          // Engine returned without an explicit terminal state.
          if (!controller.signal.aborted) this.patch(task, { status: 'paused' })
        }
      }
      this.lastDownloaded.set(task.id, task.downloaded)
      this.schedule()
      this.emitStats(true)
    }
  }

  pause(id: string): void {
    const task = this.tasks.get(id)
    if (!task) return
    if (!ACTIVE.includes(task.status) && task.status !== 'queued') return
    this.resumeFlags.add(id)
    this.controllers.get(id)?.abort()
    if (task.kind === 'torrent') this.torrent.pause(id)
    if (task.kind === 'youtube') this.youtube.stop(id)
    if (task.status === 'queued') {
      this.patch(task, { status: 'paused', speed: 0, eta: 0, connections: 0 })
    }
    this.persistSoon()
  }

  async resume(id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (!task) return
    if (!RESUMABLE.includes(task.status)) return
    this.resumeFlags.add(id)
    this.patch(task, {
      status: 'queued',
      error: undefined,
      speed: 0,
      eta: 0,
      connections: 0
    })
    this.schedule()
  }

  async cancel(id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (!task) return
    this.controllers.get(id)?.abort()
    if (task.kind === 'torrent') {
      this.torrent.pause(id)
      await this.torrent.remove(id)
    }
    if (task.kind === 'youtube') this.youtube.stop(id)
    this.patch(task, {
      status: 'paused',
      speed: 0,
      eta: 0,
      connections: 0
    })
  }

  async remove(id: string, deleteFile: boolean): Promise<void> {
    const task = this.tasks.get(id)
    if (!task) return
    this.controllers.get(id)?.abort()
    this.controllers.delete(id)
    if (task.kind === 'torrent') await this.torrent.remove(id)
    if (task.kind === 'youtube') this.youtube.stop(id)
    this.tasks.delete(id)
    this.lastDownloaded.delete(id)
    this.autoNames.delete(id)
    this.resumeFlags.delete(id)
    if (deleteFile) await this.deleteFiles(task)
    this.emit({ type: 'task:remove', id })
    this.persistSoon()
    this.emitStats(true)
    this.schedule()
  }

  private safeInside(dir: string, target: string): boolean {
    const rel = relative(dir, target)
    return !!rel && !rel.startsWith('..') && !isAbsolute(rel)
  }

  private async deleteFiles(task: DownloadTask): Promise<void> {
    const targets = new Set<string>()
    if (task.filePath) targets.add(task.filePath)
    if (task.kind === 'http') {
      if (task.filePath) {
        targets.add(`${task.filePath}.pulse-part`)
        targets.add(`${task.filePath}.pulse-meta`)
      }
      if (!task.filePath) {
        const guess = join(task.dir, task.fileName)
        targets.add(guess)
        targets.add(`${guess}.pulse-part`)
        targets.add(`${guess}.pulse-meta`)
      }
    }
    for (const target of targets) {
      if (!this.safeInside(task.dir, target)) continue
      try {
        await fs.rm(target, { recursive: true, force: true })
      } catch {
        /* ignore */
      }
    }
  }

  async retry(id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (!task) return
    this.resumeFlags.add(id)
    this.patch(task, {
      status: 'queued',
      error: undefined,
      speed: 0,
      eta: 0,
      connections: 0
    })
    this.schedule()
  }

  reveal(id: string): void {
    const task = this.tasks.get(id)
    if (!task) return
    const target = task.filePath && existsSync(task.filePath) ? task.filePath : task.dir
    if (existsSync(target)) shell.showItemInFolder(target)
    else void shell.openPath(task.dir)
  }

  async open(id: string): Promise<void> {
    const task = this.tasks.get(id)
    if (!task) return
    const target = task.filePath || join(task.dir, task.fileName)
    if (existsSync(target)) {
      const err = await shell.openPath(target)
      if (err) this.toast('error', `Could not open the file: ${err}`)
    } else {
      this.toast('info', 'The file is not on disk yet.')
    }
  }

  clearCompleted(): void {
    for (const task of [...this.tasks.values()]) {
      if (task.status === 'completed') {
        this.tasks.delete(task.id)
        this.lastDownloaded.delete(task.id)
        this.emit({ type: 'task:remove', id: task.id })
      }
    }
    this.persistSoon()
    this.emitStats(true)
  }

  updateSettings(patch: Partial<Settings>): Settings {
    const prev = this.store.settings
    for (const key of ['globalSpeedLimit', 'torrentDownloadLimit', 'torrentUploadLimit'] as const) {
      if (patch[key] !== undefined && (!Number.isFinite(patch[key]) || patch[key]! < 0)) throw new Error('Speed limits must be positive numbers or zero for unlimited')
    }
    proxyConfiguration({ ...prev, ...patch })
    const settings = this.store.patchSettings(patch)
    if (patch.globalSpeedLimit !== undefined) {
      this.throttle.setLimit(settings.globalSpeedLimit)
    }
    if (patch.torrentDownloadLimit !== undefined || patch.torrentUploadLimit !== undefined) this.torrent.setLimit(settings.torrentDownloadLimit, settings.torrentUploadLimit)
    if (patch.maxConcurrent !== undefined) this.schedule()
    if (patch.downloadDir && patch.downloadDir !== prev.downloadDir) {
      void ensureDir(settings.downloadDir)
    }
    if (patch.ytDlpPath !== undefined || patch.ffmpegPath !== undefined) {
      void this.refreshTools()
    }
    if (patch.launchAtStartup !== undefined) {
      void applyLaunchAtStartup(settings.launchAtStartup)
    }
    if (patch.theme !== undefined) {
      nativeTheme.themeSource = settings.theme
    }
    this.emit({ type: 'settings', settings })
    this.emitStats(true)
    return settings
  }

  setSpeedLimit(bytes: number): void {
    this.updateSettings({ globalSpeedLimit: Math.max(0, bytes) })
  }

  async scheduleTask(id: string, startAt?: number): Promise<void> {
    const task = this.tasks.get(id)
    if (!task) throw new Error('Download no longer exists')
    if (task.status === 'completed') throw new Error('This download is already complete')
    if (ACTIVE.includes(task.status)) throw new Error('Pause the download before changing its start time')
    const time = validateStartAt(startAt)
    this.resumeFlags.add(id)
    this.patch(task, { startAt: time, status: 'queued', error: undefined })
    this.schedule()
  }

  private tick(): void {
    const now = Date.now()
    this.schedule()
    for (const task of this.tasks.values()) {
      const last = this.lastDownloaded.get(task.id) ?? task.downloaded
      const isActive = task.status === 'downloading'
      if (isActive) {
        const delta = Math.max(0, task.downloaded - last)
        // Exponential smoothing keeps the readout from jumping around.
        task.speed = task.speed ? Math.round(task.speed * 0.55 + delta * 0.45) : delta
        if (task.size > 0) {
          task.eta = task.speed > 8 ? Math.round((task.size - task.downloaded) / task.speed) : 0
        } else {
          task.eta = 0
        }
        this.emit({ type: 'task:update', task })
      } else if (task.speed !== 0) {
        task.speed = 0
        task.eta = 0
      }
      this.lastDownloaded.set(task.id, task.downloaded)
    }
    this.emitStats(false, now)
  }

  stats(): GlobalStats {
    const tasks = [...this.tasks.values()]
    const down = tasks.reduce((acc, t) => acc + (t.status === 'downloading' ? t.speed : 0), 0)
    const up = tasks.reduce(
      (acc, t) => acc + (t.kind === 'torrent' ? t.torrent?.uploadSpeed || 0 : 0),
      0
    )
    return {
      downSpeed: down,
      upSpeed: up,
      activeCount: tasks.filter((t) => ACTIVE.includes(t.status)).length,
      queuedCount: tasks.filter((t) => t.status === 'queued').length,
      completedCount: tasks.filter((t) => t.status === 'completed').length,
      totalDownloaded: tasks.reduce((acc, t) => acc + t.downloaded, 0),
      history: this.history,
      torrentEngine: this.torrent.status(),
      ytdlp: this.toolStatus.ytdlp,
      ffmpeg: this.toolStatus.ffmpeg
    }
  }

  private emitStats(force = false, now = Date.now()): void {
    if (!force && now - this.lastStatsEmit < 900) return
    this.lastStatsEmit = now
    const stats = this.stats()
    this.history.push({ t: now, down: stats.downSpeed, up: stats.upSpeed })
    if (this.history.length > 90) this.history.shift()
    this.emit({ type: 'stats', stats })
  }

  async shutdown(): Promise<void> {
    this.shuttingDown = true
    if (this.ticker) clearInterval(this.ticker)
    this.ticker = null
    for (const controller of this.controllers.values()) controller.abort()
    for (const task of this.tasks.values()) {
      if (ACTIVE.includes(task.status)) task.status = 'paused'
      task.speed = 0
      task.eta = 0
      task.connections = 0
    }
    await this.torrent.destroy()
    await this.store.flush()
  }

  async readClipboardUrl(): Promise<string> {
    const text = (await clipboard.readText()).trim()
    if (/^(https?:\/\/|magnet:)/i.test(text) && text.length < 4096) return text
    return ''
  }

  revealDir(dir: string): void {
    if (existsSync(dir)) void shell.openPath(dir)
  }

  async installYtdlp(): Promise<{ ok: boolean; message: string }> {
    const result = await this.youtube.install()
    if (result.ok) {
      this.toast('success', result.message)
      await this.refreshTools()
    } else {
      this.toast('error', result.message)
    }
    return result
  }

  async rescanTools(): Promise<void> {
    try {
      this.toolStatus = await this.youtube.rescan()
    } catch {
      this.toolStatus = {
        ytdlp: { available: false },
        ffmpeg: { available: false }
      }
    }
    this.emitStats(true)
  }

  taskTitle(task: DownloadTask): string {
    return task.youtube?.title || task.name || basename(task.fileName || 'download')
  }
}
