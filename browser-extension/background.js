const HOST = 'com.baran.downloadmanager'
const api = globalThis.browser || globalThis.chrome

api.runtime.onInstalled.addListener(async () => {
  await api.contextMenus.removeAll()
    api.contextMenus.create({ id: 'pulse-link', title: 'Send link to Baran', contexts: ['link'], targetUrlPatterns: ['http://*/*', 'https://*/*'] })
    api.contextMenus.create({ id: 'pulse-page', title: 'Collect page links with Baran', contexts: ['page'], documentUrlPatterns: ['http://*/*', 'https://*/*'] })
    api.contextMenus.create({ id: 'pulse-media', title: 'Collect visible media with Baran', contexts: ['page', 'image', 'video', 'audio'], documentUrlPatterns: ['http://*/*', 'https://*/*'] })
})

async function transfer(urls, intent = 'collect') {
  const valid = [...new Set(urls)].filter(value => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && value.length <= 8192 }
    catch { return false }
  })
  if (valid.length > 2000) throw new Error('Select fewer than 2000 links.')
  if (!valid.length) throw new Error('No HTTP or HTTPS links were found.')
  if (new TextEncoder().encode(JSON.stringify({ action: 'import', urls: valid })).length > 256 * 1024) throw new Error('Too many links for one transfer. Select fewer links.')
  const request = { action: 'import', urls: valid }
  if (intent === 'download') request.intent = 'download'
  const result = await api.runtime.sendNativeMessage(HOST, request)
  if (!result?.ok) throw new Error(result?.error || 'Open Baran and try again.')
  if (intent === 'download' && !result.downloadPrompt) throw new Error('Update Baran desktop to a version that supports browser download prompts.')
  return result
}
async function send(urls) { return (await transfer(urls)).count }
async function captureStatus(ok, message) {
  await api.storage.local.set({ lastCapture: { ok, message, at: Date.now() } }).catch(() => {})
  await api.action.setBadgeText({ text: ok ? 'OK' : '!' }).catch(() => {})
  await api.action.setTitle({ title: message }).catch(() => {})
}

async function collect(tabId, mediaOnly = false) {
  const results = await api.scripting.executeScript({
    target: { tabId },
    args: [mediaOnly],
    func: (mediaOnly) => {
      const selection = window.getSelection()
      const range = selection?.rangeCount && !selection.isCollapsed ? selection.getRangeAt(0) : null
      const selector = mediaOnly ? 'img[src],video,audio,source[src]' : 'a[href],area[href],video[src],audio[src],source[src]'
      return [...document.querySelectorAll(selector)]
        .filter(node => !range || range.intersectsNode(node))
        .map(node => node.currentSrc || node.href || node.src)
        .filter(Boolean).slice(0, 2001)
    }
  })
  return send(results[0]?.result || [])
}

api.contextMenus.onClicked.addListener((info, tab) => {
  const action = info.menuItemId === 'pulse-link' ? send([info.linkUrl]) : collect(tab.id, info.menuItemId === 'pulse-media')
  action.then(async () => {
    await api.action.setBadgeBackgroundColor({ color: '#16834c' })
    await api.action.setBadgeText({ text: 'OK' })
    await api.action.setTitle({ title: 'Links added to Baran. Review them before downloading.' })
  }).catch(async error => {
    await api.action.setBadgeBackgroundColor({ color: '#b42318' })
    await api.action.setBadgeText({ text: '!' })
    await api.action.setTitle({ title: error.message })
  })
})

api.runtime.onMessage.addListener((message, _sender, respond) => {
  if (message?.action === 'connection') {
    api.runtime.sendNativeMessage(HOST, { action: 'ping' }).then(result => respond(result)).catch(error => respond({ ok: false, error: error.message }))
    return true
  }
  if (!['collect', 'media'].includes(message?.action)) return false
  api.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (!tabs[0]?.id) throw new Error('Open a web page first.')
    return collect(tabs[0].id, message.action === 'media')
  }).then(count => respond({ ok: true, count })).catch(error => respond({ ok: false, error: error.message }))
  return true
})

