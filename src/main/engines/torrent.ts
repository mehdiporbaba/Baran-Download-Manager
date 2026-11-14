import { join } from 'node:path'
import { promises as fs } from 'node:fs'
import { app } from 'electron'
import type { DownloadTask, TorrentFileEntry } from '@shared/types'
import type { EngineHost, TaskHandle } from './http'
import { ensureDir } from '../util'

type AnyTorrent = any

interface TorrentSession {
  torrent: AnyTorrent
  handle: TaskHandle
  paused: boolean
}

const clean = (name: string): string => name.replace(/[\\/]+/g, '/')

export class TorrentEngine {
  private host: EngineHost
  private client: any = null
  private initPromise: Promise<any> | null = null
  private sessions = new Map<string, TorrentSession>()
  private poll: NodeJS.Timeout | null = null
  state: 'idle' | 'ready' | 'starting' | 'unavailable' = 'idle'
  private lastError = ''
  private destroyed = false

  constructor(host: EngineHost) {
    this.host = host
  }

  async init(): Promise<any> {
    if (this.client) return this.client
    if (this.initPromise) return this.initPromise
    this.state = 'starting'
    this.initPromise = (async () => {
      try {
        const mod: any = await import('webtorrent')
        const Ctor = mod?.default?.WebTorrent || mod?.default || mod?.WebTorrent || mod
        const settings = this.host.settings()
        const client = new Ctor({
          maxConns: 80,
          torrentPort: settings.torrentPort || 51413,
          dht: true,
          tracker: true,
          utp: false,
          webSeeds: true
        })
        client.on('error', (err: Error) => {
          this.lastError = err?.message || String(err)
          console.error('[torrent] client error:', this.lastError)
          if (/EPERM|EACCES|EADDRINUSE/i.test(this.lastError)) {
            this.host.toast(
              'error',
              'Torrent port is busy — downloads will continue over outgoing connections.'
            )
          }
        })
        client.on('warning', (err: Error) => {
          console.warn('[torrent] warning:', err?.message)
        })
        this.client = client
        this.setLimit(settings.torrentDownloadLimit, settings.torrentUploadLimit)
        this.state = 'ready'
        this.startPolling()
        return client
      } catch (err) {
        this.state = 'unavailable'
        this.lastError = (err as Error).message
        console.error('[torrent] failed to initialise engine:', err)
        this.host.toast('error', 'Torrent engine could not start on this system.')
        throw err
      } finally {
        this.initPromise = null
      }
    })()
    return this.initPromise
  }

  private startPolling(): void {
    if (this.poll || this.destroyed) return
    this.poll = setInterval(() => this.tick(), 1000)
  }

  private tick(): void {
    for (const session of this.sessions.values()) {
      const { torrent, handle } = session
      if (!torrent || handle.task.status === 'paused') continue
      const task = handle.task
      const files: TorrentFileEntry[] = (torrent.files || []).map((f: any, i: number) => ({
        name: f.name,
        path: clean(f.path),
        length: f.length,
        downloaded: typeof f.downloaded === 'number' ? f.downloaded : 0,
        selected: typeof f.selected === 'boolean' ? f.selected : true
      }))
      const totalLength = torrent.length || 0
      const downloaded = Math.min(torrent.downloaded || 0, totalLength || Number.MAX_SAFE_INTEGER)
      handle.patch({
        downloaded,
        size: totalLength || task.size,
        connections: torrent.numPeers || 0,
        torrent: {
          infoHash: torrent.infoHash || task.torrent?.infoHash || '',
          magnet: torrent.magnetURI || task.torrent?.magnet,
          torrentFile: task.torrent?.torrentFile,
          peers: torrent.numPeers || 0,
          seeds: 0,
          uploadSpeed: torrent.uploadSpeed || 0,
          uploaded: torrent.uploaded || 0,
          ratio: torrent.ratio || 0,
          files: files.length ? files : task.torrent?.files || [],
          sequential: !!(torrent as any).sequential,
          seeding: !!torrent.done
        }
      })
      if (torrent.done && task.status !== 'completed') {
        const target = this.primaryPath(torrent, task)
        handle.patch({
          status: 'completed',
          downloaded: totalLength || task.downloaded,
          size: totalLength || task.size,
          completedAt: Date.now(),
          connections: 0,
          speed: 0,
          eta: 0,
          filePath: target
        })
        if (!this.host.settings().seedAfterComplete) {
          this.removeSilently(task)
        }
      }
    }
  }

