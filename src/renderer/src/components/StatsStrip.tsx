import { Activity, ArrowDown, ArrowUp, CircleCheck, Gauge, HardDrive } from 'lucide-react'
import { useApp } from '../state'
import { Stat, Sparkline } from './primitives'
import { cn, formatBytes, formatSpeed } from '../lib/format'

export function StatsStrip({ compact = false }: { compact?: boolean }): React.JSX.Element {
  const { t, stats, system, settings } = useApp()
  const history = (stats?.history || []).map((h) => h.down)
  const limited = settings.globalSpeedLimit > 0

  if (compact) return <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-t border-line px-4 py-2 text-xs text-muted" aria-label={settings.language === 'fa' ? 'خلاصهٔ دانلودها' : 'Download summary'}>
    <span className="flex items-center gap-1.5"><Activity size={13} className="text-brand"/>{t.stats.active}: <strong className="tabular text-ink">{stats?.activeCount ?? 0}</strong><span className="text-faint">· {stats?.queuedCount ?? 0} {t.stats.queued}</span></span>
    <span className="flex items-center gap-1.5"><ArrowDown size={13}/><span className="tabular" dir="ltr">{formatSpeed(stats?.downSpeed ?? 0)}</span><ArrowUp size={13}/><span className="tabular" dir="ltr">{formatSpeed(stats?.upSpeed ?? 0)}</span></span>
    <span className="flex items-center gap-1.5"><CircleCheck size={13} className="text-ok"/>{t.stats.completed}: <strong className="tabular text-ink">{stats?.completedCount ?? 0}</strong></span>
    <span className="ms-auto flex items-center gap-1.5"><HardDrive size={13}/>{t.stats.free}: <span className="tabular" dir="ltr">{formatBytes(system?.freeDisk ?? 0)}</span></span>
  </div>

  return (
    <div className="grid shrink-0 grid-cols-2 gap-2.5 px-5 py-3 lg:grid-cols-4">
      <Stat
        icon={<Activity size={17} className="text-brand" />}
        label={t.stats.active}
        value={stats?.activeCount ?? 0}
        hint={`${stats?.queuedCount ?? 0} ${t.stats.queued}`}
        accent="color-mix(in srgb, var(--c-brand) 14%, transparent)"
      />
      <div className="panel relative overflow-hidden rounded-xl2 shadow-[var(--shadow-panel)]">
        <div className="relative z-10 flex items-center gap-3 px-4 py-3">
          <div
            className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
            style={{ background: 'color-mix(in srgb, var(--c-brand2) 14%, transparent)' }}
          >
            <Gauge size={17} className="text-brand2" />
          </div>
          <div className="min-w-0">
            <div className="text-[10.5px] font-medium uppercase tracking-wider text-muted">
              {t.stats.speed}
            </div>
            <div className="mt-0.5 text-[17px] font-bold leading-tight tabular">
              {formatSpeed(stats?.downSpeed ?? 0)}
            </div>
            <div className="mt-0.5 flex items-center gap-2 text-[10.5px] text-faint">
              <span className={cn('flex items-center gap-0.5', limited && 'text-warn')}>
                <ArrowDown size={10} />
                {limited ? t.stats.limited : t.stats.unlimited}
              </span>
              <span className="flex items-center gap-0.5">
                <ArrowUp size={10} />
                {formatSpeed(stats?.upSpeed ?? 0)}
              </span>
            </div>
          </div>
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 opacity-60">
          <Sparkline values={history} height={38} color="var(--c-brand2)" />
        </div>
      </div>
      <Stat
        icon={<CircleCheck size={17} className="text-ok" />}
        label={t.stats.completed}
        value={stats?.completedCount ?? 0}
        hint={`${formatBytes(stats?.totalDownloaded ?? 0)} ${t.detail.downloaded.toLowerCase()}`}
        accent="color-mix(in srgb, var(--c-ok) 13%, transparent)"
      />
      <Stat
        icon={<HardDrive size={17} className="text-warn" />}
        label={t.stats.free}
        value={formatBytes(system?.freeDisk ?? 0)}
        hint={system?.platform === 'win32' ? 'Windows' : system?.platform === 'linux' ? 'Linux' : ''}
        accent="color-mix(in srgb, var(--c-warn) 13%, transparent)"
      />
    </div>
  )
}
