import { useEffect, useMemo, useState } from 'react'
import { Camera, Download, Film, Image as ImageIcon, Settings2 } from 'lucide-react'
import type { CollectedLink } from '@shared/types'
import { useApp } from '../state'
import { ScheduleField, scheduledTime } from './ScheduleField'

export function InstagramDownloader(): React.JSX.Element {
  const { lang, settings, setSettingsOpen, pushToast } = useApp()
  const fa = lang === 'fa'
  const tr = (en: string, persian: string): string => fa ? persian : en
  const [url, setUrl] = useState('')
  const [rows, setRows] = useState<CollectedLink[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [filter, setFilter] = useState<'all' | 'photo' | 'video'>('all')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [folder, setFolder] = useState(settings.downloadDir)
  const [time, setTime] = useState('')
  useEffect(() => {
    let disposed = false
    const refresh = (): void => { void window.pulse.linksList().then(links => {
      if (disposed) return
      const media = links.filter(link => link.source && /^https?:\/\/(www\.)?instagram\.com\//i.test(link.source))
      setRows(media)
      const ids = new Set(media.map(link => link.id))
      setSelected(previous => new Set([...previous].filter(id => ids.has(id))))
    }).catch(error => { if (!disposed) pushToast('error', (error as Error).message) }) }
    refresh()
    const unsubscribe = window.pulse.subscribe(event => { if (event.type === 'links:changed') refresh() })
    return () => { disposed = true; unsubscribe() }
  }, [pushToast])
  const isVideo = (link: CollectedLink): boolean => /\.(mp4|webm|mov)$/i.test(link.fileName)
  const visible = useMemo(() => rows.filter(link => filter === 'all' || (filter === 'video') === isVideo(link)), [rows, filter])
  const chosen = visible.filter(link => selected.has(link.id)).map(link => link.id)
  const run = async (action: () => Promise<void>): Promise<void> => {
    setBusy(true); setMessage('')
    try { await action() }
    catch (error) { setMessage((error as Error).message) }
    finally { setBusy(false) }
  }
  return <section className="scroll-y min-h-0 flex-1 space-y-4 p-4 lg:p-5">
    <div className="rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 via-panel to-brand2/10 p-5">
      <div className="flex items-center gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-brand/12 text-brand"><Camera size={23} /></span><div><h2 className="text-[16px] font-bold">{tr('Your Instagram media library', 'کتابخانه رسانه اینستاگرام')}</h2><p className="mt-1 text-[12px] leading-6 text-muted">{tr('A post, a reel, a carousel or an accessible story — choose the media you want to keep.', 'لینک پست، ریلز، آلبوم یا استوری قابل‌دسترسی را وارد کن و رسانه‌های دلخواه را انتخاب کن.')}</p></div></div>
      <label className="mt-5 block text-[12px] font-semibold" htmlFor="instagram-media-url">{tr('Instagram link', 'لینک اینستاگرام')}</label>
      <div className="mt-2 flex flex-wrap items-center gap-2"><input id="instagram-media-url" aria-label="Instagram URL" type="url" className="field h-10 min-w-48 flex-1 px-3 text-[12px]" dir="ltr" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://www.instagram.com/reel/…" /><button className="btn btn-primary" disabled={busy || !url.trim()} onClick={() => void run(async () => { const count = await window.pulse.instagramCollect(url); setMessage(tr(`${count} new media items found. Select the ones you want below.`, `${count} رسانه جدید پیدا شد. موارد دلخواه را در پایین انتخاب کن.`)) })}>{busy ? tr('Working…', 'در حال بررسی…') : tr('Find media', 'دریافت رسانه‌ها')}</button></div>
      <div className="mt-3 flex flex-wrap gap-2"><button className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => { await window.pulse.installGallery(); setMessage(tr('Instagram tool is ready. Paste a link to begin.', 'ابزار اینستاگرام آماده است. یک لینک وارد کن.')) })}>{tr('Install / update Instagram tool', 'نصب / به‌روزرسانی ابزار اینستاگرام')}</button><button className="btn btn-ghost gap-2" onClick={() => setSettingsOpen(true)}><Settings2 size={14} />{tr('Browser session settings', 'تنظیم نشست مرورگر')}</button></div>
      <p className="mt-3 text-[11px] leading-6 text-muted">{tr('Public media may work without login. Restricted posts and stories need your authorized browser session in Settings → Tools. Up to 100 items per link; availability depends on Instagram.', 'محتوای عمومی ممکن است بدون ورود دریافت شود. پست محدود و استوری به نشست مجاز مرورگر در تنظیمات ← ابزارها نیاز دارند. سقف هر لینک ۱۰۰ رسانه است و دسترسی به اینستاگرام بستگی دارد.')}</p>
    </div>
    {message && <p role="status" className="rounded-xl border border-line bg-elev p-3 text-[12px] leading-6">{message}</p>}
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex gap-2">{(['all', 'photo', 'video'] as const).map(kind => <button key={kind} className={`btn ${filter === kind ? 'btn-soft' : 'btn-ghost'}`} onClick={() => setFilter(kind)}>{kind === 'all' ? tr('All media', 'همه رسانه‌ها') : kind === 'photo' ? tr('Photos', 'عکس‌ها') : tr('Videos', 'ویدیوها')}</button>)}</div><span className="text-[12px] text-muted">{chosen.length} / {visible.length} {tr('selected', 'انتخاب شده')}</span></div>
    {!visible.length ? <div className="rounded-2xl border border-dashed border-line2 bg-panel/50 p-8 text-center"><Camera size={36} className="mx-auto mb-3 text-brand/60" /><h3 className="text-[14px] font-semibold">{tr('Your media will appear here', 'رسانه‌ها اینجا نمایش داده می‌شوند')}</h3><p className="mt-2 text-[12px] leading-7 text-muted">{tr('Paste a specific Instagram link above. Photos and videos are kept separate from the generic link workspace.', 'یک لینک مشخص اینستاگرام وارد کن. عکس‌ها و ویدیوها در این بخش مستقل از لینک‌گیر عمومی نمایش داده می‌شوند.')}</p></div> : <>
      <label className="flex items-center gap-2 text-[12px]"><input type="checkbox" checked={visible.length > 0 && chosen.length === visible.length} onChange={() => setSelected(previous => { const next = new Set(previous); for (const link of visible) { if (chosen.length === visible.length) next.delete(link.id); else next.add(link.id) } return next })} />{tr('Select all visible media', 'انتخاب همه رسانه‌های قابل مشاهده')}</label>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">{visible.map(link => <label key={link.id} className={`cursor-pointer rounded-xl border p-4 ${selected.has(link.id) ? 'border-brand/50 bg-brand/8' : 'border-line bg-panel'}`}><div className="flex items-center justify-between"><span className="grid h-14 w-14 place-items-center rounded-xl bg-brand/10 text-brand">{isVideo(link) ? <Film size={26} /> : <ImageIcon size={26} />}</span><input type="checkbox" aria-label={link.fileName} checked={selected.has(link.id)} onChange={() => setSelected(previous => { const next = new Set(previous); if (next.has(link.id)) next.delete(link.id); else next.add(link.id); return next })} /></div><p className="mt-3 truncate text-[12px] font-semibold" dir="ltr" title={link.fileName}>{link.fileName}</p><p className="mt-1 text-[11px] text-muted">{isVideo(link) ? tr('Video', 'ویدیو') : tr('Photo', 'عکس')}</p></label>)}</div>
      <div className="space-y-3 rounded-xl border border-line bg-panel p-4"><ScheduleField value={time} onChange={setTime} fa={fa} /><div className="flex flex-wrap items-center gap-2"><button className="btn btn-ghost max-w-full truncate" title={folder} onClick={() => void run(async () => { const value = await window.pulse.chooseDir(folder); if (value) setFolder(value) })}>{tr('Destination folder', 'پوشه مقصد')}</button><button className="btn btn-primary gap-2" disabled={busy || !chosen.length} onClick={() => void run(async () => { const result = await window.pulse.linksDownload(chosen, folder, scheduledTime(time)); setMessage(tr(`${result.added} media downloads queued`, `${result.added} رسانه به صف دانلود اضافه شد`) + (result.errors.length ? ` · ${result.errors.join('; ')}` : '')) })}><Download size={15} />{tr('Download selected media', 'دانلود رسانه‌های انتخاب‌شده')}</button></div></div>
    </>}
  </section>
}