  private primaryPath(torrent: AnyTorrent, task: DownloadTask): string | undefined {
    const base = torrent.path || task.dir
    if (torrent.files?.length === 1) return join(base, torrent.files[0].path)
    return join(base, torrent.name || task.name)
  }

  private removeSilently(task: DownloadTask): void {
    const session = this.sessions.get(task.id)
    if (!session || !this.client) return
    this.sessions.delete(task.id)
    try {
      this.client.remove(session.torrent, { destroyStore: false }, () => undefined)
    } catch {
      /* ignore */
    }
    if (task.torrent?.seeding) {
      this.host.patch(task, { torrent: { ...task.torrent, seeding: false } })
    }
  }

  private async saveTorrentFile(torrent: AnyTorrent): Promise<string | undefined> {
    try {
      if (!torrent.torrentFile || !torrent.infoHash) return undefined
      const dir = join(app.getPath('userData'), 'torrents')
      await fs.mkdir(dir, { recursive: true })
      const target = join(dir, `${torrent.infoHash}.torrent`)
      await fs.writeFile(target, Buffer.from(torrent.torrentFile))
      return target
    } catch {
      return undefined
    }
  }

  async start(
    handle: TaskHandle,
    input: { uri?: string; data?: Buffer; torrentFile?: string; sequential?: boolean; fileIndices?: number[] }
  ): Promise<void> {
    const task = handle.task
    const client = await this.init()
    await ensureDir(task.dir)
    const settings = this.host.settings()

    const source: any =
      input.data ||
      input.torrentFile ||
      (input.uri?.startsWith('base64:') ? Buffer.from(input.uri.slice(7), 'base64') : input.uri)

    handle.patch({ status: 'connecting', error: undefined })

    return new Promise<void>((resolve) => {
      let settled = false
      const settle = (): void => {
        if (settled) return
        settled = true
        resolve()
      }

      const addOptions: Record<string, unknown> = {
        path: task.dir,
        announce: []
      }
      if (input.sequential ?? true) addOptions.sequential = true
      if (settings.torrentDownloadLimit > 0) {
        try {
          client.throttleDownload(settings.torrentDownloadLimit)
        } catch {
          /* older versions */
        }
      }

      let torrent: AnyTorrent
      try {
        torrent = client.add(source, addOptions)
      } catch (err) {
        handle.patch({
          status: 'error',
          error: `Invalid torrent: ${(err as Error).message}`,
          connections: 0
        })
        settle()
        return
      }

      const session: TorrentSession = { torrent, handle, paused: false }
      this.sessions.set(task.id, session)

      torrent.on('error', (err: Error) => {
        if (handle.signal.aborted) return
        handle.patch({
          status: 'error',
          error: err?.message || 'Torrent error',
          speed: 0,
          eta: 0,
          connections: 0
        })
        settle()
      })

      torrent.on('warning', (err: Error) => {
        console.warn('[torrent] warning:', err?.message)
      })

      torrent.on('metadata', async () => {
        const saved = await this.saveTorrentFile(torrent)
        handle.patch({
          name: torrent.name || task.name,
          fileName: torrent.name || task.fileName,
          size: torrent.length || 0,
          status: 'downloading',
          torrent: {
            infoHash: torrent.infoHash || '',
            magnet: torrent.magnetURI || input.uri,
            torrentFile: saved || input.torrentFile,
            peers: torrent.numPeers || 0,
            seeds: 0,
            uploadSpeed: torrent.uploadSpeed || 0,
            uploaded: 0,
            ratio: 0,
            files: (torrent.files || []).map((f: any) => ({
              name: f.name,
              path: clean(f.path),
              length: f.length,
              downloaded: 0,
              selected: true
            })),
            sequential: !!torrent.sequential,
            seeding: false
          }
        })
        if (input.fileIndices?.length) {
          torrent.files?.forEach((file: any, i: number) => {
            if (!input.fileIndices?.includes(i)) file.deselect()
          })
        }
        // Apply a per-torrent speed cap without throttling other engines globally.
        settle()
      })

      torrent.on('ready', () => {
        handle.patch({ status: 'downloading', connections: torrent.numPeers || 0 })
        settle()
      })

      torrent.on('done', () => {
        const target = this.primaryPath(torrent, task)
        handle.patch({
          status: 'completed',
          downloaded: torrent.length,
          size: torrent.length,
          completedAt: Date.now(),
          speed: 0,
          eta: 0,
          connections: 0,
          filePath: target,
          torrent: {
            ...(task.torrent || {
              infoHash: torrent.infoHash,
              peers: 0,
              seeds: 0,
              uploadSpeed: 0,
              uploaded: 0,
              ratio: 0,
              files: [],
              sequential: true,
              seeding: false
            }),
            infoHash: torrent.infoHash,
            seeding: true
          }
        })
        if (!this.host.settings().seedAfterComplete) {
          setTimeout(() => this.removeSilently(task), 1200)
        }
        settle()
      })

      // Magnet links: resolves once we have metadata, or after a timeout so the
      // queue never stalls while the DHT is still warming up.
      const timeout = setTimeout(settle, 45_000)
      torrent.once('metadata', () => clearTimeout(timeout))
      torrent.once('ready', () => clearTimeout(timeout))

      handle.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout)
          this.pauseInternal(task.id)
          settle()
        },
        { once: true }
      )
    })
  }

  private pauseInternal(taskId: string): void {
    const session = this.sessions.get(taskId)
    if (!session) return
    session.paused = true
    const { torrent } = session
    try {
      if (typeof torrent.pause === 'function') torrent.pause()
      else if (typeof torrent.deselect === 'function' && torrent.pieces?.length) {
        torrent.deselect(0, torrent.pieces.length - 1, false)
      }
    } catch {
      /* ignore */
    }
    session.handle.patch({ status: 'paused', speed: 0, eta: 0, connections: 0 })
  }

  pause(taskId: string): void {
    this.pauseInternal(taskId)
  }

  async startOrResume(
    handle: TaskHandle,
    input: { uri?: string; data?: Buffer; torrentFile?: string; sequential?: boolean; fileIndices?: number[] }
  ): Promise<void> {
    const session = this.sessions.get(handle.task.id)
    if (session?.torrent) {
      session.handle = handle
      session.paused = false
      try {
        if (typeof session.torrent.resume === 'function') session.torrent.resume()
        if (typeof session.torrent.select === 'function' && session.torrent.pieces?.length) {
          session.torrent.select(0, session.torrent.pieces.length - 1, 1)
        }
        this.sessions.set(handle.task.id, session)
        handle.patch({ status: 'downloading', error: undefined, connections: session.torrent.numPeers || 0 })
        return
      } catch {
        removeSessionSilently(this.client, session.torrent)
        this.sessions.delete(handle.task.id)
      }
    }
    await this.start(handle, input)
  }

  async remove(taskId: string): Promise<void> {
    const session = this.sessions.get(taskId)
    this.sessions.delete(taskId)
    if (session && this.client) {
      await new Promise<void>((resolve) => {
        try {
          this.client.remove(session.torrent, { destroyStore: false }, () => resolve())
        } catch {
          resolve()
        }
      })
    }
  }

  setLimit(download: number, upload: number): void {
    if (!this.client) return
    try {
      this.client.throttleDownload(download > 0 ? download : -1)
      this.client.throttleUpload(upload > 0 ? upload : -1)
    } catch {
      /* ignore */
    }
  }

  status(): 'idle' | 'ready' | 'starting' | 'unavailable' {
    return this.state
  }

  async destroy(): Promise<void> {
    this.destroyed = true
    if (this.poll) clearInterval(this.poll)
    this.poll = null
    for (const [id] of this.sessions) {
      await this.remove(id)
    }
    if (this.client) {
      await new Promise<void>((resolve) => {
        try {
          this.client.destroy(() => resolve())
        } catch {
          resolve()
        }
      })
    }
    this.client = null
  }
}

function removeSessionSilently(client: any, torrent: any): void {
  try {
    client?.remove(torrent, { destroyStore: false }, () => undefined)
  } catch {
    /* ignore */
  }
}
