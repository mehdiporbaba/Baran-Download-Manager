import { useMemo, useState } from 'react'
import {
  ArrowDownUp,
  CircleCheck,
  CalendarClock,
  Copy,
  ExternalLink,
  FolderOpen,
  Pause,
  Play,
  RotateCw,
  Link2,
  MoreHorizontal,
  Search,
  Trash2,
  Trash,
  X
} from 'lucide-react'
import type { DownloadTask } from '@shared/types'
import { useApp, type SortId, type ViewId } from '../state'
import { cn, formatBytes, formatEta, formatSpeed, hostOf, percentOf, isActive } from '../lib/format'
import { EmptyArt, KindIcon, ProgressBar, StatusPill } from './primitives'
import { Modal } from './Modal'
import { ScheduleField, scheduledTime, localDateTime } from './ScheduleField'

function matchesView(task: DownloadTask, view: ViewId): boolean {
  switch (view) {
    case 'all':
      return true
    case 'scheduled':
      return task.status === 'queued' && Boolean(task.startAt && task.startAt > Date.now())
    case 'active':
      return isActive(task) || task.status === 'queued'
    case 'completed':
      return task.status === 'completed'
    case 'paused':
      return task.status === 'paused'
    case 'error':
      return task.status === 'error' || task.status === 'canceled'
    case 'youtube':
      return task.kind === 'youtube'
    case 'torrents':
      return task.kind === 'torrent'
    case 'direct':
      return task.kind === 'http'
    default:
      return task.category === view
  }
}

