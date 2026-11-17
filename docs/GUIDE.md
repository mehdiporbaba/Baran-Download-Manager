# Baran Download Manager — user guide

## Current Windows 2.1.1 setup

Download [2.1.1](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/v2.1.1). Finish/pause transfers and Quit Baran from Tray before upgrading. Setup refreshes browser-host paths; Portable users use Repair connection after moving their folder. Existing tasks, Inbox and partial files remain. Windows x64 needs .NET Framework 4.6.2+ (4.8 recommended) and shared WebView2. Unsigned Windows binaries may show SmartScreen warnings.

Firefox: Settings → Browser integration → Install & connect Firefox opens the bundled **Mozilla-signed 1.0.2 XPI**. Confirm Add in Firefox, open the extension, choose Check connection, then enable **Use Baran for new downloads** and grant its requested permissions. No copied ID or PowerShell is needed. Desktop beta.2's Unsupported browser command requires a desktop upgrade. A real Firefox ZIP click opening New download was confirmed by the user on beta.3. Fully quit-app startup and real Chrome acceptance remain pending.

Chrome/Edge: the owner has no store developer account yet. Open the prepared extension folder from Baran; use Load unpacked with Developer mode in `chrome://extensions` or `edge://extensions`, then copy its ID into Baran and Connect browser. The store-submission ZIP is for the publisher, not an ordinary-user installer. Firefox's self-distributed extension has no automatic update feed; keep signature protection enabled and avoid unsigned developer XPIs. Baran cannot disable another extension or claim exclusive browser priority.

Double-click/Enter on a task opens its independent progress window; closing/hiding keeps downloading. Speed sets a per-file HTTP cap in KiB/s, with the global cap also applying; zero is unlimited. Completion/tools offers verified expired-link replacement and an expected SHA-256 while paused. A mismatch keeps partial data and blocks final completion. Optional media tools install/update from Settings → Tools with required digest checks; gallery-dl uses official nightly builds. Custom paths still take priority.

The complete current English/Persian instructions, features, prerequisites and limitations are in the [README](../README.md). Provider accounts, durable pending jobs, mobile pairing, wake tasks and experimental HTTP/media VPN routing are explained in [advanced services](ADVANCED-SERVICES.md). Torrent proxy/VPN confinement and native Linux/macOS are deferred; torrents are blocked while interface binding is enabled. There is no system-wide kill switch or guarantee for every live account/site.

<div dir="rtl" lang="fa" align="right">
<h2>راه‌اندازی فعلی ویندوز ۲٫۱٫۱</h2>
<p><a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/v2.1.1">نسخهٔ ۲٫۱٫۱</a> را دریافت کنید. پیش از ارتقا دانلود را تمام/متوقف و از Tray باران Quit را انتخاب کنید. نصاب مسیر میزبان مرورگر را تازه می‌کند؛ کاربران قابل‌حمل پس از جابه‌جایی پوشه ترمیم اتصال بزنند. وظیفه، صندوق و فایل ناقص می‌مانند. ویندوز ۶۴ بیتی، .NET Framework نسخهٔ ۴٫۶٫۲ یا بالاتر (۴٫۸ پیشنهاد می‌شود) و WebView2 مشترک لازم دارد. فایل بدون امضای ویندوز ممکن است SmartScreen نشان دهد.</p>
<p>فایرفاکس: تنظیمات ← اتصال مرورگرها ← نصب و اتصال Firefox، <strong>XPI همراه ۱٫۰٫۲ با امضای موزیلا</strong> را باز می‌کند. Add را در فایرفاکس تأیید، افزونه را باز و Check connection را بزنید؛ سپس <span dir="ltr">Use Baran for new downloads</span> و دسترسی‌های درخواستی را فعال کنید. کپی شناسه یا PowerShell لازم نیست. پیام Unsupported browser command در دسکتاپ بتا ۲، ارتقای برنامه را می‌خواهد. بازشدن دانلود جدید با کلیک واقعی ZIP در فایرفاکس بتا ۳ توسط کاربر تأیید شده است. شروع با برنامهٔ کاملاً بسته و کروم واقعی هنوز پذیرش می‌خواهند.</p>
<p>کروم/اج: مالک هنوز حساب توسعه‌دهندهٔ استور ندارد. پوشهٔ آمادهٔ افزونه را از باران باز، در <span dir="ltr">chrome://extensions</span> یا <span dir="ltr">edge://extensions</span> با Developer mode روشن Load unpacked را بزنید، سپس شناسه را در باران وارد و اتصال مرورگر را فعال کنید. ZIP ارسال استور برای ناشر است، نه نصب‌کنندهٔ کاربر عادی. افزونهٔ شخصی فایرفاکس منبع به‌روزرسانی خودکار ندارد؛ حفاظت امضا را روشن نگه دارید و XPI توسعهٔ بدون امضا را نصب نکنید. باران نمی‌تواند افزونهٔ دیگر را خاموش یا اولویت انحصاری مرورگر را تصاحب کند.</p>
<p>دوبارکلیک/Enter روی وظیفه، پنجرهٔ مستقل پیشرفت را باز می‌کند؛ بستن/پنهان‌کردن دانلود را ادامه می‌دهد. سرعت، سقف هر فایل HTTP را بر حسب KiB/s تعیین می‌کند و سقف سراسری نیز برقرار است؛ صفر یعنی نامحدود. پایان/ابزارها، جایگزینی بررسی‌شدهٔ لینک منقضی و SHA-256 مورد انتظار در حالت توقف را دارد. عدم تطابق، دادهٔ ناقص را نگه می‌دارد و مانع تکمیل نهایی می‌شود. ابزار اختیاری رسانه از تنظیمات ← ابزارها با بررسی الزامی هش نصب/به‌روز می‌شود؛ gallery-dl ساخت شبانهٔ رسمی است. مسیر سفارشی همچنان اولویت دارد.</p>
<p>راهنمای کامل فعلی انگلیسی/فارسی، امکانات، پیش‌نیاز و محدودیت در <a href="../README.md">README</a> است. حساب سرویس، درخواست منتظر پایدار، اتصال موبایل، بیدارکردن و مسیر آزمایشی VPN برای HTTP/رسانه در <a href="ADVANCED-SERVICES.md">سرویس‌های پیشرفته</a> شرح داده شده‌اند. محصورسازی پراکسی/VPN تورنت و نسخهٔ بومی لینوکس/macOS موکول شده‌اند؛ با اتصال اجباری اینترفیس، تورنت مسدود است. Kill-switch کل سیستم یا تضمین تمام حساب‌ها/سایت‌های زنده وجود ندارد.</p>
</div>

