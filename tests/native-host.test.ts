import assert from 'node:assert/strict'
import { spawn, spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { test } from 'node:test'
import { startBrowserBridge } from '../src/main/browser-bridge'
import { LinkGrabber } from '../src/main/link-grabber'

test('compiled Windows native host stages a framed browser request and returns an acknowledgement', { skip: process.platform !== 'win32', timeout: 15000 }, async () => {
  mkdirSync('.tools', { recursive: true })
  const exe = resolve('.tools/BaranNativeHost-test.exe')
  const compiler = `${process.env.WINDIR}\\Microsoft.NET\\Framework64\\v4.0.30319\\csc.exe`
  const compiled = spawnSync(compiler, ['/nologo', '/target:exe', '/define:TEST', `/out:${exe}`, resolve('browser-extension/native-host/NativeHost.cs')], { encoding: 'utf8' })
  assert.equal(compiled.status, 0, compiled.stdout + compiled.stderr)
  const inbox = new LinkGrabber(() => undefined)
  const pipeName = `baran-native-test-${process.pid}`
  const server = await startBrowserBridge(inbox, () => undefined, pipeName)
  try {
    const child = spawn(exe, [], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, BARAN_NATIVE_TEST_PIPE: pipeName } })
    const body = Buffer.from(JSON.stringify({ action: 'import', urls: ['https://example.com/test.zip'] }))
    const header = Buffer.alloc(4)
    header.writeUInt32LE(body.length)
    const parts: Buffer[] = []
    child.stdout.on('data', chunk => parts.push(chunk))
    const exited = new Promise<number | null>((resolveExit, reject) => { child.once('error', reject); child.once('exit', resolveExit) })
    child.stdin.end(Buffer.concat([header, body]))
    assert.equal(await exited, 0)
    const response = Buffer.concat(parts)
    assert.equal(response.readUInt32LE(), response.length - 4)
    assert.deepEqual(JSON.parse(response.subarray(4).toString()), { ok: true, count: 1 })
    assert.equal(inbox.list()[0].url, 'https://example.com/test.zip')
    assert.equal(inbox.list()[0].status, 'new')
  } finally { await new Promise<void>(done => server!.close(() => done())) }
})
