import { useEffect, useMemo, useState } from 'react'
import {
  Activity,
  Check,
  ChevronRight,
  Cpu,
  Download,
  ExternalLink,
  FolderOpen,
  Gauge,
  Globe2,
  Info,
  KeyRound,
  Loader2,
  Monitor,
  Network,
  Moon,
  RefreshCw,
  Settings2,
  ShieldCheck,
  Sparkles,
  Sun,
  Wrench
} from 'lucide-react'
import type { Settings } from '@shared/types'
import { useApp } from '../state'
import { Modal } from './Modal'
import { Logo, Toggle } from './primitives'
import { cn } from '../lib/format'
import { proxyConfiguration } from '@shared/network-policy'
import { ConnectedServices } from './ConnectedServices'

type Tab = 'general' | 'speed' | 'network' | 'browsers' | 'connected' | 'appearance' | 'tools' | 'about'

export function SettingsModal(): React.JSX.Element {
  const { settingsOpen, setSettingsOpen, t, settings, stats, system, patchSettings, pushToast, refreshTools } =
    useApp()
  const [tab, setTab] = useState<Tab>('general')
  const [draft, setDraft] = useState<Partial<Settings>>({})
  const [installing, setInstalling] = useState(false)
  const [customLimit, setCustomLimit] = useState('')
  const [browser, setBrowser] = useState<'firefox' | 'chrome' | 'edge'>('firefox')
  const [extensionId, setExtensionId] = useState('')
  const [connectingBrowser, setConnectingBrowser] = useState(false)
  const fa = settings.language === 'fa'

  useEffect(() => {
    if (!settingsOpen) return
    setDraft({})
    setTab('general')
    setCustomLimit(
      settings.globalSpeedLimit ? String(+(settings.globalSpeedLimit / (1024 * 1024)).toFixed(2)) : ''
    )
  }, [settingsOpen])

  const merged = useMemo<Settings>(() => ({ ...settings, ...draft }), [settings, draft])

  const set = <K extends keyof Settings>(key: K, value: Settings[K]): void => {
    setDraft((prev) => ({ ...prev, [key]: value }))
  }

  const save = async (): Promise<void> => {
    try {
      proxyConfiguration(merged)
      await window.pulse.updateSettings(draft)
      pushToast('success', t.toast.settingsSaved)
      setSettingsOpen(false)
    } catch (error) { pushToast('error', (error as Error).message) }
  }

  const chooseDir = async (): Promise<void> => {
    const chosen = await window.pulse.chooseDir(merged.downloadDir)
    if (chosen) set('downloadDir', chosen)
  }

  const chooseCookies = async (): Promise<void> => {
    const chosen = await window.pulse.chooseCookiesFile()
    if (chosen) set('cookiesFile', chosen)
  }

  const installYtdlp = async (): Promise<void> => {
    setInstalling(true)
    try {
      const result = await window.pulse.installYtDlp()
      pushToast(result.ok ? 'success' : 'error', result.message)
      refreshTools()
    } finally {
      setInstalling(false)
    }
  }

  const tabs: Array<{ id: Tab; label: string; icon: React.ReactNode }> = [
    { id: 'general', label: t.settings.tabs.general, icon: <Settings2 size={15} /> },
    { id: 'speed', label: t.settings.tabs.speed, icon: <Gauge size={15} /> },
    { id: 'network', label: settings.language === 'fa' ? 'شبکه و پراکسی' : 'Network & proxy', icon: <Network size={15} /> },
    { id: 'browsers', label: fa ? 'اتصال مرورگرها' : 'Browser integration', icon: <Globe2 size={15} /> },
    { id: 'connected', label: fa ? 'سرویس‌ها و کنترل' : 'Connected services', icon: <Network size={15} /> },
    { id: 'appearance', label: t.settings.tabs.appearance, icon: <Monitor size={15} /> },
    { id: 'tools', label: t.settings.tabs.tools, icon: <Wrench size={15} /> },
    { id: 'about', label: t.settings.tabs.about, icon: <Info size={15} /> }
  ]

  const ytdlp = stats?.ytdlp
  const ffmpeg = stats?.ffmpeg

  return (
    <Modal open={settingsOpen} onClose={() => setSettingsOpen(false)} width={880} className="flex h-[600px] max-h-[88vh] flex-col">
      <div className="flex shrink-0 items-center gap-3 border-b border-line/70 px-6 py-4">
        <div className="grid h-9 w-9 place-items-center rounded-xl bg-brand/12 text-brand">
          <Settings2 size={17} />
        </div>
        <div>
          <h2 className="text-[15px] font-extrabold tracking-tight">{t.settings.title}</h2>
          <p className="text-[10.5px] text-muted">{t.settings.subtitle}</p>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        <div className="flex w-[190px] shrink-0 flex-col gap-0.5 border-e border-line/70 p-2.5">
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={cn(
                'flex items-center gap-2.5 rounded-lg px-3 py-2 text-[11.5px] font-medium transition',
                tab === item.id ? 'bg-brand/12 text-ink' : 'text-muted hover:bg-elev2/70 hover:text-ink'
              )}
            >
              <span className={tab === item.id ? 'text-brand' : 'text-faint'}>{item.icon}</span>
              {item.label}
              <ChevronRight size={12} className={cn('ms-auto text-faint flip-x', tab === item.id ? 'opacity-100' : 'opacity-0')} />
            </button>
          ))}
          <div className="mt-auto rounded-lg bg-elev/50 p-2.5 text-[9px] leading-relaxed text-faint">
            Baran v{system?.appVersion ?? '1.0.0'} · {system?.platform === 'linux' ? 'Linux' : 'Windows'}
          </div>
        </div>

        <div className="scroll-y min-w-0 flex-1 p-5">
          {tab === 'connected' && <ConnectedServices />}
          {tab === 'browsers' && (
            <div className="space-y-5">
              <Group title={fa ? 'اتصال افزونه به باران' : 'Connect the browser extension'} hint={fa ? 'ابتدا افزونه را نصب کن؛ سپس با این دکمه ارتباط آن با برنامه را فعال کن. دسترسی مدیر ویندوز لازم نیست.' : 'Install the extension first, then connect it here. No administrator access is needed.'}>
                <div className="flex flex-wrap gap-2">
                  <select aria-label={fa ? 'مرورگر' : 'Browser'} className="field px-3 py-2" value={browser} onChange={e => setBrowser(e.target.value as typeof browser)}>
                    <option value="firefox">Firefox</option><option value="chrome">Chrome</option><option value="edge">Edge</option>
                  </select>
                  {browser !== 'firefox' && <input className="field min-w-0 flex-1 px-3 py-2" dir="ltr" aria-label="Extension ID" placeholder="Extension ID" value={extensionId} onChange={e => setExtensionId(e.target.value.trim())} />}
                  <button type="button" className="btn btn-primary" disabled={connectingBrowser || system?.platform !== 'win32' || (browser !== 'firefox' && !/^[a-p]{32}$/.test(extensionId))} onClick={() => {
                    setConnectingBrowser(true)
                    void window.pulse.registerBrowserHost(browser, extensionId).then(() => pushToast('success', fa ? 'ارتباط مرورگر ثبت شد؛ افزونه را باز کن و یک لینک بفرست.' : 'Browser bridge registered. Send a link from the extension.')).catch(error => pushToast('error', error.message)).finally(() => setConnectingBrowser(false))
                  }}>{connectingBrowser ? <Loader2 className="animate-spin" size={14} /> : <Globe2 size={14} />}{fa ? 'فعال‌کردن اتصال' : 'Connect browser'}</button>
                </div>
                {browser !== 'firefox' && <p className="mt-2 text-[11px] leading-relaxed text-muted">{fa ? 'تا زمان انتشار در فروشگاه، شناسهٔ افزونه را از صفحهٔ افزونه‌های مرورگر کپی کن. شناسهٔ نسخهٔ فروشگاهی ثابت خواهد بود.' : 'Until a store build is published, copy the extension ID from your browser extensions page. Store builds will have a fixed ID.'}</p>}
              </Group>
              <Group title={fa ? 'سپردن دانلودهای مرورگر به باران' : 'Handle browser downloads in Baran'} hint={fa ? 'این گزینه را در پنجرهٔ خود افزونه فعال کن و اجازهٔ دانلود را بده. برای هر مرورگر جداست.' : 'Enable this in the extension popup and grant its downloads permission, separately for each browser.'}>
                <p className="text-[12px] leading-7 text-muted">{fa ? 'لینک دانلودهای جدید HTTP و HTTPS برای بررسی به لینک‌گیر باران می‌رود. اگر برنامه در دسترس نباشد، مرورگر دانلود را ادامه می‌دهد. دانلودهای خصوصی، blob و دانلودهای افزونه‌های دیگر منتقل نمی‌شوند. سایت‌هایی که به ورود یا درخواست POST نیاز دارند ممکن است در مرورگر بهتر کار کنند؛ در این موارد گزینه را خاموش کن.' : 'New HTTP(S) downloads are staged for review in Link Grabber. If Baran is unavailable, your browser continues downloading. Private downloads, blob URLs and downloads started by other extensions are excluded. Login-dependent or POST downloads may require leaving handoff off.'}</p>
              </Group>
              <Group title={fa ? 'نصب سادهٔ افزونه' : 'Simple extension installation'} hint={fa ? 'نسخهٔ فروشگاهی هنوز منتشر نشده است.' : 'Store listings are not published yet.'}>
                <button type="button" className="btn btn-primary mb-3" onClick={() => void window.pulse.openExternal('https://github.com/mehdiporbaba/Baran-Download-Manager/releases/download/firefox-v1.0.1/Baran-Firefox-Extension-1.0.1-signed.xpi')}><Download size={14} />{fa ? 'دانلود افزونهٔ فایرفاکس با امضای موزیلا' : 'Download Mozilla-signed Firefox extension'}</button>
                <p className="text-[12px] leading-7 text-muted">{fa ? 'فایرفاکس به فایل XPI امضاشده توسط Mozilla نیاز دارد. نصب عمومی Chrome و Edge از فروشگاه رسمی انجام می‌شود. اتصال باران به معنی غیرفعال‌کردن افزونه‌های IDM یا FDM نیست؛ اگر تداخل دارند، افزونهٔ دانلودمنیجر دیگر را خودت خاموش کن.' : 'Firefox requires a Mozilla-signed XPI. Public Chrome/Edge installation uses their stores. Connecting Baran does not disable IDM or FDM extensions; turn the other integration off if they conflict.'}</p>
              </Group>
            </div>
          )}
          {tab === 'general' ? (
            <div className="space-y-5">
              <Group title={t.settings.general.dir} hint={t.settings.general.dirHint}>
                <div className="flex gap-1.5">
                  <input
                    value={merged.downloadDir}
                    onChange={(e) => set('downloadDir', e.target.value)}
                    className="field h-9 min-w-0 flex-1 px-3 text-[10.5px]"
                    dir="ltr"
                  />
                  <button type="button" className="btn btn-ghost h-9 px-3 text-[10.5px]" onClick={() => void chooseDir()}>
                    <FolderOpen size={14} />
                    {t.add.browse}
                  </button>
                </div>
              </Group>

              <div className="grid grid-cols-2 gap-4">
                <Group title={t.settings.general.concurrent} hint={t.settings.general.concurrentHint}>
                  <Stepper
                    value={merged.maxConcurrent}
                    min={1}
                    max={10}
                    onChange={(v) => set('maxConcurrent', v)}
                  />
                </Group>
                <Group title={t.settings.general.connections} hint={t.settings.general.connectionsHint}>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={1}
                      max={32}
                      value={merged.connections}
                      onChange={(e) => set('connections', Number(e.target.value))}
                      className="flex-1 accent-[var(--c-brand)]"
                    />
                    <span className="chip text-[10px]! text-brand! tabular">{merged.connections}</span>
                  </div>
                </Group>
              </div>

              <div className="divide-y divide-line/60 overflow-hidden rounded-xl border border-line">
                <ToggleRow title={fa ? 'منو همیشه باز بماند' : 'Keep navigation menu open'} hint={fa ? 'در حالت خاموش، منو با آیکون سه‌خط باز می‌شود و پس از ۱۵ ثانیه حضور نداشتن نشانگر یا فوکوس در آن بسته می‌شود.' : 'Otherwise, open it with the menu icon; it closes after 15 seconds without the pointer or keyboard focus inside.'} checked={merged.sidebarAlwaysOpen} onChange={value => set('sidebarAlwaysOpen', value)} />
                <ToggleRow
                  title={t.settings.general.autoResume}
                  hint={t.settings.general.autoResumeHint}
                  checked={merged.autoResume}
                  onChange={(v) => set('autoResume', v)}
                />
                <ToggleRow
                  title={t.settings.general.launchAtStartup}
                  hint={
                    system && !system.autoStartSupported
                      ? t.settings.general.launchAtStartupUnsupported
                      : t.settings.general.launchAtStartupHint
                  }
                  checked={merged.launchAtStartup}
                  onChange={(v) => set('launchAtStartup', v)}
                  disabled={system ? !system.autoStartSupported : false}
                />
                <ToggleRow
                  title={t.settings.general.notify}
                  checked={merged.notifyOnComplete}
                  onChange={(v) => set('notifyOnComplete', v)}
                />
                <ToggleRow
                  title={settings.language === 'fa' ? 'بستن پنجره و ادامه در Tray' : 'Close to system tray'}
                  hint={settings.language === 'fa' ? 'با بستن پنجره، دانلودها و زمان‌بندی در پس‌زمینه ادامه می‌یابند.' : 'Closing the window keeps downloads and scheduled jobs running in the background.'}
                  checked={merged.minimizeToTray}
                  onChange={value => set('minimizeToTray', value)}
                />
                <ToggleRow
                  title={t.settings.general.clipboard}
                  hint={t.settings.general.clipboardHint}
                  checked={merged.clipboardWatch}
                  onChange={(v) => set('clipboardWatch', v)}
                />
                <ToggleRow
                  title={t.settings.tools.seed}
                  checked={merged.seedAfterComplete}
                  onChange={(v) => set('seedAfterComplete', v)}
                />
              </div>
            </div>
          ) : null}

          {tab === 'speed' ? (
            <div className="space-y-5">
              <p className="text-[11px] text-muted">{settings.language === 'fa' ? 'سقف HTTP و ویدیو از سقف‌های تورنت مستقل است. مقدار صفر یعنی نامحدود.' : 'HTTP/video limits are separate from torrent limits. Zero means unlimited.'}</p>
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-line p-4">
                {(['torrentDownloadLimit', 'torrentUploadLimit'] as const).map(key => <label key={key} className="space-y-2 text-[11px]">
                  <span>{key === 'torrentDownloadLimit' ? (settings.language === 'fa' ? 'سقف دانلود تورنت' : 'Torrent download limit') : (settings.language === 'fa' ? 'سقف آپلود و سید' : 'Torrent upload / seeding limit')}</span>
                  <div className="flex items-center gap-2"><input aria-label={key} type="number" min={0} step={64} className="field h-9 w-full px-3" value={Math.round(merged[key] / 1024)} onChange={event => set(key, Math.max(0, Number(event.target.value) || 0) * 1024)} dir="ltr" /><span>KiB/s</span></div>
                </label>)}
              </div>
              <div className="rounded-xl border border-line bg-elev/30 p-4">
                <div className="flex items-center gap-2 text-[12px] font-semibold">
                  <Gauge size={16} className="text-brand" />
                  {t.settings.speed.title}
                </div>
                <p className="mt-1 text-[10.5px] leading-relaxed text-muted">{t.settings.speed.desc}</p>
                <div className="mt-3 grid grid-cols-3 gap-1.5">
                  {[
                    { value: 0, label: t.settings.speed.unlimited },
                    { value: 1024 * 1024, label: '1 MB/s' },
                    { value: 2 * 1024 * 1024, label: '2 MB/s' },
                    { value: 5 * 1024 * 1024, label: '5 MB/s' },
                    { value: 10 * 1024 * 1024, label: '10 MB/s' },
                    { value: 25 * 1024 * 1024, label: '25 MB/s' }
                  ].map((preset) => {
                    const active = merged.globalSpeedLimit === preset.value
                    return (
                      <button
                        key={preset.value}
                        type="button"
                        onClick={() => {
                          set('globalSpeedLimit', preset.value)
                          setCustomLimit(preset.value ? String(preset.value / (1024 * 1024)) : '')
                        }}
                        className={cn(
                          'rounded-lg border px-2 py-2 text-[10.5px] transition',
                          active
                            ? 'border-brand/50 bg-brand/10 font-semibold text-brand'
                            : 'border-line bg-panel/40 text-muted hover:border-line2 hover:text-ink'
                        )}
                      >
                        {preset.label}
                      </button>
                    )
                  })}
                </div>
                <div className="mt-3 flex items-end gap-2">
                  <div className="flex-1">
                    <div className="mb-1 text-[9.5px] font-semibold text-muted">{t.settings.speed.custom}</div>
                    <div className="relative">
                      <input
                        type="number"
                        min={0}
                        step={0.5}
                        value={customLimit}
                        onChange={(e) => {
                          setCustomLimit(e.target.value)
                          const n = Number(e.target.value)
                          set('globalSpeedLimit', Number.isFinite(n) && n > 0 ? Math.round(n * 1024 * 1024) : 0)
                        }}
                        placeholder="0"
                        className="field h-9 w-full px-3 pe-16 text-[11px] tabular"
                        dir="ltr"
                      />
                      <span className="absolute end-3 top-1/2 -translate-y-1/2 text-[9px] text-faint">
                        MB/s
                      </span>
                    </div>
                  </div>
                  <div className="pb-2 text-[9.5px] text-faint">{t.settings.speed.note}</div>
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-xl border border-warn/20 bg-warn/5 px-3 py-2.5 text-[10px] text-muted">
                <Activity size={13} className="text-warn" />
                {t.settings.speed.desc}
              </div>
            </div>
          ) : null}

          {tab === 'network' ? <div className="space-y-5">
            <Group title={settings.language === 'fa' ? 'مسیر اتصال وب' : 'Web connection routing'}>
              <select aria-label="Proxy mode" className="field h-10 w-full px-3 text-[12px]" value={merged.proxyMode} onChange={event => set('proxyMode', event.target.value as Settings['proxyMode'])}>
                <option value="direct">{settings.language === 'fa' ? 'اتصال مستقیم' : 'Direct connection'}</option>
                <option value="system">{settings.language === 'fa' ? 'خودکار؛ استفاده از پراکسی سیستم و PAC' : 'Automatic — system proxy / PAC'}</option>
                <option value="manual">{settings.language === 'fa' ? 'پراکسی دستی' : 'Manual proxy'}</option>
              </select>
            </Group>
            {merged.proxyMode === 'manual' && <Group title={settings.language === 'fa' ? 'نشانی پراکسی' : 'Proxy address'}>
              <input aria-label="Proxy URL" className="field h-10 w-full px-3 text-[12px]" dir="ltr" value={merged.proxy} onChange={event => set('proxy', event.target.value)} placeholder="socks5://127.0.0.1:1080" />
              <p className="mt-2 text-[11px] text-muted">HTTP / HTTPS / SOCKS4 / SOCKS5 · {settings.language === 'fa' ? 'بدون نام کاربری و رمز عبور' : 'No embedded username or password'}</p>
            </Group>}
            <p className="rounded-xl border border-line p-4 text-[11px] leading-7 text-muted">{settings.language === 'fa' ? 'این تنظیم برای دانلود HTTP، اسکنر، گیت‌هاب، یوتیوب و اینستاگرام است. ارتباط همتایان و DHT تورنت از پراکسی وب عبور نمی‌کند؛ برای هدایت تمام ترافیک تورنت باید از VPN سیستم استفاده شود. تغییر پراکسی روی درخواست‌های جدید اعمال می‌شود.' : 'Applies to HTTP downloads, scanning, GitHub, YouTube and Instagram. Torrent peer/DHT traffic does not use a web proxy; use a system VPN to route all torrent traffic. Changes apply to new requests.'}</p>
          </div> : null}
          {tab === 'appearance' ? (
            <div className="space-y-5">
              <Group title={t.settings.appearance.theme}>
                <div className="grid grid-cols-2 gap-2">
                  <ThemeCard
                    active={merged.theme === 'dark'}
                    label={t.settings.appearance.dark}
                    icon={<Moon size={16} />}
                    preview="linear-gradient(145deg,#0b0e15,#161b27)"
                    onClick={() => set('theme', 'dark')}
                  />
                  <ThemeCard
                    active={merged.theme === 'light'}
                    label={t.settings.appearance.light}
                    icon={<Sun size={16} />}
                    preview="linear-gradient(145deg,#ffffff,#e8edf7)"
                    onClick={() => set('theme', 'light')}
                  />
                </div>
              </Group>

              <Group title={t.settings.appearance.language} hint={t.settings.appearance.direction}>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => set('language', 'fa')}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-3 py-3 text-[12px] transition',
                      merged.language === 'fa'
                        ? 'border-brand/50 bg-brand/10 font-semibold text-brand'
                        : 'border-line bg-elev/25 text-muted hover:border-line2'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Globe2 size={15} />
                      {t.settings.appearance.persian}
                    </span>
                    {merged.language === 'fa' ? <Check size={15} /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => set('language', 'en')}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-3 py-3 text-[12px] transition',
                      merged.language === 'en'
                        ? 'border-brand/50 bg-brand/10 font-semibold text-brand'
                        : 'border-line bg-elev/25 text-muted hover:border-line2'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Globe2 size={15} />
                      {t.settings.appearance.english}
                    </span>
                    {merged.language === 'en' ? <Check size={15} /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => set('language', 'ja')}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-3 py-3 text-[12px] transition',
                      merged.language === 'ja'
                        ? 'border-brand/50 bg-brand/10 font-semibold text-brand'
                        : 'border-line bg-elev/25 text-muted hover:border-line2'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Globe2 size={15} />
                      {t.settings.appearance.japanese}
                    </span>
                    {merged.language === 'ja' ? <Check size={15} /> : null}
                  </button>
                  <button
                    type="button"
                    onClick={() => set('language', 'ru')}
                    className={cn(
                      'flex items-center justify-between rounded-xl border px-3 py-3 text-[12px] transition',
                      merged.language === 'ru'
                        ? 'border-brand/50 bg-brand/10 font-semibold text-brand'
                        : 'border-line bg-elev/25 text-muted hover:border-line2'
                    )}
                  >
                    <span className="flex items-center gap-2">
                      <Globe2 size={15} />
                      {t.settings.appearance.russian}
                    </span>
                    {merged.language === 'ru' ? <Check size={15} /> : null}
                  </button>
                </div>
              </Group>
            </div>
          ) : null}

          {tab === 'tools' ? (
            <div className="space-y-3">
              <ToolCard
                title={t.settings.tools.ytdlp}
                desc={t.settings.tools.ytdlpDesc}
                ready={!!ytdlp?.available}
                version={ytdlp?.version}
                path={ytdlp?.path}
                t={t}
                action={
                  !ytdlp?.available ? (
                    <button
                      type="button"
                      onClick={() => void installYtdlp()}
                      disabled={installing}
                      className="btn btn-soft h-8 px-2.5 text-[10px]"
                    >
                      {installing ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                      {installing ? t.settings.tools.installing : t.settings.tools.install}
                    </button>
                  ) : (
                    <span className="flex items-center gap-1 text-[9.5px] font-semibold text-ok">
                      <Check size={12} /> {t.settings.tools.installed}
                    </span>
                  )
                }
              />
              <ToolCard
                title={t.settings.tools.ffmpeg}
                desc={t.settings.tools.ffmpegDesc}
                ready={!!ffmpeg?.available}
                path={ffmpeg?.path}
                t={t}
                action={
                  ffmpeg?.available ? (
                    <span className="flex items-center gap-1 text-[9.5px] font-semibold text-ok">
                      <Check size={12} /> {t.settings.tools.available}
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-semibold text-bad">{t.settings.tools.missing}</span>
                  )
                }
              />
              <ToolCard
                title={t.settings.tools.torrent}
                desc={t.settings.tools.torrentDesc}
                ready={stats?.torrentEngine === 'ready'}
                t={t}
                extra={
                  <div className="flex items-center gap-2">
                    <span className="text-[9.5px] text-faint">{t.settings.tools.port}</span>
                    <input
                      type="number"
                      value={merged.torrentPort}
                      onChange={(e) => set('torrentPort', Number(e.target.value) || 51413)}
                      className="field h-7 w-[76px] px-2 text-[10px] tabular"
                      dir="ltr"
                    />
                  </div>
                }
                action={
                  stats?.torrentEngine === 'ready' ? (
                    <span className="flex items-center gap-1 text-[9.5px] font-semibold text-ok">
                      <Check size={12} /> {t.settings.tools.engineReady}
                    </span>
                  ) : (
                    <span className="text-[9.5px] font-semibold text-warn">
                      {stats?.torrentEngine === 'starting' ? t.add.analyzing : t.settings.tools.engineIdle}
                    </span>
                  )
                }
              />
              <div className="rounded-xl border border-line bg-elev/25 p-3">
                <div className="flex items-center gap-2">
                  <ShieldCheck size={13} className="text-faint" />
                  <span className="text-[10.5px] font-semibold">{t.settings.tools.youtubeAuth}</span>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-faint">{t.settings.tools.youtubeAuthHint}</p>
                <div className="mt-2.5 grid grid-cols-2 gap-2">
                  <label className="block">
                    <span className="mb-1 block text-[9px] text-faint">{t.settings.tools.cookiesBrowser}</span>
                    <select
                      value={merged.cookiesBrowser}
                      onChange={(e) => set('cookiesBrowser', e.target.value as Settings['cookiesBrowser'])}
                      className="field h-8 w-full px-2 text-[10px]"
                      dir="ltr"
                    >
                      <option value="">{t.settings.tools.noCookies}</option>
                      <option value="chrome">Chrome</option>
                      <option value="edge">Edge</option>
                      <option value="firefox">Firefox</option>
                      <option value="brave">Brave</option>
                      <option value="opera">Opera</option>
                      <option value="vivaldi">Vivaldi</option>
                      <option value="chromium">Chromium</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="mb-1 block text-[9px] text-faint">{t.settings.tools.cookiesFile}</span>
                    <div className="flex gap-1.5">
                      <input
                        value={merged.cookiesFile}
                        onChange={(e) => set('cookiesFile', e.target.value)}
                        placeholder="cookies.txt"
                        className="field h-8 min-w-0 flex-1 px-2 text-[10px]"
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={() => void chooseCookies()}
                        className="btn btn-ghost h-8 px-2 text-[9.5px]"
                        title={t.settings.tools.chooseCookies}
                      >
                        <FolderOpen size={12} />
                      </button>
                    </div>
                  </label>
                </div>
                <p className="mt-1.5 text-[8.5px] leading-relaxed text-faint">
                  {t.settings.tools.cookiesFileHint} {t.settings.tools.cookiesBrowserHint}
                </p>
              </div>
              <div className="rounded-xl border border-line bg-elev/25 p-3">
                <div className="flex items-center gap-2">
                  <KeyRound size={13} className="text-faint" />
                  <span className="text-[10.5px] font-semibold">{t.settings.tools.githubToken}</span>
                  <button
                    type="button"
                    onClick={() =>
                      void window.pulse.openExternal(
                        'https://github.com/settings/tokens/new?scopes=public_repo&description=Baran'
                      )
                    }
                    className="ms-auto flex items-center gap-1 text-[9px] text-brand transition hover:underline"
                  >
                    <ExternalLink size={10} />
                    github.com
                  </button>
                </div>
                <p className="mt-1 text-[9px] leading-relaxed text-faint">
                  {t.settings.tools.githubTokenHint}
                </p>
                <input
                  type="password"
                  value={merged.githubToken}
                  onChange={(e) => set('githubToken', e.target.value)}
                  placeholder={t.settings.tools.githubTokenPlaceholder}
                  className="field mt-2 h-8 w-full px-2 text-[10px]"
                  dir="ltr"
                  autoComplete="off"
                  spellCheck={false}
                />
              </div>
              <div className="flex items-center justify-between rounded-xl border border-line bg-elev/25 px-3 py-2.5">
                <div className="flex items-center gap-2 text-[10.5px] text-muted">
                  <Cpu size={13} className="text-faint" />
                  {t.settings.tools.path}
                </div>
                <button
                  type="button"
                  onClick={() => refreshTools()}
                  className="btn btn-ghost h-7 px-2 text-[9.5px]"
                >
                  <RefreshCw size={11} />
                  {t.settings.tools.rescan}
                </button>
              </div>
            </div>
          ) : null}

          {tab === 'about' ? (
            <div className="flex flex-col items-center py-6 text-center">
              <Logo size={64} />
              <h3 className="mt-4 text-[19px] font-extrabold tracking-tight">
                Baran <span className="text-gradient">Download Manager</span>
              </h3>
              <p className="mt-1 max-w-sm text-[11px] leading-relaxed text-muted">{system?.runtime.electron ? t.settings.about.built : (fa ? 'رابط باران با موتور بومی دانلود و WebView2 ویندوز.' : 'Baran with a native download engine and Windows WebView2.')}</p>
              <div className="mt-3 flex flex-wrap justify-center gap-1.5">
                <span className="chip"><Sparkles size={10} /> HTTP ×{merged.connections}</span>
                <span className="chip"><Globe2 size={10} /> yt-dlp</span>
                <span className="chip"><Activity size={10} /> BitTorrent</span>
                <span className="chip"><Moon size={10} /> RTL</span>
              </div>
              <p className="mt-3 max-w-md text-[10px] leading-relaxed text-faint">{t.settings.about.features}</p>
              <div className="mt-5 w-full max-w-sm divide-y divide-line/60 overflow-hidden rounded-xl border border-line text-start">
                <Row label={t.settings.about.version} value={system?.appVersion ?? '1.0.0'} />
                <Row label={t.settings.about.platform} value={`${system?.platform} ${system?.version}`} />
                <Row label={system?.runtime.electron ? t.settings.about.electron : 'WebView2'} value={system?.runtime.electron ? `Electron ${system.runtime.electron}` : system?.runtime.chrome ?? ''} />
                <LinkRow
                  label={t.settings.about.repository}
                  value="mehdiporbaba/Baran-Download-Manager (Baran)"
                  onClick={() => window.pulse.openExternal('https://github.com/mehdiporbaba/Baran-Download-Manager')}
                />
                <LinkRow
                  label={settings.language === 'fa' ? 'پروژه اصلی' : 'Original project'}
                  value="TheGreatAzizi/Pulse-Download-Manager"
                  onClick={() =>
                    window.pulse.openExternal('https://github.com/TheGreatAzizi/Pulse-Download-Manager')
                  }
                />
                <LinkRow
                  label={t.settings.about.license}
                  value="GPL-3.0-or-later"
                  onClick={() =>
                    window.pulse.openExternal(
                      'https://github.com/TheGreatAzizi/Pulse-Download-Manager/blob/main/LICENSE'
                    )
                  }
                />
              </div>
              <p className="mt-4 text-[10px] text-faint">{t.settings.about.made}</p>
            </div>
          ) : null}
        </div>
      </div>

      <div className="flex shrink-0 items-center justify-end gap-2 border-t border-line/70 bg-panel/60 px-5 py-3">
        <button type="button" className="btn btn-ghost h-9 px-3.5 text-[11px]" onClick={() => setSettingsOpen(false)}>
          {t.settings.close}
        </button>
        <button type="button" className="btn btn-primary h-9 px-4 text-[11px]" onClick={save}>
          <Check size={14} />
          {t.settings.save}
        </button>
      </div>
    </Modal>
  )
}