<details>
<summary>Archived earlier guide and source-only developer registration — superseded by the 2.1.0 instructions above / راهنمای قبلی و ثبت مخصوص توسعه؛ دستورهای ۲٫۱٫۰ بالا اولویت دارند</summary>

## Windows setup

The native version opens **All downloads** at launch. The menu starts closed; use the three-line button in the title bar. When neither pointer nor keyboard focus is inside the open menu for 15 seconds, it closes. **Settings → General → Keep navigation menu open** keeps it visible across restarts. In Persian it opens on the right. Escape also closes an unpinned menu.

Use the native Setup build for normal installation. For native Portable, extract the ZIP into a stable folder; startup registration points at that folder, so reconfigure it if you move the executable. The older Electron self-extracting Portable disables startup because it runs from a temporary directory. Settings → General controls launch at sign-in, desktop notifications and closing/minimizing to the tray. Use **Quit** in the tray menu to exit completely. The shared Microsoft WebView2 Runtime and .NET Framework are prerequisites; optional media tools are separate downloads. See [native architecture](NATIVE.md).

## Add or schedule a download

Choose **New download**. Paste a URL, choose the folder and optionally set **Download start time**. Time is entered in the computer's local timezone. An empty time starts through the normal queue. Scheduled tasks appear in **Scheduled** and remain saved after restarting. Baran must be running at the scheduled time. An overdue queued job starts after the app next runs. A paused job stays paused.

To change an existing job's time, pause it and use the clock action on its download row. The scheduling dialog works at compact window widths. A wide-window details panel also offers scheduling controls.

## Link workspace & folder scanner

Paste one or many HTTP(S) links or import a TXT file. Select visible rows, check availability and select a destination before downloading. No import starts a download on its own. A start time applies to the selected batch. The native app persists the staging inbox in `baran-inbox.json` in its roaming profile, up to 5,000 items. Queued jobs are also persistent. Older Electron 1.0 inboxes were session-only.

The scanner follows linked HTML pages within the selected origin and containing folder. Depth zero checks only the supplied page. Limits: 100 pages, depth 5, 2 MB per HTML page, 2,000 file links and 90 seconds. Cancellation keeps discovered links. Directory listings can be scanned recursively; hidden or unlisted server files cannot be enumerated. Downloads currently share one destination rather than reproducing the remote folder tree.

## Browser extension — Windows

Use **Settings → Browser integration → Connect browser**. Firefox uses a fixed add-on ID and needs no copied ID. Chrome/Edge development builds still require their extension ID until store publication provides a stable identity. The bridge is copied into Baran's user-data directory, so the extracted extension folder can move after connecting through the app. This registers the native bridge without a PowerShell command; it does not install the extension.

