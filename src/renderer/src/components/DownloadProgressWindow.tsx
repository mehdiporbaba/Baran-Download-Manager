import { useEffect, useState } from 'react'
import { FolderOpen, Pause, Play, EyeOff, ExternalLink } from 'lucide-react'
import { useApp } from '../state'
import { formatBytes, formatEta, formatSpeed, hostOf, percentOf } from '../lib/format'
import { KindIcon, ProgressBar, StatusPill } from './primitives'

const words = {
  en: { title: 'Download', status: 'Status', limit: 'Speed limit', options: 'Completion & tools', downloaded: 'Downloaded', size: 'File size', speed: 'Transfer rate', eta: 'Time left', resume: 'Resume', pause: 'Pause', open: 'Open file', folder: 'Open folder', hide: 'Hide', stop: 'Stop and keep partial', stopping: 'Applying…', unknown: 'Unknown', yes: 'Yes', no: 'No', resumable: 'Resume supported', connections: 'Connections', details: 'Connection details', position: 'Range', done: 'Received', state: 'State', active: 'Receiving', complete: 'Finished', pending: 'Waiting', limitHint: 'This direct download only. KiB/s; 0 means unlimited. The global limit also applies.', save: 'Save', unsupported: 'Per-download limits and checksum options currently support direct downloads.', expected: 'Expected SHA-256', checksumHint: 'Pause first, then enter the checksum published by the file owner. A mismatch keeps the partial file and prevents completion.', actual: 'Calculated SHA-256', destination: 'Destination', source: 'Source', replace: 'Replace expired link', replaceHint: 'Pause first. Baran verifies that the new address belongs to the same resumable file before keeping the saved offsets.', closeHint: 'Closing or hiding this window keeps the download running.', empty: 'This download no longer exists.', loading: 'Loading download…', invalidLimit: 'Enter a non-negative whole number of KiB/s.', invalidHash: 'Enter 64 hexadecimal characters or leave the checksum empty.', checksumSaved: 'Checksum saved.', limitSaved: 'Speed limit saved.', replaced: 'New link verified. Resume when ready.' },
  fa: { title: 'دانلود', status: 'وضعیت', limit: 'محدودیت سرعت', options: 'پایان دانلود و ابزارها', downloaded: 'دریافت‌شده', size: 'حجم فایل', speed: 'سرعت انتقال', eta: 'زمان باقی‌مانده', resume: 'ادامه', pause: 'توقف موقت', open: 'بازکردن فایل', folder: 'نمایش پوشه', hide: 'پنهان‌کردن', stop: 'توقف و حفظ فایل ناقص', stopping: 'در حال اعمال…', unknown: 'نامشخص', yes: 'بله', no: 'خیر', resumable: 'پشتیبانی از ادامه', connections: 'اتصال‌ها', details: 'جزئیات اتصال‌ها', position: 'بازه', done: 'دریافت‌شده', state: 'وضعیت', active: 'دریافت', complete: 'پایان‌یافته', pending: 'در انتظار', limitHint: 'فقط همین دانلود مستقیم؛ بر حسب KiB/s. مقدار صفر یعنی بدون محدودیت. سقف سرعت سراسری هم اعمال می‌شود.', save: 'ذخیره', unsupported: 'محدودیت سرعت هر فایل و بررسی چک‌سام فعلاً برای دانلود مستقیم است.', expected: 'هش SHA-256 مورد انتظار', checksumHint: 'ابتدا دانلود را متوقف کن و سپس هش اعلام‌شدهٔ مالک فایل را وارد کن. عدم تطابق، فایل ناقص را حفظ می‌کند و مانع تکمیل دانلود می‌شود.', actual: 'هش SHA-256 محاسبه‌شده', destination: 'محل ذخیره', source: 'مبدأ', replace: 'جایگزینی لینک منقضی‌شده', replaceHint: 'ابتدا توقف موقت بزن. باران پیش از حفظ موقعیت بخش‌های دریافت‌شده، یکسان‌بودن فایل و قابلیت ادامهٔ لینک جدید را بررسی می‌کند.', closeHint: 'بستن یا پنهان‌کردن این پنجره، دانلود را متوقف نمی‌کند.', empty: 'این دانلود دیگر وجود ندارد.', loading: 'در حال بارگذاری دانلود…', invalidLimit: 'یک عدد صحیح نامنفی برای KiB/s وارد کن.', invalidHash: '۶۴ نویسهٔ هگزادسیمال وارد کن یا هش را خالی بگذار.', checksumSaved: 'هش مورد انتظار ذخیره شد.', limitSaved: 'محدودیت سرعت ذخیره شد.', replaced: 'لینک جدید تأیید شد؛ می‌توانی دانلود را ادامه بدهی.' }
}

