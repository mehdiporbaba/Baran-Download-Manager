import { useEffect, useRef, useState } from 'react'
import {
  AlertCircle,
  ArrowDownToLine,
  Check,
  ChevronDown,
  ClipboardPaste,
  FileUp,
  FolderOpen,
  Globe,
  Loader2,
  Magnet,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Video as Youtube,
  Zap
} from 'lucide-react'
import type { ProbeResult, YoutubeFormatOption, YoutubeProbe } from '@shared/types'
import { useApp } from '../state'
import { Modal } from './Modal'
import { ScheduleField, scheduledTime } from './ScheduleField'
import { cn, formatBytes, formatDuration, hostOf } from '../lib/format'

type Tab = 'link' | 'video' | 'torrent'

function toBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  const chunk = 0x8000
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk))
  }
  return btoa(binary)
}

function videoIdFrom(url: string): string | undefined {
  try {
    const u = new URL(url)
    if (u.hostname.includes('youtu.be')) return u.pathname.slice(1) || undefined
    const v = u.searchParams.get('v')
    if (v) return v
    const parts = u.pathname.split('/').filter(Boolean)
    const idx = parts.findIndex((p) => ['shorts', 'embed', 'live'].includes(p))
    if (idx >= 0) return parts[idx + 1]
    return undefined
  } catch {
    return undefined
  }
}

