import { useMemo } from 'react'
import {
  Activity,
  AlertTriangle,
  AppWindow,
  CircleCheck,
  FileArchive,
  FileText,
  Film,
  FolderOpen,
  GitBranch,
  Globe,
  HardDrive,
  Image as ImageIcon,
  LayoutGrid,
  House,
  CalendarClock,
  Camera as Instagram,
  Link2,
  Magnet,
  Music,
  PauseCircle,
  Settings,
  Video as Youtube
} from 'lucide-react'
import type { DownloadTask } from '@shared/types'
import { useApp, type ViewId } from '../state'
import { cn, formatBytes } from '../lib/format'

const isActive = (t: DownloadTask): boolean =>
  t.status === 'downloading' || t.status === 'connecting' || t.status === 'verifying'

export function Sidebar(): React.JSX.Element {
  const { t, view, setView, tasks, stats, system, setSettingsOpen, settings, patchSettings } =
    useApp()

  const counts = useMemo(() => {
    const c = {
      all: tasks.length,
      active: 0,
      completed: 0,
      paused: 0,
      error: 0,
      youtube: 0,
      torrents: 0,
      direct: 0,
      video: 0,
      audio: 0,
      image: 0,
      archive: 0,
      document: 0,
      app: 0,
      other: 0
    }
    for (const task of tasks) {
      if (isActive(task) || task.status === 'queued') c.active++
      if (task.status === 'completed') c.completed++
      if (task.status === 'paused') c.paused++
      if (task.status === 'error') c.error++
      if (task.kind === 'youtube') c.youtube++
      else if (task.kind === 'torrent') c.torrents++
      else c.direct++
      const cat = (task.category || 'other') as keyof typeof c
      if (cat in c) c[cat]++
    }
    return c
  }, [tasks])

  const free = system?.freeDisk || 0

  return (
    <aside className="flex w-[192px] shrink-0 flex-col border-e border-line/70 bg-panel/55 xl:w-[212px]">
      <nav className="scroll-y flex-1 px-2.5 py-3.5">
        <Section title={t.nav.library}>
          <Item icon={<House size={16} />} label={settings.language === 'fa' ? 'خانه باران' : 'Baran home'} count={0} active={view === 'home'} onClick={() => setView('home')} />
          <Item icon={<CalendarClock size={16} />} label={settings.language === 'fa' ? 'زمان‌بندی دانلود' : 'Scheduled'} count={tasks.filter(task => task.status === 'queued' && Boolean(task.startAt && task.startAt > Date.now())).length} active={view === 'scheduled'} onClick={() => setView('scheduled')} />
          <Item icon={<LayoutGrid size={16} />} label={t.nav.all} count={counts.all} active={view === 'all'} onClick={() => setView('all')} />
          <Item
            icon={<Activity size={16} />}
            label={t.nav.active}
            count={counts.active}
            active={view === 'active'}
            onClick={() => setView('active')}
            live={counts.active > 0}
          />
          <Item icon={<CircleCheck size={16} />} label={t.nav.completed} count={counts.completed} active={view === 'completed'} onClick={() => setView('completed')} />
          <Item icon={<PauseCircle size={16} />} label={t.nav.paused} count={counts.paused} active={view === 'paused'} onClick={() => setView('paused')} />
          <Item icon={<AlertTriangle size={16} />} label={t.nav.error} count={counts.error} active={view === 'error'} onClick={() => setView('error')} danger={counts.error > 0} />
        </Section>

        <Section title={t.nav.sources}>
          <Item icon={<Instagram size={16} />} label={settings.language === 'fa' ? 'اینستاگرام' : 'Instagram'} count={0} active={view === 'instagram'} onClick={() => setView('instagram')} />
          <Item icon={<Link2 size={16} />} label={settings.language === 'fa' ? 'لینک‌گیر و اسکنر' : 'Link Grabber'} count={0} active={view === 'links'} onClick={() => setView('links')} />
          <Item icon={<Youtube size={16} />} label={t.nav.youtube} count={counts.youtube} active={view === 'youtube'} onClick={() => setView('youtube')} />
          <Item icon={<Magnet size={16} />} label={t.nav.torrents} count={counts.torrents} active={view === 'torrents'} onClick={() => setView('torrents')} />
          <Item icon={<Globe size={16} />} label={t.nav.direct} count={counts.direct} active={view === 'direct'} onClick={() => setView('direct')} />
          <Item icon={<GitBranch size={16} />} label={t.nav.github} count={0} active={view === 'github'} onClick={() => setView('github')} />
        </Section>

        <Section title={t.nav.files}>
          <Item icon={<Film size={16} />} label={t.nav.video} count={counts.video} active={view === 'video'} onClick={() => setView('video')} />
          <Item icon={<Music size={16} />} label={t.nav.audio} count={counts.audio} active={view === 'audio'} onClick={() => setView('audio')} />
          <Item icon={<ImageIcon size={16} />} label={t.nav.image} count={counts.image} active={view === 'image'} onClick={() => setView('image')} />
          <Item icon={<FileArchive size={16} />} label={t.nav.archive} count={counts.archive} active={view === 'archive'} onClick={() => setView('archive')} />
          <Item icon={<FileText size={16} />} label={t.nav.document} count={counts.document} active={view === 'document'} onClick={() => setView('document')} />
          <Item icon={<AppWindow size={16} />} label={t.nav.app} count={counts.app} active={view === 'app'} onClick={() => setView('app')} />
        </Section>
      </nav>

      <div className="shrink-0 space-y-2 border-t border-line/70 p-2.5">
        <button
          type="button"
          onClick={() => void window.pulse.revealDir(settings.downloadDir)}
          className="group w-full rounded-xl border border-line/80 bg-elev/50 p-2.5 text-start transition hover:border-line2 hover:bg-elev2/70"
        >
          <div className="flex items-center gap-2">
            <div className="grid h-7 w-7 place-items-center rounded-lg bg-brand/12 text-brand">
              <HardDrive size={14} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[10px] text-muted">{t.stats.free}</div>
              <div className="text-[12px] font-semibold tabular">{formatBytes(free)}</div>
            </div>
            <FolderOpen size={14} className="text-faint transition group-hover:text-ink" />
          </div>
          <div className="mt-2 truncate text-[9.5px] text-faint" dir="ltr">
            {settings.downloadDir}
          </div>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSettingsOpen(true)}
            className="flex h-9 flex-1 items-center gap-2 rounded-lg px-2.5 text-[11.5px] font-medium text-muted transition hover:bg-elev2 hover:text-ink"
          >
            <Settings size={15} />
            {t.toolbar.settings}
          </button>
          <select
            value={settings.language}
            onChange={(e) => patchSettings({ language: e.target.value as 'en'|'fa'|'ja'|'ru' })}
            className="chip h-9 rounded-lg! px-2! bg-elev2/70 text-[11px] font-semibold focus:outline-none"
            title={t.settings.appearance.language}
          >
            <option value="en">EN</option>
            <option value="fa">FA</option>
            <option value="ja">JA</option>
            <option value="ru">RU</option>
          </select>
        </div>
        {stats && stats.queuedCount > 0 ? (
          <div className="px-1 text-[10px] text-faint">
            {stats.queuedCount} {t.stats.queued}
          </div>
        ) : null}
      </div>
    </aside>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <div className="mb-4">
      <div className="mb-1.5 px-2.5 text-[9.5px] font-bold uppercase tracking-[0.14em] text-faint">
        {title}
      </div>
      <div className="space-y-0.5">{children}</div>
    </div>
  )
}

