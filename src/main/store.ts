import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { dirname, join } from 'node:path'
import type { DownloadTask, Settings } from '@shared/types'
import { defaultDownloadDir } from './util'

interface Persisted {
  version: number
  tasks: DownloadTask[]
  settings: Settings
}

const DEFAULT_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

export function defaultSettings(): Settings {
  return {
    downloadDir: defaultDownloadDir(),
    maxConcurrent: 3,
    connections: 8,
    globalSpeedLimit: 0,
    torrentDownloadLimit: 0,
    torrentUploadLimit: 0,
    proxyMode: 'direct',
    minimizeToTray: true,
    sidebarAlwaysOpen: false,
    language: 'en',
    theme: 'dark',
    clipboardWatch: true,
    notifyOnComplete: true,
    ytDlpPath: '',
    ffmpegPath: '',
    torrentPort: 51413,
    seedAfterComplete: false,
    proxy: '',
    userAgent: DEFAULT_UA,
    autoResume: true,
    launchAtStartup: true,
    cookiesBrowser: '',
    cookiesFile: '',
    githubToken: ''
  }
}

export class Store {
  private file: string
  private data: Persisted
  private timer: NodeJS.Timeout | null = null
  private writing: Promise<void> | null = null
  private dirty = false

  constructor() {
    const dir = app.getPath('userData')
    this.file = join(dir, 'pulse-state.json')
    this.data = { version: 1, tasks: [], settings: defaultSettings() }
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.readFile(this.file, 'utf8')
      const parsed = JSON.parse(raw) as Partial<Persisted>
      const defaults = defaultSettings()
      this.data = {
        version: 1,
        tasks: Array.isArray(parsed.tasks) ? parsed.tasks : [],
        settings: { ...defaults, ...(parsed.settings || {}) }
      }
      if (!this.data.settings.downloadDir) this.data.settings.downloadDir = defaults.downloadDir
    } catch {
      this.data = { version: 1, tasks: [], settings: defaultSettings() }
    }
  }

  get tasks(): DownloadTask[] {
    return this.data.tasks
  }

  set tasks(list: DownloadTask[]) {
    this.data.tasks = list
    this.scheduleSave()
  }

  get settings(): Settings {
    return this.data.settings
  }

  patchSettings(patch: Partial<Settings>): Settings {
    this.data.settings = { ...this.data.settings, ...patch }
    this.scheduleSave()
    return this.data.settings
  }

  scheduleSave(): void {
    this.dirty = true
    if (this.timer) return
    this.timer = setTimeout(() => {
      this.timer = null
      void this.flush().catch(error => console.error('[store] save failed', error))
    }, 700)
  }

  async flush(): Promise<void> {
    if (this.timer) { clearTimeout(this.timer); this.timer = null }
    this.dirty = true
    if (this.writing) {
      await this.writing
      if (this.dirty) await this.flush()
      return
    }
    this.writing = (async () => {
      do {
        this.dirty = false
        const tmp = `${this.file}.tmp`
        const payload = JSON.stringify({ version: 1, tasks: this.data.tasks, settings: this.data.settings })
        await fs.mkdir(dirname(this.file), { recursive: true })
        await fs.writeFile(tmp, payload, 'utf8')
        for (let attempt = 0; ; attempt++) {
          try { await fs.rename(tmp, this.file); break }
          catch (error) {
            if (attempt >= 5 || !['EPERM', 'EACCES', 'EBUSY'].includes((error as NodeJS.ErrnoException).code || '')) throw error
            await new Promise(resolve => setTimeout(resolve, 20 * 2 ** attempt))
          }
        }
      } while (this.dirty)
    })()
    try { await this.writing } finally {
      this.writing = null
    }
  }

  async dispose(): Promise<void> {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
    await this.flush()
  }
}
