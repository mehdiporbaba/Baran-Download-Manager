/** Preserve signed query strings; fragments are never sent to HTTP servers. */
export function normalizeLink(value: string, base?: string): string | null {
  try {
    const url = new URL(value.trim(), base)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null
    url.hash = ''
    return url.href.length <= 8192 ? url.href : null
  } catch { return null }
}

export function extractLinks(text: string): string[] {
  if (typeof text !== 'string' || text.length > 2_000_000) throw new Error('Input is too large (maximum 2 MB)')
  const links = new Set<string>()
  for (const match of text.matchAll(/https?:\/\/[^\s<>"'`]+/gi)) {
    const url = normalizeLink(match[0])
    if (url) links.add(url)
    if (links.size >= 2000) break
  }
  return [...links]
}

export function linkName(url: string): string {
  try { return decodeURIComponent(new URL(url).pathname.split('/').pop() || 'download') }
  catch { return 'download' }
}
