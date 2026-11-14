import { load } from 'cheerio'
import { normalizeLink } from '../shared/links'
import type { ScanInput, ScanSummary } from '../shared/types'

const MAX_HTML = 2 * 1024 * 1024
const MAX_LINKS = 2000

export function scanScope(seed: string): (value: string) => boolean {
  const root = new URL(seed)
  const folder = root.pathname.endsWith('/') ? root.pathname : root.pathname.slice(0, root.pathname.lastIndexOf('/') + 1)
  return value => {
    const url = new URL(value)
    // URL parsing normalizes dot segments; reject encoded separators too.
    return url.origin === root.origin && url.pathname.startsWith(folder) && !/%2f|%5c/i.test(url.pathname)
  }
}

async function limitedHtml(response: Response): Promise<string> {
  if (!response.body) return ''
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_HTML) throw new Error('Page exceeds 2 MB limit')
      chunks.push(value)
    }
    return Buffer.concat(chunks).toString('utf8')
  } finally { await reader.cancel().catch(() => undefined) }
}

async function scopedFetch(url: string, allowed: (url: string) => boolean, signal: AbortSignal, fetcher: typeof fetch): Promise<Response> {
  let current = url
  for (let redirects = 0; redirects <= 5; redirects++) {
    if (!allowed(current)) throw new Error('Redirect leaves the selected folder or host')
    const response = await fetcher(current, { signal, redirect: 'manual', headers: { Accept: 'text/html,application/xhtml+xml,*/*;q=0.5' } })
    if (![301, 302, 303, 307, 308].includes(response.status)) return response
    await response.body?.cancel()
    const next = normalizeLink(response.headers.get('location') || '', current)
    if (!next) throw new Error('Invalid redirect')
    current = next
  }
  throw new Error('Too many redirects')
}

/** Bounded, user-initiated HTML discovery; never guesses hidden filenames. */
export async function scanLinks(input: ScanInput, signal: AbortSignal, onLinks: (urls: string[], source: string) => void, fetcher: typeof fetch = fetch): Promise<ScanSummary> {
  const seed = normalizeLink(input?.url || '')
  if (!seed) throw new Error('Enter a valid HTTP or HTTPS address without credentials')
  if (!Number.isInteger(input.depth) || input.depth < 0 || input.depth > 5) throw new Error('Depth must be between 0 and 5')
  if (!Number.isInteger(input.maxPages) || input.maxPages < 1 || input.maxPages > 100) throw new Error('Page limit must be between 1 and 100')
  const allowed = scanScope(seed)
  const queue = [{ url: seed, depth: 0 }]
  const queued = new Set([seed])
  const found = new Set<string>()
  const summary: ScanSummary = { pages: 0, found: 0, canceled: false, limited: false, errors: [] }
  const deadline = AbortSignal.timeout(90_000)
  const overall = AbortSignal.any([signal, deadline])
  while (queue.length && summary.pages < input.maxPages && found.size < MAX_LINKS) {
    if (overall.aborted) break
    const page = queue.shift()!
    summary.pages++
    try {
      const response = await scopedFetch(page.url, allowed, AbortSignal.any([overall, AbortSignal.timeout(15_000)]), fetcher)
      if (!response.ok) { await response.body?.cancel(); throw new Error(`HTTP ${response.status}`) }
      const type = response.headers.get('content-type') || ''
      if (!/text\/html|application\/xhtml\+xml/i.test(type) || /attachment/i.test(response.headers.get('content-disposition') || '')) {
        await response.body?.cancel()
        if (!found.has(page.url)) { found.add(page.url); onLinks([page.url], seed) }
        continue
      }
      const $ = load(await limitedHtml(response))
      const actualUrl = response.url || page.url
      const base = normalizeLink($('base[href]').first().attr('href') || actualUrl, actualUrl) || actualUrl
      const batch: string[] = []
      $('a[href], area[href], video[src], audio[src], source[src]').each((_index, element) => {
        if (found.size >= MAX_LINKS) { summary.limited = true; return false }
        const raw = $(element).attr('href') || $(element).attr('src') || ''
        if (!raw || raw.startsWith('#')) return
        const url = normalizeLink(raw, base)
        if (!url || !allowed(url)) return
        const pathname = new URL(url).pathname
        const isPage = pathname.endsWith('/') || /\.(html?|php|aspx?)$/i.test(pathname) || !/\.[^/]+$/.test(pathname)
        if (isPage) {
          if (page.depth < input.depth && !queued.has(url)) {
            if (queued.size >= 1000) { summary.limited = true; return }
            queued.add(url)
            queue.push({ url, depth: page.depth + 1 })
          }
        } else if (!found.has(url)) { found.add(url); batch.push(url) }
      })
      if (batch.length) onLinks(batch, seed)
    } catch (error) {
      if (!overall.aborted && summary.errors.length < 20) summary.errors.push(`${page.url}: ${(error as Error).message}`)
    }
  }
  summary.found = found.size
  summary.canceled = signal.aborted
  summary.limited ||= deadline.aborted || found.size >= MAX_LINKS || (queue.length > 0 && summary.pages >= input.maxPages)
  return summary
}
