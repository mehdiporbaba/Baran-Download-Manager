import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowDownToLine, Magnet } from 'lucide-react'
import { useApp } from './state'
import { TitleBar } from './components/TitleBar'
import { Sidebar } from './components/Sidebar'
import { TopBar } from './components/TopBar'
import { StatsStrip } from './components/StatsStrip'
import { DownloadList } from './components/DownloadList'
import { DetailPanel } from './components/DetailPanel'
import { StatusBar } from './components/StatusBar'
import { AddDownloadModal } from './components/AddDownloadModal'
import { SettingsModal } from './components/SettingsModal'
import { GithubBrowser } from './components/GithubBrowser'
import { LinkGrabber } from './components/LinkGrabber'
import { Home } from './components/Home'
import { InstagramDownloader } from './components/InstagramDownloader'
import { Toasts } from './components/Toasts'
import { Logo } from './components/primitives'

function base64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

export function App(): React.JSX.Element {
  const { ready, loadError, openAdd, pushToast, t, addOpen, settings, view } = useApp()
  const [dropping, setDropping] = useState(false)
  const [dropKind, setDropKind] = useState<'url' | 'torrent'>('url')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarHovered, setSidebarHovered] = useState(false)
  const [sidebarFocused, setSidebarFocused] = useState(false)
  const pinnedSidebar = Boolean(settings.sidebarAlwaysOpen)
  const menuVisible = pinnedSidebar || sidebarOpen

  useEffect(() => {
    if (!sidebarOpen || pinnedSidebar || sidebarHovered || sidebarFocused) return
    const timeout = window.setTimeout(() => setSidebarOpen(false), 15000)
    return () => window.clearTimeout(timeout)
  }, [sidebarOpen, pinnedSidebar, sidebarHovered, sidebarFocused])

  useEffect(() => {
    let depth = 0
    const onEnter = (e: DragEvent): void => {
      if (addOpen) return
      e.preventDefault()
      depth++
      if (e.dataTransfer) {
        const hasFiles = Array.from(e.dataTransfer.types).includes('Files')
        setDropKind(hasFiles ? 'torrent' : 'url')
      }
      setDropping(true)
    }
    const onOver = (e: DragEvent): void => {
      if (addOpen) return
      e.preventDefault()
    }
    const onLeave = (): void => {
      depth = Math.max(0, depth - 1)
      if (depth === 0) setDropping(false)
    }
    const onDrop = async (e: DragEvent): Promise<void> => {
      if (addOpen) return
      e.preventDefault()
      depth = 0
      setDropping(false)
      const file = e.dataTransfer?.files?.[0]
      if (file && /\.torrent$/i.test(file.name)) {
        try {
          const buffer = await file.arrayBuffer()
          await window.pulse.addTorrent({
            data: base64(buffer),
            name: file.name.replace(/\.torrent$/i, ''),
            dir: settings.downloadDir
          })
          pushToast('success', t.toast.added)
        } catch (err) {
          pushToast('error', (err as Error).message)
        }
        return
      }
      const text = e.dataTransfer?.getData('text/plain') || e.dataTransfer?.getData('text/uri-list')
      if (text) {
        if (/^magnet:/i.test(text)) {
          openAdd({ url: text, tab: 'torrent' })
        } else if (/^https?:/i.test(text)) {
          openAdd({ url: text })
        }
      }
    }
    window.addEventListener('dragenter', onEnter)
    window.addEventListener('dragover', onOver)
    window.addEventListener('dragleave', onLeave)
    window.addEventListener('drop', onDrop)
    return () => {
      window.removeEventListener('dragenter', onEnter)
      window.removeEventListener('dragover', onOver)
      window.removeEventListener('dragleave', onLeave)
      window.removeEventListener('drop', onDrop)
    }
  }, [addOpen, openAdd, pushToast, settings.downloadDir, t])

  if (!ready) {
    return (
      <div className="app-bg flex h-full flex-col items-center justify-center gap-5">
        <div className="anim-pop">
          <Logo size={62} />
        </div>
        <div className="h-1 w-32 overflow-hidden rounded-full bg-elev2">
          <div className="indeterminate h-full rounded-full" />
        </div>
        <div className="text-[10px] uppercase tracking-[0.3em] text-faint">Baran</div>
      </div>
    )
  }

  return (
    <div className="app-bg flex h-full flex-col overflow-hidden text-ink">
      <TitleBar menuOpen={menuVisible} onToggleMenu={() => { if (!pinnedSidebar) { setSidebarOpen(!sidebarOpen); setSidebarHovered(false); setSidebarFocused(false) } }} />
      <div className="relative flex min-h-0 flex-1">
        {menuVisible && <div id="baran-navigation" className={pinnedSidebar ? 'flex shrink-0' : 'absolute inset-y-0 start-0 z-20 flex border-e border-line bg-panel shadow-2xl'}
          onPointerEnter={() => setSidebarHovered(true)} onPointerLeave={() => setSidebarHovered(false)}
          onFocusCapture={() => setSidebarFocused(true)} onBlurCapture={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setSidebarFocused(false) }}
          onKeyDown={event => { if (event.key === 'Escape' && !pinnedSidebar) { setSidebarOpen(false); document.querySelector<HTMLButtonElement>('[aria-controls="baran-navigation"]')?.focus() } }}>
          <Sidebar />
        </div>}
        <main className="flex min-w-0 flex-1 flex-col">
          <TopBar />
          <div className={view === 'links' ? 'flex min-h-0 flex-1 flex-col' : 'hidden'}><LinkGrabber /></div>
          {view === 'home' ? <Home /> : view === 'instagram' ? <InstagramDownloader /> : view === 'links' ? null : view === 'github' ? (
            <GithubBrowser />
          ) : (
            <>
              {view !== 'all' && <StatsStrip />}
              <div className="flex min-h-0 flex-1">
                <div className="flex min-w-0 flex-1 flex-col">
                  {loadError ? (
                    <div className="scroll-y flex-1 p-5">
                      <div className="mx-auto mt-16 flex max-w-md items-start gap-3 rounded-xl border border-bad/30 bg-bad/8 p-4">
                        <AlertTriangle size={18} className="mt-0.5 text-bad" />
                        <div>
                          <div className="text-[12px] font-semibold text-bad">Could not load the app state</div>
                          <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{loadError}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <DownloadList />
                  )}
                </div>
                <DetailPanel />
              </div>
              {view === 'all' && <StatsStrip />}
            </>
          )}
        </main>
      </div>
      <StatusBar />

      <AddDownloadModal />
      <SettingsModal />
      <Toasts />

      {dropping ? (
        <div className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-app/70 backdrop-blur-sm">
          <div className="anim-pop flex flex-col items-center gap-3 rounded-2xl border border-brand/35 bg-panel/90 px-10 py-8 shadow-2xl">
            <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-brand to-brand2 text-white">
              {dropKind === 'torrent' ? <Magnet size={24} /> : <ArrowDownToLine size={24} />}
            </div>
            <div className="text-[12.5px] font-semibold">
              {dropKind === 'torrent' ? t.add.dropTorrent : t.empty.desc}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
