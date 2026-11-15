const HOST = 'com.baran.downloadmanager'
const api = globalThis.browser || globalThis.chrome

api.runtime.onInstalled.addListener(async () => {
  await api.contextMenus.removeAll()
    api.contextMenus.create({ id: 'pulse-link', title: 'Send link to Baran', contexts: ['link'], targetUrlPatterns: ['http://*/*', 'https://*/*'] })
    api.contextMenus.create({ id: 'pulse-page', title: 'Collect page links with Baran', contexts: ['page'], documentUrlPatterns: ['http://*/*', 'https://*/*'] })
    api.contextMenus.create({ id: 'pulse-media', title: 'Collect visible media with Baran', contexts: ['page', 'image', 'video', 'audio'], documentUrlPatterns: ['http://*/*', 'https://*/*'] })
})

async function send(urls) {
  const valid = [...new Set(urls)].filter(value => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && value.length <= 8192 }
    catch { return false }
  })
  if (valid.length > 2000) throw new Error('Select fewer than 2000 links.')
  if (!valid.length) throw new Error('No HTTP or HTTPS links were found.')
  if (new TextEncoder().encode(JSON.stringify({ action: 'import', urls: valid })).length > 256 * 1024) throw new Error('Too many links for one transfer. Select fewer links.')
  const result = await api.runtime.sendNativeMessage(HOST, { action: 'import', urls: valid })
  if (!result?.ok) throw new Error(result?.error || 'Open Baran and try again.')
  return result.count
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
    await send([url.href])
    await api.downloads.cancel(item.id)
    paused = false
    await api.action.setBadgeText({ text: 'OK' })
    await api.action.setTitle({ title: 'Download sent to Baran. Review it in Link Grabber.' })
  } catch (error) {
    await api.action.setBadgeText({ text: '!' }).catch(() => {})
    await api.action.setTitle({ title: `Browser download kept: ${error.message}` }).catch(() => {})
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
