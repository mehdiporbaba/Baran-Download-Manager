# Validation

## Native 2.0.0 checks

- Native C# application and NSIS Setup compile on Windows; the Portable ZIP contains roughly 8 MB of app files and no Electron/Node/WebTorrent runtime. Exact final package sizes and hashes are recorded with release assets.
- Native integration tests cover a pre-migration state backup, preserved two-segment legacy offsets, HTTP 403 preservation, rejected changed ETags/content/missing Range, verified new-link continuation and byte-for-byte output.
- Future tasks do not connect early; native settings and the persistent Inbox survive a full process restart. Browser imports are durable before acknowledgement. The compiled C# Native Messaging host is tested against the native pipe.
- Controlled HTTP and SOCKS5h proxy routes, shared rate limiting, drained pause/resume writers, scanner origin/path/redirect boundaries and ordinary non-Range HTTP files are tested.
- The bundled aria2 engine downloads a private torrent through a local tracker and WebTorrent test seeder with exact final bytes. WebTorrent is a test/legacy dependency, not part of the native package. DHT/PEX/LPD are disabled for this controlled test.
- Media CLI fixture executables generated from source exercise metadata, output-file completion and Instagram photo/video filtering. Live authenticated accounts and every upstream YouTube challenge are not claimed tested.
- The actual WebView2 window opened on All downloads and was inspected through Windows accessibility. Native screenshots failed twice; the shared frontend's menu, 15-second auto-close, pinning and Persian layout were separately checked in a browser preview.
- Firefox `web-ext lint` passed with zero errors/warnings. The XPI remains unsigned; signing/store submission and real installed-browser acceptance are pending.
- Native third-party libraries need independent security/update monitoring. Root npm audit findings remain for the legacy/build/test environment; this release does not claim a complete clean vulnerability audit.

## 1.0.1 development checks

- 17 automated checks including Chrome/Firefox API boundary tests for acknowledged download handoff, offline resume, opt-out and private/unsupported downloads.
- Electron runtime integration covers HTTP 403 preservation, link replacement, unchanged byte offsets, changed ETag, lying ETag with changed sampled content, missing Range, final file equality, and persistence of the pinned menu setting.
- Frontend preview verified All downloads on launch, closed navigation, opening from the hamburger, closure after 15 seconds outside, the keep-open option surviving the timeout, Persian layout and browser integration settings. The preview has empty fixture data and is not an installed browser-extension acceptance test.
- Windows packaging retains four Electron language packs and omits duplicated resources and Electron's demo application. Maximum compression reduces the installer, but does not remove the bundled Chromium runtime.
- Firefox XPI is unsigned and must be signed through Mozilla before public installation. Chrome/Edge store publication and real-browser extension acceptance remain pending. No store installation is claimed.

## Version 1.0.0 baseline

Local validation target: Windows x64, Node.js 24, Electron 45.3.1.

## Completed checks

- TypeScript type checking for main, preload, renderer and shared contracts.
- Production build of all three application bundles.
- Fourteen automated checks covering URL preservation/deduplication, browser-message validation, atomic inbox overflow, compiled Windows Native Messaging framing, scanner recursion and cycle termination, same-origin/path redirect restrictions, page/depth/HTML-size limits, cancellation, scheduled eligibility, proxy parsing, Instagram result parsing, and adaptive window bounds.
- Electron runtime integration: direct HTTP requests, actual manual HTTP-proxy routing, byte-range response integrity, a future job making no early connection, scheduler-triggered file completion, persisted scheduled timestamps, rescheduling to now, exact downloaded file bytes, independent torrent download/upload calls and rate limiter timing.
- Application opened on its custom home page with the complete product title, new navigation and version 1.0.0. Native Windows screenshot capture timed out during inspection, so this check uses the application's accessibility state rather than a screenshot-based visual assertion.
- Windows installer and Portable packaging, plus a separate browser extension archive and compiled native host.

- Frontend visual preview checked at 1000×680 and 720×560, including blue button styling, compact spacing, separate Instagram and Link Grabber screens and Persian labels. This isolated preview uses an empty test data bridge, not a live Instagram account.

## Boundaries of these checks

- No claim is made that a protected live Instagram account, every YouTube challenge or every browser's cookie store works. Those depend on upstream extractors, access and site behavior. The Instagram parser is tested with representative extractor output.
- Native host framing is integration-tested, while the unpacked Chrome/Edge extension still requires real-browser acceptance testing after user installation. It has not been submitted to a browser store.
- Startup registration is implemented through Electron login items for installed Windows builds; portable startup is deliberately disabled. An installer has not been installed over an existing user installation during local tests.
- Automatic proxy/PAC selection uses Electron's operating-system resolver. The OS's proxy configuration was not changed during tests. Manual HTTP routing was tested against a local proxy; external authenticated proxy servers are not supported.
- Torrent rate configuration is tested with a client boundary double. Public torrent swarm throughput was not benchmarked and network throughput cannot be guaranteed.
- Linux has a source build configuration, but version 1.0.0's locally verified release assets target Windows x64.

## Dependency audit

`npm audit` reports 10 findings in inherited dependencies: 4 high and 6 moderate, mainly the WebTorrent → tracker → `ip` chain and electron-builder/minimatch build tooling. The audit's suggested downgrade to very old WebTorrent versions is not applied blindly. These findings are recorded for follow-up and the release does not claim a clean security audit.

No credentials, cookies, generated host-registration manifests or development test profiles are included in the source commit or extension archive. Runtime browser cookies are only read when the user explicitly selects that source in Settings.
