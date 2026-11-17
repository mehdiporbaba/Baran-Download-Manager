(() => {
  const pending = new Map()
  const listeners = new Set()
  let serial = 0
  window.chrome.webview.addEventListener('message', ({ data }) => {
    if (data.event) { for (const listener of listeners) listener(data.event); return }
    const request = pending.get(data.id)
    if (!request) return
    pending.delete(data.id)
    if (data.error) request.reject(new Error(data.error))
    else request.resolve(data.result)
  })
  const invoke = (method, ...args) => new Promise((resolve, reject) => {
    const id = ++serial
    pending.set(id, { resolve, reject })
    window.chrome.webview.postMessage(JSON.stringify({ id, method, args }))
  })
  const methods = ['viewReady','setTaskCloseOnComplete','openProgressWindow','setTaskSpeedLimit','setTaskChecksum','browserReady','installFirefoxExtension','connected','registerBrowserHost','replaceUrl','instagramCollect','installGallery','linksList','linksImport','linksRemove','linksProbe','linksDownload','scheduleTask','scanStart','scanCancel','snapshot','probe','probeYoutube','addDownload','addTorrent','pauseTask','resumeTask','cancelTask','removeTask','retryTask','revealTask','openTask','clearCompleted','updateSettings','chooseDir','chooseTorrentFile','chooseCookiesFile','setSpeedLimit','installYtDlp','rescanTools','githubSearch','githubRepo','openExternal','revealDir','windowControl','readClipboard']
  window.pulse = Object.fromEntries(methods.map(method => [method, (...args) => invoke(method, ...args)]))
  window.pulse.subscribe = listener => { listeners.add(listener); return () => listeners.delete(listener) }
  document.addEventListener('pointerdown', event => {
    if (event.button === 0 && event.target.closest('.drag') && !event.target.closest('.no-drag,button,input,select,a')) void invoke('dragWindow')
  })
  document.addEventListener('dblclick', event => {
    if (event.target.closest('.drag') && !event.target.closest('.no-drag,button,input,select,a')) void invoke('windowControl', 'maximize')
  })
})()
