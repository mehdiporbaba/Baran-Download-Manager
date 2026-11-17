import { useEffect, useRef, useState } from 'react'
import {
  Check,
  ChevronDown,
  Gauge,
  Plus,
  Search,
  Settings,
  SlidersHorizontal,
  X
} from 'lucide-react'
import { useApp, type ViewId } from '../state'
import { cn } from '../lib/format'

const LIMITS: Array<{ value: number; label: string }> = [
  { value: 0, label: '∞' },
  { value: 512 * 1024, label: '512 KB/s' },
  { value: 1024 * 1024, label: '1 MB/s' },
  { value: 2 * 1024 * 1024, label: '2 MB/s' },
  { value: 5 * 1024 * 1024, label: '5 MB/s' },
  { value: 10 * 1024 * 1024, label: '10 MB/s' },
  { value: 25 * 1024 * 1024, label: '25 MB/s' }
]

export function TopBar(): React.JSX.Element {
  const { t, view, tasks, query, setQuery, openAdd, setSettingsOpen, settings, patchSettings, lang } =
    useApp()
  const [limitOpen, setLimitOpen] = useState(false)
  const limitRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!limitOpen) return
    const onDown = (e: MouseEvent): void => {
      if (limitRef.current && !limitRef.current.contains(e.target as Node)) setLimitOpen(false)
    }
    window.addEventListener('mousedown', onDown)
    return () => window.removeEventListener('mousedown', onDown)
  }, [limitOpen])

  const titles: Record<ViewId, string> = {
    home: lang === 'fa' ? 'خانه باران' : 'Welcome to Baran',
    scheduled: lang === 'fa' ? 'دانلودهای زمان‌بندی‌شده' : 'Scheduled downloads',
    instagram: lang === 'fa' ? 'رسانه‌های اینستاگرام' : 'Instagram media',
    links: lang === 'fa' ? 'لینک‌گیر و اسکن پوشه' : 'Link Grabber & Scanner',
    all: t.nav.all,
    active: t.nav.active,
    completed: t.nav.completed,
    paused: t.nav.paused,
    error: t.nav.error,
    youtube: t.nav.youtube,
    torrents: t.nav.torrents,
    direct: t.nav.direct,
    github: t.nav.github,
    video: t.nav.video,
    audio: t.nav.audio,
    image: t.nav.image,
    archive: t.nav.archive,
    document: t.nav.document,
    app: t.nav.app,
    other: t.nav.other
  }

  const currentLimit = settings.globalSpeedLimit
  const limitLabel =
    LIMITS.find((x) => x.value === currentLimit)?.label ??
    `${Math.round(currentLimit / (1024 * 1024))} MB/s`

  return (
    <div className={cn('flex shrink-0 flex-wrap items-center gap-3 border-b border-line/60 px-4', view === 'all' ? 'py-2' : 'py-3')}>
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-bold tracking-tight">{titles[view]}</h1>
        <p className={cn('truncate text-[10.5px] text-muted', view === 'all' && 'hidden')}>
          {view === 'github' ? t.github.subtitle : `${tasks.length} ${t.stats.tasks}`}
        </p>
      </div>

      <div className="ms-auto flex max-w-full flex-wrap items-center justify-end gap-2">
        {view !== 'github' && view !== 'home' ? (
          <div className={cn('relative', view === 'all' ? 'block' : 'hidden 2xl:block')}>
            <Search
              size={14}
              className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint"
            />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.toolbar.search}
              className={cn('field h-9 ps-8 pe-8 text-[12px]', view === 'all' ? 'w-[150px] lg:w-[210px]' : 'w-[230px] lg:w-[270px]')}
              aria-label={t.toolbar.search}
            />
            {query ? (
              <button
                type="button"
                className="absolute end-2 top-1/2 -translate-y-1/2 text-faint hover:text-ink"
                onClick={() => setQuery('')}
              >
                <X size={13} />
              </button>
            ) : (
              <kbd className="absolute end-2 top-1/2 hidden -translate-y-1/2 rounded border border-line2 px-1 text-[9px] text-faint lg:block">
                /
              </kbd>
            )}
          </div>
        ) : null}

        <div ref={limitRef} className="relative">
          <button
            type="button"
            onClick={() => setLimitOpen((v) => !v)}
            className={cn(
              'btn btn-ghost h-9 gap-1.5 px-2.5 text-[11px]',
              currentLimit > 0 && 'text-warn'
            )}
            title={t.settings.speed.title}
          >
            <Gauge size={15} />
            <span className="hidden tabular sm:inline">{limitLabel}</span>
            <ChevronDown size={12} className={cn('transition', limitOpen && 'rotate-180')} />
          </button>
          {limitOpen ? (
            <div className="glass anim-rise absolute end-0 top-11 z-50 w-[190px] rounded-xl p-1.5 shadow-2xl">
              <div className="px-2 py-1 text-[9.5px] font-bold uppercase tracking-wider text-faint">
                {t.settings.speed.title}
              </div>
              {LIMITS.map((item) => (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => {
                    patchSettings({ globalSpeedLimit: item.value })
                    setLimitOpen(false)
                  }}
                  className="flex w-full items-center justify-between rounded-lg px-2 py-1.5 text-[11.5px] text-muted transition hover:bg-elev2 hover:text-ink"
                >
                  <span className="tabular">
                    {item.value === 0 ? t.settings.speed.unlimited : item.label}
                  </span>
                  {currentLimit === item.value ? <Check size={13} className="text-brand" /> : null}
                </button>
              ))}
              <div className="my-1 h-px bg-line" />
              <button
                type="button"
                onClick={() => {
                  setSettingsOpen(true)
                  setLimitOpen(false)
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-[11.5px] text-muted transition hover:bg-elev2 hover:text-ink"
              >
                <SlidersHorizontal size={13} />
                {t.toolbar.settings}
              </button>
            </div>
          ) : null}
        </div>

        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          className="icon-btn hidden h-9 w-9 md:grid"
          title={t.toolbar.settings}
        >
          <Settings size={16} />
        </button>

        <button
          type="button"
          onClick={() => openAdd()}
          className="btn btn-primary h-9 px-3.5 text-[12px]"
        >
          <Plus size={16} strokeWidth={2.6} />
          <span>{t.toolbar.add}</span>
          <kbd
            className="ms-1 hidden rounded border border-white/25 px-1 text-[9px] font-medium text-white/75 lg:block"
            dir="ltr"
          >
            {lang === 'fa' ? 'Ctrl+N' : 'Ctrl+N'}
          </kbd>
        </button>
      </div>
      {view !== 'home' && view !== 'github' && view !== 'all' && <div className="relative w-full 2xl:hidden"><Search size={14} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-faint" /><input aria-label={t.toolbar.search} className="field h-9 w-full ps-9 pe-3" value={query} onChange={event => setQuery(event.target.value)} placeholder={t.toolbar.search} /></div>}
    </div>
  )
}