export function DownloadList(): React.JSX.Element {
  const { t, lang, tasks, view, query, sort, setSort, setSelectedId, selectedId, pushToast, openAdd, stats } =
    useApp()
  const [removeTarget, setRemoveTarget] = useState<DownloadTask | null>(null)
  const [deleteFile, setDeleteFile] = useState(false)
  const [scheduleTarget, setScheduleTarget] = useState<DownloadTask | null>(null)
  const [replaceTarget, setReplaceTarget] = useState<DownloadTask | null>(null)

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = tasks.filter((task) => matchesView(task, view))
    if (q) {
      list = list.filter(
        (task) =>
          task.name.toLowerCase().includes(q) ||
          task.url.toLowerCase().includes(q) ||
          (task.fileName || '').toLowerCase().includes(q) ||
          hostOf(task.url).toLowerCase().includes(q)
      )
    }
    const sorted = list.slice()
    switch (sort) {
      case 'newest':
        sorted.sort((a, b) => b.createdAt - a.createdAt)
        break
      case 'oldest':
        sorted.sort((a, b) => a.createdAt - b.createdAt)
        break
      case 'size':
        sorted.sort((a, b) => (b.size || 0) - (a.size || 0))
        break
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name))
        break
      case 'progress':
        sorted.sort((a, b) => percentOf(b) - percentOf(a))
        break
      default:
        break
    }
    return sorted
  }, [tasks, view, query, sort])

  const remove = async (): Promise<void> => {
    if (!removeTarget) return
    await window.pulse.removeTask(removeTarget.id, deleteFile)
    pushToast('info', t.toast.removed)
    setRemoveTarget(null)
    setDeleteFile(false)
  }

  const sortOptions: Array<{ id: SortId; label: string }> = [
    { id: 'newest', label: t.toolbar.sortNewest },
    { id: 'oldest', label: t.toolbar.sortOldest },
    { id: 'size', label: t.toolbar.sortSize },
    { id: 'name', label: t.toolbar.sortName },
    { id: 'progress', label: t.toolbar.sortProgress }
  ]

  return (
    <section className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center gap-2 px-5 pb-2 pt-0.5">
        <div className="text-[10px] font-medium uppercase tracking-wider text-faint">
          {filtered.length} {t.stats.tasks}
          {filtered.length > 0 ? (
            <span className="ms-1.5 normal-case tracking-normal text-faint/80">
              · {formatBytes(filtered.reduce((acc, x) => acc + (x.size || 0), 0))}
            </span>
          ) : null}
        </div>

        <div className="ms-auto flex items-center gap-1.5">
          {sort === 'newest' ? (
            <ArrowDownUp size={13} className="text-faint" />
          ) : (
            <ArrowDownUp size={13} className="text-brand" />
          )}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortId)}
            className="field h-7 cursor-pointer appearance-none bg-transparent border-transparent! px-1.5 text-[10.5px] text-muted hover:border-line2!"
          >
            {sortOptions.map((opt) => (
              <option key={opt.id} value={opt.id} className="bg-panel text-ink">
                {opt.label}
              </option>
            ))}
          </select>
          {tasks.some((x) => x.status === 'completed') ? (
            <button
              type="button"
              onClick={() => {
                void window.pulse.clearCompleted()
                pushToast('info', t.toast.removed)
              }}
              className="flex items-center gap-1 rounded-md px-1.5 py-1 text-[10px] text-faint transition hover:bg-elev2 hover:text-bad"
            >
              <Trash size={12} />
              {t.toolbar.clear}
            </button>
          ) : null}
        </div>
      </div>

      <div className={cn('scroll-y min-h-0 flex-1', view === 'all' ? 'compact-downloads px-3 pb-2' : 'px-5 pb-4')}>
        {filtered.length === 0 ? (
          <EmptyState
            filtered={tasks.length > 0}
            onAdd={() => openAdd()}
            title={tasks.length > 0 ? t.empty.filtered : t.empty.title}
            desc={tasks.length > 0 ? '' : t.empty.desc}
            addLabel={t.empty.add}
          />
        ) : (
          <div className={view === 'all' ? 'compact-download-table pb-2' : 'space-y-2 pb-2'} role={view === 'all' ? 'table' : undefined} aria-label={view === 'all' ? t.nav.all : undefined}>
            {view === 'all' && <div className="compact-download-grid compact-download-header" role="row"><span role="columnheader">{lang === 'fa' ? 'نام فایل / مبدأ' : 'File / source'}</span><span role="columnheader">{lang === 'fa' ? 'دریافت‌شده / حجم / پیشرفت' : 'Received / size / progress'}</span><span role="columnheader" className="compact-status">{lang === 'fa' ? 'وضعیت' : 'Status'}</span><span role="columnheader" className="compact-transfer">{lang === 'fa' ? 'سرعت / زمان باقی‌مانده' : 'Speed / time left'}</span><span role="columnheader">{lang === 'fa' ? 'عملیات' : 'Actions'}</span></div>}
            {filtered.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                compact={view === 'all'}
                selected={selectedId === task.id}
                onSelect={() => setSelectedId(task.id)}
                onSchedule={() => setScheduleTarget(task)}
                onReplace={() => setReplaceTarget(task)}
                onRemove={() => {
                  setRemoveTarget(task)
                  setDeleteFile(false)
                }}
                onToast={pushToast}
              />
            ))}
          </div>
        )}
        {view !== 'all' && stats && stats.activeCount > 0 ? (
          <div className="pb-4 text-center text-[10px] text-faint">
            {stats.activeCount} {t.stats.active.toLowerCase()} · {formatSpeed(stats.downSpeed)}
          </div>
        ) : null}
      </div>

      {scheduleTarget && <ScheduleDialog key={scheduleTarget.id} task={scheduleTarget} onClose={() => setScheduleTarget(null)} />}
      {replaceTarget && <ReplaceLinkDialog key={replaceTarget.id} task={replaceTarget} onClose={() => setReplaceTarget(null)} />}
      <Modal
        open={!!removeTarget}
        onClose={() => setRemoveTarget(null)}
        width={430}
        hideClose
      >
        <div className="p-5">
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-bad/12 text-bad">
              <Trash2 size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold">{t.common.removeTitle}</h3>
              <p className="mt-1 text-[11.5px] leading-relaxed text-muted">{t.common.removeDesc}</p>
              <div className="mt-2 truncate rounded-lg bg-elev2/60 px-2 py-1.5 text-[11px] text-muted">
                {removeTarget?.name}
              </div>
            </div>
          </div>
          <label className="mt-4 flex cursor-pointer items-center gap-2 text-[11.5px] text-muted">
            <input
              type="checkbox"
              checked={deleteFile}
              onChange={(e) => setDeleteFile(e.target.checked)}
              className="h-3.5 w-3.5 accent-[var(--c-bad)]"
            />
            {t.common.deleteFile}
          </label>
          <div className="mt-5 flex items-center justify-end gap-2">
            <button
              type="button"
              className="btn btn-ghost h-9 px-3 text-[11.5px]"
              onClick={() => setRemoveTarget(null)}
            >
              {t.common.cancel}
            </button>
            <button
              type="button"
              onClick={() => void remove()}
              className="btn h-9 border-bad/30 bg-bad/15 px-3 text-[11.5px] font-semibold text-bad hover:bg-bad/25"
            >
              <Trash2 size={14} />
              {t.common.delete}
            </button>
          </div>
        </div>
      </Modal>
    </section>
  )
}

