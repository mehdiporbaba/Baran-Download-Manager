const { spawn } = require('node:child_process')
const { existsSync } = require('node:fs')
const { resolve } = require('node:path')
if (process.platform !== 'win32') {
  process.stderr.write('The native build currently targets Windows x64. Use the explicit legacy Electron commands for other source targets.\n')
  process.exit(1)
}
const executable = resolve('dist/native/Baran Download Manager.exe')
if (!existsSync(executable)) { process.stderr.write('Run npm run build:native first.\n'); process.exit(1) }
const child = spawn(executable, [], { detached: true, stdio: 'ignore' })
child.once('error', error => { process.stderr.write(error.message + '\n'); process.exitCode = 1 })
child.unref()