function Item({
  icon,
  label,
  count,
  active,
  onClick,
  live,
  danger
}: {
  icon: React.ReactNode
  label: string
  count: number
  active: boolean
  onClick: () => void
  live?: boolean
  danger?: boolean
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group relative flex w-full items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-[12px] transition',
        active
          ? 'bg-brand/12 font-semibold text-ink'
          : 'font-medium text-muted hover:bg-elev2/70 hover:text-ink'
      )}
    >
      {active ? (
        <span className="absolute inset-y-1.5 start-0 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand2" />
      ) : null}
      <span
        className={cn(
          'relative transition',
          active ? 'text-brand' : danger ? 'text-bad/80' : 'text-faint group-hover:text-muted'
        )}
      >
        {icon}
        {live ? (
          <span className="absolute -end-1 -top-1 h-1.5 w-1.5 rounded-full bg-ok live-dot" />
        ) : null}
      </span>
      <span className="flex-1 truncate text-start">{label}</span>
      {count > 0 ? (
        <span
          className={cn(
            'min-w-[20px] rounded-md px-1 py-[1px] text-center text-[9.5px] font-semibold tabular',
            active ? 'bg-brand/20 text-brand' : 'bg-elev2/80 text-faint'
          )}
        >
          {count}
        </span>
      ) : null}
    </button>
  )
}
