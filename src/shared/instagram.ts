import { normalizeLink } from './links'
export function instagramUrl(value: string): string {
  const link = normalizeLink(value)
  if (!link || !['instagram.com', 'www.instagram.com'].includes(new URL(link).hostname)) throw new Error('Enter an instagram.com post, reel or story URL')
  if (!/^\/(p|reels?|tv|stories|share)\//.test(new URL(link).pathname)) throw new Error('Use a specific post, reel or story link, rather than an entire profile')
  return link
}
export function galleryAssets(data: unknown): Array<{ url: string; fileName: string }> {
  if (!Array.isArray(data)) throw new Error('Invalid Instagram extractor response')
  const result: Array<{ url: string; fileName: string }> = []
  const seen = new Set<string>()
  for (const item of data) {
    if (!Array.isArray(item) || item[0] !== 3 || typeof item[1] !== 'string') continue
    const url = normalizeLink(item[1])
    if (!url || seen.has(url)) continue
    const host = new URL(url).hostname
    if (!['cdninstagram.com', 'fbcdn.net', 'instagram.com'].some(domain => host === domain || host.endsWith(`.${domain}`))) continue
    const meta = item[2] && typeof item[2] === 'object' ? item[2] : {}
    const ext = String(meta.extension || new URL(url).pathname.split('.').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').slice(0, 6) || 'jpg'
    const id = String(meta.shortcode || meta.post_shortcode || meta.media_id || meta.id || 'media').replace(/[^a-z0-9_-]/gi, '').slice(0, 80)
    result.push({ url, fileName: `instagram-${id}-${meta.num || result.length + 1}.${ext}` })
    seen.add(url)
    if (result.length >= 100) break
  }
  return result
}
