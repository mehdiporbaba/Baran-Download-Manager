# Changelog

## 2.0.0 — native Windows

- Replace the packaged Electron runtime with a C#/.NET Framework WebView2 app; reuse the installed Evergreen runtime and ship a compact native installer/Portable ZIP.
- Native segmented HTTP engine, shared rate limit, verified expired-link replacement, preserved legacy partial offsets and a pre-migration state backup.
- Native scheduler, bounded scanner, persistent Inbox and optional media tool integration; aria2 handles torrents with independent rate controls.
- All downloads on launch, collapsed/timed navigation with pinning, in-app browser host registration and optional browser download handoff.
- SHA-256-pinned build inputs, runtime component inventory, packaged dependency licenses and a trusted-certificate signing hook. Windows binaries remain unsigned without an owner-supplied signing identity; browser store signing/listings remain pending.
- Validate native behavior with a local HTTP server, HTTP/SOCKS5h proxies, private torrent tracker/seeder, media CLI fixtures and full-process Inbox restart tests.

## 1.0.1 — unreleased

- Open All downloads on every launch. Navigation starts collapsed, opens from the hamburger icon and closes after 15 seconds outside; a persisted setting keeps it open.

- Smaller Electron packaging: maximum compression, four supported runtime languages and removal of duplicated app resources and Electron's demo app.
- Firefox Manifest V3 background support, stable add-on identity and a separate unsigned XPI for Mozilla signing.
- In-app Windows Native Messaging registration for Firefox, Chrome and Edge.
- Optional browser download handoff, with browser resume when the native app cannot acknowledge receipt. No automatic disabling of other download-manager extensions.
- Verified expired-link replacement for paused/error HTTP downloads: matching size, strong ETag and stored segment boundaries; preserve partial data on 401/403 and rejected byte ranges.
- Wait for every segment writer to stop before saving or replacing its partial metadata.

## 1.0.0 — 2026-11-14

First Baran Download Manager release, based on Pulse Download Manager.

- Custom blue cloud/download identity, home dashboard, bilingual project page and compact display-aware window bounds.
- Separate Link Grabber and Instagram workspaces. Group link input, TXT import, filtering, selection and availability checks.
- Folder/page scanning with bounded traversal, cancellation, path/origin limits and review before download.
- Persistent scheduled start times, a Scheduled view and a rescheduling dialog that works at compact window widths.
- Independent HTTP/video, torrent-download and torrent-upload/seeding speed controls.
- Direct, system/PAC and manual web proxy routing, applied to HTTP, scanner, GitHub and media tools.
- Instagram integration through gallery-dl for accessible photos, reels, posts/carousels and stories; public content is attempted without requiring a login first.
- Chrome/Edge extension for links and page media, with a Windows Native Messaging host.
- Installed Windows startup, minimize/close to tray, optional continued seeding, and original multilingual/RTL support.
- Windows x64 Setup and Portable packages, extension ZIP, source and checksums.

Known limits: optional media tools, source-site access requirements, session-only review inbox, no remote folder recreation, no web-proxy tunneling of torrent peers, manual extension registration, unsigned Windows binaries, and inherited dependency audit findings. See docs/GUIDE.md and docs/VALIDATION.md.
