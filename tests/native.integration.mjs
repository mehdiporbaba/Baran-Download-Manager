import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { createServer, get } from 'node:http'
import { spawn, spawnSync } from 'node:child_process'
import { createInterface } from 'node:readline'
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import WebTorrent from 'webtorrent'
import { Server as TrackerServer } from 'bittorrent-tracker'
import { createServer as createTcpServer, createConnection } from 'node:net'
const profile = resolve('.tools/native-integration', `${Date.now()}-${process.pid}`)
const nativePipeName = `baran-native-integration-${Date.now()}-${process.pid}`
const downloads = join(profile, 'downloads')
await mkdir(downloads, { recursive: true })
const fixtureDirectory = join(profile, 'bin'); await mkdir(fixtureDirectory, { recursive: true })
const mediaFixture = join(fixtureDirectory, 'yt-dlp.exe')
const compiled = spawnSync(`${process.env.WINDIR}\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe`, ['/nologo', '/target:exe', `/out:${mediaFixture}`, resolve('tests/NativeMediaFixture.cs')], { encoding: 'utf8' })
assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr)
await writeFile(join(fixtureDirectory, 'gallery-dl.exe'), await readFile(mediaFixture))
const payload = Buffer.alloc(256 * 1024)
const multiPayload = Buffer.alloc(2 * 1024 * 1024, 91)
for (let i = 0; i < payload.length; i++) payload[i] = (i * 31 + i % 251) % 256
const requests = []
let remoteTorrentMetadata
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost'); requests.push({ path: url.pathname, range: req.headers.range, ifRange: req.headers['if-range'] })
  if (url.pathname === '/opaque-verification-download') {
    const text = 'google-site-verification: google-fixture.html';
    res.writeHead(200, { 'Content-Type': 'text/html', 'Content-Disposition': 'attachment; filename="google-fixture.html"', 'Content-Length': Buffer.byteLength(text) }); res.end(text); return;
  }
  if (url.pathname==='/html-disguised.zip' || url.pathname==='/allowed.html') { const html='<html><body>Authorized page fixture</body></html>';res.writeHead(200,{'Content-Type':'text/html','Content-Length':Buffer.byteLength(html)});res.end(html);return }
  if (url.pathname === '/stall-body') {
    const range = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range || '')
    const start = range ? +range[1] : 0, end = range ? +range[2] : payload.length-1
    res.writeHead(range ? 206 : 200, { ETag: '"stall-test"', 'Content-Range': `bytes ${start}-${end}/${payload.length}`, 'Content-Length': end-start+1, 'Content-Type': 'application/octet-stream' })
    if (start === 0 && end === 0) res.end(payload.subarray(0,1))
    else { res.flushHeaders(); res.write(payload.subarray(start,start+1)) }
    return
  }
  if (url.pathname === '/expired') { res.writeHead(403); res.end(); return }
  if (url.pathname === '/fresh' && req.headers['x-baran-test'] !== 'keep') { res.writeHead(401); res.end(); return }
  if (url.pathname === '/metadata.torrent' && remoteTorrentMetadata) { res.writeHead(200, { 'Content-Type': 'application/x-bittorrent', 'Content-Length': remoteTorrentMetadata.length }); res.end(remoteTorrentMetadata); return }
  if (url.pathname === '/unknown') {
    if (req.headers.range) { res.writeHead(206, { 'Content-Range': 'bytes 0-0/*', 'Content-Length': 1 }); res.end(payload.subarray(0, 1)) }
    else { res.writeHead(200, { 'Content-Type': 'application/octet-stream' }); res.write(payload.subarray(0, 100)); res.end(payload.subarray(100)) }
    return
  }
  if (url.pathname === '/folder/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<a href="file.zip?sig=a%2Bb">file</a><a href="nested/">nested</a><a href="/outside/">outside</a>'); return }
  if (url.pathname === '/folder/nested/') { res.writeHead(200, { 'Content-Type': 'text/html' }); res.end('<a href="../">cycle</a><a href="second.pdf">second</a>'); return }
  if (url.pathname.startsWith('/outside/')) { res.writeHead(500); res.end(); return }
  if (url.pathname === '/folder/redirect/') { res.writeHead(302, { Location: '/outside/' }); res.end(); return }
  const body = url.pathname === '/multi-limit' ? multiPayload : url.pathname === '/lying' ? Buffer.alloc(payload.length, 1) : payload
  const etag = url.pathname === '/different' ? '"different"' : '"baran-native-test"'
  const match = /^bytes=(\d+)-(\d+)$/.exec(req.headers.range || '')
  let start = 0, end = body.length - 1
  if (match && url.pathname !== '/no-range') { start = +match[1]; end = +match[2]; res.writeHead(206, { ETag: etag, 'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': end - start + 1, 'Content-Type': 'application/octet-stream' }) }
  else res.writeHead(200, { ETag: etag, 'Content-Length': body.length, 'Content-Type': 'application/octet-stream' })
  res.end(body.subarray(start, end + 1))
})
await new Promise(done => server.listen(0, '127.0.0.1', done))
const origin = `http://127.0.0.1:${server.address().port}`
let proxied = 0
const proxy = createServer((req, res) => {
  proxied++
  const incoming = new URL(req.url)
  const forward = get(`${origin}${incoming.pathname}${incoming.search}`, { headers: req.headers }, response => { res.writeHead(response.statusCode, response.headers); response.pipe(res) })
  forward.on('error', error => { res.writeHead(502); res.end(error.message) })
})
await new Promise(done => proxy.listen(0, '127.0.0.1', done))
let socksConnections = 0
const socksSockets = new Set()
const socks = createTcpServer(socket => {
  socksSockets.add(socket); socket.on('close', () => socksSockets.delete(socket)); socket.on('error', () => {})
  let buffered = Buffer.alloc(0), stage = 0
  const receive = chunk => {
    buffered = Buffer.concat([buffered, chunk])
    if (stage === 0) { if (buffered.length < 3) return; assert.equal(buffered[0], 5); buffered = buffered.subarray(3); socket.write(Buffer.from([5, 0])); stage = 1 }
    if (stage !== 1 || buffered.length < 5) return
    const hostLength = buffered[3] === 3 ? buffered[4] : buffered[3] === 1 ? 4 : 16
    const prefix = buffered[3] === 3 ? 5 : 4, length = prefix + hostLength + 2
    if (buffered.length < length) return
    assert.equal(buffered[1], 1); socksConnections++; stage = 2
    const remainder = buffered.subarray(length)
    socket.removeListener('data', receive)
    const remote = createConnection({ host: '127.0.0.1', port: server.address().port }, () => {
      socket.write(Buffer.from([5, 0, 0, 1, 127, 0, 0, 1, 0, 0])); if (remainder.length) remote.write(remainder); socket.pipe(remote); remote.pipe(socket)
    })
    remote.on('error', () => socket.destroy()); socket.on('close', () => remote.destroy())
  }
  socket.on('data', receive)
})
await new Promise(done => socks.listen(0, '127.0.0.1', done))
const partialPath = join(downloads, 'legacy.bin')
const partial = Buffer.alloc(payload.length)
payload.copy(partial, 0, 0, 65536); payload.copy(partial, 131072, 131072, 163840)
await writeFile(`${partialPath}.pulse-part`, partial)
const meta = { version: 1, finalUrl: `${origin}/expired`, size: payload.length, etag: '"baran-native-test"', resumable: true, segments: [{ start: 0, end: 131072, position: 65536 }, { start: 131072, end: payload.length, position: 163840 }], downloaded: 98304, savedAt: Date.now() }
await writeFile(`${partialPath}.pulse-meta`, JSON.stringify(meta))
const state = { version: 1, settings: { downloadDir: downloads, launchAtStartup: false, notifyOnComplete: false, maxConcurrent: 2 }, tasks: [{ id: 'legacy', kind: 'http', url: `${origin}/expired`, headers: { 'X-Baran-Test': 'keep' }, name: 'legacy.bin', fileName: 'legacy.bin', filePath: partialPath, dir: downloads, size: payload.length, downloaded: 98304, resumable: true, status: 'paused', createdAt: Date.now(), updatedAt: Date.now(), order: 1 }] }
await writeFile(join(profile, 'pulse-state.json'), JSON.stringify(state))
const fixtureEnvironment = Object.fromEntries(Object.entries(process.env).filter(([key])=>key.toLowerCase()!=='path'))
const child = spawn(resolve('dist/native/Baran Download Manager.exe'), ['--test-driver', '--profile', profile], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...fixtureEnvironment, PATH: `${fixtureDirectory};${process.env.WINDIR}\\System32`, BARAN_NATIVE_TEST_PIPE: nativePipeName } })
let tracker, seeder, occupiedPeerPort
let serial = 0; const pending = new Map(); const tasks = new Map(); const phases = new Map(); const errors = []; const browserPrompts = []
child.stderr.on('data', value => errors.push(value.toString()))
createInterface({ input: child.stdout }).on('line', line => {
  let value; try { value = JSON.parse(line) } catch { errors.push(line); return }
  if (value.event?.task) { tasks.set(value.event.task.id, value.event.task); const seen=phases.get(value.event.task.id)||new Set(); seen.add(value.event.task.status); phases.set(value.event.task.id,seen) }
  if (value.event?.type === 'open-add') browserPrompts.push(value.event.url)
  const request = pending.get(value.id); if (!request) return
  pending.delete(value.id); clearTimeout(request.timeout)
  if (value.error) request.reject(new Error(value.error)); else request.resolve(value.result)
})
const exited = new Promise(done => child.once('exit', code => { for (const request of pending.values()) request.reject(new Error(`Native driver exited ${code}: ${errors.join('\n')}`)); pending.clear(); done(code) }))
function invoke(method, ...args) {
  return new Promise((resolveRequest, reject) => {
    const id = ++serial; const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`Native IPC timeout: ${method}: ${errors.join('\n')}`)) }, 20000)
    pending.set(id, { resolve: resolveRequest, reject, timeout }); child.stdin.write(JSON.stringify({ id, method, args }) + '\n')
  })
}
async function waitTask(id, status = 'completed', timeout = 10000) {
  const end = Date.now() + timeout
  while (Date.now() < end) {
    const snapshot = await invoke('snapshot'); const task = snapshot.tasks.find(row => row.id === id)
    if (task?.status === status) return task
    if (task?.status === 'error' && status !== 'error') throw new Error(task.error)
    await new Promise(done => setTimeout(done, 50))
  }
  throw new Error(`Task ${id} did not become ${status}`)
}
try {
  const snapshot = await invoke('snapshot')
  assert.equal(snapshot.system.runtime.electron, '')
  assert.equal(snapshot.tasks[0].downloaded, 98304)
  assert.equal(await readFile(join(profile, 'pulse-state.before-native.json'), 'utf8'), JSON.stringify(state))
  console.log('PASS native: legacy profile copied before migration; saved partial offsets retained')
  const hostPath = join(profile, 'NativeHostTest.exe')
  const hostBuild = spawnSync(`${process.env.WINDIR}\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe`, ['/nologo', '/target:exe', '/define:TEST', `/out:${hostPath}`, resolve('browser-extension/native-host/NativeHost.cs')], { encoding: 'utf8' })
  assert.equal(hostBuild.status, 0, hostBuild.stdout + hostBuild.stderr)
  async function sendBrowser(message) {
  const host = spawn(hostPath, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, BARAN_NATIVE_TEST_PIPE: nativePipeName } })
  const hostBytes = []; host.stdout.on('data', bytes => hostBytes.push(bytes))
  const hostDone = new Promise(done => host.once('exit', done))
  const nativeMessage = Buffer.from(JSON.stringify(message))
  const nativeHeader = Buffer.alloc(4); nativeHeader.writeUInt32LE(nativeMessage.length); host.stdin.end(Buffer.concat([nativeHeader, nativeMessage]))
  assert.equal(await hostDone, 0)
  const reply = Buffer.concat(hostBytes); assert.equal(reply.readUInt32LE(), reply.length - 4)
  return JSON.parse(reply.subarray(4).toString())
  }
  const ping = await sendBrowser({ action: 'ping' }); assert.equal(ping.ok, true); assert.equal(ping.downloadPrompt, true)
  const verificationUrl = 'https://search.google.com/u/2/search-console/verification-download?resource_id=https%3A%2F%2Fexample.com%2F';
  const beforeVerification = (await invoke('linksList')).length;
  const verificationReply = await sendBrowser({ action: 'import', intent: 'download', urls: [verificationUrl] });
  assert.equal(verificationReply.ok, false);
  assert.match(verificationReply.error, /browser session/);
  assert.equal((await invoke('linksList')).length, beforeVerification, 'session-bound file must not enter Inbox or acknowledge capture');
  assert.equal(ping.version, JSON.parse(await readFile('package.json', 'utf8')).version, 'browser handshake must identify the packaged desktop version')
  assert.deepEqual(await sendBrowser({ action: 'import', urls: ['https://example.com/native-host-test.zip'] }), { ok: true, count: 1 })
  assert.equal(browserPrompts.length, 0, 'collecting links must not open a download prompt')
  assert.ok((await invoke('linksList')).some(link => link.url === 'https://example.com/native-host-test.zip'))
  const captureUrl = 'https://example.com/captured.zip'
  assert.deepEqual(await sendBrowser({ action: 'import', intent: 'download', urls: [captureUrl] }), { ok: true, count: 1, downloadPrompt: true })
  assert.ok(JSON.parse(await readFile(join(profile, 'baran-inbox.json'), 'utf8')).links.some(link => link.url === captureUrl))
  assert.equal(browserPrompts.length, 0, 'a cold-start prompt must wait for renderer readiness')
  await invoke('browserReady'); assert.deepEqual(browserPrompts, [captureUrl])
  await sendBrowser({ action: 'import', intent: 'download', urls: [captureUrl] })
  await invoke('snapshot'); assert.deepEqual(browserPrompts, [captureUrl, captureUrl])
  assert.equal((await sendBrowser({ action: 'import', intent: 'download', urls: [] })).ok, false)
  console.log('PASS native: capture persists before acknowledgement, waits for renderer readiness, and opens New download even for an existing inbox URL')
  console.log('PASS native: compiled browser host forwards a framed request to the native engine and receives a durable inbox acknowledgement')
  await invoke('resumeTask', 'legacy'); await waitTask('legacy', 'error')
  assert.deepEqual(await readFile(`${partialPath}.pulse-part`), partial)
  const saved = await readFile(`${partialPath}.pulse-meta`, 'utf8')
  for (const path of ['different', 'no-range', 'lying']) {
    await assert.rejects(invoke('replaceUrl', 'legacy', `${origin}/${path}`))
    assert.equal(await readFile(`${partialPath}.pulse-meta`, 'utf8'), saved)
  }
  await invoke('replaceUrl', 'legacy', `${origin}/fresh?token=new`)
  const updated = JSON.parse(await readFile(`${partialPath}.pulse-meta`, 'utf8'))
  assert.equal(updated.segments[0].position, 65536); assert.equal(updated.segments[1].position, 163840)
  requests.length = 0; await invoke('resumeTask', 'legacy'); await waitTask('legacy')
  assert.deepEqual(await readFile(partialPath), payload)
  assert.ok(requests.some(req => req.range === 'bytes=65536-131071'))
  assert.ok(requests.some(req => req.range === `bytes=163840-${payload.length - 1}`))
  console.log('PASS native: expired links preserve data; wrong files and missing Range rejected; refreshed multi-segment download completes byte-for-byte')
  const future = await invoke('addDownload', { url: `${origin}/scheduled`, kind: 'http', fileName: 'scheduled.bin', startAt: Date.now() + 1500 })
  const before = requests.length; await new Promise(done => setTimeout(done, 250)); assert.equal(requests.length, before)
  const completed = await waitTask(future.id); assert.deepEqual(await readFile(completed.filePath), payload)
  await invoke('updateSettings', { sidebarAlwaysOpen: true, torrentDownloadLimit: 2048, torrentUploadLimit: 1024 })
  const persisted = JSON.parse(await readFile(join(profile, 'pulse-state.json'), 'utf8')); assert.equal(persisted.settings.sidebarAlwaysOpen, true)
  console.log('PASS native: scheduled jobs do not connect early, complete correctly and persist pinned navigation and independent torrent limits')
  assert.equal(await invoke('linksImport', 'https://example.com/file?sig=a%2Bb#x\nhttps://example.com/file?sig=a%2Bb#y\nfile:///C:/secret'), 1)
  assert.ok(JSON.parse(await readFile(join(profile, 'baran-inbox.json'), 'utf8')).links.some(link => link.url === 'https://example.com/file?sig=a%2Bb'), 'acknowledged imports must already be durable')
  const links = await invoke('linksList'); assert.ok(links.some(link => link.url === 'https://example.com/file?sig=a%2Bb'))
  const scan = await invoke('scanStart', { url: `${origin}/folder/`, depth: 2, maxPages: 10 })
  assert.equal(scan.found, 2); assert.ok(!requests.some(req => req.path.startsWith('/outside/')))
  await invoke('scanStart', { url: `${origin}/folder/redirect/`, depth: 0, maxPages: 3 })
  assert.ok(!requests.some(req => req.path.startsWith('/outside/')))
  console.log('PASS native: inbox URL deduplication preserves signed queries; recursive scan stays within origin/folder and blocks outside redirects')
  const plain = await invoke('addDownload', { url: `${origin}/no-range`, kind: 'http', fileName: 'plain.bin' })
  const plainDone = await waitTask(plain.id); assert.deepEqual(await readFile(plainDone.filePath), payload)
  console.log('PASS native: servers without Range complete via a single stream')
  const verificationProbe = await invoke('probe', `${origin}/opaque-verification-download`);
  assert.equal(verificationProbe.fileName, 'google-fixture.html');
  const verification = await invoke('addDownload', { url: `${origin}/opaque-verification-download`, kind: 'http', fileName: 'opaque-verification-download', dir: downloads });
  const verificationDone = await waitTask(verification.id);
  assert.equal(verificationDone.fileName, 'google-fixture.html');
  assert.equal(await readFile(verificationDone.filePath, 'utf8'), 'google-site-verification: google-fixture.html');
  console.log('PASS verification download: server attachment filename and exact HTML payload are preserved');
  const pageAsFile=await invoke('addDownload',{url:`${origin}/html-disguised.zip`,kind:'http',fileName:'archive.zip'})
  assert.match((await waitTask(pageAsFile.id,'error')).error,/HTML page/)
  const page=await invoke('addDownload',{url:`${origin}/allowed.html`,kind:'http',fileName:'page.html'})
  assert.match(await readFile((await waitTask(page.id)).filePath,'utf8'),/Authorized page fixture/)
  await writeFile(join(downloads,'occupied.bin'),'keep existing file')
  const collision=await invoke('addDownload',{url:`${origin}/collision`,kind:'http',fileName:'occupied.bin',dir:downloads})
  const renamed=await waitTask(collision.id); assert.notEqual(renamed.filePath,join(downloads,'occupied.bin'))
  assert.equal(await readFile(join(downloads,'occupied.bin'),'utf8'),'keep existing file'); assert.deepEqual(await readFile(renamed.filePath),payload)
  const freshName=await invoke('addDownload',{url:`${origin}/fresh-name`,kind:'http',fileName:'unchanged.bin',dir:downloads})
  assert.equal((await waitTask(freshName.id)).fileName,'unchanged.bin')
  console.log('PASS MDM regressions #701/#597/#1143: HTML is not saved as an archive; explicit HTML is allowed; collisions preserve old files and unchanged destinations keep their name')
  const unknown = await invoke('addDownload', { url: `${origin}/unknown`, kind: 'http', fileName: 'unknown.bin' })
  const unknownDone = await waitTask(unknown.id); assert.deepEqual(await readFile(unknownDone.filePath), payload)
  await invoke('updateSettings', { proxyMode: 'manual', proxy: `http://127.0.0.1:${proxy.address().port}` })
  const proxyProbe = await invoke('probe', `http://baran-proxy-test.invalid:${server.address().port}/proxy`)
  assert.equal(proxyProbe.size, payload.length); assert.ok(proxied > 0, 'manual proxy must receive the request')
  await invoke('updateSettings', { proxyMode: 'manual', proxy: `socks5h://127.0.0.1:${socks.address().port}` })
  const socksProbe = await invoke('probe', `http://baran-socks-test.invalid:${server.address().port}/socks`)
  assert.equal(socksProbe.size, payload.length); assert.ok(socksConnections > 0, 'SOCKS5h adapter must tunnel the HTTP request')
  await invoke('updateSettings', { proxyMode: 'direct', proxy: '', globalSpeedLimit: 65536 })
  const paused = await invoke('addDownload', { url: `${origin}/pause`, kind: 'http', fileName: 'pause.bin' })
  const pauseDeadline = Date.now() + 6000
  let pausedTask
  while (Date.now() < pauseDeadline) {
    pausedTask = (await invoke('snapshot')).tasks.find(task => task.id === paused.id)
    if (pausedTask.downloaded > 0) break
    await new Promise(done => setTimeout(done, 50))
  }
  assert.ok(pausedTask.downloaded > 0 && pausedTask.downloaded < payload.length)
  await invoke('pauseTask', paused.id)
  const pauseMeta = JSON.parse(await readFile(`${pausedTask.filePath}.pulse-meta`, 'utf8'))
  assert.ok(pauseMeta.downloaded > 0)
  await invoke('updateSettings', { globalSpeedLimit: 0 })
  await invoke('resumeTask', paused.id)
  const resumed = await waitTask(paused.id); assert.deepEqual(await readFile(resumed.filePath), payload)
  console.log('PASS native: HTTP proxy and SOCKS5h tunnel receive traffic, rate limit delays bytes, pause drains writers and resume preserves exact data')
  const stalled = await invoke('addDownload', { url: `${origin}/stall-body`, kind: 'http', fileName: 'stall.bin', connections: 1 })
  await waitTask(stalled.id, 'downloading'); await new Promise(done => setTimeout(done, 200))
  const pauseStart = Date.now(); await invoke('pauseTask',stalled.id)
  assert.ok(Date.now()-pauseStart < 2000, 'stalled body cancellation must not wait for the socket timeout')
  assert.ok((await stat(`${(await invoke('snapshot')).tasks.find(t=>t.id===stalled.id).filePath}.pulse-part`)).isFile())
  console.log('PASS MDM regression #1328: pause aborts a stalled response promptly and retains partial data')
  await assert.rejects(invoke('addDownload', { url: `${origin}/hash`, kind: 'http', expectedSha256: 'bad' }), /SHA-256/)
  const digest = createHash('sha256').update(payload).digest('hex')
  const verified = await invoke('addDownload', { url: `${origin}/hash-good`, kind: 'http', fileName: 'hash-good.bin', expectedSha256: digest })
  const verifiedDone = await waitTask(verified.id); assert.equal(verifiedDone.checksum,digest)
  const mismatch = await invoke('addDownload', { url: `${origin}/hash-bad`, kind: 'http', fileName: 'hash-bad.bin', expectedSha256: '0'.repeat(64) })
  const failedHash = await waitTask(mismatch.id,'error'); assert.match(failedHash.error,/SHA-256 mismatch/)
  await assert.rejects(stat(failedHash.filePath), { code: 'ENOENT' }); assert.deepEqual(await readFile(`${failedHash.filePath}.pulse-part`),payload)
  await invoke('pauseTask',mismatch.id); await invoke('setTaskChecksum',mismatch.id,digest); await invoke('resumeTask',mismatch.id)
  assert.equal((await waitTask(mismatch.id)).checksum,digest)
  console.log('PASS native integrity: valid digest completes, mismatch preserves unpublished partial data, corrected expected digest reuses verified bytes')
  const limited = await invoke('addDownload', { url: `${origin}/per-file-limit`, kind: 'http', fileName:'limited.bin', connections:1, speedLimit:32768 })
  const fastStart=Date.now(); const fast = await invoke('addDownload',{url:`${origin}/uncapped`,kind:'http',fileName:'uncapped.bin',connections:1})
  await waitTask(fast.id); assert.ok(Date.now()-fastStart < 3000,'one limited task must not block an unlimited task')
  assert.notEqual((await invoke('snapshot')).tasks.find(t=>t.id===limited.id).status,'completed')
  await assert.rejects(invoke('setTaskSpeedLimit',limited.id,-1))
  const wakeLimit=Date.now(); await invoke('setTaskSpeedLimit',limited.id,0); await invoke('setTaskCloseOnComplete',limited.id,true)
  const unlimited=await waitTask(limited.id); assert.deepEqual(await readFile(unlimited.filePath),payload); assert.equal(unlimited.closeProgressOnComplete,true)
  assert.ok(Date.now()-wakeLimit < 2000,'removing a limit wakes the active transfer without pause/resume')
  const rateWait=await invoke('addDownload',{url:`${origin}/rate-wait`,kind:'http',fileName:'rate-wait.bin',connections:1,speedLimit:1024})
  await waitTask(rateWait.id,'downloading'); const limitPause=Date.now(); await invoke('pauseTask',rateWait.id)
  assert.ok(Date.now()-limitPause < 2000,'rate waiting must remain cancelable')
  await invoke('updateSettings',{showProgressWindow:false})
  assert.equal(JSON.parse(await readFile(join(profile,'pulse-state.json'),'utf8')).settings.showProgressWindow,false)
  console.log('PASS MDM regression #621: per-file cap is independent, removing it wakes the live transfer, rate waits cancel promptly, and window preferences persist')
  const multi=await invoke('addDownload',{url:`${origin}/multi-limit`,kind:'http',fileName:'multi-limit.bin',connections:8,speedLimit:65536})
  await waitTask(multi.id,'downloading'); await new Promise(done=>setTimeout(done,200)); await invoke('pauseTask',multi.id)
  await invoke('resumeTask',multi.id)
  const resumeDeadline=Date.now()+3000; let resumedBytes=0
  while(Date.now()<resumeDeadline) { resumedBytes=(await invoke('snapshot')).tasks.find(t=>t.id===multi.id).downloaded; if(resumedBytes>0)break; await new Promise(done=>setTimeout(done,50)) }
  assert.ok(resumedBytes>0,'a resumed segmented task must discard throttle reservations from its canceled run')
  await invoke('setTaskSpeedLimit',multi.id,0); const multiDone=await waitTask(multi.id)
  assert.deepEqual(await readFile(multiDone.filePath),multiPayload)
  console.log('PASS native: segmented resume discards canceled throttle debt and completes with exact bytes')
  await invoke('updateSettings',{globalSpeedLimit:65536})
  const globalMulti=await invoke('addDownload',{url:`${origin}/multi-limit`,kind:'http',fileName:'global-multi.bin',connections:8})
  await waitTask(globalMulti.id,'downloading'); await new Promise(done=>setTimeout(done,200)); await invoke('pauseTask',globalMulti.id); await invoke('resumeTask',globalMulti.id)
  const globalDeadline=Date.now()+3000; let globalBytes=0
  while(Date.now()<globalDeadline) { globalBytes=(await invoke('snapshot')).tasks.find(t=>t.id===globalMulti.id).downloaded; if(globalBytes>0)break; await new Promise(done=>setTimeout(done,50)) }
  assert.ok(globalBytes>0,'global cap must not retain canceled segment reservations either')
  await invoke('updateSettings',{globalSpeedLimit:0}); assert.deepEqual(await readFile((await waitTask(globalMulti.id)).filePath),multiPayload)
  console.log('PASS native: global throttling also resumes without canceled-worker debt')
  const video = await invoke('probeYoutube', 'https://www.youtube.com/watch?v=local-native-fixture')
  assert.equal(video.title, 'Native media fixture'); assert.ok(video.formats.some(format => format.id === '22'))
  for (const name of ['baran-sign-in-test', 'baran-private-test', 'baran-age-test']) {
    await assert.rejects(invoke('probeYoutube', `https://www.youtube.com/watch?v=${name}`), /Settings . Tools/)
  }
  const mediaTask = await invoke('addDownload', { kind: 'youtube', url: 'https://www.youtube.com/watch?v=local-native-fixture', fileName: 'media-fixture.mp4', youtube: { selector: '22' } })
  const mediaDone = await waitTask(mediaTask.id)
  assert.ok(phases.get(mediaTask.id).has('verifying'), 'postprocessing reported on stderr must reach the progress window')
  assert.equal(await readFile(mediaDone.filePath, 'utf8'), 'Baran native media fixture')
  assert.equal(mediaDone.size, (await stat(mediaDone.filePath)).size, 'final file size must override inaccurate CLI progress')
  const needsFfmpeg=await invoke('addDownload',{kind:'youtube',url:'https://www.youtube.com/watch?v=local-native-fixture',fileName:'separate-tracks.mp4',youtube:{selector:'137+bestaudio/best'}})
  assert.match((await waitTask(needsFfmpeg.id,'error')).error,/FFmpeg is required/)
  assert.equal(await invoke('instagramCollect', 'https://www.instagram.com/p/native-fixture/'), 2)
  const instagram = (await invoke('linksList')).filter(link => link.source.includes('instagram.com'))
  assert.equal(instagram.length, 2); assert.ok(instagram.some(link => link.fileName.endsWith('.mp4')))
  assert.ok(!instagram.some(link => link.url.includes('malicious.invalid')))
  console.log('PASS native: media CLI boundaries handle video metadata, completed output files and Instagram photo/video filtering (fixture tools, no live account)')
  tracker = new TrackerServer({ http: true, udp: false, ws: false })
  tracker.on('warning', error => errors.push(`tracker: ${error.message}`))
  await new Promise(done => tracker.listen(0, '127.0.0.1', done))
  const announce = `http://127.0.0.1:${tracker.http.address().port}/announce`
  seeder = new WebTorrent({ dht: false, lsd: false, utp: false, tracker: { udp: false, ws: false } })
  seeder.on('error', error => errors.push(`seeder: ${error.message}`))
  const torrent = await new Promise((done, reject) => {
    seeder.once('error', reject)
    seeder.seed(Buffer.from(payload), { name: 'private-test.bin', private: true, announce: [announce] }, done)
  })
  occupiedPeerPort = createTcpServer(socket => socket.destroy())
  await new Promise(done => occupiedPeerPort.listen(0, '0.0.0.0', done))
  await invoke('updateSettings', { torrentPort: occupiedPeerPort.address().port, torrentDownloadLimit: 0, torrentUploadLimit: 0, seedAfterComplete: false })
  const torrentTask = await invoke('addTorrent', { data: Buffer.from(torrent.torrentFile).toString('base64'), name: 'private-test', dir: downloads })
  const torrentDone = await waitTask(torrentTask.id, 'completed', 30000)
  assert.deepEqual(await readFile(torrentDone.filePath), payload)
  assert.ok(torrentDone.torrent.files.length > 0)
  console.log('PASS native: with the configured peer port occupied, bundled aria2 downloads a private torrent with exact final file contents')
  const remoteSeed = await new Promise(done => seeder.seed(Buffer.from(payload), { name: 'remote-test.bin', private: true, announce: [announce] }, done))
  remoteTorrentMetadata = Buffer.from(remoteSeed.torrentFile)
  await invoke('updateSettings', { proxyMode: 'manual', proxy: `http://127.0.0.1:${proxy.address().port}` })
  const remoteTorrent = await invoke('addTorrent', { uri: `http://baran-torrent-test.invalid:${server.address().port}/metadata.torrent`, name: 'remote metadata', dir: downloads, startAt: Date.now() + 1200 })
  const proxyBefore = proxied
  await new Promise(done => setTimeout(done, 250)); assert.equal(proxied, proxyBefore, 'future torrent must not fetch metadata early')
  const remoteDone = await waitTask(remoteTorrent.id, 'completed', 30000)
  assert.deepEqual(await readFile(remoteDone.filePath), payload)
  assert.ok(proxied > proxyBefore, 'HTTP torrent metadata must use the selected web proxy')
  console.log('PASS native: scheduled HTTP torrent metadata respects time and web proxy before the local torrent engine starts')
} finally {
  child.stdin.end(); const code = await Promise.race([exited, new Promise(done => setTimeout(() => { child.kill(); done(-1) }, 10000).unref())])
  server.closeAllConnections(); await new Promise(done => server.close(done))
  proxy.closeAllConnections(); await new Promise(done => proxy.close(done))
  for (const socket of socksSockets) socket.destroy(); await new Promise(done => socks.close(done))
  if (seeder) await new Promise(done => seeder.destroy(done))
  if (tracker) await new Promise(done => tracker.close(done))
  if (occupiedPeerPort) await new Promise(done => occupiedPeerPort.close(done))
  assert.equal(code, 0, errors.join('\n'))
}
const restart = spawnSync(resolve('dist/native/Baran Download Manager.exe'), ['--test-driver', '--profile', profile], {
  input: JSON.stringify({ id: 'restored', method: 'linksList', args: [] }) + '\n', encoding: 'utf8', timeout: 10000
})
assert.equal(restart.status, 0, restart.stderr)
const restoredInbox = restart.stdout.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)).find(message => message.id === 'restored').result
assert.ok(restoredInbox.some(link => link.url === 'https://example.com/file?sig=a%2Bb'))
assert.ok(restoredInbox.some(link => link.fileName === 'instagram_fixture_2.mp4'))
console.log('PASS native: acknowledged inbox links and extracted Instagram filenames survive a full process restart')