function ReplaceLinkDialog({ task, onClose }: { task: DownloadTask; onClose: () => void }): React.JSX.Element {
  const { lang, pushToast } = useApp()
  const fa = lang === 'fa'
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const replace = async (): Promise<void> => {
    setBusy(true)
    try {
      await window.pulse.replaceUrl(task.id, url)
      pushToast('success', fa ? 'لینک تأیید و عوض شد. با دکمهٔ ادامه، دانلود را از همان‌جا دنبال کن.' : 'Link verified and replaced. Press Resume to continue from the saved position.')
      onClose()
    } catch (error) { pushToast('error', (error as Error).message) }
    finally { setBusy(false) }
  }
  return <Modal open onClose={() => { if (!busy) onClose() }} width={520}><div className="space-y-4 p-5">
    <h2 className="font-semibold">{fa ? 'تعویض لینک منقضی‌شده' : 'Replace expired download link'}</h2>
    <p className="truncate text-[12px] text-muted">{task.name} · {formatBytes(task.downloaded)}</p>
    <p className="text-[12px] leading-6 text-muted">{fa ? 'لینک تازهٔ همان فایل را وارد کن. حجم، شناسهٔ معتبر فایل و بخش‌هایی از دادهٔ ذخیره‌شده بررسی می‌شود. اگر تطابق تأیید نشود، فایل ناقص دست‌نخورده باقی می‌ماند. این بررسی به پشتیبانی Range و ETag معتبر از سمت سرور نیاز دارد.' : 'Enter a fresh URL for the same file. Baran checks size, a strong ETag and saved segment boundaries. If verification fails, the partial file is kept. The server must support Range requests and a strong ETag.'}</p>
    <input autoFocus className="field w-full px-3 py-2" type="url" dir="ltr" aria-label={fa ? 'لینک جدید فایل' : 'New file URL'} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://example.com/file?new-token=..." disabled={busy} />
    <div className="flex flex-wrap gap-2"><button className="btn btn-primary" disabled={busy || !url.trim()} onClick={() => void replace()}>{busy ? (fa ? 'در حال بررسی تطابق…' : 'Verifying file…') : (fa ? 'بررسی و تعویض لینک' : 'Verify and replace link')}</button><button className="btn btn-ghost" disabled={busy} onClick={onClose}>{fa ? 'انصراف' : 'Cancel'}</button></div>
  </div></Modal>
}

function ScheduleDialog({ task, onClose }: { task: DownloadTask; onClose: () => void }): React.JSX.Element {
  const { lang, pushToast } = useApp()
  const [value, setValue] = useState(localDateTime(task.startAt))
  const [busy, setBusy] = useState(false)
  const save = async (now: boolean): Promise<void> => {
    setBusy(true)
    try { await window.pulse.scheduleTask(task.id, now ? undefined : scheduledTime(value)); onClose() }
    catch (error) { pushToast('error', (error as Error).message) }
    finally { setBusy(false) }
  }
  return <Modal open onClose={onClose} width={480}><div className="space-y-4 p-5"><h2 className="font-semibold">{lang === 'fa' ? 'زمان‌بندی دانلود' : 'Schedule download'}</h2><p className="truncate text-[12px] text-muted">{task.name}</p><ScheduleField value={value} onChange={setValue} fa={lang === 'fa'} /><div className="flex gap-2"><button className="btn btn-primary" disabled={busy || !value} onClick={() => void save(false)}>{lang === 'fa' ? 'ذخیره زمان' : 'Save time'}</button><button className="btn btn-ghost" disabled={busy} onClick={() => void save(true)}>{lang === 'fa' ? 'شروع اکنون' : 'Start now'}</button></div></div></Modal>
}

