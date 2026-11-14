import { useEffect, useMemo, useState } from 'react'
import { Download, Link2, Search, Square, Trash2 } from 'lucide-react'
import type { CollectedLink, ScanSummary } from '@shared/types'
import { useApp } from '../state'
import { formatBytes } from '../lib/format'
import { ScheduleField, scheduledTime } from './ScheduleField'

export function LinkGrabber(): React.JSX.Element {
  const { lang, settings, pushToast, query } = useApp()
  const fa = lang === 'fa'
  const tr = (en: string, persian: string): string => fa ? persian : en
  const [links, setLinks] = useState<CollectedLink[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [text, setText] = useState('')
  const [url, setUrl] = useState('')
  const [depth, setDepth] = useState(2)
  const [maxPages, setMaxPages] = useState(30)
  const [filter, setFilter] = useState('')
  const [dir, setDir] = useState(settings.downloadDir)
  const [busy, setBusy] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [summary, setSummary] = useState<ScanSummary | null>(null)
  const [message, setMessage] = useState('')
  const [startAt, setStartAt] = useState('')

  useEffect(() => {
    let disposed = false
    const refresh = (): void => {
      void window.pulse.linksList().then(rows => {
        if (disposed) return
        const generic = rows.filter(row => !/^https?:\/\/(www\.)?instagram\.com\//i.test(row.source || ''))
        setLinks(generic)
        const ids = new Set(generic.map(row => row.id))
        setSelected(previous => new Set([...previous].filter(id => ids.has(id))))
      }).catch(error => { if (!disposed) pushToast('error', String(error)) })
    }
    refresh()
    const unsubscribe = window.pulse.subscribe(event => { if (event.type === 'links:changed') refresh() })
    return () => { disposed = true; unsubscribe() }
  }, [pushToast])

  const visible = useMemo(() => links.filter(link => {
    const haystack = `${link.fileName} ${link.url}`.toLowerCase()
    return haystack.includes(query.toLowerCase()) && (!filter || link.fileName.toLowerCase().endsWith(filter.toLowerCase().replace(/^\*?/, '')))
  }), [links, query, filter])
  const selectedIds = visible.filter(link => selected.has(link.id)).map(link => link.id)
  const allSelected = visible.length > 0 && selectedIds.length === visible.length

  async function run(action: () => Promise<void>): Promise<void> {
    setBusy(true)
    setMessage('')
    try { await action() }
    catch (error) { const value = (error as Error).message; setMessage(value); pushToast('error', value) }
    finally { setBusy(false) }
  }
  async function scan(): Promise<void> {
    setScanning(true)
    setSummary(null)
    setMessage('')
    try { setSummary(await window.pulse.scanStart({ url, depth, maxPages })) }
    catch (error) { setMessage((error as Error).message) }
    finally { setScanning(false) }
  }
  const status = (link: CollectedLink): string => ({
    new: tr('Not checked', 'بررسی نشده'), checking: tr('Checking…', 'در حال بررسی…'),
    ready: tr('Available', 'در دسترس'), error: tr('Check failed', 'خطا در بررسی')
  })[link.status]

  return <section className="scroll-y flex min-h-0 flex-1 flex-col gap-4 p-4 text-[12px]">
    <div className="flex items-center gap-2 text-muted"><Link2 size={18} /><p>{tr('Collect, review and select files before downloading. This inbox lasts until you close the app.', 'لینک‌ها را جمع‌آوری و بررسی کن، سپس فایل‌های دلخواه را دانلود کن. این فهرست تا زمان بستن برنامه نگهداری می‌شود.')}</p></div>
    <div className="grid gap-4 xl:grid-cols-2">
      <div className="space-y-2 rounded-xl border border-line bg-panel p-4">
        <label className="block font-semibold" htmlFor="link-text">{tr('Paste links or text', 'متن یا لینک‌ها')}</label>
        <textarea id="link-text" className="field min-h-24 w-full p-3" dir="ltr" value={text} maxLength={2_000_000} onChange={event => setText(event.target.value)} placeholder="https://example.com/file.zip" />
        <div className="flex flex-wrap gap-2">
          <button className="btn btn-primary" disabled={busy || !text.trim()} onClick={() => void run(async () => {
            const count = await window.pulse.linksImport(text)
            setMessage(tr(`${count} new links added`, `${count} لینک جدید اضافه شد`))
            setText('')
          })}>{tr('Collect links', 'جمع‌آوری لینک‌ها')}</button>
          <label className="btn btn-ghost cursor-pointer">{tr('Import TXT', 'ورود فایل TXT')}<input className="hidden" type="file" accept=".txt,text/plain" disabled={busy} onChange={event => {
            const file = event.target.files?.[0]
            event.target.value = ''
            if (file) void run(async () => {
              if (file.size > 2_000_000) throw new Error(tr('Maximum file size is 2 MB', 'حداکثر حجم فایل ۲ مگابایت است'))
              const count = await window.pulse.linksImport(await file.text())
              setMessage(tr(`${count} new links added`, `${count} لینک جدید اضافه شد`))
            })
          }} /></label>
        </div>
      </div>
      <div className="space-y-3 rounded-xl border border-line bg-panel p-4">
        <label className="block font-semibold" htmlFor="scan-url">{tr('Scan a page or listed folder', 'اسکن صفحه یا پوشه دارای فهرست')}</label>
        <input id="scan-url" type="url" dir="ltr" className="field w-full p-2" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://example.com/downloads/" disabled={scanning} />
        <div className="flex flex-wrap items-end gap-3">
          <label>{tr('Depth', 'عمق')}<input aria-label={tr('Scan depth', 'عمق اسکن')} className="field ms-2 w-16 p-2" type="number" min={0} max={5} value={depth} disabled={scanning} onChange={event => setDepth(Number(event.target.value))} /></label>
          <label>{tr('Page limit', 'سقف صفحات')}<input aria-label={tr('Page limit', 'سقف صفحات')} className="field ms-2 w-20 p-2" type="number" min={1} max={100} value={maxPages} disabled={scanning} onChange={event => setMaxPages(Number(event.target.value))} /></label>
          <button className="btn btn-primary gap-2" disabled={scanning || !url.trim()} onClick={() => void scan()}><Search size={14} />{tr('Scan', 'اسکن')}</button>
          {scanning && <button className="btn btn-ghost gap-2" onClick={() => void run(async () => { await window.pulse.scanCancel() })}><Square size={12} />{tr('Stop', 'توقف')}</button>}
        </div>
        <p className="text-[11px] text-muted">{tr('Stays in this host and folder. Only linked files are discoverable; hidden files and sign-in pages need another method.', 'اسکن در همان میزبان و مسیر می‌ماند. فقط فایل‌های لینک‌شده قابل کشف‌اند؛ فایل‌های پنهان و صفحات نیازمند ورود روش دیگری می‌خواهند.')}</p>
        {scanning && <p role="status" className="text-brand">{tr('Scanning… discovered files appear below.', 'در حال اسکن… فایل‌های کشف‌شده در پایین نمایش داده می‌شوند.')}</p>}
      </div>
    </div>
    {message && <p role="status" className="rounded-lg bg-elev p-3">{message}</p>}
    {summary && <div role="status" className="space-y-1 rounded-lg bg-elev p-3">
      <p>{tr(`${summary.pages} pages checked · ${summary.found} file links found`, `${summary.pages} صفحه بررسی شد · ${summary.found} لینک فایل پیدا شد`)}</p>
      {summary.canceled && <p>{tr('Stopped. Discovered links were kept.', 'اسکن متوقف شد. لینک‌های پیدا شده حفظ شدند.')}</p>}
      {summary.limited && <p>{tr('A scan limit was reached; results may be incomplete.', 'اسکن به محدودیت رسید؛ نتیجه ممکن است کامل نباشد.')}</p>}
      {summary.errors.length > 0 && <details><summary>{tr('Pages that could not be scanned', 'صفحات بررسی‌نشده')} ({summary.errors.length})</summary>{summary.errors.map((error, index) => <p key={index} dir="ltr" className="break-all">{error}</p>)}</details>}
    </div>}
    <ScheduleField value={startAt} onChange={setStartAt} fa={fa} />
    <div className="flex flex-wrap items-center gap-2">
      <input aria-label={tr('File extension filter', 'فیلتر پسوند')} className="field w-32 p-2" dir="ltr" value={filter} onChange={event => setFilter(event.target.value)} placeholder=".zip" />
      <span className="text-muted">{selectedIds.length} / {visible.length} {tr('selected', 'انتخاب شده')}</span>
      <button className="btn btn-ghost" disabled={busy || !selectedIds.length} onClick={() => void run(async () => { await window.pulse.linksProbe(selectedIds) })}>{tr('Check selected', 'بررسی انتخاب‌شده‌ها')}</button>
      <button className="btn btn-ghost" aria-label={tr('Remove selected', 'حذف انتخاب‌شده‌ها')} disabled={busy || !selectedIds.length} onClick={() => void run(async () => { await window.pulse.linksRemove(selectedIds) })}><Trash2 size={14} /></button>
      <button className="btn btn-ghost ms-auto max-w-64 truncate" title={dir} disabled={busy} onClick={() => void run(async () => { const chosen = await window.pulse.chooseDir(dir); if (chosen) setDir(chosen) })}>{tr('Folder', 'پوشه')}: {dir}</button>
      <button className="btn btn-primary gap-2" disabled={busy || !selectedIds.length || !dir} onClick={() => void run(async () => {
        const result = await window.pulse.linksDownload(selectedIds, dir, scheduledTime(startAt))
        setMessage(tr(`${result.added} downloads queued`, `${result.added} دانلود به صف اضافه شد`) + (result.errors.length ? ` · ${result.errors.join('; ')}` : ''))
      })}><Download size={14} />{tr('Download selected', 'دانلود انتخاب‌شده‌ها')}</button>
    </div>
    <div className="min-h-48 overflow-auto rounded-xl border border-line">
      <table className="w-full text-start"><thead className="bg-elev text-muted"><tr>
        <th className="p-3"><input type="checkbox" aria-label={tr('Select all visible links', 'انتخاب همه لینک‌های قابل مشاهده')} checked={allSelected} onChange={() => setSelected(previous => {
          const next = new Set(previous)
          for (const link of visible) { if (allSelected) next.delete(link.id); else next.add(link.id) }
          return next
        })} /></th><th className="p-3 text-start">{tr('File / URL', 'فایل / نشانی')}</th><th className="p-3 text-start">{tr('Size', 'حجم')}</th><th className="p-3 text-start">{tr('Status', 'وضعیت')}</th>
      </tr></thead><tbody>{visible.map(link => <tr key={link.id} className="border-t border-line hover:bg-elev/60">
        <td className="p-3"><input type="checkbox" aria-label={link.fileName} checked={selected.has(link.id)} onChange={() => setSelected(previous => { const next = new Set(previous); if (next.has(link.id)) next.delete(link.id); else next.add(link.id); return next })} /></td>
        <td className="max-w-md p-3"><div className="truncate font-medium" dir="auto">{link.fileName}</div><div className="truncate text-[10px] text-muted" title={link.url} dir="ltr">{link.url}</div></td>
        <td className="whitespace-nowrap p-3" dir="ltr">{link.size ? formatBytes(link.size) : '—'}</td>
        <td className="p-3" title={link.error}>{status(link)}{link.error && <p className="max-w-48 break-words text-[10px] text-bad">{link.error}</p>}</td>
      </tr>)}</tbody></table>
      {!visible.length && <p className="p-10 text-center text-muted">{tr('Paste links, import a TXT file, or scan a folder to get started.', 'برای شروع لینک وارد کن، فایل TXT باز کن یا یک پوشه را اسکن کن.')}</p>}
    </div>
  </section>
}
