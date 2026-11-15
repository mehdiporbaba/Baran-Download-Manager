<a id="en"></a>

<div align="center">

<img src="resources/banner.svg" alt="Baran Download Manager — Your download workspace" width="100%" />

[![Version](https://img.shields.io/badge/version-2.0.0-0284c7)](https://github.com/mehdiporbaba/Baran-Download-Manager/releases)
[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows-x64-0284c7)](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/latest)

**Collect links. Plan your queue. Control your connection.**

[Download](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/latest) · [Browser extension](browser-extension) · [Setup guide](docs/GUIDE.md) · [فارسی](#fa)

</div>

**Firefox installation fixed:** use the [Mozilla-signed Firefox 1.0.1 XPI](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/firefox-v1.0.1), then connect Firefox in Baran Settings → Browser integration. Do not use the old unsigned development XPI. [Signing details](docs/FIREFOX-SIGNING.md).

**2.1.0-beta.2 prerelease:** Real-Debrid, authenticated private-LAN mobile control, Windows wake tasks and experimental HTTP-only IPv4 VPN binding. [Scope and limits](docs/RELEASE-2.1.0-beta.2.md). Latest stable desktop: **2.0.0**.

## A workspace built around your downloads

Baran Download Manager brings direct files, scheduled jobs, browser links, media and torrents into one desktop workspace. Version 2.0 uses a native C# backend and the shared Windows WebView2 Runtime: roughly 2.5 MB Setup / 3.2 MB Portable ZIP in local builds, with no bundled Electron, Node.js or Chromium runtime. It opens All downloads with a collapsible menu and keeps your review inbox on disk. [Architecture and measurements](docs/NATIVE.md).

This is an independently maintained GPL fork of [Pulse Download Manager](https://github.com/TheGreatAzizi/Pulse-Download-Manager), extended by **Mehdi Porbaba**. The original authors and licensing are credited below.

## What's inside

| Workspace | What you can do |
| --- | --- |
| **Link Grabber** | Paste text or import TXT, deduplicate links, check availability, filter file extensions, and download a selection. |
| **Folder scanner** | Discover linked files in an HTML directory or page tree, with depth/page limits, cancellation and an explicit preview. |
| **Scheduling** | Set a local start date/time when adding files or a batch. Scheduled jobs are saved with the download queue. |
| **Browser extension** | Mozilla-signed Firefox XPI, Chrome/Edge development sources, optional acknowledged handoff and in-app Native Messaging registration. Public store listings remain pending. |
| **Expired links** | Replace a paused/error HTTP URL after verifying size, a strong ETag and saved segment boundaries, then resume without resetting offsets. |
| **YouTube & video** | Use yt-dlp to select quality, audio, subtitles and playlist items. Optional tools are managed in Settings. |
| **Instagram** | Use gallery-dl to collect photos, video posts, reels, carousels and accessible stories into the review inbox. |
| **Torrent controls** | Configure separate download and upload/seeding rate limits and select whether seeding continues after completion. |
| **Proxy routing** | Direct, automatic system/PAC, or manual HTTP(S)/SOCKS routing for web downloads and media tools. |
| **Desktop integration** | Installed Windows startup, minimize/close to system tray, notifications, Persian RTL and light/dark themes. |

## Download & start

Open the [latest release](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/latest).

- **Setup**: `Baran-Download-Manager-Native-Setup-2.0.0-x64.exe` — compact Windows installer and shortcuts.
- **Portable**: `Baran-Download-Manager-Native-Portable-2.0.0-x64.zip` — extract into a stable folder and run `Baran Download Manager.exe`.
- **Extensions**: Chrome/Edge development ZIP; use the separate [Mozilla-signed Firefox release](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/firefox-v1.0.1) instead of the historical unsigned XPI in desktop 2.0.0.

Windows 10/11 x64 needs .NET Framework and the shared Microsoft WebView2 Evergreen Runtime. WebView2 is already present on many PCs; a missing runtime requires a separate Microsoft download. The app is unsigned unless the release explicitly provides a verified trusted publisher signature. Self-signed certificates do not solve public SmartScreen trust. Optional `yt-dlp`, `gallery-dl` and `ffmpeg` are separate tools and can be much larger than Baran. No guarantee is made that every source-site challenge or protected account works.

## Browser integration

1. In `chrome://extensions` or `edge://extensions`, turn on **Developer mode** and choose **Load unpacked**.
2. Select the unpacked `browser-extension` directory and copy the extension ID.
3. In Baran, open **Settings → Browser integration**, select the browser, paste that development extension ID and click **Connect browser**. No PowerShell command is required.

Firefox has a fixed add-on ID and needs no copied ID in Baran. Its **signed.xpi** is approved by Mozilla for self-distribution and ordinary Firefox installation. Chrome/Edge still need store publication for ordinary-user onboarding; a plain ZIP/CRX does not bypass store requirements. In the extension popup you can opt in to handling new HTTP(S) downloads; it resumes the browser if Baran cannot acknowledge receipt. [Guide](docs/GUIDE.md) · [Privacy](browser-extension/PRIVACY.md).

## Why do some media links need a login?

Public content may work without logging in. A desktop downloader cannot automatically inherit the session from an open browser tab. Restricted stories, private posts, age checks and service-side bot checks may require cookies from your own authorized session.

The extension can collect HTTP(S) media URLs already present in a page you can access. This is different from guaranteeing access to every video player: `blob:` objects, encrypted streams, expiring URLs and POST-based downloads may need a different integration. Baran does not bypass account permissions or DRM.

## Scope & current limits

- A scanner can discover **linked files**, not hidden files that the server never lists. Traversal stays within the seed origin and containing directory. Remote subfolder recreation is not included in 1.0.
- The native app persists the link review inbox, download tasks and scheduled times. Keep Baran running; the scheduler does not yet wake a sleeping or shut-down computer.
- Web proxy settings do not tunnel torrent peer or DHT traffic. Use an operating-system VPN when all torrent traffic must be routed. Authenticated proxy URLs are not supported in 1.0.
- Instagram extraction depends on gallery-dl, Instagram availability and your access. Stories/private content may require an authorized session. CDN URLs can expire and need re-extraction.
- The extension is shipped unpacked, not published in browser stores. Native Messaging setup in 1.0 targets Windows; Linux source builds do not yet include that host.
- The native package contains no WebTorrent/Node modules. Inherited npm findings remain in the legacy source/build environment; native dependencies have their own update needs. This is not a claim of a clean vulnerability audit. See [validation notes](docs/VALIDATION.md) and the [runtime inventory](native/runtime-components.json).

## Build from source

Use Windows, **Node.js 24**, npm and the Windows .NET Framework C# compiler. The build downloads pinned and checksum-verified native SDK/engine archives.

```powershell
git clone https://github.com/mehdiporbaba/Baran-Download-Manager.git
cd Baran-Download-Manager
npm ci
npm test
npm run typecheck
npm run build:native
npm run test:native
npm start
```

```powershell
npm run build
npm run dist:win
```

The native target is Windows x64. The retained Electron implementation has explicit `dev:electron`, `start:electron`, `dist:electron:win` and `dist:electron:linux` commands for development/rollback. A retained Linux configuration is not a tested native Linux release. [Product roadmap](docs/ROADMAP.md).

<a id="fa"></a>

<div dir="rtl" lang="fa" align="right">

<h2>باران دانلود منیجر</h2>

<p><strong>لینک‌ها را جمع‌آوری کنید. صف دانلودتان را برنامه‌ریزی کنید. اتصال را در اختیار بگیرید.</strong></p>

<p>
<a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases/latest">دانلود</a> ·
<a href="browser-extension">افزونهٔ مرورگر</a> ·
<a href="docs/GUIDE.md">راهنمای راه‌اندازی</a> ·
<a href="#en" dir="ltr">English</a>
</p>

<p>نسخهٔ پایدار: <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases"><bdi dir="ltr">2.0.0</bdi></a> · مجوز: <a href="LICENSE"><bdi dir="ltr">GPL-3.0-or-later</bdi></a> · سیستم‌عامل: ویندوز ۶۴ بیتی</p>

<p><strong>مشکل نصب افزونهٔ فایرفاکس برطرف شد:</strong> از <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/firefox-v1.0.1">فایل <bdi dir="ltr">XPI</bdi> نسخهٔ <bdi dir="ltr">1.0.1</bdi> فایرفاکس با امضای موزیلا</a> استفاده کنید؛ سپس در باران، از بخش «تنظیمات ← اتصال مرورگرها» اتصال فایرفاکس را فعال کنید. از فایل قدیمی و بدون امضای مخصوص توسعه استفاده نکنید. <a href="docs/FIREFOX-SIGNING.md">جزئیات امضای افزونه</a>.</p>

<p><strong>نسخهٔ پیش‌انتشار <bdi dir="ltr">2.1.0-beta.2</bdi>:</strong> پشتیبانی از <bdi dir="ltr">Real-Debrid</bdi>، کنترل موبایل با احراز هویت در شبکهٔ محلی خصوصی، تسک‌های بیدارکردن ویندوز و اتصال آزمایشی به اینترفیس <bdi dir="ltr">VPN</bdi> از طریق <bdi dir="ltr">IPv4</bdi> که فقط دانلودهای <bdi dir="ltr">HTTP</bdi> را پوشش می‌دهد. <a href="docs/RELEASE-2.1.0-beta.2.md">امکانات و محدودیت‌ها</a>. آخرین نسخهٔ پایدار دسکتاپ: <strong><bdi dir="ltr">2.0.0</bdi></strong>.</p>

<h3>فضایی برای مدیریت همهٔ دانلودهای شما</h3>

<p><bdi dir="ltr">Baran Download Manager</bdi> فایل‌های مستقیم، دانلودهای زمان‌بندی‌شده، لینک‌های مرورگر، رسانه‌ها و تورنت‌ها را در یک فضای کاری دسکتاپ کنار هم قرار می‌دهد. نسخهٔ ۲٫۰ از بخش پشتیِ بومی نوشته‌شده با <bdi dir="ltr">C#</bdi> و محیط اجرای مشترک <bdi dir="ltr">WebView2</bdi> ویندوز استفاده می‌کند: در ساخت‌های محلی، حجم نصب‌کننده حدود ۲٫۵ مگابایت و فایل فشردهٔ نسخهٔ قابل‌حمل حدود ۳٫۲ مگابایت است؛ بدون اینکه <bdi dir="ltr">Electron</bdi>، <bdi dir="ltr">Node.js</bdi> یا محیط اجرای <bdi dir="ltr">Chromium</bdi> همراه برنامه بسته‌بندی شود. برنامه با صفحهٔ «همهٔ دانلودها» و منوی جمع‌شونده باز می‌شود و صندوق لینک‌های آمادهٔ بررسی را روی دیسک نگه می‌دارد. <a href="docs/NATIVE.md">معماری و اندازه‌گیری‌ها</a>.</p>

<p>این برنامه فورکی با نگه‌داری مستقل و مجوز <bdi dir="ltr">GPL</bdi> از <a href="https://github.com/TheGreatAzizi/Pulse-Download-Manager"><bdi dir="ltr">Pulse Download Manager</bdi></a> است که توسط <strong>مهدی پُربابا</strong> توسعه یافته است. نام پدیدآورندگان اصلی و اطلاعات مجوز در ادامه آمده است.</p>

<h3>امکانات برنامه</h3>

<table dir="rtl">
<thead><tr><th align="right">بخش</th><th align="right">کارهایی که می‌توانید انجام دهید</th></tr></thead>
<tbody>
<tr><td align="right"><strong>لینک‌گیر</strong></td><td align="right">متن را جای‌گذاری یا فایل <bdi dir="ltr">TXT</bdi> را وارد کنید؛ لینک‌های تکراری را حذف، در دسترس بودن فایل‌ها را بررسی و پسوندها را فیلتر کنید؛ سپس موارد انتخاب‌شده را دانلود کنید.</td></tr>
<tr><td align="right"><strong>اسکنر پوشه</strong></td><td align="right">فایل‌های لینک‌شده در فهرست پوشه‌های <bdi dir="ltr">HTML</bdi> یا ساختار درختی صفحات را پیدا کنید؛ با محدودیت عمق و تعداد صفحه، امکان لغو و پیش‌نمایش روشن نتایج.</td></tr>
<tr><td align="right"><strong>زمان‌بندی</strong></td><td align="right">هنگام افزودن فایل یا مجموعه‌ای از فایل‌ها، تاریخ و ساعت محلی شروع را مشخص کنید. دانلودهای زمان‌بندی‌شده همراه صف دانلود ذخیره می‌شوند.</td></tr>
<tr><td align="right"><strong>افزونهٔ مرورگر</strong></td><td align="right">فایل <bdi dir="ltr">XPI</bdi> فایرفاکس با امضای موزیلا، سورس نسخه‌های توسعهٔ <bdi dir="ltr">Chrome/Edge</bdi>، واگذاری اختیاری دانلود پس از تأیید دریافت و ثبت اتصال <bdi dir="ltr">Native Messaging</bdi> از داخل برنامه. انتشار عمومی در فروشگاه‌ها هنوز انجام نشده است.</td></tr>
<tr><td align="right"><strong>لینک‌های منقضی‌شده</strong></td><td align="right">پس از بررسی اندازهٔ فایل، یک <bdi dir="ltr">ETag</bdi> قوی و مرز بخش‌های ذخیره‌شده، نشانی <bdi dir="ltr">HTTP</bdi> یک دانلود متوقف‌شده یا خطادار را جایگزین کنید؛ سپس بدون صفرشدن موقعیت دانلود، ادامه دهید.</td></tr>
<tr><td align="right"><strong>یوتیوب و ویدیو</strong></td><td align="right">با <bdi dir="ltr">yt-dlp</bdi> کیفیت، صدا، زیرنویس و موارد دلخواه فهرست پخش را انتخاب کنید. ابزارهای اختیاری از بخش تنظیمات مدیریت می‌شوند.</td></tr>
<tr><td align="right"><strong>اینستاگرام</strong></td><td align="right">با <bdi dir="ltr">gallery-dl</bdi> عکس‌ها، پست‌های ویدیویی، ریلز، پست‌های چنداسلایدی و استوری‌های در دسترس را در صندوق بررسی جمع‌آوری کنید.</td></tr>
<tr><td align="right"><strong>کنترل تورنت</strong></td><td align="right">سقف سرعت دانلود و آپلود/سید را جداگانه تنظیم کنید و مشخص کنید که سیدکردن پس از تکمیل دانلود ادامه پیدا کند یا نه.</td></tr>
<tr><td align="right"><strong>مسیریابی پراکسی</strong></td><td align="right">برای دانلودهای وب و ابزارهای رسانه، اتصال مستقیم، پراکسی خودکار سیستم/<bdi dir="ltr">PAC</bdi> یا پراکسی دستی <bdi dir="ltr">HTTP(S)/SOCKS</bdi> را انتخاب کنید.</td></tr>
<tr><td align="right"><strong>یکپارچگی با دسکتاپ</strong></td><td align="right">اجرای خودکار نسخهٔ نصب‌شده با شروع ویندوز، کوچک‌شدن یا بسته‌شدن در ناحیهٔ اعلان سیستم، اعلان‌ها، فارسی راست‌به‌چپ و پوسته‌های روشن و تیره.</td></tr>
</tbody>
</table>

<h3>دانلود و شروع کار</h3>

<p><a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases/latest">آخرین نسخهٔ منتشرشده</a> را باز کنید.</p>

<ul>
<li><strong>نصب‌کننده:</strong> <bdi dir="ltr"><code>Baran-Download-Manager-Native-Setup-2.0.0-x64.exe</code></bdi> — نصب‌کنندهٔ کم‌حجم ویندوز همراه میان‌برها.</li>
<li><strong>نسخهٔ قابل‌حمل:</strong> <bdi dir="ltr"><code>Baran-Download-Manager-Native-Portable-2.0.0-x64.zip</code></bdi> — فایل را در پوشه‌ای با محل ثابت استخراج و <bdi dir="ltr"><code>Baran Download Manager.exe</code></bdi> را اجرا کنید.</li>
<li><strong>افزونه‌ها:</strong> فایل <bdi dir="ltr">ZIP</bdi> مخصوص توسعهٔ <bdi dir="ltr">Chrome/Edge</bdi>؛ برای فایرفاکس از <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/firefox-v1.0.1">نسخهٔ جداگانه با امضای موزیلا</a> استفاده کنید، نه فایل قدیمی و بدون امضای <bdi dir="ltr">XPI</bdi> که در نسخهٔ دسکتاپ ۲٫۰٫۰ قرار داشت.</li>
</ul>

<p>روی ویندوز ۱۰ یا ۱۱ نسخهٔ ۶۴ بیتی، نصب <bdi dir="ltr">.NET Framework</bdi> و محیط اجرای مشترک <bdi dir="ltr">Microsoft WebView2 Evergreen Runtime</bdi> لازم است. <bdi dir="ltr">WebView2</bdi> از قبل روی بسیاری از رایانه‌ها وجود دارد؛ در صورت نبود آن، باید جداگانه از مایکروسافت دانلود شود. خود برنامه بدون امضاست، مگر اینکه در اطلاعات انتشار صراحتاً امضای معتبر و تأییدشدهٔ ناشر ارائه شده باشد. گواهی خودامضا، مشکل اعتماد عمومی <bdi dir="ltr">SmartScreen</bdi> را برطرف نمی‌کند. ابزارهای اختیاری <bdi dir="ltr"><code>yt-dlp</code></bdi>، <bdi dir="ltr"><code>gallery-dl</code></bdi> و <bdi dir="ltr"><code>ffmpeg</code></bdi> جداگانه دریافت می‌شوند و ممکن است بسیار حجیم‌تر از خود باران باشند. کارکرد برنامه در برابر همهٔ چالش‌های سایت‌های مبدأ یا حساب‌های دارای محدودیت تضمین نمی‌شود.</p>

<h3>اتصال مرورگرها</h3>

<ol>
<li>در <bdi dir="ltr"><code>chrome://extensions</code></bdi> یا <bdi dir="ltr"><code>edge://extensions</code></bdi>، گزینهٔ <bdi dir="ltr"><strong>Developer mode</strong></bdi> را روشن و <bdi dir="ltr"><strong>Load unpacked</strong></bdi> را انتخاب کنید.</li>
<li>پوشهٔ استخراج‌شدهٔ <bdi dir="ltr"><code>browser-extension</code></bdi> را انتخاب کنید و شناسهٔ افزونه را کپی کنید.</li>
<li>در باران، «تنظیمات ← اتصال مرورگرها» را باز کنید، مرورگر را انتخاب کنید، شناسهٔ نسخهٔ توسعهٔ افزونه را جای‌گذاری کنید و «فعال‌کردن اتصال» را بزنید. اجرای دستور <bdi dir="ltr">PowerShell</bdi> لازم نیست.</li>
</ol>

<p>افزونهٔ فایرفاکس شناسهٔ ثابتی دارد و نیازی به کپی‌کردن آن در باران نیست. فایل <bdi dir="ltr"><strong>signed.xpi</strong></bdi> آن برای توزیع مستقیم و نصب در فایرفاکس معمولی به تأیید موزیلا رسیده است. برای نصب آسان کاربران عادی، <bdi dir="ltr">Chrome/Edge</bdi> همچنان به انتشار در فروشگاه نیاز دارند؛ یک فایل سادهٔ <bdi dir="ltr">ZIP/CRX</bdi> الزامات فروشگاه را دور نمی‌زند. در پنجرهٔ افزونه می‌توانید واگذاری دانلودهای جدید <bdi dir="ltr">HTTP(S)</bdi> را فعال کنید؛ اگر باران نتواند دریافت لینک را تأیید کند، افزونه دانلود را در مرورگر ادامه می‌دهد. <a href="docs/GUIDE.md">راهنما</a> · <a href="browser-extension/PRIVACY.md">حریم خصوصی</a>.</p>

<h3>چرا بعضی لینک‌های رسانه به ورود به حساب نیاز دارند؟</h3>

<p>محتوای عمومی ممکن است بدون ورود قابل دریافت باشد. دانلودمنیجر دسکتاپ نمی‌تواند نشست ورود یک زبانهٔ باز مرورگر را خودکار به ارث ببرد. استوری‌های محدودشده، پست‌های خصوصی، بررسی سن و بررسی‌های ضدرباتِ سرویس ممکن است به کوکی‌های نشست مجاز خود شما نیاز داشته باشند.</p>

<p>افزونه می‌تواند نشانی‌های رسانهٔ <bdi dir="ltr">HTTP(S)</bdi> را که از قبل در صفحهٔ قابل دسترس شما وجود دارند جمع‌آوری کند. این قابلیت به معنی تضمین دسترسی به همهٔ پخش‌کننده‌های ویدیو نیست: اشیای <bdi dir="ltr"><code>blob:</code></bdi>، جریان‌های رمزگذاری‌شده، نشانی‌های دارای انقضا و دانلودهای مبتنی بر درخواست <bdi dir="ltr">POST</bdi> ممکن است به نوع دیگری از اتصال نیاز داشته باشند. باران مجوزهای حساب یا حفاظت <bdi dir="ltr">DRM</bdi> را دور نمی‌زند.</p>

<h3>دامنهٔ امکانات و محدودیت‌های فعلی</h3>

<ul>
<li>اسکنر می‌تواند <strong>فایل‌های لینک‌شده</strong> را پیدا کند؛ نه فایل‌های پنهانی که سرور هرگز فهرست نمی‌کند. پیمایش در همان مبدأ نشانی اولیه و پوشهٔ حاوی آن باقی می‌ماند. بازسازی زیرپوشه‌های مبدأ در نسخهٔ ۱٫۰ وجود ندارد.</li>
<li>نسخهٔ بومی، صندوق لینک‌های آمادهٔ بررسی، وظایف دانلود و زمان‌های برنامه‌ریزی‌شده را ذخیره می‌کند. باران را در حال اجرا نگه دارید؛ زمان‌بند هنوز رایانهٔ خوابیده یا خاموش را بیدار نمی‌کند.</li>
<li>تنظیمات پراکسی وب، ترافیک همتایان تورنت یا <bdi dir="ltr">DHT</bdi> را از تونل عبور نمی‌دهد. اگر باید تمام ترافیک تورنت از مسیر مشخصی عبور کند، از <bdi dir="ltr">VPN</bdi> سیستم‌عامل استفاده کنید. نشانی‌های پراکسی دارای اطلاعات احراز هویت در نسخهٔ ۱٫۰ پشتیبانی نمی‌شوند.</li>
<li>استخراج اینستاگرام به <bdi dir="ltr">gallery-dl</bdi>، در دسترس بودن اینستاگرام و سطح دسترسی شما بستگی دارد. استوری‌ها و محتوای خصوصی ممکن است به نشست مجاز نیاز داشته باشند. نشانی‌های <bdi dir="ltr">CDN</bdi> ممکن است منقضی شوند و نیاز به استخراج دوباره داشته باشند.</li>
<li>افزونه به‌صورت استخراج‌شده ارائه می‌شود و در فروشگاه‌های مرورگر منتشر نشده است. راه‌اندازی <bdi dir="ltr">Native Messaging</bdi> در نسخهٔ ۱٫۰ برای ویندوز است؛ ساخت‌های سورس لینوکس هنوز این میزبان را ندارند.</li>
<li>بستهٔ بومی شامل ماژول‌های <bdi dir="ltr">WebTorrent/Node</bdi> نیست. یافته‌های امنیتی به‌ارث‌رسیدهٔ <bdi dir="ltr">npm</bdi> همچنان در سورس و محیط ساخت نسخهٔ قدیمی وجود دارند؛ وابستگی‌های بومی نیز به‌روزرسانی‌های خاص خود را لازم دارند. این موضوع به معنی اعلام پاک‌بودن کامل ممیزی آسیب‌پذیری‌ها نیست. <a href="docs/VALIDATION.md">یادداشت‌های اعتبارسنجی</a> و <a href="native/runtime-components.json">فهرست اجزای محیط اجرا</a> را ببینید.</li>
</ul>

<h3>ساخت از روی سورس</h3>

<p>از ویندوز، <bdi dir="ltr"><strong>Node.js 24</strong></bdi>، <bdi dir="ltr">npm</bdi> و کامپایلر <bdi dir="ltr">C#</bdi> مربوط به <bdi dir="ltr">.NET Framework</bdi> ویندوز استفاده کنید. فرایند ساخت، فایل‌های فشردهٔ ابزارهای توسعه و موتور بومی را با نسخهٔ ثابت و بررسی چک‌سام دانلود می‌کند.</p>

<div dir="ltr" align="left">
<pre dir="ltr"><code>git clone https://github.com/mehdiporbaba/Baran-Download-Manager.git
cd Baran-Download-Manager
npm ci
npm test
npm run typecheck
npm run build:native
npm run test:native
npm start</code></pre>

<pre dir="ltr"><code>npm run build
npm run dist:win</code></pre>
</div>

<p>هدف ساخت بومی، ویندوز ۶۴ بیتی است. پیاده‌سازی قبلی <bdi dir="ltr">Electron</bdi> همچنان برای توسعه یا بازگشت به نسخهٔ قبلی نگه‌داری می‌شود و دستورهای مشخص <bdi dir="ltr"><code>dev:electron</code></bdi>، <bdi dir="ltr"><code>start:electron</code></bdi>، <bdi dir="ltr"><code>dist:electron:win</code></bdi> و <bdi dir="ltr"><code>dist:electron:linux</code></bdi> را دارد. وجود تنظیمات ساخت لینوکس به معنی ارائهٔ نسخهٔ بومیِ آزمایش‌شده برای لینوکس نیست. <a href="docs/ROADMAP.md">نقشهٔ راه محصول</a>.</p>

<h3>پدیدآورندگان و مجوز</h3>

<p>حق نشر برنامهٔ اصلی © ۲۰۲۶ متعلق به <bdi dir="ltr"><strong>TheGreatAzizi</strong></bdi> و مشارکت‌کنندگان اصلی <bdi dir="ltr">Pulse</bdi> است. حق نشر افزوده‌ها، یکپارچه‌سازی و هویت باران © ۲۰۲۶ متعلق به <strong>مهدی پُربابا</strong> است.</p>

<p>برنامه با <strong>مجوز عمومی همگانی گنو، نسخهٔ ۳٫۰ یا بالاتر</strong> توزیع می‌شود. <a href="LICENSE">متن مجوز</a> را ببینید. سورس این نسخه در همین مخزن در دسترس است. <bdi dir="ltr">yt-dlp</bdi>، <bdi dir="ltr">gallery-dl</bdi>، <bdi dir="ltr">ffmpeg</bdi>، <bdi dir="ltr">Electron</bdi>، <bdi dir="ltr">WebTorrent</bdi> و سایر وابستگی‌ها مجوزهای مربوط به خود را حفظ می‌کنند.</p>

</div>

## Credits & license

Copyright © 2026 **TheGreatAzizi** and the original Pulse contributors for the upstream application. Baran extensions, integration and identity © 2026 **Mehdi Porbaba**.

Distributed under **GNU GPL v3.0 or later**. See [LICENSE](LICENSE). Source for this release is available in this repository. yt-dlp, gallery-dl, ffmpeg, Electron, WebTorrent and other dependencies retain their respective licenses.
