# Baran project memory

Last reviewed: 2026-11-16 (Asia/Tehran). This file records project state, not additional authorization. Recheck GitHub and the working tree before resuming. Do not store credentials, browser cookies or private account data here.

## Identity and architecture

- Product: **Baran Download Manager**. Repository: https://github.com/mehdiporbaba/Baran-Download-Manager. Original upstream: https://github.com/TheGreatAzizi/Pulse-Download-Manager. Earlier GitHub owner `warchiefmad` is obsolete.
- GPL-3.0-or-later fork with upstream attribution. Preserve the independent Baran identity and blue/sky palette; maintain Persian RTL and text fitting in buttons throughout the UI.
- Shipping Windows x64 architecture: C#/.NET Framework + shared WebView2, bundled aria2. Electron/Node/Chromium/WebTorrent are not bundled in native releases. Retained Electron code is a development/rollback path, not the shipping native engine. Local native Setup/Portable measurements were about 2.6/3.3 MB; use actual release asset sizes for exact claims. Optional media tools and a missing WebView2 runtime are separate downloads.
- Startup view: All downloads. Navigation starts collapsed behind a hamburger, closes after 15 seconds outside, and has a persisted always-open option. Keep adaptive window sizing; compact layout must fit the user's display.

## Delivered features and boundaries

- HTTP segmented downloads, rate limiting, pause/resume, verified URL replacement preserving partial segments; reject different content or missing Range support. This is the answer to expired signed links, not arbitrary unverified continuation.
- Persistent Link Inbox and bounded recursive link scanner. Instagram extraction is a separate source view. Scanner stays within origin/folder and cannot enumerate files the server never exposes.
- Scheduler, Windows startup/tray, independent torrent download/upload limits, direct/system/manual web proxy. Web proxies do not cover torrent peers/DHT.
- yt-dlp/gallery-dl/FFmpeg integration and authorized browser/cookies-file selection. Public media may work anonymously; restricted media can need an authorized account. No guaranteed access to every YouTube/Instagram link, private story, POST download, blob stream or DRM media.
- Beta connected services: Real-Debrid with DPAPI-protected credentials, opt-in authenticated private-LAN mobile control, Windows WakeToRun scheduled tasks and experimental HTTP-only IPv4 VPN binding. Wake depends on Windows/hardware/power state and is not power-on from shutdown or Wake-on-LAN. Media/torrents are blocked during HTTP VPN binding because their traffic is not yet confined. No full torrent proxy/VPN kill-switch claim.
- Windows public trusted code signing and Chrome/Edge store publication remain pending. Self-signed certificates do not remove public SmartScreen reputation warnings. Linux/macOS packaged native releases are not delivered.

## Published versus prepared

- Last verified stable desktop: `v2.0.0`; latest published prerelease: `v2.1.0-beta.2`; previous prerelease: `v2.1.0-beta.1`. Verify live release state before publication. Root package version remains `2.1.0-beta.2`.
- Mozilla-signed Firefox `1.0.1` is published under `firefox-v1.0.1` and bundled by beta.2. Preserve `browser-extension/signed/Baran-Firefox-Extension-1.0.1-signed.xpi`; SHA-256 `908de928372ff98ca24f021907b175ceeb686e269db2b605b793d8676dbbc0c8`. Unlisted/self-distributed, not a public AMO store listing.
- Latest implementation commit: `b09c85b95d6f5909a27b92510eb58594c50265ac`, branch `codex/firefox-and-upstream-fixes`, draft PR https://github.com/mehdiporbaba/Baran-Download-Manager/pull/1. This source is not a newly published desktop installer. Documentation-only commits may follow it.
- Prepared Firefox/Chrome source version: `1.0.2`. Firefox unsigned submission: `dist/Baran-Firefox-Extension-1.0.2-unsigned.xpi` (generated/ignored). Mozilla signing is pending. Do not substitute it for the signed 1.0.1 package or claim it installs in ordinary Firefox. AMO update page: https://addons.mozilla.org/en-US/developers/addon/9981089fe8f345dfab31/versions/submit/ . Last handoff: owner must choose the prepared file because automated file selection failed; no 1.0.2 signing result was observed.

