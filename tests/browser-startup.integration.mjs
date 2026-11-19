import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve, join } from 'node:path'
const root = resolve('.tools/browser-startup', `${Date.now()}-${process.pid}`)
mkdirSync(root, { recursive: true })
const exe = join(root, 'StartupFixture.exe')
const build = spawnSync(`${process.env.WINDIR}/Microsoft.NET/Framework64/v4.0.30319/csc.exe`, ['/nologo', '/main:BrowserStartupFixture', `/out:${exe}`, resolve('tests/BrowserStartupFixture.cs'), resolve('browser-extension/native-host/NativeHost.cs')], { encoding: 'utf8' })
assert.equal(build.status, 0, build.stdout + build.stderr)
const run = spawnSync(exe, ['test', root], { encoding: 'utf8', windowsHide: true, timeout: 20000 })
assert.equal(run.status, 0, run.stdout + run.stderr)
console.log(run.stdout.trim())
