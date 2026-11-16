const api = globalThis.browser || globalThis.chrome
const button = document.getElementById('collect')
const status = document.getElementById('status')
async function connection() {
  const result = await api.runtime.sendMessage({ action: 'connection' })
  if (!result?.ok) throw new Error(result?.error || 'Baran is not connected. Use Baran Settings → Browser integration → Firefox → Repair connection.')
  if (!result.downloadPrompt) throw new Error('Update Baran desktop: this version cannot open browser download prompts.')
  return result
}
document.getElementById('connection').addEventListener('click', async () => {
  status.textContent = 'Checking… / در حال بررسی…'
  try { const result = await connection(); status.textContent = `Connected to Baran ${result.version}. / اتصال برقرار است.` }
  catch (error) { status.textContent = error.message }
})
document.getElementById('addons').addEventListener('click', () => {
  api.tabs.create({url: globalThis.browser ? 'about:addons' : 'chrome://extensions/'}).catch(() => { status.textContent = 'Open about:addons in Firefox and disable the other download-manager extension. / افزونهٔ دانلودمنیجر قبلی را در مدیریت افزونه‌ها خاموش کن.' })
})
async function collect(action) {
  button.disabled = true
  status.textContent = 'Collecting…'
  try {
    const result = await api.runtime.sendMessage({ action })
    if (!result?.ok) throw new Error(result?.error || 'Could not connect.')
    status.textContent = `${result.count} new links added. Review them in Baran.`
  } catch (error) { status.textContent = `${error.message} Check that the native host is registered and Baran is running.` }
  finally { button.disabled = false }
}
button.addEventListener('click', () => collect('collect'))
document.getElementById('media').addEventListener('click', () => collect('media'))

const capture = document.getElementById('capture')
Promise.all([
  api.storage.local.get('captureDownloads'),
  api.permissions.contains({ permissions: ['downloads'] })
]).then(([settings, allowed]) => { capture.checked = Boolean(settings.captureDownloads && allowed) })
capture.addEventListener('change', async () => {
  try {
    // Request directly inside the click gesture, before another awaited call.
    const permissions = globalThis.browser ? { permissions: ['downloads', 'webRequest', 'webRequestBlocking'], origins: ['http://*/*', 'https://*/*'] } : { permissions: ['downloads'] }
    const allowed = !capture.checked || await api.permissions.request(permissions)
    capture.checked = capture.checked && allowed
    if (capture.checked) await connection()
    await api.storage.local.set({ captureDownloads: capture.checked })
    status.textContent = capture.checked
      ? 'Capture enabled. Disable the old download-manager extension. Baran will show New download. / گرفتن دانلود فعال شد؛ افزونهٔ قبلی را خاموش کن.'
      : 'Browser download handoff is off. / گرفتن دانلود خاموش است.'
  } catch (error) { capture.checked = false; await api.storage.local.set({ captureDownloads: false }).catch(() => {}); status.textContent = error.message }
})
api.storage.local.get('lastCapture').then(value => { if (value.lastCapture) document.getElementById('last').textContent = `${value.lastCapture.ok ? '✓' : '!'} ${value.lastCapture.message}` })
