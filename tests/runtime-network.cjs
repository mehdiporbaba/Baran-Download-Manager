const { app } = require('electron')
const { createServer, get } = require('node:http')
const assert = require('node:assert/strict')
const { join } = require('node:path')
app.setPath('userData', join(process.env.BARAN_NETWORK_TEST_ROOT, `profile-${process.pid}`))
const listen = server => new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve(server.address().port)))
const close = server => new Promise(resolve => { server.closeAllConnections(); server.close(resolve) })
app.whenReady().then(async () => {
  const { networkFetch, setNetworkSettingsProvider, mediaProxy } = require(join(process.env.BARAN_NETWORK_TEST_ROOT, 'main/network.js'))
  const payload = Buffer.from('Baran range + proxy verification')
  let proxyRequests = 0
  let targetRequests = 0
  const target = createServer((req, res) => {
    targetRequests++
    const range = req.headers.range
    if (req.url.startsWith('/refresh/')) {
      if (req.url === '/refresh/expired') { res.writeHead(403); res.end(); return }
      const etag = req.url === '/refresh/different' ? '"other-file"' : '"same-file"'
      const data = req.url === '/refresh/lying' ? Buffer.alloc(payload.length, 120) : payload
      const match = /^bytes=(\d+)-(\d+)$/.exec(range || '')
      if (match && req.url !== '/refresh/no-range') {
        const start = +match[1], end = +match[2]
        res.writeHead(206, { ETag: etag, 'Content-Range': `bytes ${start}-${end}/${data.length}`, 'Content-Length': end - start + 1 }); res.end(data.subarray(start, end + 1))
      } else { res.writeHead(200, { ETag: etag, 'Content-Length': data.length }); res.end(data) }
      return
    }
    if (range === 'bytes=0-3') { res.writeHead(206, { 'Content-Range': `bytes 0-3/${payload.length}`, 'Content-Length': 4 }); res.end(payload.subarray(0, 4)) }
    else { res.writeHead(200, { 'Content-Length': payload.length }); res.end(payload) }
  })
  const proxy = createServer((req, res) => {
    proxyRequests++
    const forward = get(req.url, { headers: req.headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res) })
    forward.on('error', () => { res.writeHead(502); res.end() })
  })
  try {
    const port = await listen(target)
    const proxyPort = await listen(proxy)
    const url = `http://127.0.0.1:${port}/file`
    setNetworkSettingsProvider(() => ({ proxyMode: 'direct', proxy: '' }))
    assert.equal(await (await networkFetch(url)).text(), payload.toString())
    assert.equal(proxyRequests, 0)
    setNetworkSettingsProvider(() => ({ proxyMode: 'manual', proxy: `http://127.0.0.1:${proxyPort}` }))
    assert.equal(await mediaProxy(url), `http://127.0.0.1:${proxyPort}`)
    const response = await networkFetch(url, { headers: { Range: 'bytes=0-3' } })
    assert.equal(response.status, 206)
    assert.equal(await response.text(), 'Bara')
    assert.ok(proxyRequests > 0, 'manual proxy must receive the request')
    console.log('PASS: Electron direct downloads, manual proxy routing and Range response integrity')
    setNetworkSettingsProvider(() => ({ proxyMode: 'direct', proxy: '' }))
    const { Store } = require(join(process.env.BARAN_NETWORK_TEST_ROOT, 'main/store.js'))
    const { DownloadManager } = require(join(process.env.BARAN_NETWORK_TEST_ROOT, 'main/manager.js'))
    const { GlobalThrottle } = require(join(process.env.BARAN_NETWORK_TEST_ROOT, 'main/util.js'))
    const store = new Store()
    await store.load()
    store.patchSettings({ downloadDir: join(app.getPath('userData'), 'downloads'), notifyOnComplete: false })
    const manager = new DownloadManager({ store, emit() {} })
    manager.torrent.init = async () => null
    manager.youtube.status = async () => ({ ytdlp: { available: false }, ffmpeg: { available: false } })
    await manager.init()
    const before = targetRequests
    const startAt = Date.now() + 700
    const task = await manager.addDownload({ url, kind: 'http', fileName: 'scheduled.bin', startAt })
    await new Promise(resolve => setTimeout(resolve, 250))
    assert.equal(targetRequests, before, 'future job must not connect early')
    assert.equal(task.status, 'queued')
    const completed = async task => {
      const deadline = Date.now() + 5000
      while (task.status !== 'completed' && Date.now() < deadline) {
        if (task.status === 'error') throw new Error(task.error)
        await new Promise(resolve => setTimeout(resolve, 25))
      }
      assert.equal(task.status, 'completed')
      assert.deepEqual(await require('node:fs/promises').readFile(task.filePath), payload)
    }
    await completed(task)
    const pending = await manager.addDownload({ url, kind: 'http', fileName: 'future.bin', startAt: Date.now() + 3600000 })
    manager.updateSettings({ sidebarAlwaysOpen: true })
    await store.flush()
    const restored = new Store(); await restored.load()
    assert.equal(restored.tasks.find(row => row.id === pending.id).startAt, pending.startAt)
    assert.equal(restored.settings.sidebarAlwaysOpen, true, 'pinned navigation must persist across restart')
    await manager.scheduleTask(pending.id)
    await completed(pending)
    const fs = require('node:fs/promises')
    const refresh = await manager.addDownload({ url: `http://127.0.0.1:${port}/refresh/expired`, kind: 'http', fileName: 'refresh.bin', startAt: Date.now() + 3600000 })
    manager.pause(refresh.id)
    const path = join(store.settings.downloadDir, 'refresh.bin')
    const partial = Buffer.alloc(payload.length); payload.copy(partial, 0, 0, 12)
    const metadata = { version: 1, finalUrl: refresh.url, size: payload.length, resumable: true, etag: '"same-file"', segments: [{ start: 0, end: payload.length, position: 12 }], downloaded: 12, savedAt: Date.now() }
    await fs.writeFile(`${path}.pulse-part`, partial)
    await fs.writeFile(`${path}.pulse-meta`, JSON.stringify(metadata))
    manager.patch(refresh, { filePath: path, downloaded: 12, size: payload.length, resumable: true, startAt: undefined })
    await manager.resume(refresh.id)
    const expiredDeadline = Date.now() + 3000
    while (refresh.status !== 'error' && Date.now() < expiredDeadline) await new Promise(resolve => setTimeout(resolve, 20))
    assert.equal(refresh.status, 'error')
    assert.match(refresh.error, /401\/403/)
    assert.equal(refresh.downloaded, 12)
    assert.deepEqual(await fs.readFile(`${path}.pulse-part`), partial)
    const savedMeta = await fs.readFile(`${path}.pulse-meta`, 'utf8')
    for (const route of ['different', 'no-range', 'lying']) {
      await assert.rejects(manager.replaceUrl(refresh.id, `http://127.0.0.1:${port}/refresh/${route}`))
      assert.equal(refresh.url.endsWith('/expired'), true)
      assert.equal(await fs.readFile(`${path}.pulse-meta`, 'utf8'), savedMeta)
      assert.deepEqual(await fs.readFile(`${path}.pulse-part`), partial)
    }
    await manager.replaceUrl(refresh.id, `http://127.0.0.1:${port}/refresh/fresh`)
    assert.equal(refresh.downloaded, 12)
    assert.equal(JSON.parse(await fs.readFile(`${path}.pulse-meta`, 'utf8')).segments[0].position, 12)
    await manager.resume(refresh.id)
    await completed(refresh)
    console.log('PASS: expired-link replacement rejects changed files, missing Range and false ETags; verified partial download resumes with exact final bytes')
    const limits = []
    manager.torrent.client = { throttleDownload(value) { limits.push(['down', value]) }, throttleUpload(value) { limits.push(['up', value]) } }
    manager.updateSettings({ torrentDownloadLimit: 2048, torrentUploadLimit: 1024 })
    manager.torrent.setLimit(0, 0)
    assert.deepEqual(limits, [['down', 2048], ['up', 1024], ['down', -1], ['up', -1]])
    manager.torrent.client = null
    const throttle = new GlobalThrottle(); throttle.setLimit(65536)
    const throttleStart = Date.now(); await throttle.consume(65536)
    assert.ok(Date.now() - throttleStart >= 800, 'HTTP rate limiter must account for a full second of bytes')
    await manager.shutdown()
    console.log('PASS: scheduled HTTP start, persistent timestamps, reschedule-to-now, file integrity, independent torrent caps and HTTP throttle timing')
    await close(target); await close(proxy)
    app.exit(0)
  } catch (error) { console.error(error); await close(target); await close(proxy); app.exit(1) }
})
setTimeout(() => { console.error('Runtime network test timed out'); app.exit(1) }, 20000).unref()
