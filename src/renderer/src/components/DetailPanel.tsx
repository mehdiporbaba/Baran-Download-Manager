import { useEffect, useState } from 'react'
import {
  ChevronRight,
  Clock,
  Copy,
  ExternalLink,
  FolderOpen,
  Globe,
  HardDrive,
  Info,
  Link2,
  Pause,
  Play,
  ShieldCheck,
  Users,
  X,
  Zap
} from 'lucide-react'
import type { DownloadTask } from '@shared/types'
import { useApp } from '../state'
import {
  cn,
  compactNumber,
  fileNameOf,
  formatBytes,
  formatDate,
  formatDuration,
  formatEta,
  formatSpeed,
  hostOf,
  percentOf
} from '../lib/format'
import { KindIcon, ProgressBar, Ring, StatusPill } from './primitives'
import { ScheduleField, scheduledTime, localDateTime } from './ScheduleField'

export function DetailPanel(): React.JSX.Element {
  const { t, selected, lang, setSelectedId, pushToast } = useApp()

  if (!selected) {
    return (
      <aside className="hidden w-[280px] shrink-0 flex-col border-s border-line/70 bg-panel/35 2xl:flex">
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8 text-center">
          <div className="relative grid h-16 w-16 place-items-center rounded-2xl border border-line bg-elev/60">
            <Info size={22} className="text-faint" />
            <span className="absolute -end-1 -top-1 h-2 w-2 rounded-full bg-brand/70 live-dot" />
          </div>
          <div>
            <h3 className="text-[12.5px] font-semibold">{t.detail.selectFile}</h3>
            <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{t.detail.selectFileDesc}</p>
          </div>
        </div>
      </aside>
    )
  }

  const task = selected
  const percent = percentOf(task)
  const active = task.status === 'downloading'
  const tone =
    task.status === 'completed' ? 'ok' : task.status === 'error' ? 'bad' : task.status === 'paused' ? 'warn' : 'brand'
  const thumb = task.thumbnail || task.youtube?.thumbnail

  const copy = async (text: string): Promise<void> => {
    try {
      await navigator.clipboard.writeText(text)
      pushToast('success', t.toast.copied)
    } catch {
      pushToast('error', 'Clipboard unavailable')
    }
  }

  return (
    <aside className="hidden w-[280px] shrink-0 flex-col border-s border-line/70 bg-panel/35 xl:flex">
      <div className="flex shrink-0 items-center justify-between px-4 pb-2 pt-3.5">
        <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-faint">
          {t.detail.title}
        </div>
        <button type="button" className="icon-btn" onClick={() => setSelectedId(null)}>
          <X size={15} />
        </button>
      </div>

      <div className="scroll-y flex-1 px-4 pb-4">
        <div className="anim-fade">
          <TaskSchedule task={task} />
          <div className="flex items-start gap-3">
            {thumb ? (
              <div className="relative h-[62px] w-[104px] shrink-0 overflow-hidden rounded-xl border border-line bg-elev">
                <img src={thumb} alt="" className="h-full w-full object-cover" />
                {task.youtube?.duration ? (
                  <span className="absolute bottom-1 end-1 rounded bg-black/70 px-1 text-[9px] font-medium text-white">
                    {formatDuration(task.youtube.duration)}
                  </span>
                ) : null}
              </div>
            ) : (
              <KindIcon task={task} size={54} />
            )}
            <div className="min-w-0 flex-1">
              <h2 className="line-clamp-2 text-[12.5px] font-bold leading-snug" dir="auto" title={task.name}>
                {task.name}
              </h2>
              <div className="mt-1 flex items-center gap-1.5 text-[10px] text-muted">
                <Globe size={10} />
                <span className="truncate" dir="ltr">
                  {hostOf(task.url)}
                </span>
              </div>
              <div className="mt-1.5">
                <StatusPill status={task.status} label={t.status[task.status]} />
              </div>
            </div>
          </div>

          <div className="mt-4 flex items-center justify-center gap-5 rounded-xl2 border border-line/70 bg-elev/40 py-4">
            <Ring percent={percent} size={112} stroke={8} tone={tone}>
              <div className="text-center">
                <div className="text-[20px] font-extrabold leading-none tabular">
                  {task.size > 0 ? Math.round(percent) : '—'}
                  <span className="text-[11px] font-semibold text-muted">%</span>
                </div>
                <div className="mt-1 text-[9px] text-faint tabular">
                  {formatBytes(task.downloaded)}
                </div>
              </div>
            </Ring>
            <div className="space-y-2">
              <MiniStat label={t.detail.speed} value={active ? formatSpeed(task.speed) : '—'} accent={active} />
              <MiniStat label={t.detail.size} value={task.size ? formatBytes(task.size) : '?'} />
              <MiniStat
                label={t.detail.eta}
                value={active ? formatEta(task.eta, lang) : '—'}
              />
            </div>
          </div>

          <div className="mt-3 flex items-center gap-1.5">
            {task.status === 'completed' ? (
              <button
                type="button"
                onClick={() => void window.pulse.openTask(task.id)}
                className="btn btn-primary h-8 flex-1 text-[11px]"
              >
                <ExternalLink size={13} />
                {t.row.open}
              </button>
            ) : (
              <button
                type="button"
                onClick={() =>
                  void (isRunning(task)
                    ? window.pulse.pauseTask(task.id)
                    : window.pulse.resumeTask(task.id))
                }
                className="btn btn-primary h-8 flex-1 text-[11px]"
              >
                {isRunning(task) ? <Pause size={13} /> : <Play size={13} />}
                {isRunning(task) ? t.row.pause : t.row.resume}
              </button>
            )}
            <button
              type="button"
              className="icon-btn h-8! w-8! border border-line"
              title={t.row.folder}
              onClick={() => void window.pulse.revealTask(task.id)}
            >
              <FolderOpen size={14} />
            </button>
            <button
              type="button"
              className="icon-btn h-8! w-8! border border-line"
              title={t.row.copy}
              onClick={() => void copy(task.url)}
            >
              <Copy size={13} />
            </button>
          </div>

          {task.kind === 'http' && task.segments && task.segments.length > 1 ? (
            <div className="mt-4">
              <SectionTitle icon={<Zap size={12} />} label={t.detail.segments} />
              <div className="flex h-2.5 w-full gap-[2px] overflow-hidden rounded-full">
                {task.segments.map((seg, i) => {
                  const span = Math.max(1, seg.end - seg.start)
                  const pct = Math.max(0, Math.min(100, ((seg.position - seg.start) / span) * 100))
                  return (
                    <div
                      key={i}
                      className="relative h-full overflow-hidden rounded-full bg-elev2"
                      style={{ flexGrow: span, flexBasis: 0 }}
                      title={`#${i + 1} · ${pct.toFixed(0)}%`}
                    >
                      <div
                        className={cn('h-full rounded-full', pct >= 100 ? 'bg-ok' : 'bg-brand')}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  )
                })}
              </div>
              <div className="mt-1.5 flex items-center justify-between text-[9.5px] text-faint">
                <span>
                  {task.connections} / {task.segments.length} {t.row.connections}
                </span>
                <span className="flex items-center gap-1">
                  <ShieldCheck size={10} />
                  {task.resumable ? t.detail.yes : t.detail.no}
                </span>
              </div>
            </div>
          ) : null}

          {task.kind === 'torrent' && task.torrent ? (
            <div className="mt-4">
              <SectionTitle icon={<Users size={12} />} label={t.detail.files} />
              <div className="space-y-1.5">
                <div className="flex items-center justify-between rounded-lg bg-elev/50 px-2.5 py-2 text-[10px] text-muted">
                  <span className="flex items-center gap-1.5">
                    <Users size={11} /> {task.torrent.peers} {t.row.peers}
                  </span>
                  <span className="tabular">
                    {t.detail.ratio} {task.torrent.ratio.toFixed(2)}
                  </span>
                </div>
                {(task.torrent.files || []).slice(0, 30).map((file, i) => {
                  const filePercent = file.length ? (file.downloaded / file.length) * 100 : 0
                  return (
                    <div key={i} className="rounded-lg border border-line/60 bg-elev/30 px-2 py-1.5">
                      <div className="flex items-center gap-1.5 text-[10px]">
                        <span className="truncate" dir="auto">
                          {file.name}
                        </span>
                        <span className="ms-auto shrink-0 text-[9px] text-faint tabular">
                          {formatBytes(file.length)}
                        </span>
                      </div>
                      <div className="progress-track mt-1 h-1">
                        <div
                          className="progress-fill"
                          style={{ width: `${Math.min(100, filePercent)}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
                {(task.torrent.files?.length || 0) > 30 ? (
                  <div className="text-center text-[9.5px] text-faint">
                    +{(task.torrent.files?.length || 0) - 30} {t.detail.more}
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          <div className="mt-4">
            <SectionTitle icon={<Info size={12} />} label={t.detail.overview} />
            <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line/60 bg-elev/25">
              {task.kind === 'youtube' && task.youtube ? (
                <>
                  {task.youtube.quality ? <Meta label={t.detail.quality} value={task.youtube.quality} /> : null}
                  {task.youtube.uploader ? <Meta label={t.detail.channel} value={task.youtube.uploader} /> : null}
                  {task.youtube.duration ? (
                    <Meta label={t.detail.duration} value={formatDuration(task.youtube.duration)} />
                  ) : null}
                  <Meta
                    label={t.detail.format}
                    value={task.youtube.audioOnly ? task.youtube.audioFormat || 'audio' : 'video'}
                  />
                </>
              ) : null}
              {task.kind === 'torrent' && task.torrent ? (
                <>
                  <Meta label={t.detail.infoHash} value={task.torrent.infoHash.slice(0, 16) + '…'} mono />
                  <Meta label={t.detail.host} value={`${task.torrent.peers}`} />
                </>
              ) : null}
              <Meta label={t.detail.size} value={task.size ? formatBytes(task.size) : t.row.unknownSize} />
              {task.kind === 'http' ? (
                <Meta label={t.detail.resumable} value={task.resumable ? t.detail.yes : t.detail.no} />
              ) : null}
              <Meta label={t.detail.created} value={formatDate(task.createdAt, lang)} />
              {task.completedAt ? (
                <Meta label={t.detail.finished} value={formatDate(task.completedAt, lang)} />
              ) : null}
              <div className="flex items-start gap-2 px-2.5 py-2">
                <span className="w-[64px] shrink-0 text-[9.5px] text-faint">{t.detail.path}</span>
                <button
                  type="button"
                  onClick={() => void window.pulse.revealTask(task.id)}
                  className="flex min-w-0 flex-1 items-center gap-1 text-start text-[9.5px] text-muted hover:text-ink"
                  dir="ltr"
                  title={task.filePath || task.dir}
                >
                  <HardDrive size={10} className="shrink-0" />
                  <span className="truncate">{fileNameOf(task.filePath || task.fileName)}</span>
                  <ChevronRight size={10} className="shrink-0 flip-x" />
                </button>
              </div>
            </div>
          </div>

          <div className="mt-3">
            <SectionTitle icon={<Link2 size={12} />} label={t.detail.source} />
            <div className="rounded-xl border border-line/60 bg-elev/25 p-2">
              <div className="line-clamp-2 break-all text-[9.5px] leading-relaxed text-muted" dir="ltr">
                {task.url}
              </div>
              <div className="mt-1.5 flex items-center gap-2 text-[9px] text-faint">
                <Clock size={10} />
                <span>{formatDate(task.updatedAt, lang)}</span>
                <button
                  type="button"
                  className="ms-auto text-muted hover:text-ink"
                  onClick={() => void copy(task.url)}
                >
                  <Copy size={11} />
                </button>
              </div>
            </div>
          </div>

          {task.youtube?.viewCount ? (
            <div className="mt-2 flex items-center justify-center gap-1 text-[9.5px] text-faint">
              <Zap size={10} />
              {compactNumber(task.youtube.viewCount, lang)} {t.detail.views}
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  )
}

function TaskSchedule({ task }: { task: DownloadTask }): React.JSX.Element | null {
  const { lang, pushToast } = useApp()
  const [value, setValue] = useState(localDateTime(task.startAt))
  useEffect(() => setValue(localDateTime(task.startAt)), [task.id, task.startAt])
  if (['completed', 'connecting', 'downloading', 'verifying'].includes(task.status)) return null
  const save = async (now: boolean): Promise<void> => {
    try { await window.pulse.scheduleTask(task.id, now ? undefined : scheduledTime(value)) }
    catch (error) { pushToast('error', (error as Error).message) }
  }
  return <div className="mb-4 space-y-2 rounded-xl border border-brand/20 p-3">
    <ScheduleField value={value} onChange={setValue} fa={lang === 'fa'} />
    <div className="flex gap-2"><button className="btn btn-primary text-[10px]" disabled={!value} onClick={() => void save(false)}>{lang === 'fa' ? 'زمان‌بندی' : 'Schedule'}</button><button className="btn btn-ghost text-[10px]" onClick={() => void save(true)}>{lang === 'fa' ? 'شروع اکنون' : 'Start now'}</button></div>
  </div>
}

function isRunning(task: DownloadTask): boolean {
  return task.status === 'downloading' || task.status === 'connecting' || task.status === 'queued'
}

function MiniStat({
  label,
  value,
  accent
}: {
  label: string
  value: string
  accent?: boolean
}): React.JSX.Element {
  return (
    <div>
      <div className="text-[8.5px] uppercase tracking-wider text-faint">{label}</div>
      <div className={cn('text-[11px] font-semibold tabular', accent ? 'text-brand2' : 'text-ink')}>
        {value}
      </div>
    </div>
  )
}

function SectionTitle({ icon, label }: { icon: React.ReactNode; label: string }): React.JSX.Element {
  return (
    <div className="mb-1.5 flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-[0.12em] text-faint">
      {icon}
      {label}
    </div>
  )
}

function Meta({
  label,
  value,
  mono
}: {
  label: string
  value: string
  mono?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2 px-2.5 py-[7px]">
      <span className="w-[64px] shrink-0 text-[9.5px] text-faint">{label}</span>
      <span className={cn('min-w-0 flex-1 truncate text-[10px] text-ink/90', mono && 'font-mono')} dir="auto">
        {value}
      </span>
    </div>
  )
}
