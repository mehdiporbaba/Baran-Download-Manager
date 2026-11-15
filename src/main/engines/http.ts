import { promises as fs, existsSync } from 'node:fs'
import { networkFetch as fetch } from '../network'
import type { FileHandle } from 'node:fs/promises'
import { join } from 'node:path'
import type { DownloadTask, Settings, SegmentState } from '@shared/types'
import {
  GlobalThrottle,
  ensureDir,
  extFromMime,
  fileSize,
  guessNameFromUrl,
  moveSafe,
  parseContentDisposition,
  safeJsonParse,
  sanitizeFileName,
  sleep,
  uniquePath
} from '../util'

export interface EngineHost {
  settings(): Settings
  patch(task: DownloadTask, patch: Partial<DownloadTask>): void
  toast(level: 'info' | 'success' | 'error', message: string): void
  throttle: GlobalThrottle
}

export interface TaskHandle {
  task: DownloadTask
  signal: AbortSignal
  patch: (patch: Partial<DownloadTask>) => void
  toast: (level: 'info' | 'success' | 'error', message: string) => void
}

export interface ProbeOutput {
  url: string
  finalUrl: string
  fileName: string
  size: number
  resumable: boolean
  contentType?: string
  etag?: string
  lastModified?: string
  headers: Record<string, string>
}

interface HttpMeta {
  version: 1
  finalUrl: string
  size: number
  etag?: string
  lastModified?: string
  resumable: boolean
  segments: SegmentState[]
  downloaded: number
  savedAt: number
}

const META_SUFFIX = '.pulse-meta'
const PART_SUFFIX = '.pulse-part'
const MAX_RETRIES = 5

function parseTotalFromHeaders(res: Response): number {
  const cr = res.headers.get('content-range')
  if (cr) {
    const total = cr.split('/')[1]
    if (total && total !== '*') {
      const n = Number(total)
      if (Number.isFinite(n) && n > 0) return n
    }
  }
  const len = Number(res.headers.get('content-length') || 0)
  return Number.isFinite(len) && len > 0 ? len : 0
}

export class HttpEngine {
  private host: EngineHost

  constructor(host: EngineHost) {
    this.host = host
  }

