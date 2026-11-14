# Version 1.0.0 validation

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
