const button = document.getElementById('collect')
const status = document.getElementById('status')
async function collect(action) {
  button.disabled = true
  status.textContent = 'Collecting…'
  try {
    const result = await chrome.runtime.sendMessage({ action })
    if (!result?.ok) throw new Error(result?.error || 'Could not connect.')
    status.textContent = `${result.count} new links added. Review them in Baran.`
  } catch (error) { status.textContent = `${error.message} Check that the native host is registered and Baran is running.` }
  finally { button.disabled = false }
}
button.addEventListener('click', () => collect('collect'))
document.getElementById('media').addEventListener('click', () => collect('media'))
