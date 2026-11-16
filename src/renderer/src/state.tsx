import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from 'react'
import type {
  AppSnapshot,
  DownloadTask,
  GlobalStats,
  MainEvent,
  Settings
} from '@shared/types'
import type { Lang } from './i18n'
import { dictionaries, type Dict } from './i18n'

export type ViewId =
  | 'home'
  | 'scheduled'
  | 'instagram'
  | 'links'
  | 'all'
  | 'active'
  | 'completed'
  | 'paused'
  | 'error'
  | 'youtube'
  | 'torrents'
  | 'direct'
  | 'github'
  | 'video'
  | 'audio'
  | 'image'
  | 'archive'
  | 'document'
  | 'app'
  | 'other'

export type SortId = 'newest' | 'oldest' | 'size' | 'name' | 'progress'

export type ToastLevel = 'info' | 'success' | 'error'

export interface ToastItem {
  id: string
  level: ToastLevel
  message: string
  actionLabel?: string
  action?: () => void
  ttl: number
}

export interface AddInitial {
  tab?: 'link' | 'video' | 'torrent'
  url?: string
}

interface AppContextValue {
  ready: boolean
  loadError: string | null
  tasks: DownloadTask[]
  settings: Settings
  stats: GlobalStats | null
  system: AppSnapshot['system'] | null
  lang: Lang
  t: Dict
  dir: 'rtl' | 'ltr'
  view: ViewId
  setView: (v: ViewId) => void
  query: string
  setQuery: (q: string) => void
  sort: SortId
  setSort: (s: SortId) => void
  selectedId: string | null
  setSelectedId: (id: string | null) => void
  selected: DownloadTask | null
  addOpen: boolean
  addInitial: AddInitial | null
  openAdd: (initial?: AddInitial) => void
  closeAdd: () => void
  settingsOpen: boolean
  setSettingsOpen: (open: boolean) => void
  toasts: ToastItem[]
  pushToast: (level: ToastLevel, message: string, opts?: { actionLabel?: string; action?: () => void; ttl?: number }) => void
  dismissToast: (id: string) => void
  maximized: boolean
  refreshTools: () => void
  patchSettings: (patch: Partial<Settings>) => void
}

const fallbackSettings: Settings = {
  downloadDir: '',
  maxConcurrent: 3,
  connections: 8,
  globalSpeedLimit: 0,
  torrentDownloadLimit: 0,
  torrentUploadLimit: 0,
  proxyMode: 'direct',
  minimizeToTray: true,
  sidebarAlwaysOpen: false,
  language: 'en',
  theme: 'dark',
  clipboardWatch: true,
  notifyOnComplete: true,
  ytDlpPath: '',
  ffmpegPath: '',
  torrentPort: 51413,
  seedAfterComplete: false,
  proxy: '',
  userAgent: '',
  autoResume: true,
  launchAtStartup: true,
  cookiesBrowser: '',
  cookiesFile: '',
  githubToken: ''
}

