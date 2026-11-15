# Baran product priorities

This backlog incorporates the product feedback supplied by the project owner. Competitor star counts, Reddit trends and claims about other products have not been independently audited; they are not used as release claims.

## Current native Windows work

- Replace bundled Electron/Chromium with a Windows WebView2 shell and a C#/.NET Framework backend. Node, Electron and WebTorrent are absent from the native runtime package; the existing TypeScript backend remains in source as a legacy fallback and development/test dependency.
- Keep direct downloads, verified link replacement, pause/resume, schedules, scoped scanning, media tool integration and BitTorrent. Preserve the old state and partial-file format, with a pre-migration backup.
- Persist the link inbox locally; acknowledge browser imports after writing them to disk.
- Default to All downloads and collapsed navigation; auto-close after 15 seconds outside, with an optional pinned menu.
- Register the native browser host from the app, with no user PowerShell command. Prepare Firefox XPI and Chrome/Edge packages for signing/store submission.
- Provide a real code-signing hook and accurate unsigned-build notices. A self-signed development certificate does not resolve public SmartScreen trust.

## Next release gates

1. Owner-controlled, trusted Windows code-signing certificate or an eligible managed signing service; certificate identity, timestamps and signature verification in releases. Microsoft Store distribution is another option. No certificate or private key is fabricated or silently installed.
2. Mozilla signing/AMO listing and Chrome/Edge store listings. Normal users should install from store links, not Developer Mode. Finish real-browser acceptance tests for download handoff and native-host registration. A signed XPI is required for normal Firefox.
3. Improve media-tool onboarding and updates, with explicit downloads, source checksums and error recovery. Authorized browser cookies are supported by yt-dlp/gallery-dl settings; the extension currently sends URLs, not cookies, Authorization headers or POST bodies. Add per-site opt-in header/cookie transfer only with a clear permission and retention model.
4. Maintain a native runtime component inventory and update policy, including aria2 and its bundled libraries. Removing a vulnerable npm chain from a runtime package is not proof that every native dependency is vulnerability-free.

## Subsequent capabilities

### 2.1.0-beta.1 status

Implemented for prerelease acceptance testing: Real-Debrid account/link flow with DPAPI token storage; scoped, paired private-LAN HTTP mobile control; opt-in Windows wake tasks; experimental HTTP-only IPv4 binding with bound DNS and disconnect closure. Torrents/media are blocked in binding mode. Actual Windows task registration and local transport/provider/control tests pass. Live paid-provider, physical sleep/wake, phone/firewall and real VPN reconnect/DNS/IPv6 leak acceptance remain. See [release limits](RELEASE-2.1.0-beta.1.md).

Mozilla approved/signed Firefox 1.0.1 on 2026-11-15. Its signed self-distribution package is preserved and published separately. Public AMO listing, automatic update hosting and ordinary-browser native-handoff acceptance remain.

- Debrid provider abstraction, starting with Real-Debrid, then AllDebrid, Premiumize and TorBox as warranted. Keep provider tokens out of logs, source, release assets and ordinary link text. Verify current provider APIs before implementation.
- Link health checks and smart grouping; multi-part archive grouping and extraction only with path-traversal protection, archive limits and clear overwrite behavior.
- Publisher-supplied SHA-256 verification and file-type destination rules. MD5 may be useful for accidental-corruption checks but is not a secure authenticity guarantee.
- Optional Windows Task Scheduler integration with WakeToRun. Sleep/hibernate wake depends on hardware and power policy; a powered-off PC is a different case. Scheduled starts currently require Baran running. Do not silently create wake tasks or alter system power policy.
- Authenticated, opt-in LAN/headless control, with pairing, scoped commands, an explicit bind address and no unauthenticated queue access. Docker/mobile work should follow a reusable headless backend rather than exposing the desktop bridge.
- VPN/interface binding and fail-closed behavior with tests for reconnects, DNS and IPv6. Web proxy settings currently do not tunnel torrent peers or DHT; that limit must remain visible.
- Cross-platform native shell and host registration, Linux AppImage/deb/rpm/Flatpak and macOS packaging/signing. The current native release targets Windows x64; retained Electron Linux source configuration is not a tested native Linux release.
- Accessible theme presets and a validated custom theme schema, keeping contrast and compact sizing consistent.

## Completion rule

Mark a capability complete only after its user flow and relevant failure paths have been tested. Document account/certificate dependencies and source-site restrictions instead of presenting placeholders, unsigned packages or a simple URL transfer as finished store integration.
