import { randomUUID } from 'node:crypto'
import { normalizeLink, linkName } from '../shared/links'
import type { CollectedLink } from '../shared/types'

/** A staging inbox: importing never starts downloads. No credentials are accepted. */
export class LinkGrabber {
  private links = new Map<string, CollectedLink>()
  constructor(private changed: () => void) {}
  list(): CollectedLink[] { return [...this.links.values()] }
  add(urls: string[], source?: string): number {
    if (!Array.isArray(urls) || urls.length > 2000) throw new Error('Maximum 2000 links per import')
    const existing = new Set(this.list().map(link => link.url))
    const incoming = [...new Set(urls.map(raw => typeof raw === 'string' ? normalizeLink(raw) : null)
      .filter((url): url is string => Boolean(url) && !existing.has(url!)))]
    if (this.links.size + incoming.length > 5000) throw new Error('Link inbox is full (5000 links)')
    let count = 0
    for (const url of incoming) {
      const link: CollectedLink = { id: randomUUID(), url, fileName: linkName(url), source, status: 'new' }
      this.links.set(link.id, link)
      existing.add(url)
      count++
    }
    this.changed()
    return count
  }
  get(id: string): CollectedLink {
    const link = this.links.get(id)
    if (!link) throw new Error('Link no longer exists')
    return link
  }
  patch(id: string, patch: Partial<CollectedLink>): void {
    const link = this.links.get(id)
    if (link) { Object.assign(link, patch); this.changed() }
  }
  remove(ids: string[]): void {
    if (!Array.isArray(ids) || ids.length > 5000) throw new Error('Invalid selection')
    for (const id of ids) this.links.delete(id)
    this.changed()
  }
}
