const HOST = 'com.baran.downloadmanager'

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: 'pulse-link', title: 'Send link to Baran', contexts: ['link'], targetUrlPatterns: ['http://*/*', 'https://*/*'] })
    chrome.contextMenus.create({ id: 'pulse-page', title: 'Collect page links with Baran', contexts: ['page'], documentUrlPatterns: ['http://*/*', 'https://*/*'] })
    chrome.contextMenus.create({ id: 'pulse-media', title: 'Collect visible media with Baran', contexts: ['page', 'image', 'video', 'audio'], documentUrlPatterns: ['http://*/*', 'https://*/*'] })
  })
})

async function send(urls) {
  const valid = [...new Set(urls)].filter(value => {
    try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && value.length <= 8192 }
    catch { return false }
  })
  if (valid.length > 2000) throw new Error('Select fewer than 2000 links.')
  if (!valid.length) throw new Error('No HTTP or HTTPS links were found.')
  if (new TextEncoder().encode(JSON.stringify({ action: 'import', urls: valid })).length > 256 * 1024) throw new Error('Too many links for one transfer. Select fewer links.')
  const result = await chrome.runtime.sendNativeMessage(HOST, { action: 'import', urls: valid })
  if (!result?.ok) throw new Error(result?.error || 'Open Baran and try again.')
  return result.count
}

async function collect(tabId, mediaOnly = false) {
  const results = await chrome.scripting.executeScript({
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

chrome.contextMenus.onClicked.addListener((info, tab) => {
  const action = info.menuItemId === 'pulse-link' ? send([info.linkUrl]) : collect(tab.id, info.menuItemId === 'pulse-media')
  action.then(async () => {
    await chrome.action.setBadgeBackgroundColor({ color: '#16834c' })
    await chrome.action.setBadgeText({ text: 'OK' })
    await chrome.action.setTitle({ title: 'Links added to Baran. Review them before downloading.' })
  }).catch(async error => {
    await chrome.action.setBadgeBackgroundColor({ color: '#b42318' })
    await chrome.action.setBadgeText({ text: '!' })
    await chrome.action.setTitle({ title: error.message })
  })
})

chrome.runtime.onMessage.addListener((message, _sender, respond) => {
  if (!['collect', 'media'].includes(message?.action)) return false
  chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
    if (!tabs[0]?.id) throw new Error('Open a web page first.')
    return collect(tabs[0].id, message.action === 'media')
  }).then(count => respond({ ok: true, count })).catch(error => respond({ ok: false, error: error.message }))
  return true
})