## Latest fixes awaiting release

- Browser capture formerly defaulted off and only staged a URL. New source explicitly opts in, checks desktop connection/capability, persists before ACK, requests New download, waits for renderer readiness during startup, and resumes the browser on failure/incompatible desktop.
- Firefox optional early attachment capture uses GET navigation responses and optional webRequest/webRequestBlocking/host grants. Excludes private/extension-owned/POST/background/unsupported downloads. No cookies, passwords or Authorization headers are transferred by this extension path.
- Native host may launch the registered Baran executable; Repair connection records its current path. Cold-start UI/real installed-Firefox acceptance still needs manual validation.
- Firefox cannot grant Baran exclusive priority or let it disable arbitrary competing extensions. Ask the user to disable the competing manager's browser integration; canceling that manager's dialog does not redistribute the request to Baran. Never promise a global Windows/Firefox default-download-manager takeover.
- Pulse `v1.0.3...v1.0.16` was supplied to find inherited bugs, not merely summarize commits. Adapt relevant fixes to BOTH native and retained Electron engines. Full bilingual mapping and limits: [upstream review](docs/UPSTREAM-REVIEW-v1.0.16.md).
- Applied: native TCP/UDP torrent fallback port range, native actionable YouTube errors, absolute media tool paths; Electron graceful Tray Quit, actual media output size, FFmpeg resolution, bounded torrent startup/fallback and early app identity; both engines get bounded GitHub transport retry. Native adds rate-limit/404 guidance. No bulk Electron merge into the native runtime.

## Verification evidence

For implementation commit `b09c85b`: 20 unit tests, TypeScript checks, native download/migration/browser-IPC integration, connected-services fixtures, retained Electron HTTP/proxy/resume regressions, 5 release-policy tests, and shared release-note checks passed locally. GitHub native Windows build, Windows/Linux source validation and Gitleaks workflows all completed successfully (verified 2026-11-16). This is not a complete security audit or Linux app acceptance.

Native tests include a real local private torrent with its configured TCP port deliberately occupied, exact final bytes, renderer-ready prompt handoff, durable Inbox ACK, media errors and deliberately inaccurate progress size. Connected tests exercise dropped GitHub connections, rate limits and 404 against a local server. Firefox 1.0.2 web-ext lint had zero errors/warnings. Live account extraction, real FFmpeg merging, UDP/DHT collision, installed-browser conflict behavior and Windows taskbar appearance were not all manually verified.

Commands: `npm run typecheck`, `npm test`, `npm run build:native`, `npm run test:native`, `npm run test:connected`, `npm run test:network`, `node --test tests/release-notes.test.cjs`, `node scripts/release-notes.cjs --check`. See [validation](docs/VALIDATION.md). Local npm may need `.tools/npm-current/package/bin/npm-cli.js`; restricted Windows execution previously caused Node userInfo errors, so distinguish environment failure from a failing assertion.

## Continuation and permanent documentation policy

- Keep README fully translated into Persian with proper RTL. Releases are authored only as ordered English/Persian pairs in `docs/releases/<tag>.json`; follow [AGENTS.md](AGENTS.md) and [release policy](docs/RELEASE-POLICY.md). Run the shared renderer `--write`, then `--check`. Structural checks do not prove semantic fidelity.
- Every publisher must use `loadReleaseNotes(tag)`. A new desktop version requires matching paired notes before publication. Correcting existing descriptions changes bodies only; preserve tags, commits, assets/checksums and release flags/latest selection.
- Next product step: obtain genuine Mozilla signature for Firefox 1.0.2, verify signed contents/hash, update bundled metadata/installer pins, run real Firefox conflict and cold-start acceptance, then prepare a NEW desktop version and full paired release notes. Never replace already-published beta.2 binaries with the modified source build.
- Saving project memory does not itself authorize a new release, store submission, merge, legal agreement or permission expansion. Use the user's current request and existing session authorization for those decisions.
- Update this memory after meaningful implementation, validation, publication or handoff state changes. Reusable maintenance workflow: [.agents/skills/baran-maintenance/SKILL.md](.agents/skills/baran-maintenance/SKILL.md). Keep changing state here, not duplicated in the skill.
