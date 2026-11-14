import { app } from 'electron'
import { existsSync, promises as fs } from 'node:fs'
import { dirname, basename, extname, join } from 'node:path'

/** Cross-platform filename sanitizer that also copes with reserved Windows names. */
export function sanitizeFileName(input: string, fallback = 'download'): string {
  let name = (input || '').normalize('NFC')
  name = name.replace(/[\u0000-\u001f\u007f<>:"/\\|?*]/g, '_').replace(/\s+/g, ' ').trim()
  name = name.replace(/^\.+/, '').replace(/[. ]+$/, '')
  if (!name) name = fallback
  if (process.platform === 'win32') {
    const base = name.split('.')[0]?.toUpperCase()
    if (
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/.test(base) ||
      ['CON', 'PRN', 'AUX', 'NUL'].includes(base)
    ) {
      name = `_${name}`
    }
  }
  if (name.length > 180) {
    const ext = extname(name).slice(0, 12)
    name = name.slice(0, 180 - ext.length) + ext
  }
  return name
}

export function formatBytes(bytes: number, digits = 1): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)))
  const value = bytes / Math.pow(1024, i)
  return `${value.toFixed(i === 0 ? 0 : digits)} ${units[i]}`
}

export function parseContentDisposition(value?: string | null): string | undefined {
  if (!value) return undefined
  const star = /filename\*\s*=\s*([^;]+)/i.exec(value)?.[1]
  if (star) {
    // RFC 5987: UTF-8''encoded-name
    const match = /^([\w-]+)'([^']*)'(.+)$/.exec(star.trim().replace(/^"|"$/g, ''))
    if (match) {
      try {
        return decodeURIComponent(match[3])
      } catch {
        return match[3]
      }
    }
  }
  const plain = /filename\s*=\s*("([^"]+)"|([^;]+))/i.exec(value)
  const raw = plain?.[2] ?? plain?.[3]
  if (!raw) return undefined
  let name = raw.trim()
  try {
    name = decodeURIComponent(name)
  } catch {
    /* keep raw */
  }
  // Some servers send latin1-encoded utf8 bytes
  if (/[ÃÂ][\x80-\xbf]/.test(name)) {
    try {
      const decoded = Buffer.from(name, 'latin1').toString('utf8')
      if (!decoded.includes('\uFFFD')) name = decoded
    } catch {
      /* ignore */
    }
  }
  return name
}

export function guessNameFromUrl(url: string): string {
  try {
    const u = new URL(url)
    const last = decodeURIComponent(u.pathname.split('/').filter(Boolean).pop() || '')
    if (last && last.includes('.')) return last
    return last || `download-${Date.now()}`
  } catch {
    return `download-${Date.now()}`
  }
}

export function extFromMime(mime?: string): string | undefined {
  if (!mime) return undefined
  const map: Record<string, string> = {
    'video/mp4': '.mp4',
    'video/webm': '.webm',
    'video/x-matroska': '.mkv',
    'audio/mpeg': '.mp3',
    'audio/mp4': '.m4a',
    'audio/ogg': '.ogg',
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/webp': '.webp',
    'application/pdf': '.pdf',
    'application/zip': '.zip',
    'application/x-7z-compressed': '.7z',
    'application/x-rar-compressed': '.rar',
    'application/x-msdownload': '.exe',
    'application/vnd.android.package-archive': '.apk',
    'application/octet-stream': ''
  }
  return map[mime.split(';')[0].trim().toLowerCase()]
}

/** Returns a path that does not exist yet, appending " (n)" before the extension. */
export async function uniquePath(dir: string, fileName: string): Promise<string> {
  const ext = extname(fileName)
  const stem = fileName.slice(0, fileName.length - ext.length)
  let candidate = join(dir, fileName)
  let i = 1
  while (existsSync(candidate)) {
    candidate = join(dir, `${stem} (${i})${ext}`)
    i++
  }
  return candidate
}

export function defaultDownloadDir(): string {
  try {
    return join(app.getPath('downloads'))
  } catch {
    return process.cwd()
  }
}

