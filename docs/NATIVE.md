# Native Windows architecture

Baran 2.0 uses a C#/.NET Framework WinForms host with the installed Microsoft Edge WebView2 Evergreen Runtime. The React interface is reused. It is **not a Tauri or Rust build**, and it does not ship Electron, Node.js, a fixed Chromium runtime or WebTorrent.

The first measured local packages are about 2.5 MB for Setup and 3.2 MB for Portable ZIP, compared with roughly 130 MB for the first Electron installer. Published asset sizes and checksums are authoritative. The installed app files occupy about 8 MB before WebView2's profile/cache. The shared WebView2 Runtime and .NET are OS prerequisites; they are not counted as bundled app files. A computer without WebView2 needs a separate Microsoft runtime download. Optional media executables can also be much larger than Baran itself.

## Components

- `native/Program.cs`: DPI-aware, frameless WebView2 shell, compact initial bounds, tray, notifications, dialogs, clipboard watch, current-user startup and browser-host registration.
- `native/bridge.js`: the frontend's existing `window.pulse` contract implemented with WebView2 messages. Only the local app origin is accepted by the native receiver; web navigation opens externally.
- `native/Core.cs`: persistent queue, scheduler, statistics, desktop service dispatch and task lifecycle.
- `native/HttpDownload.cs`: native HTTP range workers, shared rate limiter, legacy partial-file compatibility, pause/cancellation draining and verified source replacement.
- `native/Network.cs` / `ProxyTunnel.cs`: direct/system PAC/manual routing, HTTP proxy and authenticated local adapters for SOCKS5/HTTPS proxies. TLS validation is retained. Windows Framework's loopback handling can bypass proxy routing for loopback destinations; non-loopback proxy requests are tested using controlled local proxy fixtures.
- `native/Torrents.cs`: bundled official aria2 process. Its JSON-RPC binds to loopback with a random per-process secret and no permissive CORS. Torrent peers/DHT are not routed by the web proxy setting. Private-swarm tests disable DHT/PEX/LPD.
- `native/Links.cs`: persistent bounded inbox and bounded same-origin/path HTML scanner. Browser imports are written before acknowledgement.
- `native/Media.cs`: optional yt-dlp/gallery-dl/ffmpeg execution, safe Windows argument quoting, authorized cookie settings and official-release tool updates with available SHA-256 checks.
- `native/BrowserPipe.cs`: bounded, current-user-only Native Messaging pipe. The host only stages URLs; it does not automatically execute downloads or commands.

The runtime component inventory is in `native/runtime-components.json`; license files ship with the app. It is an inventory, not a clean CVE audit. The official aria2 Windows package is pinned at 1.37.0 and includes its upstream native-library versions. These require independent update monitoring. The old npm/WebTorrent audit findings still apply to the retained legacy source/build environment, not to Node modules in the native package.

## Build and verify

On Windows with Node 24/npm and the Windows .NET Framework C# compiler:

```powershell
npm ci
npm run typecheck
npm test
npm run build:native
npm run test:native
```

The build fetches pinned, SHA-256-verified WebView2 SDK, HtmlAgilityPack and aria2 archives. NSIS and a verified standalone 7-Zip extractor are fetched if a compiler is not cached. None of this build tooling is installed system-wide or copied into the application runtime. The native bundle only takes `out/renderer` from the frontend build.

`native/build.ps1 -SkipFrontend -SkipInstaller` reuses an existing frontend and produces just the native Portable ZIP. `native/sign.ps1` supports a supplied trusted code-signing certificate thumbprint; normal builds remain honestly unsigned without a certificate. No self-signed root is generated or installed.

## Migration and rollback

The native app uses `%APPDATA%\Baran\pulse-state.json`, copies a one-time `pulse-state.before-native.json` backup before migration, and understands `.pulse-part` / `.pulse-meta` segment offsets. Close the Electron version first. The native installer uses a separate program directory so the old program is available for rollback. Do not run both against the same real profile.

Inbox entries are in `%APPDATA%\Baran\baran-inbox.json`. Media tools remain in the profile's `bin` folder. Uninstalling application files keeps the roaming profile and downloaded files.

## Tested and pending

Native integration tests use an isolated profile, a local HTTP server, HTTP/SOCKS5h proxies and a private tracker/seeder. They cover preserved legacy offsets, 403 handling, mismatched/missing Range and ETag rejection, exact final bytes, deferred scheduling, rate limiting, pause/resume, settings and inbox persistence, scanner scope and media CLI boundaries. The media fixture is generated from source; it is not evidence that a particular live protected account or YouTube challenge works.

The real WebView2 app opened and exposed its All downloads screen through Windows accessibility. Native window screenshot capture failed in this environment. The shared frontend's menu/timer/pinned setting was separately verified in a browser preview.

Store extension signing/listings, a trusted Windows signing identity, real-browser extension acceptance, OS wake scheduling, Debrid, remote control and native non-Windows packaging are pending. See `docs/ROADMAP.md`.
