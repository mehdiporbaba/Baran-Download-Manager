const { mkdirSync, copyFileSync } = require('node:fs')
const { join } = require('node:path')
const { execFileSync } = require('node:child_process')

module.exports = async function (context) {
  if (context.electronPlatformName !== 'win32') return
  const root = context.packager.projectDir
  const target = join(root, '.tools', 'build', 'native-host')
  mkdirSync(target, { recursive: true })
  const source = join(root, 'browser-extension', 'native-host')
  execFileSync(join(process.env.WINDIR, 'Microsoft.NET', 'Framework64', 'v4.0.30319', 'csc.exe'),
    ['/nologo', '/target:exe', `/out:${join(target, 'BaranNativeHost.exe')}`, join(source, 'NativeHost.cs')], { windowsHide: true })
  copyFileSync(join(source, 'register.ps1'), join(target, 'register.ps1'))
}
