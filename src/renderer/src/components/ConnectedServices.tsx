import { useEffect, useState } from 'react'
import { useApp } from '../state'

interface Status {
  debridConfigured: boolean
  providers: Array<{ id: string; configured: boolean; pending: { id: string } | null }>
  mobile: { running: boolean; url: string; token: string; addresses: string[] }
  interfaces: Array<{ id: string; name: string; up: boolean; addresses: string[] }>
  vpnInterfaceId: string
  wakeEnabled: boolean
  wakeError: string
  nextWake: number
}

export function ConnectedServices(): React.JSX.Element {
  const { settings, pushToast } = useApp()
  const fa = settings.language === 'fa'
  const [status, setStatus] = useState<Status>()
  const [busy, setBusy] = useState(false)
  const [token, setToken] = useState('')
  const [link, setLink] = useState('')
  const [address, setAddress] = useState('')
  const [vpn, setVpn] = useState('')
  const [account, setAccount] = useState('')
  const [provider, setProvider] = useState('real-debrid')
  const providers = { 'real-debrid': ['Real-Debrid', 'https://real-debrid.com/apitoken'], alldebrid: ['AllDebrid', 'https://alldebrid.com/apikeys/'], premiumize: ['Premiumize', 'https://www.premiumize.me/account'], torbox: ['TorBox', 'https://torbox.app/settings'] } as const
  const api = window.pulse.connected
  async function refresh(): Promise<void> {
    if (!api) return
    const value = await api('status') as Status
    setStatus(value)
    setVpn(value.vpnInterfaceId)
    setAddress(previous => previous || value.mobile.addresses[0] || '')
  }
  useEffect(() => { void refresh().catch(error => pushToast('error', error.message)) }, [])
  async function run(work: () => Promise<void>): Promise<void> {
    setBusy(true)
    try { await work(); await refresh() } catch (error) { pushToast('error', (error as Error).message) } finally { setBusy(false) }
  }
  if (!api) return <p>{fa ? 'این امکانات به نسخهٔ Native باران نیاز دارند.' : 'These services require the native Windows build.'}</p>
  if (!status) return <p>{fa ? 'در حال دریافت وضعیت…' : 'Loading services…'}</p>
  const box = 'space-y-3 rounded-xl border border-line bg-panel/50 p-4'
  const input = 'field w-full min-w-0 px-3 py-2 text-[12px]'
  const selected = status.providers?.find(item => item.id === provider)
  const configured = selected?.configured ?? (provider === 'real-debrid' && status.debridConfigured)
  const providerInfo = providers[provider as keyof typeof providers]
  return <div className="space-y-5 text-[12px] leading-7">
    <p className="text-muted">{fa ? 'دکمه‌های این صفحه تغییرات را همان لحظه اعمال می‌کنند.' : 'Buttons on this page apply changes immediately.'}</p>
    <section className={box}>
      <h3 className="font-semibold text-ink">Debrid</h3>
      <label className="block">{fa ? 'سرویس حساب' : 'Account provider'}<select className={input} disabled={busy} value={provider} onChange={event => { setProvider(event.target.value); setToken(''); setAccount(''); setLink('') }}>{Object.entries(providers).map(([id, info]) => <option key={id} value={id}>{info[0]}</option>)}</select></label>
      <p className="text-muted">{fa ? 'توکن حساب خودت را ذخیره کن؛ فایل‌های تولیدشده برای انتخاب وارد لینک‌گیر می‌شوند. تولید لینک، نشانی را به سرویس انتخابی می‌فرستد و ممکن است سهمیه مصرف کند. باران خرید یا اشتراک ایجاد نمی‌کند.' : 'Use your own account token. Resolved files go to Link Grabber for selection. Generating sends the source URL to the selected provider and may consume account quota. Baran does not purchase a subscription.'}</p>
      <button className="text-brand underline" type="button" onClick={() => void window.pulse.openExternal(providerInfo[1])}>{fa ? `دریافت توکن از حساب ${providerInfo[0]}` : `Get your ${providerInfo[0]} token`}</button>
      <label className="block">{fa ? 'توکن API' : 'API token'}<input aria-label={`${providerInfo[0]} token`} className={input} type="password" autoComplete="off" dir="ltr" placeholder={configured ? '••••••••' : ''} value={token} onChange={event => setToken(event.target.value)} /></label>
      <div className="flex flex-wrap gap-2">
        <button className="btn btn-primary" disabled={busy || !token.trim()} onClick={() => void run(async () => { await api('debridSave', { provider, token }); setToken('') })}>{fa ? 'ذخیرهٔ توکن' : 'Save token'}</button>
        <button className="btn btn-ghost" disabled={busy || !configured} onClick={() => void run(async () => { const user = await api('debridAccount', { provider }) as { username: string; type: string }; setAccount(`${user.username} · ${user.type}`) })}>{fa ? 'آزمایش حساب' : 'Test account'}</button>
        <button className="btn btn-ghost" disabled={busy || !configured} onClick={() => void run(async () => { await api('debridSave', { provider, token: '' }); setToken(''); setAccount('') })}>{fa ? 'حذف توکن' : 'Remove token'}</button>
      </div>
      {account && <p>{account}</p>}
      <label className="block">{fa ? 'لینک مبدأ' : 'Source URL'}<input className={input} dir="ltr" type="url" value={link} placeholder="https://host.example/file" onChange={event => setLink(event.target.value)} /></label>
      <button className="btn btn-primary" disabled={busy || !configured || !link.trim() || Boolean(selected?.pending)} onClick={() => void run(async () => { const result = await api('debridCollect', { provider, url: link }) as { pending: boolean; added: number }; setLink(''); pushToast('success', result.pending ? (fa ? 'در سرویس در حال آماده‌سازی است؛ دکمهٔ بررسی را بزن.' : 'Provider is preparing the file; use Check pending job.') : (fa ? `${result.added} فایل به لینک‌گیر اضافه شد.` : `${result.added} files added to Link Grabber.`)) })}>{busy ? (fa ? 'در حال پردازش…' : 'Working…') : (fa ? 'تولید لینک و افزودن به لینک‌گیر' : 'Generate links into Link Grabber')}</button>
      {selected?.pending && <div role="status" className="space-y-2"><p>{fa ? 'یک درخواست در سرویس در حال آماده‌سازی است؛ با بستن برنامه از بین نمی‌رود.' : 'A provider job is pending; it is retained when Baran closes.'}</p><button className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => { const result = await api('debridCollect', { provider, checkPending: true }) as { pending: boolean; added: number }; pushToast('info', result.pending ? (fa ? 'هنوز آماده نیست.' : 'Still preparing.') : (fa ? `${result.added} فایل اضافه شد.` : `${result.added} files added.`)) })}>{fa ? 'بررسی درخواست آماده‌سازی' : 'Check pending job'}</button><button className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => { await api('debridForget', { provider }) })}>{fa ? 'حذف پیگیری محلی' : 'Forget local tracking'}</button><p className="text-faint">{fa ? 'حذف پیگیری فقط رکورد باران را پاک می‌کند؛ کار سرویس ابری ادامه دارد و حذف نمی‌شود.' : 'Forgetting removes only Baran’s tracking record; the cloud job continues and is not deleted.'}</p></div>}
      <p className="text-faint">{fa ? 'توکن با رمزگذاری حساب ویندوز ذخیره می‌شود؛ در خروجی صف یا صفحهٔ موبایل نمایش داده نمی‌شود.' : 'The token is encrypted for your Windows account; queue snapshots and mobile control never contain it.'}</p>
    </section>
    <section className={box}>
      <h3 className="font-semibold">{fa ? 'کنترل از موبایل در شبکهٔ محلی' : 'Mobile control on your LAN'}</h3>
      <p className="text-muted">{fa ? 'فقط روی شبکهٔ خصوصی قابل اعتماد فعال کن. این نسخه از HTTP بدون رمزگذاری استفاده می‌کند. دسترسی شامل مشاهدهٔ نام و وضعیت دانلودها، توقف/ادامه و ارسال لینک به لینک‌گیر است. فایروال یا Port forwarding خودکار تغییر نمی‌کند.' : 'Enable only on a trusted private network. This version uses unencrypted HTTP. Access is limited to task names/status, pause/resume and collecting links. Baran does not change the firewall or port forwarding.'}</p>
      {!status.mobile.running ? <><select className={input} aria-label="Mobile bind address" value={address} onChange={event => setAddress(event.target.value)}><option value="">{fa ? 'انتخاب IP خصوصی' : 'Choose private IP'}</option>{status.mobile.addresses.map(ip => <option key={ip}>{ip}</option>)}</select><button className="btn btn-primary" disabled={busy || !address} onClick={() => void run(async () => { await api('mobileStart', { address }) })}>{fa ? 'فعال‌کردن کنترل موبایل' : 'Enable mobile control'}</button></> : <>
        <p>{fa ? 'این نشانی را روی گوشیِ متصل به همان شبکه باز کن:' : 'Open this address on a phone on the same network:'}</p><p dir="ltr" className="select-text break-all text-brand">{status.mobile.url}</p>
        <label className="block">{fa ? 'کد اتصال' : 'Pairing token'}<input className={input} dir="ltr" readOnly value={status.mobile.token} onFocus={event => event.target.select()} /></label>
        <button className="btn btn-ghost" disabled={busy} onClick={() => void run(async () => { await api('mobileStop') })}>{fa ? 'توقف و باطل‌کردن کد اتصال' : 'Stop and revoke token'}</button>
      </>}
    </section>
    <section className={box}>
      <h3 className="font-semibold">{fa ? 'بیدارکردن ویندوز برای دانلود زمان‌بندی‌شده' : 'Wake Windows for scheduled downloads'}</h3>
      <p className="text-muted">{fa ? 'با فعال‌سازی، یک تسک برای نزدیک‌ترین دانلود آینده در Windows Task Scheduler ثبت می‌شود و باران را اجرا می‌کند. نیازمند واردبودن حساب ویندوز و پشتیبانی سخت‌افزار و Wake timers است؛ کامپیوتر خاموش را روشن نمی‌کند.' : 'Opt in to register a Windows task for the next queued schedule and launch Baran. Requires a signed-in Windows session, supported hardware and allowed wake timers. It cannot power on a shut-down computer.'}</p>
      <button className="btn btn-primary" disabled={busy} onClick={() => void run(async () => { await api('wake', { enabled: !status.wakeEnabled }) })}>{status.wakeEnabled ? (fa ? 'غیرفعال‌کردن و حذف تسک' : 'Disable and remove task') : (fa ? 'فعال‌کردن Wake timer' : 'Enable wake task')}</button>
      {status.nextWake > 0 && <p>{fa ? 'نزدیک‌ترین زمان: ' : 'Next schedule: '}{new Date(status.nextWake).toLocaleString(fa ? 'fa-IR' : 'en-US')}</p>}
      {status.wakeError && <p role="alert" className="text-warn">{status.wakeError}</p>}
    </section>
    <section className={box}>
      <h3 className="font-semibold">{fa ? 'اتصال HTTP و رسانه به اینترفیس VPN — آزمایشی' : 'HTTP and media VPN binding — experimental'}</h3>
      <p className="text-muted">{fa ? 'HTTP و DNS آن فقط از IPv4 اینترفیس انتخابی عبور می‌کنند و با قطع آن مسیر جایگزین ندارند. دریافت HTTP رسانه از پراکسی محلیِ متصل به همین اینترفیس انجام می‌شود؛ yt-dlp از دریافت‌کنندهٔ داخلی استفاده می‌کند و FFmpeg برای پردازش فایل محلی است. تورنت در این حالت همچنان مسدود است، چون aria2 پراکسی امن برای همهٔ همتاها ندارد. این قابلیت Kill-switch کل سیستم نیست. تغییر مسیر، دانلودهای جاری را متوقف و حالت پراکسی را مستقیم می‌کند.' : 'HTTP and its DNS use the selected IPv4 interface without fallback. Media HTTP requests use a local proxy bound to that interface; yt-dlp uses its native downloader and FFmpeg processes local files. Torrents remain blocked because aria2 cannot proxy every peer safely. This is not a system-wide kill switch. Changing the binding pauses transfers and selects Direct proxy mode.'}</p>
      <select className={input} aria-label="VPN interface" value={vpn} onChange={event => setVpn(event.target.value)}><option value="">{fa ? 'بدون اتصال اجباری' : 'No interface binding'}</option>{status.interfaces.map(nic => <option key={nic.id} value={nic.id}>{nic.name} · {nic.up ? nic.addresses.join(', ') : 'offline'}</option>)}</select>
      <button className="btn btn-primary" disabled={busy || vpn === status.vpnInterfaceId} onClick={() => void run(async () => { await api('vpn', { id: vpn }) })}>{fa ? 'اعمال مسیر اتصال' : 'Apply interface binding'}</button>
    </section>
  </div>
}