function Group({
  title,
  hint,
  children
}: {
  title: string
  hint?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[11px] font-semibold">{title}</span>
        {hint ? <span className="text-[9px] text-faint">{hint}</span> : null}
      </div>
      {children}
    </div>
  )
}

function Stepper({
  value,
  min,
  max,
  onChange
}: {
  value: number
  min: number
  max: number
  onChange: (v: number) => void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        className="icon-btn h-8! w-8! border border-line text-[14px]"
      >
        −
      </button>
      <div className="field flex h-8 flex-1 items-center justify-center text-[12px] font-semibold tabular">
        {value}
      </div>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        className="icon-btn h-8! w-8! border border-line text-[14px]"
      >
        +
      </button>
    </div>
  )
}

function ToggleRow({
  title,
  hint,
  checked,
  onChange,
  disabled
}: {
  title: string
  hint?: string
  checked: boolean
  onChange: (v: boolean) => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="min-w-0 flex-1">
        <div className="text-[10.5px] font-medium">{title}</div>
        {hint ? <div className="mt-0.5 text-[9px] text-faint">{hint}</div> : null}
      </div>
      <Toggle checked={checked} onChange={onChange} label={title} disabled={disabled} />
    </div>
  )
}

function ThemeCard({
  active,
  label,
  icon,
  preview,
  onClick
}: {
  active: boolean
  label: string
  icon: React.ReactNode
  preview: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'group flex items-center gap-3 rounded-xl border p-2.5 text-start transition',
        active ? 'border-brand/50 bg-brand/8' : 'border-line bg-elev/25 hover:border-line2'
      )}
    >
      <div
        className="relative h-11 w-16 overflow-hidden rounded-lg border border-line2"
        style={{ background: preview }}
      >
        <div className="absolute inset-x-1.5 top-1.5 h-1 rounded-full bg-white/20" />
        <div className="absolute inset-x-1.5 top-3.5 h-1 rounded-full bg-white/10" />
        <div className="absolute inset-x-1.5 top-5.5 h-1 rounded-full bg-brand/60" />
      </div>
      <div className="flex-1">
        <div className={cn('flex items-center gap-1.5 text-[11px] font-semibold', active && 'text-brand')}>
          {icon}
          {label}
        </div>
        {active ? <div className="mt-0.5 text-[9px] text-brand/80">active</div> : null}
      </div>
    </button>
  )
}

