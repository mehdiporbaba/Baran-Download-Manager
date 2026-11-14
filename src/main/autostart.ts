import { app } from 'electron'
import { promises as fs } from 'node:fs'
import { join } from 'node:path'

const AUTOSTART_NAME = 'Baran Download Manager'

/**
 * Auto-start is supported on Windows and Linux for installed builds. Portable
 * Windows builds run from a temporary folder, so registering them would create
 * a broken startup entry.
 */
export function isAutoStartSupported(): boolean {
  if (process.platform === 'win32') return !process.env.PORTABLE_EXECUTABLE_DIR
  return process.platform === 'linux'
}

/**
 * Create or remove the OS login item that launches Baran after sign-in.
 * On Windows this uses the per-user Run registry key; on Linux it writes a
 * freedesktop autostart entry.
 */
export async function applyLaunchAtStartup(enabled: boolean): Promise<void> {
  if (!app.isPackaged || !isAutoStartSupported()) return
  try {
    if (process.platform === 'win32') {
      app.setLoginItemSettings({
        openAtLogin: enabled,
        name: AUTOSTART_NAME,
        path: process.execPath,
        args: []
      })
      return
    }

    const configHome = process.env.XDG_CONFIG_HOME || join(app.getPath('home'), '.config')
    const dir = join(configHome, 'autostart')
    const file = join(dir, 'baran-download-manager.desktop')

    if (!enabled) {
      await fs.rm(file, { force: true })
      return
    }

    const target = process.env.APPIMAGE || process.execPath
    const exec = `"${target.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`
    const desktop = [
      '[Desktop Entry]',
      'Type=Application',
      'Version=1.0',
      'Name=Baran Download Manager',
      'Comment=Baran Download Manager',
      `Exec=${exec}`,
      'Terminal=false',
      'X-GNOME-Autostart-enabled=true',
      'Categories=Network;FileTransfer;',
      ''
    ].join('\n')

    await fs.mkdir(dir, { recursive: true })
    await fs.writeFile(file, desktop, 'utf8')
  } catch (err) {
    console.error('[autostart] could not update the login item', err)
  }
}
