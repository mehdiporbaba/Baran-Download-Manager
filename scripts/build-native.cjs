const { spawn, execFileSync } = require('node:child_process')
if (process.platform !== 'win32') {
  process.stderr.write('The native build targets Windows x64.\n')
  process.exit(1)
}
let shell = 'powershell.exe'
try { shell = execFileSync('where.exe', ['pwsh.exe'], { encoding: 'utf8', windowsHide: true }).trim().split(/\r?\n/)[0] || shell } catch {}
// A PowerShell 7 parent exports a module path that can break module discovery
// in Windows PowerShell 5. Let the selected shell initialize its own paths.
const env = { ...process.env }
for (const key of Object.keys(env)) if (key.toLowerCase() === 'psmodulepath') delete env[key]
const child = spawn(shell, ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', 'native/build.ps1', ...process.argv.slice(2)], { stdio: 'inherit', windowsHide: true, env })
child.once('error', error => { process.stderr.write(error.message + '\n'); process.exitCode = 1 })
child.once('exit', code => { process.exitCode = code ?? 1 })
