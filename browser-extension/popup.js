const api = globalThis.browser || globalThis.chrome
const button = document.getElementById('collect')
const status = document.getElementById('status')
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
    const allowed = !capture.checked || await api.permissions.request({ permissions: ['downloads'] })
    capture.checked = capture.checked && allowed
    await api.storage.local.set({ captureDownloads: capture.checked })
    status.textContent = capture.checked
      ? 'New HTTP(S) downloads will be sent to the Baran inbox. If Baran is unavailable, the browser continues.'
      : 'Browser download handoff is off.'
  } catch (error) { capture.checked = false; status.textContent = error.message }
})
