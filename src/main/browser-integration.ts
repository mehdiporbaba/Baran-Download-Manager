import { app } from 'electron'
import { copyFile, mkdir } from 'node:fs/promises'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { join } from 'node:path'

const execute = promisify(execFile)

export async function registerBrowserHost(browser: string, extensionId?: string): Promise<void> {
  if (process.platform !== 'win32') throw new Error('Browser integration currently requires Windows')
  if (!['chrome', 'edge', 'firefox'].includes(browser)) throw new Error('Unsupported browser')
  if (browser !== 'firefox' && !/^[a-p]{32}$/.test(extensionId || '')) throw new Error('Enter the extension ID shown by Chrome or Edge')
  const source = app.isPackaged
    ? join(process.resourcesPath, 'native-host')
    : join(app.getAppPath(), 'browser-extension', 'native-host')
  const destination = join(app.getPath('userData'), 'native-host')
  await mkdir(destination, { recursive: true })
  await copyFile(join(source, 'register.ps1'), join(destination, 'register.ps1'))
  if (app.isPackaged) await copyFile(join(source, 'BaranNativeHost.exe'), join(destination, 'BaranNativeHost.exe'))
  else await copyFile(join(source, 'NativeHost.cs'), join(destination, 'NativeHost.cs'))
  const shell = join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'WindowsPowerShell', 'v1.0', 'powershell.exe')
  await execute(shell, ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', join(destination, 'register.ps1'),
    '-Browser', browser, '-ExtensionId', browser === 'firefox' ? 'baran-download-manager@mehdiporbaba' : extensionId!],
  { windowsHide: true, timeout: 20000 })
}