export function AddDownloadModal(): React.JSX.Element {
  const { addOpen, closeAdd, addInitial, t, settings, lang, pushToast, setSelectedId, setView, tasks } =
    useApp()

  const [tab, setTab] = useState<Tab>('link')
  const [url, setUrl] = useState('')
  const [magnet, setMagnet] = useState('')
  const [dir, setDir] = useState(settings.downloadDir)
  const [fileName, setFileName] = useState('')
  const [probe, setProbe] = useState<ProbeResult | null>(null)
  const [yt, setYt] = useState<YoutubeProbe | null>(null)
  const [selectedFormat, setSelectedFormat] = useState('best')
  const [analyzing, setAnalyzing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [connections, setConnections] = useState(settings.connections)
  const [advanced, setAdvanced] = useState(false)
  const [referer, setReferer] = useState('')
  const [ua, setUa] = useState('')
  const [cookie, setCookie] = useState('')
  const [expectedSha256, setExpectedSha256] = useState('')
  const [subtitles, setSubtitles] = useState(false)
  const [embedThumb, setEmbedThumb] = useState(false)
  const [torrentPath, setTorrentPath] = useState<string | null>(null)
  const [torrentData, setTorrentData] = useState<string | null>(null)
  const [torrentName, setTorrentName] = useState('')
  const [sequential, setSequential] = useState(true)
  const [dragOver, setDragOver] = useState(false)
  const [scheduleAt, setScheduleAt] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const skipAuto = useRef(false)

  const requestClose = (): void => {
    if (busy) return
    closeAdd()
  }

  useEffect(() => {
    if (!addOpen) return
    setError(null)
    setProbe(null)
    setYt(null)
    setBusy(false)
    setAnalyzing(false)
    setFileName('')
    setAdvanced(false)
    setReferer('')
    setUa('')
    setCookie('')
    setExpectedSha256('')
    setSubtitles(false)
    setEmbedThumb(false)
    setTorrentPath(null)
    setTorrentData(null)
    setTorrentName('')
    setSequential(true)
    setScheduleAt('')
    setDir(settings.downloadDir)
    setConnections(settings.connections)
    const initialUrl = addInitial?.url || ''
    const isMagnet = /^magnet:/i.test(initialUrl)
    const nextTab: Tab = addInitial?.tab || (isMagnet ? 'torrent' : 'link')
    setTab(nextTab)
    setUrl(initialUrl)
    setMagnet(isMagnet ? initialUrl : '')
    setSelectedFormat('best')
    if (initialUrl && nextTab === 'link') void analyzeLink(initialUrl)
    if (initialUrl && nextTab === 'video') void analyzeVideo(initialUrl)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addOpen])

  const analyzeLink = async (raw?: string): Promise<void> => {
    const target = (raw ?? url).trim()
    if (!/^https?:\/\//i.test(target)) {
      setError(t.add.errorUrl)
      return
    }
    setAnalyzing(true)
    setError(null)
    try {
      const result = await window.pulse.probe(target)
      setProbe(result)
      setFileName(result.fileName)
      if (!/^magnet:/i.test(target)) setUrl(result.finalUrl || target)
    } catch (err) {
      setProbe(null)
      setError((err as Error).message || t.add.errorProbe)
    } finally {
      setAnalyzing(false)
    }
  }

  const analyzeVideo = async (raw?: string): Promise<void> => {
    const target = (raw ?? url).trim()
    if (!/^https?:\/\//i.test(target)) {
      setError(t.add.errorUrl)
      return
    }
    setAnalyzing(true)
    setError(null)
    try {
      const result = await window.pulse.probeYoutube(target)
      setYt(result)
      if (result.isPlaylist) {
        setSelectedFormat('best')
      } else {
        const videos = result.formats.filter((f) => !f.audioOnly && f.height > 0)
        const best = videos.slice().sort((a, b) => b.height - a.height)[0]
        setSelectedFormat(best?.id || result.formats[0]?.id || 'best')
      }
    } catch (err) {
      setYt(null)
      setError((err as Error).message || t.add.errorProbe)
    } finally {
      setAnalyzing(false)
    }
  }

  const paste = async (): Promise<void> => {
    const text = await window.pulse.readClipboard()
    if (!text) {
      pushToast('info', t.toast.clipboard)
      return
    }
    if (/^magnet:/i.test(text)) {
      setMagnet(text)
      setTab('torrent')
      return
    }
    setUrl(text)
    if (tab === 'video') void analyzeVideo(text)
    else {
      setTab('link')
      void analyzeLink(text)
    }
  }

  const chooseDir = async (): Promise<void> => {
    const chosen = await window.pulse.chooseDir(dir)
    if (chosen) setDir(chosen)
  }

  const onTorrentFile = async (file: File): Promise<void> => {
    const name = file.name.replace(/\.torrent$/i, '')
    setTorrentName(name)
    const anyWindow = window as unknown as {
      pulsePath?: { pathForFile: (f: File) => string }
    }
    const path = anyWindow.pulsePath?.pathForFile(file)
    if (path && path.length > 0) {
      setTorrentPath(path)
      setTorrentData(null)
      const existing = tasks.find((x) => x.kind === 'torrent' && x.name === name)
      if (existing) setError(null)
      return
    }
    const buffer = await file.arrayBuffer()
    setTorrentData(toBase64(buffer))
    setTorrentPath(null)
  }

  const onDrop = async (e: React.DragEvent): Promise<void> => {
    e.preventDefault()
    setDragOver(false)
    const file = e.dataTransfer.files?.[0]
    if (file && /\.torrent$/i.test(file.name)) {
      setTab('torrent')
      await onTorrentFile(file)
      return
    }
    const text = e.dataTransfer.getData('text/plain') || e.dataTransfer.getData('text/uri-list')
    if (text) {
      if (/^magnet:/i.test(text)) {
        setTab('torrent')
        setMagnet(text)
      } else if (/^https?:/i.test(text)) {
        setUrl(text)
        setTab('link')
        void analyzeLink(text)
      }
    }
  }

  const finish = (id: string): void => {
    pushToast('success', t.toast.added)
    setSelectedId(id)
    setView('all')
    closeAdd()
  }

  const submitPlaylist = async (): Promise<void> => {
    const entries = yt?.entries || []
    if (!yt || !entries.length) {
      setError(t.add.errorProbe)
      return
    }
    setError(null)
    setBusy(true)
    try {
      let lastId = ''
      let added = 0
      for (const entry of entries.slice(0, 150)) {
        try {
          const task = await window.pulse.addDownload({
            startAt: scheduledTime(scheduleAt),
            url: entry.url,
            kind: 'youtube',
            dir,
            title: entry.title,
            thumbnail: entry.thumbnail,
            youtube: {
              selector: 'bestvideo*+bestaudio/best',
              quality: t.add.best,
              videoId: videoIdFrom(entry.url),
              duration: entry.duration,
              playlistIndex: entry.index,
              playlistCount: yt.playlistCount
            }
          })
          lastId = task.id
          added++
        } catch {
          // Skip individual episodes that cannot be queued.
        }
      }
      if (!added) throw new Error(t.add.errorProbe)
      if (lastId) setSelectedId(lastId)
      setView('all')
      pushToast('success', `${added} ${t.add.items} · ${t.toast.added}`)
      closeAdd()
    } catch (err) {
      setError((err as Error).message || t.add.errorProbe)
    } finally {
      setBusy(false)
    }
  }

  const submit = async (): Promise<void> => {
    if (tab === 'video' && yt?.isPlaylist) {
      await submitPlaylist()
      return
    }
    setError(null)
    setBusy(true)
    try {
      if (tab === 'link') {
        const target = url.trim()
        if (!/^https?:\/\//i.test(target) && !/^ftp:\/\//i.test(target)) {
          setError(t.add.errorUrl)
          setBusy(false)
          return
        }
        const headers: Record<string, string> = {}
        if (referer.trim()) headers.Referer = referer.trim()
        if (ua.trim()) headers['User-Agent'] = ua.trim()
        if (cookie.trim()) headers.Cookie = cookie.trim()
        const task = await window.pulse.addDownload({
          startAt: scheduledTime(scheduleAt),
          url: target,
          kind: 'http',
          fileName: fileName.trim() || undefined,
          dir,
          connections,
          headers: Object.keys(headers).length ? headers : undefined,
          expectedSha256: expectedSha256.trim() || undefined
        })
        finish(task.id)
      } else if (tab === 'video') {
        if (!yt || yt.isPlaylist) {
          setError(yt?.isPlaylist ? t.add.playlistNote : t.add.errorProbe)
          setBusy(false)
          return
        }
        const option: YoutubeFormatOption =
          yt.formats.find((f) => f.id === selectedFormat) || yt.formats[0]
        if (!option) {
          setError(t.add.selectQuality)
          setBusy(false)
          return
        }
        const audioOnly = !!option.audioOnly
        const task = await window.pulse.addDownload({
          startAt: scheduledTime(scheduleAt),
          url: yt.url,
          kind: 'youtube',
          dir,
          title: yt.title,
          thumbnail: yt.thumbnail,
          youtube: {
            selector: option.selector,
            quality: option.label,
            audioOnly,
            audioFormat: audioOnly && option.ext === 'mp3' ? 'mp3' : undefined,
            subtitles,
            thumbnail: embedThumb,
            videoId: videoIdFrom(yt.url),
            duration: yt.duration,
            uploader: yt.uploader
          }
        })
        finish(task.id)
      } else {
        const source = torrentPath || magnet.trim()
        if (!source && !torrentData) {
          setError(t.add.errorTorrent)
          setBusy(false)
          return
        }
        const task = await window.pulse.addTorrent({
          startAt: scheduledTime(scheduleAt),
          uri: torrentPath || magnet.trim() || undefined,
          data: !torrentPath && !magnet.trim() ? torrentData || undefined : undefined,
          name: torrentName || undefined,
          dir,
          sequential
        })
        finish(task.id)
      }
    } catch (err) {
      setError((err as Error).message || t.add.errorTorrent)
    } finally {
      setBusy(false)
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'link', label: t.add.tabs.link, icon: <Globe size={14} /> },
    { id: 'video', label: t.add.tabs.video, icon: <Youtube size={14} /> },
    { id: 'torrent', label: t.add.tabs.torrent, icon: <Magnet size={14} /> }
  ]

  const selectedOption = yt?.formats.find((f) => f.id === selectedFormat)
  const videoFormats = yt?.formats.filter((f) => !f.audioOnly) || []
  const audioFormats = yt?.formats.filter((f) => f.audioOnly) || []

  return (
    <Modal open={addOpen} onClose={requestClose} width={800} className="flex max-h-[90vh] flex-col">
      <div
        className="relative shrink-0 overflow-hidden px-6 pb-4 pt-5"
        onDragOver={(e) => {
          e.preventDefault()
          setDragOver(true)
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => void onDrop(e)}
      >
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(600px_200px_at_20%_-60%,var(--glow),transparent)]" />
        <div className="relative flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand2 text-white shadow-lg shadow-brand/25">
            <ArrowDownToLine size={19} />
          </div>
          <div>
            <h2 className="text-[16px] font-extrabold tracking-tight">{t.add.title}</h2>
            <p className="text-[10.5px] text-muted">{t.add.subtitle}</p>
          </div>
        </div>

        <div className="relative mt-4 grid grid-cols-3 gap-1 rounded-xl border border-line bg-elev/50 p-1">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setTab(item.id)
                setError(null)
              }}
              className={cn(
                'flex items-center justify-center gap-2 rounded-lg py-2 text-[11.5px] font-semibold transition',
                tab === item.id
                  ? 'bg-panel text-ink shadow-sm ring-1 ring-line2'
                  : 'text-muted hover:text-ink'
              )}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
        {dragOver ? (
          <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center rounded-t-2xl border-2 border-dashed border-brand/60 bg-brand/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-[12px] font-semibold text-brand">
              <FileUp size={18} />
              {t.add.dropTorrent}
            </div>
          </div>
        ) : null}
      </div>

      <div className="scroll-y min-h-0 flex-1 border-t border-line/70 px-6 py-4">
        {error ? (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-bad/25 bg-bad/8 px-3 py-2 text-[11px] text-bad">
            <AlertCircle size={14} className="mt-[1px] shrink-0" />
            <span className="min-w-0 flex-1">{error}</span>
            <button type="button" onClick={() => setError(null)} className="text-bad/70 hover:text-bad">
              ×
            </button>
          </div>
        ) : null}

        {tab === 'link' ? (
          <div className="space-y-3.5">
            <Labeled label={t.add.url} hint={t.add.urlHint}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" />
                  <input
                    value={url}
                    autoFocus
                    onChange={(e) => {
                      setUrl(e.target.value)
                      setProbe(null)
                      setFileName('')
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void analyzeLink()
                    }}
                    placeholder="https://example.com/file.zip"
                    className="field h-10 w-full ps-9 pe-2 text-[12px]"
                    dir="ltr"
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-ghost h-10 px-3 text-[11px]"
                  onClick={() => void paste()}
                  title={t.add.pasteClipboard}
                >
                  <ClipboardPaste size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-soft h-10 px-3.5 text-[11px]"
                  onClick={() => void analyzeLink()}
                  disabled={analyzing}
                >
                  {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Zap size={14} />}
                  {analyzing ? t.add.analyzing : t.add.analyze}
                </button>
              </div>
            </Labeled>

            {probe ? (
              <div className="anim-rise rounded-xl border border-line bg-elev/45 p-3">
                <div className="flex items-center gap-3">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand">
                    <Globe size={17} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[12px] font-semibold" dir="auto">
                      {probe.fileName}
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px] text-muted">
                      <span>{hostOf(probe.finalUrl)}</span>
                      <span>·</span>
                      <span className="tabular">{probe.size ? formatBytes(probe.size) : t.row.unknownSize}</span>
                      <span className="chip py-0! text-[9px]!">
                        <ShieldCheck size={9} />
                        {probe.resumable ? t.add.resumable : t.add.noResume}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Labeled label={t.add.fileName}>
                <input
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder={probe?.fileName || 'file.zip'}
                  className="field h-9 w-full px-3 text-[11.5px]"
                  dir="auto"
                />
              </Labeled>
              <Labeled label={t.add.saveTo}>
                <div className="flex gap-1.5">
                  <input
                    value={dir}
                    onChange={(e) => setDir(e.target.value)}
                    className="field h-9 min-w-0 flex-1 px-3 text-[10.5px]"
                    dir="ltr"
                  />
                  <button type="button" className="icon-btn h-9! w-9! border border-line" onClick={() => void chooseDir()}>
                    <FolderOpen size={14} />
                  </button>
                </div>
              </Labeled>
            </div>

            <div className="rounded-xl border border-line bg-elev/30 px-3.5 py-3">
              <div className="flex items-center justify-between">
                <div className="text-[11px] font-semibold">{t.add.connections}</div>
                <div className="chip text-[10px]! text-brand! tabular">{connections}</div>
              </div>
              <input
                type="range"
                min={1}
                max={32}
                value={connections}
                onChange={(e) => setConnections(Number(e.target.value))}
                className="mt-2.5 w-full accent-[var(--c-brand)]"
                disabled={!!probe && !probe.resumable}
              />
              <div className="mt-0.5 text-[9.5px] text-faint">{t.add.connectionsHint}</div>
            </div>

            <button
              type="button"
              onClick={() => setAdvanced((v) => !v)}
              className="flex w-full items-center gap-1.5 text-[10.5px] font-medium text-muted transition hover:text-ink"
            >
              <ChevronDown size={13} className={cn('transition', advanced && 'rotate-180')} />
              {t.add.advanced}
            </button>
            {advanced ? (
              <div className="anim-rise grid grid-cols-1 gap-2.5 rounded-xl border border-line bg-elev/25 p-3 sm:grid-cols-3">
                <Labeled label={t.add.referer} small>
                  <input value={referer} onChange={(e) => setReferer(e.target.value)} className="field h-8 w-full px-2 text-[10.5px]" dir="ltr" />
                </Labeled>
                <Labeled label={t.add.userAgent} small>
                  <input value={ua} onChange={(e) => setUa(e.target.value)} className="field h-8 w-full px-2 text-[10.5px]" dir="ltr" />
                </Labeled>
                <Labeled label={t.add.cookie} small>
                  <input value={cookie} onChange={(e) => setCookie(e.target.value)} className="field h-8 w-full px-2 text-[10.5px]" dir="ltr" />
                </Labeled>
                {window.pulse.setTaskChecksum && <div className="sm:col-span-3"><Labeled label={lang === 'fa' ? 'هش SHA-256 مورد انتظار (اختیاری)' : 'Expected SHA-256 (optional)'} small><input value={expectedSha256} onChange={e => setExpectedSha256(e.target.value)} maxLength={64} className="field h-8 w-full px-2 font-mono text-[10.5px]" dir="ltr" placeholder="64 hexadecimal characters" /></Labeled></div>}
              </div>
            ) : null}
          </div>
        ) : null}

        {tab === 'video' ? (
          <div className="space-y-3.5">
            <Labeled label={t.add.videoUrl} hint={t.add.videoHint}>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Youtube size={15} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-bad/80" />
                  <input
                    value={url}
                    autoFocus
                    onChange={(e) => {
                      setUrl(e.target.value)
                      setYt(null)
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') void analyzeVideo()
                    }}
                    placeholder="https://www.youtube.com/watch?v=…"
                    className="field h-10 w-full ps-9 pe-2 text-[12px]"
                    dir="ltr"
                  />
                </div>
                <button type="button" className="btn btn-ghost h-10 px-3" onClick={() => void paste()} title={t.add.pasteClipboard}>
                  <ClipboardPaste size={14} />
                </button>
                <button
                  type="button"
                  className="btn btn-soft h-10 px-3.5 text-[11px]"
                  onClick={() => void analyzeVideo()}
                  disabled={analyzing}
                >
                  {analyzing ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                  {analyzing ? t.add.analyzing : t.add.analyze}
                </button>
              </div>
            </Labeled>

            {analyzing && !yt ? (
              <div className="flex items-center justify-center gap-2 rounded-xl border border-line bg-elev/30 py-10 text-[11px] text-muted">
                <Loader2 size={16} className="animate-spin text-brand" />
                {t.add.analyzing}
              </div>
            ) : null}

            {yt && yt.isPlaylist ? (
              <div className="anim-rise">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <div className="truncate text-[11px] font-semibold">{yt.title}</div>
                  <span className="chip text-[9.5px]!">
                    {yt.playlistCount} {t.add.items}
                  </span>
                </div>
                <div className="scroll-y max-h-[260px] space-y-1.5 pe-1">
                  {(yt.entries || []).map((entry) => (
                    <button
                      key={`${entry.index}-${entry.url}`}
                      type="button"
                      onClick={() => {
                        setUrl(entry.url)
                        void analyzeVideo(entry.url)
                      }}
                      className="flex w-full items-center gap-2.5 rounded-lg border border-line/70 bg-elev/25 p-2 text-start transition hover:border-brand/30 hover:bg-brand/5"
                    >
                      {entry.thumbnail ? (
                        <img src={entry.thumbnail} alt="" className="h-9 w-16 shrink-0 rounded object-cover" />
                      ) : (
                        <div className="grid h-9 w-16 shrink-0 place-items-center rounded bg-elev2 text-faint">
                          <Youtube size={14} />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[11px] font-medium" dir="auto">
                          {entry.title}
                        </div>
                        <div className="text-[9.5px] text-faint">
                          {entry.index} · {formatDuration(entry.duration)}
                        </div>
                      </div>
                      <Plus size={14} className="text-faint" />
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {yt && !yt.isPlaylist ? (
              <div className="anim-rise space-y-3">
                <div className="flex gap-3 rounded-xl border border-line bg-elev/40 p-3">
                  {yt.thumbnail ? (
                    <div className="relative h-[74px] w-[130px] shrink-0 overflow-hidden rounded-lg bg-black/30">
                      <img src={yt.thumbnail} alt="" className="h-full w-full object-cover" />
                      {yt.duration ? (
                        <span className="absolute bottom-1 end-1 rounded bg-black/75 px-1 py-[1px] text-[9px] font-medium text-white">
                          {formatDuration(yt.duration)}
                        </span>
                      ) : null}
                    </div>
                  ) : null}
                  <div className="min-w-0 flex-1">
                    <div className="line-clamp-2 text-[12px] font-semibold leading-snug" dir="auto">
                      {yt.title}
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted">
                      <Youtube size={10} className="text-bad/70" />
                      <span className="truncate">{yt.uploader || yt.extractor}</span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {yt.extractor ? <span className="chip py-0! text-[9px]!">{yt.extractor}</span> : null}
                      {yt.duration ? (
                        <span className="chip py-0! text-[9px]!">{formatDuration(yt.duration)}</span>
                      ) : null}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                    {t.add.selectQuality}
                  </div>
                  <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                    {videoFormats.map((option) => {
                      const active = option.id === selectedFormat
                      return (
                        <button
                          key={option.id}
                          type="button"
                          onClick={() => setSelectedFormat(option.id)}
                          className={cn(
                            'relative flex flex-col items-start rounded-lg border px-2.5 py-2 text-start transition',
                            active
                              ? 'border-brand/50 bg-brand/10'
                              : 'border-line bg-elev/25 hover:border-line2 hover:bg-elev2/60'
                          )}
                        >
                          <span className={cn('text-[11px] font-semibold', active && 'text-brand')}>
                            {option.id === 'best' ? t.add.best : option.label}
                          </span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-[9px] text-faint">
                            <span className="uppercase">{option.ext}</span>
                            {option.filesize ? <span>· {formatBytes(option.filesize)}</span> : null}
                          </span>
                          {active ? (
                            <span className="absolute end-1.5 top-1.5 grid h-4 w-4 place-items-center rounded-full bg-brand text-white">
                              <Check size={10} strokeWidth={3} />
                            </span>
                          ) : null}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {audioFormats.length ? (
                  <div>
                    <div className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-faint">
                      {t.add.audioTrack}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {audioFormats.map((option) => {
                        const active = option.id === selectedFormat
                        return (
                          <button
                            key={option.id}
                            type="button"
                            onClick={() => setSelectedFormat(option.id)}
                            className={cn(
                              'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[10.5px] transition',
                              active
                                ? 'border-brand/50 bg-brand/10 font-semibold text-brand'
                                : 'border-line bg-elev/25 text-muted hover:border-line2 hover:text-ink'
                            )}
                          >
                            <span className="uppercase">{option.label}</span>
                            {option.filesize ? <span className="text-[9px] opacity-70">{formatBytes(option.filesize)}</span> : null}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                ) : null}

                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-line bg-elev/25 px-3 py-2">
                  <label className="flex cursor-pointer items-center gap-2 text-[10.5px] text-muted">
                    <input
                      type="checkbox"
                      checked={subtitles}
                      onChange={(e) => setSubtitles(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--c-brand)]"
                    />
                    {t.add.subtitles}
                  </label>
                  <label className="flex cursor-pointer items-center gap-2 text-[10.5px] text-muted">
                    <input
                      type="checkbox"
                      checked={embedThumb}
                      onChange={(e) => setEmbedThumb(e.target.checked)}
                      className="h-3.5 w-3.5 accent-[var(--c-brand)]"
                    />
                    {t.add.thumbnail}
                  </label>
                  {selectedOption?.audioOnly ? (
                    <span className="chip border-warn/25! text-[9px]! text-warn!">{t.add.audioOnly}</span>
                  ) : null}
                </div>
              </div>
            ) : null}

            <Labeled label={t.add.saveTo}>
              <div className="flex gap-1.5">
                <input value={dir} onChange={(e) => setDir(e.target.value)} className="field h-9 min-w-0 flex-1 px-3 text-[10.5px]" dir="ltr" />
                <button type="button" className="icon-btn h-9! w-9! border border-line" onClick={() => void chooseDir()}>
                  <FolderOpen size={14} />
                </button>
              </div>
            </Labeled>
          </div>
        ) : null}

        {tab === 'torrent' ? (
          <div className="space-y-3.5">
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setDragOver(true)
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => void onDrop(e)}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                'flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-7 text-center transition',
                dragOver ? 'border-brand/60 bg-brand/10' : 'border-line2 bg-elev/20 hover:border-brand/40 hover:bg-elev/40'
              )}
            >
              <div className="grid h-11 w-11 place-items-center rounded-xl bg-brand/12 text-brand">
                <Magnet size={20} />
              </div>
              <div className="text-[11.5px] font-semibold">
                {torrentPath ? torrentPath.split(/[\\/]/).pop() : t.add.dropTorrent}
              </div>
              <div className="text-[9.5px] text-faint">BitTorrent · DHT · magnet</div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".torrent"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void onTorrentFile(file)
                }}
              />
            </div>

            <Labeled label={t.add.magnet} hint={t.add.magnetHint}>
              <input
                value={magnet}
                onChange={(e) => {
                  setMagnet(e.target.value)
                  setTorrentPath(null)
                  setTorrentData(null)
                  setTorrentName('')
                }}
                placeholder="magnet:?xt=urn:btih:…"
                className="field h-10 w-full px-3 text-[11px]"
                dir="ltr"
              />
            </Labeled>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Labeled label={t.add.saveTo}>
                <div className="flex gap-1.5">
                  <input value={dir} onChange={(e) => setDir(e.target.value)} className="field h-9 min-w-0 flex-1 px-3 text-[10.5px]" dir="ltr" />
                  <button type="button" className="icon-btn h-9! w-9! border border-line" onClick={() => void chooseDir()}>
                    <FolderOpen size={14} />
                  </button>
                </div>
              </Labeled>
              <div className="flex items-end pb-1">
                <button
                  type="button"
                  onClick={() => setSequential((v) => !v)}
                  className={cn(
                    'flex w-full items-center gap-2 rounded-lg border px-2.5 py-2 text-[10.5px] transition',
                    sequential ? 'border-brand/40 bg-brand/10 text-ink' : 'border-line bg-elev/25 text-muted'
                  )}
                >
                  <span
                    className={cn(
                      'grid h-4 w-4 place-items-center rounded border',
                      sequential ? 'border-brand bg-brand text-white' : 'border-line2'
                    )}
                  >
                    {sequential ? <Check size={10} strokeWidth={3} /> : null}
                  </span>
                  {t.add.sequential}
                </button>
              </div>
            </div>

            <div className="flex items-start gap-2 rounded-xl border border-line bg-elev/25 px-3 py-2.5 text-[9.5px] leading-relaxed text-muted">
              <ShieldCheck size={13} className="mt-[1px] shrink-0 text-ok" />
              {t.add.torrentNote}
            </div>
          </div>
        ) : null}
      </div>

      <div className="shrink-0 border-t border-line/70 px-6 py-2"><ScheduleField value={scheduleAt} onChange={setScheduleAt} fa={lang === 'fa'} /></div>
      <div className="flex shrink-0 items-center gap-2 border-t border-line/70 bg-panel/60 px-6 py-3">
        <div className="hidden items-center gap-1.5 text-[9.5px] text-faint sm:flex">
          {tab === 'torrent' ? <Magnet size={11} /> : tab === 'video' ? <Youtube size={11} /> : <Globe size={11} />}
          {hostOf(tab === 'torrent' ? magnet || torrentPath || '' : url)}
        </div>
        <div className="ms-auto flex items-center gap-2">
          <button type="button" className="btn btn-ghost h-9 px-3.5 text-[11.5px]" onClick={requestClose} disabled={busy}>
            {t.common.cancel}
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={
              busy ||
              (tab === 'link' && !url.trim()) ||
              (tab === 'video' && (!yt || analyzing || (yt.isPlaylist && !(yt.entries || []).length))) ||
              (tab === 'torrent' && !magnet.trim() && !torrentPath && !torrentData)
            }
            className="btn btn-primary h-9 min-w-[132px] px-4 text-[11.5px]"
          >
            {busy ? <Loader2 size={14} className="animate-spin" /> : <ArrowDownToLine size={14} />}
            {tab === 'torrent'
              ? t.add.addToQueue
              : tab === 'video' && yt?.isPlaylist
                ? t.add.downloadAll
                : t.add.start}
          </button>
        </div>
      </div>
    </Modal>
  )
}

function Labeled({
  label,
  hint,
  children,
  small
}: {
  label: string
  hint?: string
  children: React.ReactNode
  small?: boolean
}): React.JSX.Element {
  return (
    <div>
      <div className={cn('mb-1 flex items-center justify-between gap-2', small ? 'text-[9px]' : 'text-[10px]')}>
        <span className="font-semibold text-muted">{label}</span>
        {hint ? <span className="hidden truncate text-[9px] text-faint sm:block">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}
