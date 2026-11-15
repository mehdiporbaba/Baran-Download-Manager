import assert from 'node:assert/strict'
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
for (let i = 0; i < payload.length; i++) payload[i] = (i * 31 + i % 251) % 256
const requests = []
let remoteTorrentMetadata
const server = createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost'); requests.push({ path: url.pathname, range: req.headers.range, ifRange: req.headers['if-range'] })
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
  const body = url.pathname === '/lying' ? Buffer.alloc(payload.length, 1) : payload
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
const child = spawn(resolve('dist/native/Baran Download Manager.exe'), ['--test-driver', '--profile', profile], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, BARAN_NATIVE_TEST_PIPE: nativePipeName } })
let tracker, seeder
let serial = 0; const pending = new Map(); const tasks = new Map(); const errors = []
child.stderr.on('data', value => errors.push(value.toString()))
createInterface({ input: child.stdout }).on('line', line => {
  let value; try { value = JSON.parse(line) } catch { errors.push(line); return }
  if (value.event?.task) tasks.set(value.event.task.id, value.event.task)
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
  const host = spawn(hostPath, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, BARAN_NATIVE_TEST_PIPE: nativePipeName } })
  const hostBytes = []; host.stdout.on('data', bytes => hostBytes.push(bytes))
  const hostDone = new Promise(done => host.once('exit', done))
  const nativeMessage = Buffer.from(JSON.stringify({ action: 'import', urls: ['https://example.com/native-host-test.zip'] }))
  const nativeHeader = Buffer.alloc(4); nativeHeader.writeUInt32LE(nativeMessage.length); host.stdin.end(Buffer.concat([nativeHeader, nativeMessage]))
  assert.equal(await hostDone, 0)
  const reply = Buffer.concat(hostBytes); assert.equal(reply.readUInt32LE(), reply.length - 4)
  assert.deepEqual(JSON.parse(reply.subarray(4).toString()), { ok: true, count: 1 })
  assert.ok((await invoke('linksList')).some(link => link.url === 'https://example.com/native-host-test.zip'))
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
  const video = await invoke('probeYoutube', 'https://www.youtube.com/watch?v=local-native-fixture')
  assert.equal(video.title, 'Native media fixture'); assert.ok(video.formats.some(format => format.id === '22'))
  const mediaTask = await invoke('addDownload', { kind: 'youtube', url: 'https://www.youtube.com/watch?v=local-native-fixture', fileName: 'media-fixture.mp4', youtube: { selector: '22' } })
  const mediaDone = await waitTask(mediaTask.id)
  assert.equal(await readFile(mediaDone.filePath, 'utf8'), 'Baran native media fixture')
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
  await invoke('updateSettings', { torrentDownloadLimit: 0, torrentUploadLimit: 0, seedAfterComplete: false })
  const torrentTask = await invoke('addTorrent', { data: Buffer.from(torrent.torrentFile).toString('base64'), name: 'private-test', dir: downloads })
  const torrentDone = await waitTask(torrentTask.id, 'completed', 30000)
  assert.deepEqual(await readFile(torrentDone.filePath), payload)
  assert.ok(torrentDone.torrent.files.length > 0)
  console.log('PASS native: bundled aria2 downloads a private torrent from a local tracker and seeder with exact final file contents')
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
