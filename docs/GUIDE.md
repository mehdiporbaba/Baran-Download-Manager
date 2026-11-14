# Baran Download Manager — user guide

## Windows setup

Use the Setup build for normal installation. The Portable build does not register Windows startup because its executable is unpacked into a temporary directory. Settings → General controls launch at sign-in, desktop notifications and closing/minimizing to the tray. Use **Quit** in the tray menu to exit completely.

## Add or schedule a download

Choose **New download**. Paste a URL, choose the folder and optionally set **Download start time**. Time is entered in the computer's local timezone. An empty time starts through the normal queue. Scheduled tasks appear in **Scheduled** and remain saved after restarting. Baran must be running at the scheduled time. An overdue queued job starts after the app next runs. A paused job stays paused.

To change an existing job's time, pause it and use the clock action on its download row. The scheduling dialog works at compact window widths. A wide-window details panel also offers scheduling controls.

## Link workspace & folder scanner

Paste one or many HTTP(S) links or import a TXT file. Select visible rows, check availability and select a destination before downloading. No import starts a download on its own. A start time applies to the selected batch. The staging inbox is kept in memory until the app closes; queued download jobs are persistent.

The scanner follows linked HTML pages within the selected origin and containing folder. Depth zero checks only the supplied page. Limits: 100 pages, depth 5, 2 MB per HTML page, 2,000 file links and 90 seconds. Cancellation keeps discovered links. Directory listings can be scanned recursively; hidden or unlisted server files cannot be enumerated. Downloads currently share one destination rather than reproducing the remote folder tree.

## Browser extension — Windows

Load the browser-extension directory unpacked in Chrome or Edge. Copy its ID and run:

```powershell
& .\browser-extension\native-host\register.ps1 -ExtensionId 'YOUR_EXTENSION_ID' -Browser chrome
```

The script compiles the included C# Native Messaging host with the Windows .NET Framework compiler and registers it for the current user only. It does not need administrator rights. Use `-Browser edge` for Edge. If local script policy blocks it, review the script and use your approved development workflow.

Keep Baran running, then right-click a link or use **Collect page links / Collect visible media**. If page text is selected, the collection is limited to elements intersecting that selection. Imports stage up to 2,000 links and never request automatic downloading. A native message is limited to 256 KB. Browser cookies and passwords are not transferred by this extension.

To remove registration, run the same command with `-Unregister`, then remove the extension in the browser. Moving the extracted extension directory requires re-registration. Chrome/Edge internal pages cannot be scanned.

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