// Handoff is opt-in for each browser. Never cancel until the app acknowledges
// that it has staged the URL; restore the browser download when Baran is offline.
async function captureDownload(item) {
  if (item.state !== 'in_progress' || item.paused || item.incognito || item.byExtensionId) return
  let url
  try {
    url = new URL(item.finalUrl || item.url)
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return
  } catch { return }
  const settings = await api.storage.local.get('captureDownloads')
  if (!settings.captureDownloads || !await api.permissions.contains({ permissions: ['downloads'] })) return
  let paused = false
  try {
    await api.downloads.pause(item.id)
    paused = true
    const [current] = await api.downloads.search({ id: item.id })
    if (!current || current.state !== 'in_progress' || !current.paused) return
    await transfer([url.href], 'download')
    await api.downloads.cancel(item.id)
    paused = false
    await captureStatus(true, 'Download received by Baran. Confirm its New download window.')
  } catch (error) {
    await captureStatus(false, `Browser download kept: ${error.message}. If another download manager is active, disable its Firefox integration.`)
  } finally {
    if (paused) await api.downloads.resume(item.id).catch(() => {})
  }
}

const onDownload = item => { void captureDownload(item).catch(() => {}) }
function registerCaptureListener() {
  try { api.downloads?.onCreated.addListener(onDownload) } catch { /* Permission is optional until enabled. */ }
}
registerCaptureListener()
api.permissions.onAdded.addListener(registerCaptureListener)

// Firefox can offer binary downloads before the downloads event. CDN archives
// frequently omit Content-Disposition and retain signed query strings.
// Other extensions can still cancel the same request; this is not a priority lock.
function isDownloadResponse(details) {
  const header = name => (details.responseHeaders || []).find(value => value.name.toLowerCase() === name)?.value || ''
  if (/^attachment(?:\s*;|\s*$)/i.test(header('content-disposition'))) return true
  const type = header('content-type').split(';', 1)[0].trim().toLowerCase()
  if (/^application\/(?:zip|x-zip-compressed|x-rar-compressed|vnd\.rar|x-7z-compressed|gzip|x-gzip|x-tar|x-bzip2|x-msdownload|x-msdos-program|vnd\.microsoft\.portable-executable|x-iso9660-image|x-bittorrent)$/.test(type)) return true
  if (type && type !== 'application/octet-stream' && type !== 'binary/octet-stream') return false
  try { return /\.(?:zip|rar|7z|gz|tgz|bz2|xz|tar|exe|msi|msix|iso|img|dmg|deb|rpm|torrent)$/i.test(new URL(details.url).pathname) } catch { return false }
}
async function captureAttachment(details) {
  if (details.incognito || details.tabId < 0 || details.method !== 'GET' || details.statusCode !== 200 || !['main_frame', 'sub_frame'].includes(details.type)) return {}
  if (/^(moz|chrome)-extension:/i.test(details.originUrl || details.initiator || '')) return {}
  if (!isDownloadResponse(details)) return {}
  const setting = await api.storage.local.get('captureDownloads')
  if (!setting.captureDownloads || !await api.permissions.contains({permissions: ['webRequest', 'webRequestBlocking'], origins: ['http://*/*', 'https://*/*']})) return {}
  try {
    await transfer([details.url], 'download')
    await captureStatus(true, 'Attachment received by Baran. Confirm its New download window.')
    return { cancel: true }
  } catch (error) {
    await captureStatus(false, `Browser download kept: ${error.message}`)
    return {}
  }
}
function registerAttachmentListener() {
  if (!globalThis.browser || !api.webRequest?.onHeadersReceived) return
  try { if (!api.webRequest.onHeadersReceived.hasListener(captureAttachment)) api.webRequest.onHeadersReceived.addListener(captureAttachment, {urls: ['http://*/*', 'https://*/*'], types: ['main_frame', 'sub_frame']}, ['blocking', 'responseHeaders']) } catch { /* Optional permissions are granted during setup. */ }
}
registerAttachmentListener()
api.permissions.onAdded.addListener(registerAttachmentListener)
