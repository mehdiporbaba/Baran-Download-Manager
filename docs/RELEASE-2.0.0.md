**Baran Download Manager 2.0.0 — native Windows x64**

The Windows app now uses a C#/.NET Framework backend and the installed Microsoft WebView2 Evergreen Runtime. Electron, Node.js, a fixed Chromium runtime and WebTorrent are absent from this app package. Local builds measure roughly **2.5 MB Setup / 3.2 MB Portable ZIP**, compared with about 130 MB for the first Electron installer. The attached asset sizes and SHA-256 file give the exact published values.

### Downloads

- **Native Setup:** normal Windows installation and shortcuts.
- **Native Portable ZIP:** extract to a stable folder and run `Baran Download Manager.exe`.
- **Chrome/Edge extension ZIP:** development package; public store publication is pending.
- **Firefox unsigned XPI:** package prepared for Mozilla signing, **not a normal-user installer yet**.
- **SHA256SUMS-Native-2.0.0.txt:** checksums for all four packages.

Windows 10/11 x64 needs .NET Framework and Microsoft's shared WebView2 Evergreen Runtime. The runtime is already present on many computers; a missing runtime requires a separate Microsoft download. Optional yt-dlp/gallery-dl/ffmpeg tools are also separate downloads and may be much larger than Baran itself.

### Changes

- Open **All downloads** by default; hamburger navigation starts closed, closes after 15 seconds outside, and can stay pinned through Settings → General.
- Persistent link Inbox, including extracted Instagram filenames; browser imports are acknowledged after durable storage.
- Native segmented HTTP downloads, global HTTP rate control, scheduler and bounded folder scanning.
- Replace expired HTTP links after verifying size, a strong ETag and saved segment boundaries. Preserve partial data on 401/403 or a refused range. Resume without resetting saved offsets.
- Preserve the old queue/partial-file format and create a pre-migration state backup. Close the Electron app before using the native app.
- Native torrent engine with independent download/upload caps; validated with a private local tracker/seeder.
- Optional media tools, authorized browser-cookie settings, tray, startup and in-app native browser host registration.
- Chrome/Firefox-compatible extension sources and optional browser-download handoff that resumes browser downloads if Baran cannot acknowledge receipt.

### Validation and limits

Native integration checks cover exact file bytes, legacy partial offsets, link expiry/replacement failure cases, scheduled starts, HTTP/SOCKS5h routing, pause/rate limits, scanner scope, a private torrent download, compiled browser-host framing, media CLI fixtures and a full-process Inbox restart. The real WebView2 window was inspected through accessibility. This is not a live protected-account test or proof that every media-site challenge works.

**Unsigned Windows binaries:** no trusted signing identity has been supplied. A self-signed certificate would not fix public SmartScreen trust. Firefox signing and browser-store listings still need owner-controlled developer accounts.

Web proxy settings do not tunnel torrent peers/DHT. Schedules still require the app running and do not wake the PC. Debrid, authenticated LAN/mobile control, wake scheduling, VPN kill-switch and native macOS/Linux packages are future work. Native dependency versions need their own update monitoring; this release does not claim a clean vulnerability audit.

[Setup guide](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/GUIDE.md) · [Architecture](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/NATIVE.md) · [Roadmap](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/ROADMAP.md)

### فارسی

نسخهٔ بومی باران: بستهٔ نصب بسیار کوچک‌تر، حذف Electron از بسته، شروع از همهٔ دانلودها، منوی کشویی زمان‌دار، Inbox ماندگار و تعویض امن‌تر لینک منقضی‌شده. WebView2 ویندوز و ابزارهای اختیاری رسانه جدا هستند. فایل‌های ویندوز هنوز امضای معتبر ندارند و بستهٔ فایرفاکس برای نصب عادی به امضای Mozilla نیاز دارد.

GPL-3.0-or-later. Original Pulse authorship retained; native backend and Baran identity maintained by Mehdi Porbaba.