function TaskRow({
  task,
  compact = false,
  selected,
  onSelect,
  onRemove,
  onSchedule,
  onReplace,
  onToast
}: {
  task: DownloadTask
  compact?: boolean
  selected: boolean
  onSelect: () => void
  onRemove: () => void
  onSchedule: () => void
  onReplace: () => void
  onToast: (level: 'info' | 'success' | 'error', message: string) => void
}): React.JSX.Element {
  const { t, lang } = useApp()
  const [moreOpen, setMoreOpen] = useState(false)
  const percent = percentOf(task)
  const active = task.status === 'downloading'
  const pausable = active || ['queued', 'connecting', 'verifying'].includes(task.status)
  const paused = task.status === 'paused' || task.status === 'error' || task.status === 'canceled'
  const completed = task.status === 'completed'

  const metaParts: string[] = []
  if (task.kind === 'youtube') {
    if (task.youtube?.quality) metaParts.push(task.youtube.quality)
    if (task.youtube?.duration) metaParts.push(`${Math.floor(task.youtube.duration / 60)}:${String(Math.floor(task.youtube.duration % 60)).padStart(2, '0')}`)
    if (task.youtube?.uploader) metaParts.push(task.youtube.uploader)
  } else if (task.kind === 'torrent') {
    metaParts.push(`${task.torrent?.peers ?? 0} ${t.row.peers}`)
    if (task.torrent?.files?.length) metaParts.push(`${task.torrent.files.length} ${t.detail.files}`)
    if (task.torrent?.ratio) metaParts.push(`${t.detail.ratio} ${task.torrent.ratio.toFixed(2)}`)
  } else {
    metaParts.push(hostOf(task.url))
    if (task.resumable) metaParts.push(`${task.connections || 0} ${t.row.connections}`)
  }
  if (task.status === 'error' && task.error) metaParts.push(task.error)
  if (task.startAt && task.status === 'queued') metaParts.push(`${lang === 'fa' ? 'شروع' : 'Starts'}: ${new Date(task.startAt).toLocaleString(lang)}`)

  const primaryAction = (): void => {
    if (completed) {
      void window.pulse.openTask(task.id)
    } else if (pausable) {
      void window.pulse.pauseTask(task.id)
    } else if (paused) {
      void window.pulse.resumeTask(task.id)
    }
  }

  const copyLink = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(task.url)
      onToast('success', t.toast.copied)
    } catch {
      onToast('error', 'Clipboard unavailable')
    }
  }

  if (compact) {
    const openProgress = (): void => { onSelect(); if (window.pulse.openProgressWindow) void window.pulse.openProgressWindow(task.id).catch(error => onToast('error', error.message)) }
    const speed = active ? formatSpeed(task.speed) : '—'
    const eta = active ? formatEta(task.eta, lang) : '—'
    return <>
      <div role="row" tabIndex={0} aria-selected={selected} className={cn('compact-download-grid compact-download-row row-hover', selected && 'row-selected')} onClick={onSelect} onDoubleClick={openProgress} onContextMenu={event => { event.preventDefault(); onSelect(); setMoreOpen(true) }} onKeyDown={event => { if (event.target === event.currentTarget && event.key === 'Enter') { event.preventDefault(); openProgress() } }}>
        <div role="cell" className="flex min-w-0 items-center gap-2"><KindIcon task={task} size={30}/><div className="min-w-0"><div className="truncate text-[13px] font-semibold" dir="auto" title={task.name}>{task.name}</div><div className="truncate text-xs text-muted" dir="auto" title={metaParts.join(' · ')}><span className="compact-inline-status">{t.status[task.status]} · </span>{metaParts.join(' · ')}</div><div className="compact-inline-transfer text-xs tabular text-muted">{speed} · {t.row.eta} {eta}</div></div></div>
        <div role="cell" className="min-w-0 space-y-1"><div className="flex items-center justify-between gap-2 text-xs tabular"><span className="truncate" dir="ltr">{formatBytes(task.downloaded)} / {task.size > 0 ? formatBytes(task.size) : '?'}</span><strong className="shrink-0 text-brand">{task.size > 0 ? `${percent.toFixed(0)}%` : '—'}</strong></div><ProgressBar task={task}/></div>
        <div role="cell" className="compact-status"><StatusPill status={task.status} label={t.status[task.status]}/></div>
        <div role="cell" className="compact-transfer min-w-0 text-xs tabular"><div className={active ? 'font-semibold text-brand2' : 'text-muted'}>{speed}</div><div className="truncate text-muted" title={`${t.row.eta} ${eta}`}>{t.row.eta} {eta}</div></div>
        <div role="cell" className="flex items-center justify-end gap-1" onDoubleClick={event => event.stopPropagation()}><button type="button" className="icon-btn h-8 w-8" aria-label={completed ? t.row.open : pausable ? t.row.pause : t.row.resume} title={completed ? t.row.open : pausable ? t.row.pause : t.row.resume} onClick={event => { event.stopPropagation(); primaryAction() }}>{completed ? <ExternalLink size={15}/> : pausable ? <Pause size={15}/> : <Play size={15}/>}</button><button type="button" className="icon-btn h-8 w-8" aria-label={lang === 'fa' ? 'عملیات بیشتر' : 'More actions'} title={lang === 'fa' ? 'عملیات بیشتر' : 'More actions'} onClick={event => { event.stopPropagation(); onSelect(); setMoreOpen(true) }}><MoreHorizontal size={17}/></button></div>
      </div>
      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} width={420}><div className="space-y-4 p-5"><h2 className="break-words pe-6 text-sm font-semibold" dir="auto">{task.name}</h2><div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" onClick={() => { setMoreOpen(false); openProgress() }}>{lang === 'fa' ? 'پنجرهٔ دانلود' : 'Download window'}</button>
        <button className="btn btn-ghost" onClick={() => { setMoreOpen(false); void window.pulse.revealTask(task.id) }}><FolderOpen size={14}/>{t.row.folder}</button>
        <button className="btn btn-ghost" onClick={() => { setMoreOpen(false); void copyLink() }}><Copy size={14}/>{t.row.copy}</button>
        {!completed && !['connecting','downloading','verifying'].includes(task.status) && <button className="btn btn-ghost" onClick={() => { setMoreOpen(false); onSchedule() }}><CalendarClock size={14}/>{lang === 'fa' ? 'زمان‌بندی' : 'Schedule'}</button>}
        {task.kind === 'http' && task.downloaded > 0 && ['paused','error'].includes(task.status) && <button className="btn btn-ghost" onClick={() => { setMoreOpen(false); onReplace() }}><Link2 size={14}/>{lang === 'fa' ? 'جایگزینی لینک' : 'Replace link'}</button>}
        <button className="btn btn-ghost text-bad" onClick={() => { setMoreOpen(false); onRemove() }}><Trash2 size={14}/>{t.row.remove}</button>
      </div>{task.error && <p className="break-words text-xs text-bad">{task.error}</p>}</div></Modal>
    </>
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelect}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && e.target === e.currentTarget) {
          e.preventDefault(); onSelect()
          if (window.pulse.openProgressWindow) void window.pulse.openProgressWindow(task.id).catch(error => onToast('error', error.message))
        }
      }}
      onDoubleClick={() => {
        if (window.pulse.openProgressWindow) void window.pulse.openProgressWindow(task.id).catch(error => onToast('error', error.message))
        else if (completed) void window.pulse.openTask(task.id)
      }}
      className={cn(
        'row-hover group relative cursor-pointer overflow-hidden rounded-xl2 border border-line/70 bg-panel/55 px-3.5 py-2.5',
        selected && 'row-selected'
      )}
    >
      {selected ? (
        <span className="absolute inset-y-3 start-0 w-[3px] rounded-full bg-gradient-to-b from-brand to-brand2" />
      ) : null}
      <div className="flex items-center gap-3">
        <KindIcon task={task} />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-[12.5px] font-semibold leading-tight" title={task.name}>
              {task.name}
            </span>
            <StatusPill status={task.status} label={t.status[task.status]} />
            {task.kind === 'youtube' && task.youtube?.audioOnly ? (
              <span className="chip py-0! text-[9px]!">audio</span>
            ) : null}
            {task.kind === 'torrent' && task.torrent?.seeding ? (
              <span className="chip border-ok/25! py-0! text-[9px]! text-ok!">seed</span>
            ) : null}
          </div>
          <div className="mt-0.5 flex items-center gap-1.5 truncate text-[10.5px] text-muted">
            <span className="truncate" dir="auto">
              {metaParts.join(' · ')}
            </span>
          </div>
          <div className="mt-2 flex items-center gap-2.5">
            <div className="flex-1">
              <ProgressBar task={task} />
            </div>
            <span className="w-9 shrink-0 text-end text-[10px] font-medium tabular text-muted">
              {task.size > 0 ? `${percent.toFixed(percent >= 10 ? 0 : 1)}%` : '—'}
            </span>
          </div>
        </div>

        <div className="flex w-[112px] shrink-0 flex-col items-end justify-center gap-0.5">
          <div
            className={cn(
              'text-[11.5px] font-semibold tabular',
              active ? 'text-brand2' : completed ? 'text-ok' : 'text-muted'
            )}
          >
            {active
              ? formatSpeed(task.speed)
              : completed
                ? formatBytes(task.size)
                : task.size > 0
                  ? formatBytes(task.size)
                  : '—'}
          </div>
          <div className="text-[9.5px] text-faint tabular">
            {active
              ? `${t.row.eta} ${formatEta(task.eta, lang)}`
              : task.status === 'paused'
                ? `${formatBytes(task.downloaded)} / ${task.size ? formatBytes(task.size) : '?'}`
                : task.status === 'queued'
                  ? t.status.queued
                  : task.status === 'connecting'
                    ? t.row.processing
                    : task.status === 'error'
                      ? (task.error || '').slice(0, 24)
                      : task.kind === 'torrent'
                        ? `${task.torrent?.peers ?? 0} ${t.row.peers}`
                        : t.status[task.status]}
          </div>
        </div>

        <div className="flex w-[84px] shrink-0 flex-wrap items-center justify-end gap-0.5 opacity-70 transition group-hover:opacity-100">
          {task.kind === 'http' && task.downloaded > 0 && ['paused', 'error'].includes(task.status) && <button type="button" className="icon-btn" title={lang === 'fa' ? 'تعویض لینک منقضی‌شده' : 'Replace expired link'} onClick={event => { event.stopPropagation(); onReplace() }}><Link2 size={14} /></button>}
          {!completed && !['connecting', 'downloading', 'verifying'].includes(task.status) && <button type="button" className="icon-btn" title={lang === 'fa' ? 'زمان‌بندی دانلود' : 'Schedule download'} onClick={event => { event.stopPropagation(); onSchedule() }}><CalendarClock size={14} /></button>}
          <button
            type="button"
            className="icon-btn"
            title={completed ? t.row.open : active ? t.row.pause : t.row.resume}
            onClick={(e) => {
              e.stopPropagation()
              primaryAction()
            }}
          >
            {completed ? (
              <ExternalLink size={14} />
            ) : pausable ? (
              <Pause size={14} />
            ) : task.status === 'error' ? (
              <RotateCw size={14} />
            ) : (
              <Play size={14} />
            )}
          </button>
          <button
            type="button"
            className="icon-btn hidden sm:grid"
            title={t.row.folder}
            onClick={(e) => {
              e.stopPropagation()
              void window.pulse.revealTask(task.id)
            }}
          >
            <FolderOpen size={14} />
          </button>
          <button
            type="button"
            className="icon-btn hidden lg:grid"
            title={t.row.copy}
            onClick={(e) => {
              e.stopPropagation()
              void copyLink()
            }}
          >
            <Copy size={13} />
          </button>
          <button
            type="button"
            className="icon-btn hover:text-bad!"
            title={t.row.remove}
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <X size={15} />
          </button>
        </div>
      </div>
    </div>
  )
}

function EmptyState({
  filtered,
  title,
  desc,
  addLabel,
  onAdd
}: {
  filtered: boolean
  title: string
  desc: string
  addLabel: string
  onAdd: () => void
}): React.JSX.Element {
  const { t } = useApp()
  return (
    <div className="anim-fade flex h-full min-h-[280px] flex-col items-center justify-center gap-4 py-10 text-center">
      <EmptyArt />
      <div>
        <h3 className="text-[14px] font-bold">{title}</h3>
        {desc ? <p className="mx-auto mt-1 max-w-xs text-[11.5px] leading-relaxed text-muted">{desc}</p> : null}
      </div>
      {!filtered ? (
        <button type="button" onClick={onAdd} className="btn btn-soft h-9 px-3.5 text-[11.5px]">
          <Search size={14} />
          {addLabel}
        </button>
      ) : (
        <div className="flex items-center gap-1.5 text-[10.5px] text-faint">
          <CircleCheck size={13} />
          {t.toolbar.clear}
        </div>
      )}
    </div>
  )
}