const AppCtx = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }): React.JSX.Element {
  const [ready, setReady] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<DownloadTask[]>([])
  const [settings, setSettings] = useState<Settings>(fallbackSettings)
  const [stats, setStats] = useState<GlobalStats | null>(null)
  const [system, setSystem] = useState<AppSnapshot['system'] | null>(null)
  const [view, setView] = useState<ViewId>('all')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortId>('newest')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addInitial, setAddInitial] = useState<AddInitial | null>(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [toasts, setToasts] = useState<ToastItem[]>([])
  const [maximized, setMaximized] = useState(false)
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>())
  const langRef = useRef<Lang>(settings.language)
  langRef.current = settings.language

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id))
    const timer = timers.current.get(id)
    if (timer) clearTimeout(timer)
    timers.current.delete(id)
  }, [])

  const pushToast = useCallback<AppContextValue['pushToast']>(
    (level, message, opts) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
      const item: ToastItem = {
        id,
        level,
        message,
        actionLabel: opts?.actionLabel,
        action: opts?.action,
        ttl: opts?.ttl ?? 4600
      }
      setToasts((prev) => [...prev.slice(-4), item])
      const timer = setTimeout(() => dismissToast(id), item.ttl)
      timers.current.set(id, timer)
    },
    [dismissToast]
  )

  const openAdd = useCallback((initial?: AddInitial) => {
    setAddInitial(initial ?? null)
    setAddOpen(true)
  }, [])

  const closeAdd = useCallback(() => setAddOpen(false), [])

  const patchSettings = useCallback((patch: Partial<Settings>) => {
    setSettings((prev) => ({ ...prev, ...patch }))
    void window.pulse.updateSettings(patch)
  }, [])

  useEffect(() => {
    let cancelled = false
    const upsert = (task: DownloadTask): void => {
      setTasks((prev) => {
        const index = prev.findIndex((x) => x.id === task.id)
        if (index === -1) return [task, ...prev]
        const next = prev.slice()
        next[index] = task
        return next
      })
    }

    const handleEvent = (event: MainEvent): void => {
      if (cancelled) return
      switch (event.type) {
        case 'task:update':
        case 'task:add':
          upsert(event.task)
          break
        case 'task:remove':
          setTasks((prev) => prev.filter((x) => x.id !== event.id))
          setSelectedId((current) => (current === event.id ? null : current))
          break
        case 'stats':
          setStats(event.stats)
          break
        case 'settings':
          setSettings(event.settings)
          break
        case 'toast':
          pushToast(event.level, event.message)
          break
        case 'clipboard:url':
          pushToast('info', dictionaries[langRef.current].toast.clipboard, {
            ttl: 9000,
            actionLabel: dictionaries[langRef.current].toast.addThis,
            action: () => openAdd({ url: event.url, tab: /^magnet:/i.test(event.url) ? 'torrent' : undefined })
          })
          break
        case 'open-add':
          openAdd({ url: event.url })
          break
        case 'navigate':
          if (event.view === 'links') setView('links')
          break
        case 'window:state':
          setMaximized(event.maximized)
          break
        default:
          break
      }
    }

    const unsubscribe = window.pulse.subscribe(handleEvent)
    window.pulse
      .snapshot()
      .then((snap) => {
        if (cancelled) return
        setTasks(snap.tasks)
        setSettings(snap.settings)
        setStats(snap.stats)
        setSystem(snap.system)
        setMaximized(Boolean(snap.system.maximized))
        setReady(true)
        void window.pulse.browserReady?.().catch(() => {})
      })
      .catch((err: Error) => {
        if (cancelled) return
        setLoadError(err.message)
        setReady(true)
      })
    return () => {
      cancelled = true
      unsubscribe()
    }
  }, [openAdd, pushToast])

  const lang = settings.language
  const t = dictionaries[lang] ?? dictionaries.en
  const dir = lang === 'fa' ? 'rtl' : 'ltr'

  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = dir
  }, [lang, dir])

  useEffect(() => {
    document.documentElement.dataset.theme = settings.theme
  }, [settings.theme])

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      const ctrl = e.ctrlKey || e.metaKey
      if (ctrl && e.key.toLowerCase() === 'n') {
        e.preventDefault()
        openAdd()
      }
      if (e.key === 'Escape') {
        // Escape closes the topmost overlay; components handle their own too.
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [openAdd])

  const selected = useMemo(
    () => tasks.find((x) => x.id === selectedId) ?? null,
    [tasks, selectedId]
  )

  const refreshTools = useCallback(() => {
    void window.pulse.rescanTools().then(async () => {
      const snap = await window.pulse.snapshot()
      setStats(snap.stats)
      setSettings(snap.settings)
      setSystem(snap.system)
    })
  }, [])

  const value: AppContextValue = {
    ready,
    loadError,
    tasks,
    settings,
    stats,
    system,
    lang,
    t,
    dir,
    view,
    setView,
    query,
    setQuery,
    sort,
    setSort,
    selectedId,
    setSelectedId,
    selected,
    addOpen,
    addInitial,
    openAdd,
    closeAdd,
    settingsOpen,
    setSettingsOpen,
    toasts,
    pushToast,
    dismissToast,
    maximized,
    refreshTools,
    patchSettings
  }

  return <AppCtx.Provider value={value}>{children}</AppCtx.Provider>
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppCtx)
  if (!ctx) throw new Error('useApp must be used inside AppProvider')
  return ctx
}
