import { BrowserWindow, app, dialog, ipcMain, shell } from 'electron'
import { statfs } from 'node:fs/promises'
import type { AddDownloadInput, AddTorrentInput, AppSnapshot, Settings } from '@shared/types'
import { IP } from '@shared/ipc'
import type { DownloadManager } from './manager'
import { isAutoStartSupported } from './autostart'
import { getGithubRepo, searchGithubRepos } from './github'

export function registerIpc(manager: DownloadManager, getWindow: () => BrowserWindow | null): void {
  const handle = (channel: string, fn: (...args: any[]) => any): void => {
    ipcMain.handle(channel, async (_event, ...args) => {
      try {
        return await fn(...args)
      } catch (err) {
        const message = (err as Error)?.message || String(err)
        manager.toast('error', message)
        throw new Error(message)
      }
    })
  }

  handle(IP.snapshot, async (): Promise<AppSnapshot> => {
    const settings = manager.settings()
    let freeDisk = 0
    try {
      const info = await statfs(settings.downloadDir)
      freeDisk = info.bavail * info.bsize
    } catch {
      freeDisk = 0
    }
    return {
      tasks: manager.list(),
      settings,
      stats: manager.stats(),
      system: {
        platform: process.platform,
        version: process.getSystemVersion?.() || '',
        appVersion: app.getVersion(),
        freeDisk,
        downloadDir: settings.downloadDir,
        defaultDir: settings.downloadDir,
        runtime: {
          electron: process.versions.electron || '',
          chrome: process.versions.chrome || '',
          node: process.versions.node || ''
        },
        maximized: getWindow()?.isMaximized() ?? false,
        autoStartSupported: isAutoStartSupported()
      }
    }
  })

  handle(IP.probe, (url: string, headers?: Record<string, string>) => manager.probe(url, headers))
  handle(IP.scheduleTask, (id: string, startAt?: number) => manager.scheduleTask(id, startAt))

  handle(IP.probeYoutube, (url: string) => manager.youtube.probe(url))

  handle(IP.addDownload, (input: AddDownloadInput) => manager.addDownload(input))

  handle(IP.addTorrent, (input: AddTorrentInput) => manager.addTorrent(input))

  handle(IP.pause, (id: string) => manager.pause(id))

  handle(IP.resume, (id: string) => manager.resume(id))

  handle(IP.cancel, (id: string) => manager.cancel(id))

  handle(IP.remove, (id: string, deleteFile: boolean) => manager.remove(id, deleteFile))

  handle(IP.retry, (id: string) => manager.retry(id))

  handle(IP.reveal, (id: string) => manager.reveal(id))

  handle(IP.open, (id: string) => manager.open(id))

  handle(IP.clearCompleted, () => manager.clearCompleted())

  handle(IP.updateSettings, (patch: Partial<Settings>) => manager.updateSettings(patch))

  handle(IP.setSpeedLimit, (bytes: number) => manager.setSpeedLimit(bytes))

  handle(IP.installYtDlp, () => manager.installYtdlp())

  handle(IP.rescanTools, () => manager.rescanTools())

  handle(IP.githubSearch, (query: string, page?: number) =>
    searchGithubRepos(manager.settings().githubToken, query, page)
  )

  handle(IP.githubRepo, (fullName: string) =>
    getGithubRepo(manager.settings().githubToken, fullName)
  )

  handle(IP.readClipboard, () => manager.readClipboardUrl())

  handle(IP.chooseDir, async (current?: string) => {
    const win = getWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Choose download folder',
      defaultPath: current || manager.settings().downloadDir,
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0] || null
  })

  handle(IP.chooseTorrent, async () => {
    const win = getWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Open torrent file',
      properties: ['openFile'],
      filters: [
        { name: 'Torrent files', extensions: ['torrent'] },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePaths[0] || null
  })

  handle(IP.chooseCookies, async () => {
    const win = getWindow()
    const result = await dialog.showOpenDialog(win!, {
      title: 'Select a cookies.txt file',
      properties: ['openFile'],
      filters: [
        { name: 'Cookies file', extensions: ['txt'] },
        { name: 'All files', extensions: ['*'] }
      ]
    })
    return result.canceled ? null : result.filePaths[0] || null
  })

  handle(IP.revealDir, (dir: string) => manager.revealDir(dir))

  handle(IP.openExternal, async (url: string) => {
    if (!/^(https?:|mailto:)/i.test(url)) throw new Error('Blocked external URL')
    await shell.openExternal(url)
  })

  handle(IP.windowControl, (action: 'minimize' | 'maximize' | 'close') => {
    const win = getWindow()
    if (!win) return
    if (action === 'minimize') win.minimize()
    else if (action === 'maximize') {
      if (win.isMaximized()) win.unmaximize()
      else win.maximize()
    } else win.close()
  })
}
