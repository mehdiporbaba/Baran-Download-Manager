import { ArrowDownToLine, ArrowUpRight, CalendarClock, FolderSearch, Camera as Instagram, Link2, Settings2, Video } from 'lucide-react'
import { useApp, type ViewId } from '../state'
import { formatBytes, formatSpeed } from '../lib/format'
import { Logo } from './primitives'

export function Home(): React.JSX.Element {
  const { lang, stats, tasks, setView, openAdd, setSettingsOpen, system } = useApp()
  const fa = lang === 'fa'
  const tr = (en: string, persian: string): string => fa ? persian : en
  const actions: Array<{ view: ViewId; title: string; description: string; icon: React.ReactNode }> = [
    { view: 'links', title: tr('Link workspace', 'میز کار لینک‌ها'), description: tr('Collect links. Review files. Download together.', 'جمع‌آوری لینک، بررسی فایل و دانلود گروهی.'), icon: <Link2 size={22} /> },
    { view: 'scheduled', title: tr('Your time, your queue', 'دانلود در زمان دلخواه'), description: tr('Plan downloads and let Baran take the next shift.', 'شروع دانلودها را برای زمان مناسب برنامه‌ریزی کن.'), icon: <CalendarClock size={22} /> },
    { view: 'instagram', title: tr('Instagram media', 'رسانه‌های اینستاگرام'), description: tr('Photos, posts, reels and accessible stories.', 'عکس، پست، ریلز و استوری‌های قابل‌دسترسی.'), icon: <Instagram size={22} /> },
    { view: 'youtube', title: tr('Video & audio', 'ویدیو و صدا'), description: tr('Choose quality, audio or a whole playlist.', 'انتخاب کیفیت، دریافت صدا و پلی‌لیست.'), icon: <Video size={22} /> }
  ]
  return <section className="scroll-y min-h-0 flex-1 p-4 lg:p-5">
    <div className="relative overflow-hidden rounded-2xl border border-brand/25 bg-gradient-to-br from-brand/15 via-panel to-brand2/10 p-5 lg:p-7">
      <div className="pointer-events-none absolute -end-12 -top-14 h-52 w-52 rounded-full bg-brand2/10 blur-3xl" />
      <div className="flex items-center gap-3"><Logo size={46} /><div><div className="text-[10px] font-bold uppercase tracking-[0.22em] text-brand2">BARAN · YOUR DOWNLOAD WORKSPACE</div><h1 className="mt-1 text-xl font-extrabold tracking-tight" dir="ltr">Baran Download Manager</h1></div></div>
      <p className="mt-4 max-w-lg text-[13px] leading-7 text-muted">{tr('Bring every download into one calm workspace. Collect links, plan your queue, and keep the connection under your control.', 'هر دانلود، در جای خودش. لینک‌ها را یک‌جا جمع کن، صف را برای زمان دلخواه بچین و کنترل اتصال را در دست بگیر.')}</p>
      <div className="mt-4 flex flex-wrap gap-2"><button className="btn btn-primary gap-2" onClick={() => openAdd()}><ArrowDownToLine size={16} />{tr('New download', 'دانلود جدید')}</button><button className="btn btn-ghost gap-2" onClick={() => setView('links')}><FolderSearch size={16} />{tr('Scan a folder', 'اسکن پوشه')}</button><button className="btn btn-ghost gap-2" onClick={() => setSettingsOpen(true)}><Settings2 size={16} />{tr('Connection & speed', 'اتصال و سرعت')}</button></div>
    </div>
    <div className="my-4 grid grid-cols-3 gap-3">{[
      [tr('Downloading', 'در حال دریافت'), `${stats?.activeCount || 0}`],
      [tr('Current speed', 'سرعت فعلی'), formatSpeed(stats?.downSpeed || 0)],
      [tr('Completed', 'تکمیل شده'), `${tasks.filter(task => task.status === 'completed').length}`]
    ].map(([label, value]) => <div key={label} className="rounded-xl border border-line bg-panel/70 p-3"><p className="text-[10px] text-muted">{label}</p><p className="mt-1 text-lg font-bold tabular" dir="ltr">{value}</p></div>)}</div>
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">{actions.map(action => <button key={action.view} className="group flex items-start gap-3 rounded-xl border border-line bg-panel/60 p-4 text-start transition hover:border-brand/50 hover:bg-brand/5" onClick={() => { if (action.view === 'youtube') openAdd({ tab: 'video' }); else setView(action.view) }}><span className="rounded-xl bg-brand/10 p-2.5 text-brand">{action.icon}</span><span className="min-w-0 flex-1"><span className="block text-[13px] font-semibold">{action.title}</span><span className="mt-1 block text-[11px] leading-6 text-muted">{action.description}</span></span><ArrowUpRight size={14} className="text-faint transition group-hover:text-brand" /></button>)}</div>
    <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-faint"><span>{tr('Ready for the next download.', 'آماده برای دانلود بعدی.')} · v{system?.appVersion || '1.0.0'}</span><span>{tr('Available space', 'فضای آزاد')}: {formatBytes(system?.freeDisk || 0)}</span></div>
  </section>
}
