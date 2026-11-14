import { ipcMain } from 'electron'
import { IP } from '../shared/ipc'
import { extractLinks } from '../shared/links'
import type { ScanInput } from '../shared/types'
import type { DownloadManager } from './manager'
import { LinkGrabber } from './link-grabber'
import { scanLinks } from './scanner'
import { networkFetch } from './network'
import { validateStartAt } from '../shared/scheduling'
import { collectInstagram, installGallery } from './instagram'

export function registerLinkIpc(manager: DownloadManager, inbox: LinkGrabber): () => void {
  let scan: AbortController | undefined
  let probing = false
  let downloading = false
  let instagramBusy = false
  ipcMain.handle(IP.installGallery, async () => {
    if (instagramBusy) throw new Error('Instagram tool is busy')
    instagramBusy = true
    try { await installGallery() } finally { instagramBusy = false }
  })
  ipcMain.handle(IP.instagramCollect, async (_event, url: string) => {
    if (instagramBusy) throw new Error('Instagram tool is busy')
    instagramBusy = true
    try {
      const assets = await collectInstagram(url, manager.settings())
      const source = url.trim()
      const count = inbox.add(assets.map(asset => asset.url), source)
      const names = new Map(assets.map(asset => [asset.url, asset.fileName]))
      for (const link of inbox.list()) {
        const fileName = names.get(link.url)
        if (fileName) inbox.patch(link.id, { fileName, source, headers: { Referer: 'https://www.instagram.com/' } })
      }
      return count
    } finally { instagramBusy = false }
  })
  function selection(ids: string[]): string[] {
    if (!Array.isArray(ids) || ids.length > 2000 || ids.some(id => typeof id !== 'string')) throw new Error('Invalid selection (maximum 2000)')
    return [...new Set(ids)]
  }
  ipcMain.handle(IP.linksList, () => inbox.list())
  ipcMain.handle(IP.linksImport, (_event, text: string) => inbox.add(extractLinks(text)))
  ipcMain.handle(IP.linksRemove, (_event, ids: string[]) => inbox.remove(selection(ids)))
  ipcMain.handle(IP.linksProbe, async (_event, rawIds: string[]) => {
    if (probing) throw new Error('A link check is already running')
    const ids = selection(rawIds)
    probing = true
    try {
      await Promise.all(Array.from({ length: Math.min(4, ids.length) }, async () => {
        while (ids.length) {
          const id = ids.shift()!
          let url: string
          try { url = inbox.get(id).url } catch { continue }
          inbox.patch(id, { status: 'checking', error: undefined })
          try {
            const result = await manager.probe(url, inbox.get(id).headers)
            inbox.patch(id, { status: 'ready', size: result.size, fileName: result.fileName, contentType: result.contentType, resumable: result.resumable })
          } catch (error) { inbox.patch(id, { status: 'error', error: (error as Error).message }) }
        }
      }))
    } finally { probing = false }
  })
  ipcMain.handle(IP.linksDownload, async (_event, rawIds: string[], dir: string, scheduled?: number) => {
    const startAt = validateStartAt(scheduled)
    if (downloading) throw new Error('An import is already running')
    const ids = selection(rawIds)
    if (typeof dir !== 'string' || !dir.trim()) throw new Error('Choose a download folder')
    downloading = true
    const result = { added: 0, errors: [] as string[] }
    try {
      for (const id of ids) {
        try {
          const link = inbox.get(id)
          // Force HTTP: collected files must not unexpectedly enter another engine.
          await manager.addDownload({ url: link.url, dir, kind: 'http', fileName: link.fileName, headers: link.headers, startAt })
          inbox.remove([id])
          result.added++
        } catch (error) { result.errors.push((error as Error).message) }
      }
      return result
    } finally { downloading = false }
  })
  ipcMain.handle(IP.scanStart, async (_event, input: ScanInput) => {
    if (scan) throw new Error('A scan is already running')
    scan = new AbortController()
    try { return await scanLinks(input, scan.signal, (urls, source) => { inbox.add(urls, source) }, networkFetch as typeof fetch) }
    finally { scan = undefined }
  })
  ipcMain.handle(IP.scanCancel, () => { scan?.abort() })
  return () => { scan?.abort() }
}
