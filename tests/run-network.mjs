import { createRequire } from 'node:module'
import { mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { spawn } from 'node:child_process'
const require = createRequire(import.meta.url)
const ts = require('typescript')
function compile(directory) {
  for (const entry of readdirSync(`src/${directory}`, { withFileTypes: true })) {
    if (entry.isDirectory()) { compile(`${directory}/${entry.name}`); continue }
    if (!entry.name.endsWith('.ts') || entry.name.endsWith('.d.ts') || entry.name === 'index.ts') continue
    const file = `${directory}/${entry.name}`
    const target = resolve('.tools/network-test', file.replace(/\.ts$/, '.js'))
    mkdirSync(dirname(target), { recursive: true })
    writeFileSync(target, ts.transpileModule(readFileSync(`src/${file}`, 'utf8'), { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS } }).outputText)
  }
}
compile('main'); compile('shared')
const child = spawn(require('electron'), [resolve('tests/runtime-network.cjs')], { windowsHide: true, stdio: 'inherit', env: { ...process.env, BARAN_NETWORK_TEST_ROOT: resolve('.tools/network-test') } })
child.once('error', error => { console.error(error); process.exitCode = 1 })
child.once('exit', code => { process.exitCode = code ?? 1 })
