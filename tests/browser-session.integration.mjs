import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { resolve } from 'node:path'
mkdirSync('.tools/browser-session', { recursive: true })
const exe = resolve('.tools/browser-session/SessionFixture.exe')
const build = spawnSync(`${process.env.WINDIR}/Microsoft.NET/Framework64/v4.0.30319/csc.exe`, ['/nologo', `/out:${exe}`, resolve('tests/BrowserSessionFixture.cs'), resolve('native/BrowserSessionPolicy.cs')], { encoding: 'utf8' })
assert.equal(build.status, 0, build.stdout + build.stderr)
const run = spawnSync(exe, [], { encoding: 'utf8', timeout: 10000, windowsHide: true })
assert.equal(run.status, 0, run.stdout + run.stderr)
console.log(run.stdout.trim())
