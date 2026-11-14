<div align="center">

<img src="resources/banner.svg" alt="Baran Download Manager — Your download workspace" width="100%" />

[![Version](https://img.shields.io/badge/version-1.0.0-14b8a6)](https://github.com/mehdiporbaba/Baran-Download-Manager/releases)
[![License](https://img.shields.io/badge/license-GPL--3.0--or--later-blue)](LICENSE)
[![Windows](https://img.shields.io/badge/Windows-x64-0284c7)](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/latest)

**Collect links. Plan your queue. Control your connection.**

[Download](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/latest) · [Browser extension](browser-extension) · [Setup guide](docs/GUIDE.md) · [فارسی](#باران-دانلود-منیجر)

</div>

## A workspace built around your downloads

Baran Download Manager brings direct files, scheduled jobs, browser links, media and torrents into one desktop workspace. A compact home dashboard, cloud/download identity and adaptive window sizes make it comfortable on ordinary laptop screens and high-DPI monitors.

This is an independently maintained GPL fork of [Pulse Download Manager](https://github.com/TheGreatAzizi/Pulse-Download-Manager), extended by **Mehdi Porbaba**. The original authors and licensing are credited below.

## What's inside

| Workspace | What you can do |
| --- | --- |
| **Link Grabber** | Paste text or import TXT, deduplicate links, check availability, filter file extensions, and download a selection. |
| **Folder scanner** | Discover linked files in an HTML directory or page tree, with depth/page limits, cancellation and an explicit preview. |
| **Scheduling** | Set a local start date/time when adding files or a batch. Scheduled jobs are saved with the download queue. |
| **Browser extension** | Send a link, collect page links or collect visible media from Chrome/Edge through Windows Native Messaging. |
| **YouTube & video** | Use yt-dlp to select quality, audio, subtitles and playlist items. Optional tools are managed in Settings. |
| **Instagram** | Use gallery-dl to collect photos, video posts, reels, carousels and accessible stories into the review inbox. |
| **Torrent controls** | Configure separate download and upload/seeding rate limits and select whether seeding continues after completion. |
| **Proxy routing** | Direct, automatic system/PAC, or manual HTTP(S)/SOCKS routing for web downloads and media tools. |
| **Desktop integration** | Installed Windows startup, minimize/close to system tray, notifications, Persian RTL and light/dark themes. |

## Download & start

Open the [latest release](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/latest).

- **Setup**: `Baran-Download-Manager-Setup-1.0.0-x64.exe` — Windows installer and shortcuts.
- **Portable**: `Baran-Download-Manager-Portable-1.0.0-x64.exe` — no installation; Windows startup registration is disabled for portable builds.
- **Extension**: `Baran-Browser-Extension-1.0.0.zip` — unpack, load in Chrome/Edge, then register its native host using the included guide.

The first Windows release is unsigned. Optional `yt-dlp`, `gallery-dl` and `ffmpeg` are separate tools; check the guide for their installation and availability. This release does not claim that every website or media link can be downloaded.

## Browser integration

1. In `chrome://extensions` or `edge://extensions`, turn on **Developer mode** and choose **Load unpacked**.
2. Select the unpacked `browser-extension` directory and copy the extension ID.
3. Register the Windows native host for that extension:

```powershell
& .\browser-extension\native-host\register.ps1 -ExtensionId 'YOUR_32_CHARACTER_ID' -Browser chrome
```

Use `-Browser edge` for Edge. Keep the extension directory in place while registered. Baran must be running to receive links. See the [complete guide](docs/GUIDE.md) for removal and troubleshooting.

## Why do some media links need a login?

Public content may work without logging in. A desktop downloader cannot automatically inherit the session from an open browser tab. Restricted stories, private posts, age checks and service-side bot checks may require cookies from your own authorized session.

The extension can collect HTTP(S) media URLs already present in a page you can access. This is different from guaranteeing access to every video player: `blob:` objects, encrypted streams, expiring URLs and POST-based downloads may need a different integration. Baran does not bypass account permissions or DRM.

## Scope & current limits

- A scanner can discover **linked files**, not hidden files that the server never lists. Traversal stays within the seed origin and containing directory. Remote subfolder recreation is not included in 1.0.
- The link review inbox is session-only. Download tasks and scheduled start times are persistent. Keep Baran running; the scheduler does not wake a sleeping or shut-down computer.
- Web proxy settings do not tunnel torrent peer or DHT traffic. Use an operating-system VPN when all torrent traffic must be routed. Authenticated proxy URLs are not supported in 1.0.
- Instagram extraction depends on gallery-dl, Instagram availability and your access. Stories/private content may require an authorized session. CDN URLs can expire and need re-extraction.
- The extension is shipped unpacked, not published in browser stores. Native Messaging setup in 1.0 targets Windows; Linux source builds do not yet include that host.
- The inherited dependency audit includes findings in WebTorrent/build-tool chains. See [validation notes](docs/VALIDATION.md) for the release's checks and limits.

## Build from source

Use **Node.js 24** and npm.

```powershell
git clone https://github.com/mehdiporbaba/Baran-Download-Manager.git
cd Baran-Download-Manager
npm ci
npm test
npm run typecheck
npm run test:network
npm run dev
```

```powershell
npm run build
npm run dist:win
```

Source builds can also target Linux using `npm run dist:linux`. Windows is the packaged and locally verified target for version 1.0.0.

## باران دانلود منیجر

**Baran Download Manager** یک فضای یکپارچه برای مدیریت دانلود است: لینک‌گیر گروهی، اسکن پوشه‌های دارای فهرست، زمان‌بندی شروع، افزونه مرورگر، دریافت رسانه و تنظیم اتصال.

- پنجره اولیه با فضای نمایشگر هماهنگ می‌شود و به‌صورت پیش‌فرض بزرگ و تمام‌صفحه نیست.
- برای زمان‌بندی، در پنجره دانلود جدید یا لینک‌گیر، تاریخ و ساعت شروع را وارد کن؛ برنامه باید هنگام موعد باز باشد.
- در **Settings → Speed** سرعت HTTP/ویدیو و سقف‌های دانلود و آپلود تورنت را تنظیم کن. صفر یعنی نامحدود.
- در **Settings → Network & proxy** اتصال مستقیم، پراکسی سیستم/PAC یا پراکسی دستی را انتخاب کن.
- برای اینستاگرام، بخش **Instagram** را باز کن و ابزار مربوط را نصب کن. محتوای عمومی الزاماً به ورود نیاز ندارد؛ محتوای خصوصی و برخی استوری‌ها ممکن است نشست مجاز خودت را بخواهند.
- تنظیمات اجرای خودکار ویندوز و ادامه فعالیت در Tray در بخش عمومی تنظیمات قرار دارد.

## Credits & license

Copyright © 2026 **TheGreatAzizi** and the original Pulse contributors for the upstream application. Baran extensions, integration and identity © 2026 **Mehdi Porbaba**.

Distributed under **GNU GPL v3.0 or later**. See [LICENSE](LICENSE). Source for this release is available in this repository. yt-dlp, gallery-dl, ffmpeg, Electron, WebTorrent and other dependencies retain their respective licenses.
