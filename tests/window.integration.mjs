import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, copyFile } from 'node:fs/promises'
import { resolve, join } from 'node:path'
import vm from 'node:vm'
const root = resolve('.tools/window-integration', `${Date.now()}-${process.pid}`)
await mkdir(root, { recursive: true })
const binary = resolve('dist/native/Baran Download Manager.exe'), fixture = join(root, 'WindowFixture.exe')
const build = spawnSync(`${process.env.WINDIR}/Microsoft.NET/Framework64/v4.0.30319/csc.exe`, ['/nologo','/r:System.Drawing.dll',`/r:${binary}`,`/out:${fixture}`,resolve('tests/WindowFixture.cs')], { encoding: 'utf8' })
assert.equal(build.status, 0, build.stdout + build.stderr)
await copyFile(binary, join(root, 'Baran Download Manager.exe'))
const result = spawnSync(fixture, [join(root,'profile')], { encoding: 'utf8', timeout: 15000, windowsHide: true })
assert.equal(result.status, 0, result.stderr)
for (const line of result.stdout.trim().split(/\r?\n/)) {
  if (!line.startsWith('{')) { console.log(line); continue }
  const value = JSON.parse(line)
  for (const delayed of [false,true]) {
    const element = { dataset: {}, style: {}, lang:'', dir:'' }
    const document = { documentElement: delayed ? null : element }
    let callback, disconnected = false
    class MutationObserver { constructor(fn) { callback=fn } observe() {} disconnect() { disconnected=true } }
    vm.runInNewContext(value.script, { document, MutationObserver })
    if (delayed) { document.documentElement=element; callback(); assert.equal(disconnected,true) }
    assert.equal(element.dataset.theme,value.theme)
    assert.equal(element.dir,'rtl'); assert.equal(element.lang,'fa')
    assert.equal(element.style.backgroundColor.toLowerCase(),value.background.toLowerCase())
  }
}
console.log('PASS window startup: light/dark theme applied before app CSS with immediate or delayed document root')