  async replaceUrl(task: DownloadTask, input: string): Promise<{ url: string; headers?: Record<string, string> }> {
    const url = new URL(input.trim())
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || input.length > 8192) throw new Error('Enter a valid HTTP(S) file URL without credentials')
    if (!task.filePath || task.downloaded <= 0) throw new Error('No partial download is available')
    const metaPath = `${task.filePath}${META_SUFFIX}`
    const meta: HttpMeta = JSON.parse(await fs.readFile(metaPath, 'utf8'))
    if (meta.version !== 1 || !meta.resumable || !meta.segments?.length || meta.size !== task.size) throw new Error('This partial file cannot be safely resumed')
    if (!meta.etag || !/^"[^"\r\n]*"$/.test(meta.etag)) throw new Error('The original server did not provide a strong file validator. Safe link replacement is unavailable for this download.')
    const crossOrigin = new URL(task.url).origin !== url.origin
    const headers = Object.fromEntries(Object.entries(task.headers || {}).filter(([name]) =>
      !/^(range|if-range|host)$/i.test(name) && !(crossOrigin && /^(authorization|cookie|proxy-authorization|referer)$/i.test(name))))
    const probe = await this.probe(url.href, headers)
    if (probe.size !== meta.size || probe.etag !== meta.etag || !probe.resumable) throw new Error('The new link does not identify the same resumable file; the partial file was kept')
    const file = await fs.open(`${task.filePath}${PART_SUFFIX}`, 'r')
    try {
      const signal = AbortSignal.timeout(45000)
      for (const segment of meta.segments) {
        if (!Number.isSafeInteger(segment.position) || segment.start < 0 || segment.position < segment.start || segment.position > segment.end || segment.end > meta.size) throw new Error('Invalid partial-file metadata')
        const count = Math.min(8192, segment.position - segment.start)
        if (!count) continue
        // Compare both boundaries of every downloaded segment as well as ETag.
        for (const start of new Set([segment.start, segment.position - count])) {
          const end = start + count - 1
          const response = await fetch(probe.finalUrl, { headers: { ...headers, 'Accept-Encoding': 'identity', Range: `bytes=${start}-${end}`, 'If-Range': meta.etag }, signal })
          if (response.status !== 206 || response.headers.get('content-range') !== `bytes ${start}-${end}/${meta.size}` || response.headers.get('etag') !== meta.etag || !response.body) {
            await response.body?.cancel()
            throw new Error('The replacement server did not confirm the requested file range')
          }
          const reader = response.body.getReader()
          const remote = Buffer.alloc(count)
          let offset = 0
          try {
            while (true) {
              const { value, done } = await reader.read()
              if (done) break
              if (offset + value.byteLength > count) throw new Error('Unexpected range response size')
              remote.set(value, offset); offset += value.byteLength
            }
          } finally { await reader.cancel().catch(() => undefined) }
          const local = Buffer.alloc(count)
          const read = await file.read(local, 0, count, start)
          if (offset !== count || read.bytesRead !== count || !local.equals(remote)) throw new Error('File contents differ. The original partial download was kept.')
        }
      }
    } finally { await file.close() }
    const next = { ...meta, finalUrl: probe.finalUrl, savedAt: Date.now() }
    const temporary = `${metaPath}.refresh`
    try { await fs.writeFile(temporary, JSON.stringify(next)); await fs.rename(temporary, metaPath) }
    finally { await fs.unlink(temporary).catch(() => undefined) }
    return { url: url.href, headers }
  }

  private baseHeaders(task: DownloadTask): Record<string, string> {
    const settings = this.host.settings()
    const headers: Record<string, string> = {
      'User-Agent': settings.userAgent,
      Accept: '*/*',
      'Accept-Language': 'en-US,en;q=0.9',
      'Accept-Encoding': 'identity'
    }
    try {
      const origin = new URL(task.url).origin
      if (origin && origin !== 'null') headers.Referer = `${origin}/`
    } catch {
      /* ignore */
    }
    return { ...headers, ...(task.headers || {}) }
  }

  async probe(
    url: string,
    headers: Record<string, string> = {},
    userAgent?: string
  ): Promise<ProbeOutput> {
    const settings = this.host.settings()
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 30_000)
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': userAgent || settings.userAgent,
          Accept: '*/*',
          'Accept-Encoding': 'identity',
          Range: 'bytes=0-0',
          ...headers
        },
        signal: controller.signal,
        redirect: 'follow'
      })
      if (!res.ok && res.status !== 416) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`)
      }
      const size = parseTotalFromHeaders(res)
      const resumable = res.status === 206 || /bytes/i.test(res.headers.get('accept-ranges') || '')
      const contentType = res.headers.get('content-type') || undefined
      let fileName =
        parseContentDisposition(res.headers.get('content-disposition')) ||
        guessNameFromUrl(res.url || url)
      if (!/\.[a-z0-9]{2,6}$/i.test(fileName)) {
        const ext = extFromMime(contentType)
        if (ext) fileName += ext
      }
      fileName = sanitizeFileName(fileName)
      const outHeaders: Record<string, string> = {}
      res.headers.forEach((value, key) => {
        if (['content-length', 'content-type', 'content-disposition'].includes(key)) {
          outHeaders[key] = value
        }
      })
      try {
        await res.body?.cancel()
      } catch {
        /* ignore */
      }
      return {
        url,
        finalUrl: res.url || url,
        fileName,
        size,
        resumable,
        contentType,
        etag: res.headers.get('etag') || undefined,
        lastModified: res.headers.get('last-modified') || undefined,
        headers: outHeaders
      }
    } finally {
      clearTimeout(timeout)
    }
  }

  async start(handle: TaskHandle, resume: boolean): Promise<void> {
    const task = handle.task
    const settings = this.host.settings()
    await ensureDir(task.dir)

    if (!task.fileName) task.fileName = guessNameFromUrl(task.url)
    let fileName = sanitizeFileName(task.fileName)

    let finalPath = task.filePath || join(task.dir, fileName)
    let metaPath = `${finalPath}${META_SUFFIX}`
    let partPath = `${finalPath}${PART_SUFFIX}`

    // Keep the sidecar paths in sync whenever the final name is adjusted.
    const setFinalPath = (next: string): void => {
      finalPath = next
      metaPath = `${next}${META_SUFFIX}`
      partPath = `${next}${PART_SUFFIX}`
    }

    if (resume && existsSync(finalPath) && !existsSync(partPath)) {
      // Nothing left to do — the file is already complete on disk.
      const size = await fileSize(finalPath)
      handle.patch({
        status: 'completed',
        downloaded: size,
        size: size || task.size,
        connections: 0,
        speed: 0,
        eta: 0,
        completedAt: Date.now(),
        filePath: finalPath,
        fileName
      })
      return
    }

    let meta: HttpMeta | null = null
    if (resume && existsSync(metaPath) && existsSync(partPath)) {
      const raw = await fs.readFile(metaPath, 'utf8').catch(() => '')
      const parsed = safeJsonParse<HttpMeta | null>(raw, null)
      if (parsed && parsed.version === 1 && parsed.size > 0 && parsed.segments?.length) {
        meta = parsed
      }
    }

    if (!meta) {
      if (!task.filePath) {
        const target = await uniquePath(task.dir, fileName)
        setFinalPath(target)
        fileName = target.split(/[\\/]/).pop() as string
      }
      handle.patch({ status: 'connecting', filePath: finalPath, fileName, error: undefined })
      let probe: ProbeOutput
      try {
        probe = await this.probe(task.url, task.headers, settings.userAgent)
      } catch (err) {
        handle.patch({
          status: 'error',
          error: `Could not reach the server: ${(err as Error).message}`,
          connections: 0,
          speed: 0,
          eta: 0
        })
        return
      }
      if (handle.signal.aborted) return
      if (!task.fileName || task.fileName === guessNameFromUrl(task.url)) {
        const nice = sanitizeFileName(probe.fileName)
        if (nice && nice !== fileName) {
          const target = await uniquePath(task.dir, nice)
          setFinalPath(target)
          fileName = target.split(/[\\/]/).pop() as string
        }
      }
      meta = {
        version: 1,
        finalUrl: probe.finalUrl,
        size: probe.size,
        etag: probe.etag,
        lastModified: probe.lastModified,
        resumable: probe.resumable,
        segments: [],
        downloaded: 0,
        savedAt: Date.now()
      }
      handle.patch({
        size: probe.size,
        resumable: probe.resumable,
        filePath: finalPath,
        fileName
      })
    }

    if (meta.size <= 0) {
      await this.streamUnknownSize(handle, finalPath, meta.finalUrl)
      return
    }

    const segments: SegmentState[] = meta.segments.length
      ? meta.segments
      : this.buildSegments(meta.size, meta.resumable ? task.maxConnections || settings.connections : 1)

    const partExists = existsSync(partPath)
    let handleFs: FileHandle
    try {
      handleFs = partExists ? await fs.open(partPath, 'r+') : await fs.open(partPath, 'w+')
      if (!partExists && meta.size > 0) await handleFs.truncate(meta.size)
      const stat = await handleFs.stat()
      if (meta.size > 0 && stat.size < meta.size) await handleFs.truncate(meta.size)
    } catch (err) {
      handle.patch({
        status: 'error',
        error: `Cannot write file: ${(err as Error).message}`,
        connections: 0,
        speed: 0,
        eta: 0
      })
      return
    }

    const state: HttpMeta = {
      ...meta,
      segments,
      downloaded: segments.reduce((acc, s) => acc + Math.max(0, s.position - s.start), 0),
      savedAt: Date.now()
    }

    let lastEmit = 0
    let lastSave = 0

    const activeConns = segments.filter((s) => s.position < s.end).length || 1
    handle.patch({
      status: 'downloading',
      filePath: finalPath,
      fileName,
      size: state.size,
      downloaded: state.downloaded,
      connections: activeConns,
      resumable: state.resumable,
      segments: state.segments.map((s) => ({ ...s })),
      error: undefined
    })

    const recompute = (): void => {
      state.downloaded = state.segments.reduce(
        (acc, s) => acc + Math.max(0, s.position - s.start),
        0
      )
    }

    let persistence = Promise.resolve()
    const persist = (): Promise<void> => {
      recompute()
      state.savedAt = Date.now()
      const data = JSON.stringify(state)
      persistence = persistence.then(() => fs.writeFile(metaPath, data, 'utf8')).catch(() => undefined)
      return persistence
    }

    const tick = (): void => {
      const now = Date.now()
      if (now - lastEmit >= 160) {
        lastEmit = now
        recompute()
        handle.patch({
          downloaded: state.downloaded,
          size: state.size,
          segments: state.segments.map((s) => ({ ...s }))
        })
      }
      if (now - lastSave > 2500) {
        lastSave = now
        void persist()
      }
    }

    const transferController = new AbortController()
    const downloadSignal = AbortSignal.any([handle.signal, transferController.signal])
    const downloadSegment = async (seg: SegmentState, index: number): Promise<void> => {
      let attempt = 0
      while (seg.position < seg.end) {
        if (downloadSignal.aborted) return
        const controller = new AbortController()
        const relay = (): void => controller.abort()
        downloadSignal.addEventListener('abort', relay, { once: true })
        try {
          const ranged = state.resumable || seg.position > 0 || state.segments.length > 1
          const headers = { ...this.baseHeaders(task) }
          if (ranged) headers.Range = `bytes=${seg.position}-${seg.end - 1}`
          if (ranged && state.etag && !state.etag.startsWith('W/')) headers['If-Range'] = state.etag

          const res = await fetch(state.finalUrl, {
            headers,
            signal: controller.signal,
            redirect: 'follow'
          })
          if (res.status === 416 || res.status === 401 || res.status === 403) {
            await res.body?.cancel()
            throw new Error(res.status === 416 ? 'RANGE_CHANGED' : 'LINK_EXPIRED')
          }
          if (!res.ok) { await res.body?.cancel(); throw new Error(`HTTP ${res.status} ${res.statusText}`) }
          if (state.etag && res.headers.get('etag') && res.headers.get('etag') !== state.etag) {
            await res.body?.cancel()
            throw new Error('RANGE_CHANGED')
          }
          if (ranged && (res.status !== 206 || res.headers.get('content-range') !== `bytes ${seg.position}-${seg.end - 1}/${state.size}`)) {
            await res.body?.cancel()
            throw new Error('RANGE_UNSUPPORTED')
          }
          if (!res.body) throw new Error('Empty response body')

          const reader = res.body.getReader()
          while (true) {
            if (downloadSignal.aborted) {
              await reader.cancel().catch(() => undefined)
              return
            }
            const { done, value } = await reader.read()
            if (done) break
            if (!value || !value.byteLength) continue
            const remain = seg.end - seg.position
            if (remain <= 0) break
            const len = Math.min(value.byteLength, remain)
            const buf = Buffer.from(value.buffer, value.byteOffset, len)
            await handleFs.write(buf, 0, len, seg.position)
            seg.position += len
            await this.host.throttle.consume(len, downloadSignal)
            tick()
            if (len < value.byteLength) break
          }
          await reader.cancel().catch(() => undefined)
          if (seg.position < seg.end) throw new Error('Incomplete range response')
          attempt = 0
        } catch (err) {
          if (downloadSignal.aborted) return
          const message = (err as Error).message || 'network error'
          if (message === 'RANGE_CHANGED' || message === 'RANGE_UNSUPPORTED' || message === 'LINK_EXPIRED') throw err
          attempt++
          if (attempt > MAX_RETRIES) {
            throw new Error(`Connection ${index + 1} failed: ${message}`)
          }
          await sleep(Math.min(5000, 350 * Math.pow(2, attempt)), downloadSignal)
        } finally {
          downloadSignal.removeEventListener('abort', relay)
        }
      }
    }

    try {
      const transfers = segments.map((seg, i) => downloadSegment(seg, i))
      try { await Promise.all(transfers) }
      catch (error) { transferController.abort(); await Promise.allSettled(transfers); throw error }
      if (handle.signal.aborted) throw new DOMException('Aborted', 'AbortError')
      await handleFs.close().catch(() => undefined)
      await persist()

      const finalSize = await fileSize(partPath)
      if (state.size > 0 && finalSize !== state.size) {
        throw new Error(`Incomplete file (${finalSize} of ${state.size} bytes)`)
      }
      await moveSafe(partPath, finalPath)
      await fs.unlink(metaPath).catch(() => undefined)
      handle.patch({
        status: 'completed',
        downloaded: state.size || finalSize,
        size: state.size || finalSize,
        completedAt: Date.now(),
        filePath: finalPath,
        fileName: finalPath.split(/[\\/]/).pop() as string,
        connections: 0,
        speed: 0,
        eta: 0
      })
    } catch (err) {
      await handleFs.close().catch(() => undefined)
      await persist()
      handle.patch({ downloaded: state.downloaded, segments: state.segments.map(segment => ({ ...segment })) })
      if (handle.signal.aborted || (err as Error).name === 'AbortError') {
        handle.patch({ status: 'paused', speed: 0, eta: 0, connections: 0 })
        return
      }
      const message = (err as Error).message || 'Download failed'
      if (message === 'RANGE_UNSUPPORTED' || message === 'RANGE_CHANGED') {
        handle.patch({ status: 'error', error: 'The server changed the file or refused its byte range. Your partial file was kept; replace the link with one for the same file.', speed: 0, eta: 0, connections: 0 })
        return
      }
      if (message === 'LINK_EXPIRED') {
        handle.patch({ status: 'error', error: 'The link expired or access was refused (HTTP 401/403). Your partial file was kept. Get a fresh link and use Replace expired link.', speed: 0, eta: 0, connections: 0 })
        return
      }
      handle.patch({
        status: 'error',
        error: message,
        speed: 0,
        eta: 0,
        connections: 0
      })
    }
  }

  /** Fallback for servers that do not report a content length. */
  private async streamUnknownSize(
    handle: TaskHandle,
    finalPath: string,
    finalUrl: string
  ): Promise<void> {
    const task = handle.task
    const partPath = `${finalPath}${PART_SUFFIX}`
    const metaPath = `${finalPath}${META_SUFFIX}`
    const controller = new AbortController()
    const relay = (): void => controller.abort()
    handle.signal.addEventListener('abort', relay, { once: true })
    let fsHandle: FileHandle | null = null
    let downloaded = 0
    const started = Date.now()
    try {
      const res = await fetch(finalUrl, {
        headers: this.baseHeaders(task),
        signal: controller.signal,
        redirect: 'follow'
      })
      if (!res.ok) throw new Error(`HTTP ${res.status} ${res.statusText}`)
      if (!res.body) throw new Error('Empty response body')
      fsHandle = await fs.open(partPath, 'w+')
      handle.patch({ status: 'downloading', connections: 1, filePath: finalPath })
      const reader = res.body.getReader()
      let lastEmit = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        if (!value?.byteLength) continue
        const buf = Buffer.from(value.buffer, value.byteOffset, value.byteLength)
        await fsHandle.write(buf, 0, buf.length, downloaded)
        downloaded += buf.length
        await this.host.throttle.consume(buf.length, handle.signal)
        const now = Date.now()
        if (now - lastEmit > 160) {
          lastEmit = now
          handle.patch({ downloaded, size: 0 })
        }
      }
      await fsHandle.close()
      fsHandle = null
      await moveSafe(partPath, finalPath)
      await fs.unlink(metaPath).catch(() => undefined)
      handle.patch({
        status: 'completed',
        downloaded,
        size: downloaded,
        completedAt: Date.now(),
        connections: 0,
        speed: 0,
        eta: 0,
        filePath: finalPath,
        fileName: finalPath.split(/[\\/]/).pop() as string,
        resumable: false
      })
      void started
    } catch (err) {
      await fsHandle?.close().catch(() => undefined)
      if (handle.signal.aborted || (err as Error).name === 'AbortError') {
        handle.patch({ status: 'paused', downloaded, speed: 0, eta: 0, connections: 0 })
        return
      }
      handle.patch({
        status: 'error',
        error: (err as Error).message || 'Download failed',
        downloaded,
        speed: 0,
        eta: 0,
        connections: 0
      })
    } finally {
      handle.signal.removeEventListener('abort', relay)
    }
  }

  private buildSegments(size: number, connections: number): SegmentState[] {
    if (size <= 0) {
      return [{ start: 0, end: Number.MAX_SAFE_INTEGER, position: 0 }]
    }
    const maxUseful = Math.ceil(size / (1024 * 1024))
    const count = Math.max(1, Math.min(connections, maxUseful))
    const chunk = Math.floor(size / count)
    const segments: SegmentState[] = []
    for (let i = 0; i < count; i++) {
      const start = i * chunk
      const end = i === count - 1 ? size : start + chunk
      segments.push({ start, end, position: start })
    }
    return segments
  }
}