export function DownloadProgressWindow({ taskId }: { taskId: string }): React.JSX.Element {
  const { tasks, ready, loadError, lang, t, settings } = useApp()
  const text = lang === 'fa' ? words.fa : words.en
  const task = tasks.find(row => row.id === taskId)
  const [showDetails, setShowDetails] = useState(true)
  const [tab, setTab] = useState<'status' | 'limit' | 'options'>('status')
  const [limit, setLimit] = useState('0')
  const [checksum, setChecksum] = useState('')
  const [url, setUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  useEffect(() => { setLimit(String((task?.speedLimit || 0) / 1024)) }, [task?.speedLimit])
  useEffect(() => { setChecksum(task?.expectedSha256 || '') }, [task?.expectedSha256])
  const action = async (operation: () => Promise<unknown>, success = ''): Promise<void> => {
    if (busy) return
    setBusy(true); setError(''); setMessage('')
    try { await operation(); setMessage(success) } catch (e) { setError(e instanceof Error ? e.message : String(e)) } finally { setBusy(false) }
  }
  if (!task) return <main className="grid h-full place-items-center p-6 text-center text-muted">{loadError || (ready ? text.empty : text.loading)}</main>
  const active = ['connecting', 'downloading', 'verifying'].includes(task.status)
  const stopped = ['paused', 'error', 'canceled'].includes(task.status)
  const progress = percentOf(task)
  const direct = task.kind === 'http'
  return <main className="flex h-full min-w-0 flex-col overflow-hidden bg-app text-ink" aria-label={text.title}>
    <header className="flex shrink-0 items-center gap-3 border-b border-line bg-panel/60 p-4">
      <KindIcon task={task} size={42} />
      <div className="min-w-0 flex-1"><h1 className="truncate text-base font-bold" dir="auto" title={task.name}>{task.name}</h1><p className="mt-1 truncate text-xs text-muted" dir="ltr">{hostOf(task.url)}</p></div>
      <StatusPill status={task.status} label={t.status[task.status]} />
    </header>
    <nav role="tablist" aria-label={text.title} className="flex shrink-0 gap-1 border-b border-line p-2">
      {(['status', 'limit', 'options'] as const).map((key, index) => <button key={key} type="button" role="tab" id={`tab-${key}`} aria-selected={tab === key} aria-controls={`panel-${key}`} tabIndex={tab === key ? 0 : -1}
        onKeyDown={e => { if (!['ArrowLeft','ArrowRight','Home','End'].includes(e.key)) return; e.preventDefault(); const all = ['status','limit','options'] as const; const next = e.key === 'Home' ? 0 : e.key === 'End' ? 2 : (index + (e.key === 'ArrowRight' ? 1 : 2)) % 3; setTab(all[next]); document.getElementById(`tab-${all[next]}`)?.focus() }}
        onClick={() => setTab(key)} className={`rounded-lg px-3 py-2 text-xs font-semibold ${tab === key ? 'bg-brand/15 text-brand' : 'text-muted hover:bg-elev'}`}>{text[key]}</button>)}
    </nav>
    <section role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`} className="scroll-y min-h-0 flex-1 space-y-4 overflow-x-hidden p-4">
      {tab === 'status' && <>
        <div className="rounded-xl border border-line bg-panel p-4"><div className="mb-3 flex items-center justify-between gap-3"><span className="text-sm font-semibold">{t.status[task.status]}</span><strong className="tabular text-lg text-brand2">{task.size > 0 ? `${progress.toFixed(1)}%` : '—'}</strong></div><ProgressBar task={task} />
          <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">{[[text.downloaded,formatBytes(task.downloaded)],[text.size,task.size > 0 ? formatBytes(task.size) : text.unknown],[text.speed,task.status === 'downloading' ? formatSpeed(task.speed) : '—'],[text.eta,task.status === 'downloading' ? formatEta(task.eta,lang) : '—'],[text.resumable,task.resumable === undefined ? text.unknown : task.resumable ? text.yes : text.no],[text.connections,String(task.connections)]].map(([label,value]) => <div key={label}><dt className="text-muted">{label}</dt><dd className="mt-1 break-words font-semibold tabular">{value}</dd></div>)}</dl>
        </div>
        {task.segments?.length ? <div className="space-y-3">
          <button type="button" className="btn btn-ghost text-xs" aria-expanded={showDetails} aria-controls="connection-details" onClick={() => setShowDetails(value => !value)}>{lang === 'fa' ? showDetails ? 'پنهان‌کردن جزئیات' : 'نمایش جزئیات' : showDetails ? 'Hide details' : 'Show details'}</button>
          {showDetails && <section id="connection-details" className="space-y-3 rounded-xl border border-line bg-panel p-3" aria-label={text.details}>
            <h2 className="text-xs font-semibold">{lang === 'fa' ? 'موقعیت و پیشرفت بخش‌های فایل' : 'File ranges and connection progress'}</h2>
            {task.size > 0 && <div className="relative h-5 overflow-hidden rounded-md border border-line bg-elev" dir="ltr" aria-label={text.details}>
              {task.segments.map((part,index) => <div key={index} className="absolute inset-y-0 border-s border-brand/60 bg-brand/10" style={{left:`${100*part.start/task.size}%`,width:`${100*(part.end-part.start)/task.size}%`}} title={`#${index+1}: ${part.start}–${part.end}`}>
                <div className="h-full bg-gradient-to-r from-brand to-brand2" style={{width:`${Math.max(0,Math.min(100,100*(part.position-part.start)/Math.max(1,part.end-part.start)))}%`}} />
              </div>)}
            </div>}
            <table className="w-full table-fixed text-start text-[11px]"><thead className="text-muted"><tr><th className="w-10 py-2 text-start">#</th><th className="py-2 text-start">{text.downloaded}</th><th className="py-2 text-start">{text.state}</th></tr></thead><tbody>
              {task.segments.map((part,index) => { const size = Math.max(0,part.end-part.start), received = Math.max(0,part.position-part.start); return <tr key={index} className="border-t border-line/60"><td className="py-2 tabular">{index+1}</td><td className="py-2 tabular" title={`${part.start}–${part.end}`}><span dir="ltr">{formatBytes(received)}</span><span className="mt-0.5 block text-[10px] text-faint" dir="ltr">/ {size > 0 ? formatBytes(size) : text.unknown}</span></td><td className="py-2">{size > 0 && received >= size ? text.complete : active ? text.active : text.pending}</td></tr> })}
            </tbody></table>
          </section>}
        </div> : null}
        {task.torrent && <div className="rounded-xl border border-line bg-panel p-3 text-xs">{t.detail.peers}: {task.torrent.peers} · {lang === 'fa' ? 'فرستنده‌ها' : 'Seeds'}: {task.torrent.seeds}<div className="mt-2">↑ {formatSpeed(task.torrent.uploadSpeed)} · {formatBytes(task.torrent.uploaded)}</div></div>}
      </>}
      {tab === 'limit' && (direct ? <form className="space-y-3" onSubmit={e => { e.preventDefault(); const value = Number(limit); if (!Number.isSafeInteger(value) || value < 0 || value > 1073741824) { setError(text.invalidLimit); return } void action(() => window.pulse.setTaskSpeedLimit!(task.id,value*1024),text.limitSaved) }}><p className="text-xs leading-relaxed text-muted">{text.limitHint}</p><label className="block text-xs">KiB/s<input className="field mt-2 w-full" type="number" min="0" step="1" dir="ltr" value={limit} onChange={e => setLimit(e.target.value)} /></label><button className="btn btn-primary" disabled={busy} type="submit">{text.save}</button></form> : <p className="text-sm text-muted">{text.unsupported}</p>)}
      {tab === 'options' && <>
        <div className="space-y-3 rounded-xl border border-line bg-panel p-3">
          <label className="flex items-start gap-3 text-xs leading-relaxed"><input className="mt-0.5" type="checkbox" checked={Boolean(task.closeProgressOnComplete)} disabled={busy} onChange={e => void action(() => window.pulse.setTaskCloseOnComplete!(task.id,e.target.checked))}/><span>{lang === 'fa' ? 'پس از تکمیل، فقط این پنجره بسته شود' : 'Close this window when the download completes'}</span></label>
          <p className="text-xs leading-relaxed text-muted">{lang === 'fa' ? 'فایل خودکار اجرا نمی‌شود. وظیفه و فایل دریافت‌شده در باران باقی می‌مانند.' : 'The file is never run automatically. The task and downloaded file remain in Baran.'}</p>
          <div className="flex flex-wrap gap-2"><button className="btn btn-ghost" disabled={task.status !== 'completed' || busy} onClick={() => void action(() => window.pulse.openTask(task.id))}>{text.open}</button><button className="btn btn-ghost" disabled={busy} onClick={() => void action(() => window.pulse.revealTask(task.id))}>{text.folder}</button></div>
        </div>
        <div className="space-y-2 text-xs"><h2 className="font-semibold">{text.destination}</h2><p className="break-all rounded-lg border border-line bg-panel p-3" dir="auto">{task.filePath || task.dir}</p><h2 className="pt-2 font-semibold">{text.source}</h2><p className="break-all rounded-lg border border-line bg-panel p-3" dir="ltr">{task.url}</p></div>
        {direct ? <>
          <form className="space-y-2 rounded-xl border border-line bg-panel p-3" onSubmit={e => { e.preventDefault(); if (checksum && !/^[a-f0-9]{64}$/i.test(checksum.trim())) { setError(text.invalidHash); return } void action(() => window.pulse.setTaskChecksum!(task.id,checksum.trim()),text.checksumSaved) }}><label className="block text-xs font-semibold">{text.expected}<input className="field mt-2 w-full font-mono text-xs" dir="ltr" value={checksum} onChange={e => setChecksum(e.target.value)} disabled={!stopped || busy} /></label><p className="text-xs leading-relaxed text-muted">{text.checksumHint}</p><button className="btn btn-ghost" type="submit" disabled={!stopped || busy}>{text.save}</button>{task.checksum && <p className="break-all font-mono text-xs" dir="ltr">{text.actual}: {task.checksum}</p>}</form>
          <form className="space-y-2 rounded-xl border border-line bg-panel p-3" onSubmit={e => { e.preventDefault(); void action(() => window.pulse.replaceUrl(task.id,url),text.replaced) }}><label className="block text-xs font-semibold">{text.replace}<input className="field mt-2 w-full text-xs" type="url" dir="ltr" required value={url} onChange={e => setUrl(e.target.value)} disabled={!stopped || busy} /></label><p className="text-xs leading-relaxed text-muted">{text.replaceHint}</p><button className="btn btn-ghost" disabled={!stopped || busy} type="submit">{text.replace}</button></form>
        </> : <p className="text-xs text-muted">{text.unsupported}</p>}
      </>}
      {task.error && <p role="alert" className="break-words rounded-lg border border-bad/30 bg-bad/10 p-3 text-xs text-bad">{task.error}</p>}
    </section>
    <footer className="shrink-0 space-y-2 border-t border-line bg-panel/60 p-3">
      {(error || message || busy) && <p role={error ? 'alert' : 'status'} className={`break-words text-xs ${error ? 'text-bad' : 'text-muted'}`}>{error || (busy ? text.stopping : message)}</p>}
      <div className="flex flex-wrap gap-2">
        {task.status === 'completed' ? <button className="btn btn-primary" disabled={busy} onClick={() => void action(() => window.pulse.openTask(task.id))}><ExternalLink size={14}/>{text.open}</button>
          : <button className="btn btn-primary" disabled={busy} onClick={() => void action(() => active || task.status === 'queued' ? window.pulse.pauseTask(task.id) : window.pulse.resumeTask(task.id))}>{active || task.status === 'queued' ? <Pause size={14}/> : <Play size={14}/>}{active || task.status === 'queued' ? text.pause : text.resume}</button>}
        <button className="btn btn-ghost" disabled={busy} onClick={() => void action(() => window.pulse.revealTask(task.id))}><FolderOpen size={14}/>{text.folder}</button>
        {task.status !== 'completed' && <button className="btn btn-ghost" disabled={busy} onClick={() => void action(async () => { await window.pulse.pauseTask(task.id); void window.pulse.windowControl('close') })}>{text.stop}</button>}
        <button className="btn btn-ghost ms-auto" onClick={() => void window.pulse.windowControl('hide')}><EyeOff size={14}/>{text.hide}</button>
      </div>
      <p className="text-[11px] leading-relaxed text-muted">{text.closeHint}</p>
    </footer>
  </main>
}