export const VIDEO_EXT = new Set([
  '.mp4', '.mkv', '.webm', '.avi', '.mov', '.flv', '.m4v', '.ts', '.wmv', '.mpg', '.mpeg'
])
export const AUDIO_EXT = new Set(['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus', '.wav', '.wma'])
export const IMAGE_EXT = new Set(['.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp', '.svg', '.avif'])
export const ARCHIVE_EXT = new Set(['.zip', '.rar', '.7z', '.tar', '.gz', '.xz', '.bz2', '.iso'])
export const DOC_EXT = new Set(['.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx', '.txt', '.epub'])
export const APP_EXT = new Set(['.exe', '.msi', '.apk', '.dmg', '.deb', '.rpm', '.appimage'])

export function categoryFor(fileName: string): string {
  const ext = extname(fileName).toLowerCase()
  if (VIDEO_EXT.has(ext)) return 'video'
  if (AUDIO_EXT.has(ext)) return 'audio'
  if (IMAGE_EXT.has(ext)) return 'image'
  if (ARCHIVE_EXT.has(ext)) return 'archive'
  if (DOC_EXT.has(ext)) return 'document'
  if (APP_EXT.has(ext)) return 'app'
  return 'other'
}

export function isYoutubeUrl(raw: string): boolean {
  try {
    const host = new URL(raw).hostname.replace(/^www\./, '').toLowerCase()
    return [
      'youtube.com',
      'm.youtube.com',
      'music.youtube.com',
      'youtu.be',
      'youtube-nocookie.com',
      'vimeo.com',
      'dailymotion.com',
      'soundcloud.com',
      'twitch.tv',
      'twitter.com',
      'x.com',
      'tiktok.com',
      'instagram.com',
      'facebook.com'
    ].some((h) => host === h || host.endsWith(`.${h}`))
  } catch {
    return false
  }
}

export function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(new DOMException('Aborted', 'AbortError'))
    const timer = setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = (): void => {
      clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}

export function safeJsonParse<T>(text: string, fallback: T): T {
  try {
    return JSON.parse(text) as T
  } catch {
    return fallback
  }
}

/** Shared token bucket applying the global speed limit across every HTTP segment. */
export class GlobalThrottle {
  private limit = 0
  private budget = 0
  private last = Date.now()
  private chain: Promise<void> = Promise.resolve()

  setLimit(bytesPerSecond: number): void {
    this.limit = Math.max(0, bytesPerSecond)
    if (!this.limit) this.budget = 0
    this.last = Date.now()
  }

  getLimit(): number {
    return this.limit
  }

  consume(bytes: number, signal?: AbortSignal): Promise<void> {
    if (!this.limit) return Promise.resolve()
    // Serialise consumption so the bucket stays accurate with many connections.
    const run = this.chain.then(async () => {
      if (!this.limit) return
      const now = Date.now()
      this.budget = Math.min(this.limit, this.budget + ((now - this.last) / 1000) * this.limit)
      this.last = now
      this.budget -= bytes
      while (this.limit && this.budget < 0) {
        const before = Date.now()
        await sleep(Math.min(200, Math.ceil((-this.budget / this.limit) * 1000)), signal)
        this.budget += ((Date.now() - before) / 1000) * this.limit
        this.last = Date.now()
      }
    })
    this.chain = run.catch(() => undefined)
    return run
  }
}

export async function moveSafe(src: string, dest: string): Promise<void> {
  try {
    await fs.rename(src, dest)
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code === 'EXDEV') {
      await fs.copyFile(src, dest)
      await fs.unlink(src)
      return
    }
    throw err
  }
}

export async function ensureDir(dir: string): Promise<void> {
  await fs.mkdir(dir, { recursive: true })
}

export async function fileSize(path: string): Promise<number> {
  try {
    const stat = await fs.stat(path)
    return stat.size
  } catch {
    return 0
  }
}

export function shortPath(p: string, max = 46): string {
  if (p.length <= max) return p
  return `${p.slice(0, 8)}…${p.slice(-(max - 9))}`
}

export function dirOf(p: string): string {
  return dirname(p) || p
}

export function baseName(p: string): string {
  return basename(p)
}