function ToolCard({
  title,
  desc,
  ready,
  version,
  path,
  action,
  extra,
  t
}: {
  title: string
  desc: string
  ready: boolean
  version?: string
  path?: string
  action?: React.ReactNode
  extra?: React.ReactNode
  t: ReturnType<typeof useApp>['t']
}): React.JSX.Element {
  return (
    <div className="rounded-xl border border-line bg-elev/25 p-3">
      <div className="flex items-start gap-2.5">
        <span
          className={cn(
            'mt-1 h-2 w-2 shrink-0 rounded-full',
            ready ? 'bg-ok live-dot' : 'bg-faint'
          )}
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[11.5px] font-semibold">{title}</span>
            {version ? <span className="chip py-0! text-[8.5px]!">v{version}</span> : null}
            <span className={cn('text-[9px] font-semibold', ready ? 'text-ok' : 'text-faint')}>
              {ready ? t.settings.tools.available : t.settings.tools.missing}
            </span>
          </div>
          <p className="mt-0.5 text-[9.5px] leading-relaxed text-muted">{desc}</p>
          {path ? (
            <div className="mt-1 truncate text-[8.5px] text-faint" dir="ltr">
              {path}
            </div>
          ) : null}
          {extra ? <div className="mt-2">{extra}</div> : null}
        </div>
        <div className="shrink-0">{action}</div>
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="flex items-center justify-between px-3 py-2">
      <span className="text-[9.5px] text-faint">{label}</span>
      <span className="max-w-[60%] truncate text-[9.5px] font-medium text-muted" dir="ltr">
        {value}
      </span>
    </div>
  )
}

function LinkRow({
  label,
  value,
  onClick
}: {
  label: string
  value: string
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between px-3 py-2 text-start transition hover:bg-elev/50"
    >
      <span className="text-[9.5px] text-faint">{label}</span>
      <span className="flex max-w-[60%] items-center gap-1 text-[9.5px] font-medium text-brand" dir="ltr">
        <span className="truncate">{value}</span>
        <ExternalLink size={10} className="shrink-0" />
      </span>
    </button>
  )
}
