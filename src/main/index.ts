import { app, BrowserWindow, Menu, clipboard, nativeTheme, shell, Tray, nativeImage, screen } from 'electron'
import { join } from 'node:path'
import { app as electronApp } from 'electron'
import { Store } from './store'
import { DownloadManager } from './manager'
import { registerIpc } from './ipc'
import { applyLaunchAtStartup } from './autostart'
import { IP } from '@shared/ipc'
import { LinkGrabber } from './link-grabber'
import { registerLinkIpc } from './link-ipc'
import { startBrowserBridge } from './browser-bridge'
import { setNetworkSettingsProvider } from './network'
import { initialWindow } from '../shared/window-size'
import type { MainEvent } from '@shared/types'

let mainWindow: BrowserWindow | null = null
let manager: DownloadManager
let store: Store
let clipboardTimer: NodeJS.Timeout | null = null
let lastClipboard = ''
let tray: Tray | null = null
let stopLinkServices: (() => void) | undefined
let browserBridge: Awaited<ReturnType<typeof startBrowserBridge>>

const gotLock = electronApp.requestSingleInstanceLock()
if (!gotLock) {
  electronApp.quit()
}
function send(event: MainEvent): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IP.event, event)
  }
}

function createWindow(): void {
  mainWindow = new BrowserWindow({
    ...initialWindow(screen.getDisplayNearestPoint(screen.getCursorScreenPoint()).workArea),
    show: false,
    frame: false,
    backgroundColor: store.settings.theme === 'dark' ? '#0a0c12' : '#f4f6fb',
    title: 'Baran Download Manager',
    icon: electronApp.isPackaged
      ? join(process.resourcesPath, process.platform === 'win32' ? 'icon.ico' : 'icon.png')
      : join(__dirname, '../../resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png'),
    autoHideMenuBar: true,
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
      webSecurity: true,
      backgroundThrottling: false
    }
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
  })
  mainWindow.webContents.once('did-finish-load', () => mainWindow?.show())

  mainWindow.on('maximize', () => send({ type: 'window:state', maximized: true }))
  mainWindow.on('unmaximize', () => send({ type: 'window:state', maximized: false }))
  mainWindow.on('minimize', () => { if (store.settings.minimizeToTray) mainWindow?.hide() })

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) void shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env['ELECTRON_RENDERER_URL']
    if (devUrl && url.startsWith(devUrl)) return
    if (url.startsWith('file://')) return
    event.preventDefault()
    if (/^https?:/i.test(url)) void shell.openExternal(url)
  })

  // Keep useful keyboard shortcuts even though the native menu is hidden.
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const ctrl = input.control || input.meta
    if (input.key === 'F12' || (ctrl && input.shift && input.key.toLowerCase() === 'i')) {
      mainWindow?.webContents.toggleDevTools()
      event.preventDefault()
    }
    if (ctrl && input.key.toLowerCase() === 'r' && input.shift) {
      mainWindow?.webContents.reload()
      event.preventDefault()
    }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void mainWindow.loadURL(devUrl)
  } else {
    void mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.on('close', (event) => {
    if (!quitting && store.settings.minimizeToTray) {
      event.preventDefault()
      mainWindow?.hide()
    }
    if (!store.settings.minimizeToTray && !quitting) electronApp.quit()
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

function startClipboardWatcher(): void {
  if (clipboardTimer) clearInterval(clipboardTimer)
  clipboardTimer = setInterval(async () => {
    if (!manager.settings().clipboardWatch) return
    const text = (await clipboard.readText()).trim()
    if (!text || text === lastClipboard) return
    lastClipboard = text
    if (!/^(https?:\/\/|magnet:)/i.test(text) || text.length > 4096) return
    if (/^https?:\/\/(localhost|127\.0\.0\.1)/i.test(text)) return
    send({ type: 'clipboard:url', url: text })
  }, 1600)
}

function createTray(): void {
  const iconPath = electronApp.isPackaged
    ? join(process.resourcesPath, process.platform === 'win32' ? 'icon.ico' : 'icon.png')
    : join(__dirname, '../../resources', process.platform === 'win32' ? 'icon.ico' : 'icon.png')
  const image = nativeImage.createFromPath(iconPath)
  tray = new Tray(image.resize({ width: 24, height: 24 }))

  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show Baran Download Manager',
      click: () => {
        if (mainWindow) {
          if (mainWindow.isMinimized()) mainWindow.restore()
          mainWindow.show()
          mainWindow.focus()
        }
      }
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        quitting = true
        electronApp.quit()
      }
    }
  ])

  tray.setToolTip('Baran Download Manager')
  tray.setContextMenu(contextMenu)
  tray.on('click', () => {
    if (mainWindow?.isVisible()) {
      mainWindow.hide()
    } else {
      if (mainWindow?.isMinimized()) mainWindow.restore()
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
}

async function bootstrap(): Promise<void> {
  await electronApp.whenReady()
  electronApp.setAppUserModelId('io.github.mehdiporbaba.baran')
  electronApp.setName('Baran Download Manager')
  electronApp.setPath('userData', join(electronApp.getPath('appData'), 'Baran'))
  Menu.setApplicationMenu(null)

  store = new Store()
  await store.load()
  setNetworkSettingsProvider(() => store.settings)
  nativeTheme.themeSource = store.settings.theme
  void applyLaunchAtStartup(store.settings.launchAtStartup)

  manager = new DownloadManager({ store, emit: send })
  await manager.init()

  registerIpc(manager, () => mainWindow)
  let inboxTimer: NodeJS.Timeout | undefined
  const inbox = new LinkGrabber(() => {
    if (inboxTimer) return
    inboxTimer = setTimeout(() => { inboxTimer = undefined; send({ type: 'links:changed' }) }, 80)
  })
  stopLinkServices = registerLinkIpc(manager, inbox)
  createWindow()
  try {
    browserBridge = await startBrowserBridge(inbox, () => {
      mainWindow?.show()
      mainWindow?.focus()
      send({ type: 'navigate', view: 'links' })
    })
  } catch (error) { manager.toast('error', `Browser integration unavailable: ${(error as Error).message}`) }
  createTray()
  startClipboardWatcher()

  electronApp.on('second-instance', (_event, argv) => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore()
      mainWindow.focus()
    }
    const url = argv.find((a) => /^(https?:\/\/|magnet:)/i.test(a))
    if (url) setTimeout(() => send({ type: 'open-add', url }), 800)
  })

  electronApp.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
}

electronApp.on('window-all-closed', () => {
  // Keep app running for tray on Windows/Linux
  if (process.platform !== 'darwin') {
    mainWindow?.hide()
  }
})

let quitting = false
electronApp.on('before-quit', (event) => {
  if (quitting) return
  event.preventDefault()
  quitting = true
  if (clipboardTimer) clearInterval(clipboardTimer)
  stopLinkServices?.()
  browserBridge?.close()
  void (async () => {
    try {
      await manager?.shutdown()
    } finally {
      electronApp.exit(0)
    }
  })()
})

process.on('uncaughtException', (err) => {
  console.error('[main] uncaught exception:', err)
})

if (gotLock) void bootstrap()