Open the extension popup and enable **Handle new downloads in Baran** to request the optional browser downloads permission. This setting is off initially and applies only to that browser. The browser pauses a new HTTP(S) download, waits for Baran to acknowledge staging its URL, and only then cancels its own transfer. If Baran is closed or the bridge fails, the browser resumes. Review the link in Baran before downloading. Private downloads, `blob:`/`data:` URLs and downloads initiated by other extensions are excluded. Cookies, authorization headers and POST request bodies are not copied; leave handoff off for downloads that require them. If IDM/FDM also captures downloads, disable that other extension yourself to avoid conflicts. There is no system-wide setting that makes every browser assign downloads to Baran.

For Firefox download the **signed.xpi** from the [Mozilla-signed 1.0.1 release](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/firefox-v1.0.1). In Firefox open Add-ons → gear → Install Add-on From File, select it and accept the browser's permission prompt. Keep signature protection enabled. Then connect Firefox inside Baran. This is signed self-distribution; a public AMO listing and automatic extension updates are not configured. `scripts/package-extension.ps1` still produces unsigned source-development artifacts; those are not ordinary-user installers. Chrome/Edge development builds still need store publication for easy public installation.

For source-checkout development, the command-line registration method remains available:

Load the browser-extension directory unpacked in Chrome or Edge. Copy its ID and run:

```powershell
& .\browser-extension\native-host\register.ps1 -ExtensionId 'YOUR_EXTENSION_ID' -Browser chrome
```

The script compiles the included C# Native Messaging host with the Windows .NET Framework compiler and registers it for the current user only. It does not need administrator rights. Use `-Browser edge` for Edge, or `-Browser firefox` without an extension ID for Firefox. If local script policy blocks it, review the script and use your approved development workflow.

Keep Baran running, then right-click a link or use **Collect page links / Collect visible media**. If page text is selected, the collection is limited to elements intersecting that selection. Imports stage up to 2,000 links and never request automatic downloading. A native message is limited to 256 KB. Browser cookies and passwords are not transferred by this extension.

To remove registration, run the same command with `-Unregister`, then remove the extension in the browser. Moving the extracted extension directory requires re-registration. Chrome/Edge internal pages cannot be scanned.

## Replace an expired direct-download link (1.0.1)

For a paused or failed HTTP download with saved bytes, use the chain-link action on its row and paste a fresh URL for **the same file**. Baran checks the total size, a matching strong ETag, real Range responses, and the first/last saved bytes of each downloaded segment. It updates the saved source without resetting segment offsets, stays paused, and lets you press Resume. It does not obtain a paid/signed URL automatically or extend the server's expiry time.

A weak/missing ETag, changed size/content or unsupported Range is rejected; your original URL and partial file remain. HTTP 401/403 stops the job and keeps partial data. File boundaries and HTTP validators are not a cryptographic full-file checksum. These checks assume an honest server's strong ETag semantics; a trusted publisher checksum is still the strongest final integrity check. This feature is for direct HTTP(S) files, not torrent sources or yt-dlp media URLs.

## Video & Instagram

Use **Video & audio** for yt-dlp quality/audio/playlist selection. Install or update yt-dlp in Settings → Tools. ffmpeg is required for merging separate streams or conversion.

Use **Instagram** for a specific post, reel, share link or story, then choose **Find media**. Install gallery-dl with the provided button on Windows. It collects up to 100 media URLs per request into the inbox. On Linux, install gallery-dl on PATH through your package manager or pipx.

Public content can be available without login. When a source requests authorization, select your own signed-in browser or cookies.txt in Settings → Tools. This is access to your authorized session, not a bypass. No Instagram password is requested by Baran. A browser may lock its cookie store; follow the extractor's supported cookie workflow if reading it fails.

Some web download services fetch public metadata from their servers, maintain their own sessions, cache prior results or use site-specific extractors. Their visible lack of a login prompt does not mean all content is public. Baran's browser extension can collect accessible HTTP(S) media URLs in a page, including photos, but cannot forward a `blob:` object as a reusable server URL.

## Speed & proxy

Settings → Speed contains an HTTP/video rate limit and independent torrent download/upload limits. Torrent limits apply across the torrent client and include seeding. Enter 0 for unlimited. Settings → General controls continuing to seed after completion.

Settings → Network & proxy offers Direct, Automatic system/PAC, or a manual HTTP, HTTPS, SOCKS4 or SOCKS5 URL. No credentials embedded in proxy URLs are accepted. New web requests use the selected configuration. Active requests retain their established route. The media tools resolve the current URL's system proxy before starting. A PAC file may route other media domains differently; complex PAC behavior may require a manual proxy for those tools.

Torrent peer and DHT traffic is not routed through the web proxy. A system VPN is needed for routing all peer traffic. Cookies and bearer tokens manually supplied for a download may be stored in the persistent download queue by the inherited task model; do not share that state file.

## Source and support

Repository: https://github.com/mehdiporbaba/Baran-Download-Manager

Original upstream: https://github.com/TheGreatAzizi/Pulse-Download-Manager

License: GPL-3.0-or-later. See LICENSE and docs/VALIDATION.md.

</details>
