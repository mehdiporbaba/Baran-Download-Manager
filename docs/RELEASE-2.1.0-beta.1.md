# Baran Download Manager 2.1.0-beta.1

This is a **Windows x64 prerelease** for acceptance testing. Latest stable desktop: 2.0.0. New services are off until enabled; installation creates no provider account, wake task or LAN listener.

## Added

- Settings → Connected services, in Persian/English.
- Real-Debrid account check and host-link generation into the persistent Link Grabber inbox. Tokens are encrypted with Windows DPAPI for the current user, separately from ordinary settings. Generating a link contacts Real-Debrid and can consume account allowances. Generated URLs are normal inbox/queue data and may contain sensitive signatures.
- Opt-in mobile web control on one selected private IPv4 address. A random, session-only 256-bit pairing token permits task names/status, pause/resume and collecting HTTP(S) links for desktop review. Stopping/restarting revokes/rotates the token. No remote file opening, deleting, settings, shell or arbitrary desktop RPC. No firewall/port-forwarding changes.
- Opt-in Windows Task Scheduler WakeToRun for the next future queued download. Baran can reopen when closed. The account must remain signed in; waking depends on hardware and Windows wake-timer policy. It does not power on a shut-down PC. Gregorian invariant timestamps work on Persian Windows. Disable removes the owned task; uninstall requests removal too.
- Experimental **HTTP-only IPv4 interface binding**. TCP and IPv4 DNS queries bind to the selected interface, without system DNS or alternate-interface fallback. Sockets close if its identity/address disappears. No IPv6 fallback. DNS truncation/missing IPv4 DNS causes failure. Proxy chaining is unsupported. Changing binding pauses transfers. Torrents and external media tools are blocked while enabled; after using torrents, restart Baran before changing binding. This is **not** a system-wide or torrent/media VPN kill switch.
- Mozilla-approved/signed Firefox extension 1.0.1. Install **signed.xpi**, then connect Firefox in Baran's Browser integration settings. No Developer Mode/signature bypass. Self-distribution is signed; a public AMO listing and automatic extension update hosting are not configured.

## Validation and limits

Native regressions cover migration, expired links, segment resume, headers, proxies, rate limits, persistence, private local torrents and media CLI fixtures. Connected tests cover DPAPI, Real-Debrid HTTP against a local fixture, actual Windows task registration/removal without running it, bound TCP source/closure on simulated interface loss, mobile pairing/revocation and Host/Origin/command boundaries.

No live Real-Debrid account was supplied. Real VPN reconnect/route/DNS/IPv6 leak audit, physical sleep/wake, phone/firewall acceptance and ordinary Firefox end-to-end handoff still require environment testing. Mobile uses **unencrypted HTTP**, only for a trusted private network; never expose it to the internet. Desktop must remain running for mobile control; this is not a headless service.

Windows executables remain unsigned pending a trusted owner-controlled signing identity. Shared WebView2/.NET and optional media tools are separate prerequisites. Other Debrid providers, non-Windows native packages and complete torrent/media VPN binding are not included.

## فارسی

نسخهٔ آزمایشی ۲٫۱: افزونهٔ فایرفاکس امضاشده توسط موزیلا، اتصال Real-Debrid، کنترل موبایل روی شبکهٔ محلی، Wake timer ویندوز و اتصال آزمایشی HTTP به اینترفیس انتخابی. فعال‌سازی از «تنظیمات ← سرویس‌ها و کنترل» است.

کنترل موبایل HTTP و مخصوص شبکهٔ خصوصی قابل اعتماد است. حالت اتصال VPN فعلاً مخصوص HTTP است و تورنت/ابزارهای رسانه را مسدود می‌کند. حساب واقعی Real-Debrid، Sleep واقعی و اتصال از گوشی هنوز آزمایش پذیرش نشده‌اند. نسخهٔ پایدار همچنان ۲٫۰ است.
