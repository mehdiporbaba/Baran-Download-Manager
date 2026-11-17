# Validation

## Windows 2.1.0 release checks — 2026-11-17

Local type checks, 23 unit tests, 6 documentation-policy tests, production renderer/native/Setup builds, native integration, connected integration, advanced integration and retained Electron network regressions passed. Published Setup is 2,606,151 bytes and Portable is 3,347,396 bytes. The release tag resolves to ff3d51753db15f5a50279727d97b931837bbc033; GitHub Windows build/publish, Windows/Linux validation and Gitleaks all passed. Advanced evidence and limits: [services](ADVANCED-SERVICES.md). GitHub CI and publication are verified separately in [memory](../MEMORY.md). No new visual/browser permission was used after denial.

<div dir="rtl" lang="fa" align="right"><h2>بررسی انتشار ویندوز ۲٫۱٫۰ در ۲۰۲۶/۱۱/۱۷</h2><p>بررسی نوع‌ها، ۲۳ تست واحد، ۶ تست سیاست مستندات، ساخت رابط تولیدی/بومی/نصاب، یکپارچه‌سازی بومی، متصل و پیشرفته و رگرسیون شبکهٔ Electron نگه‌داری‌شده محلی پاس شدند. نصاب منتشرشده ۲٬۶۰۶٬۱۵۱ بایت و نسخهٔ قابل‌حمل ۳٬۳۴۷٬۳۹۶ بایت است. تگ انتشار به ff3d51753db15f5a50279727d97b931837bbc033 اشاره می‌کند؛ ساخت/انتشار ویندوز، اعتبارسنجی ویندوز/لینوکس و Gitleaks گیت‌هاب موفق‌اند. شواهد و محدودیت پیشرفته: <a href="ADVANCED-SERVICES.md">سرویس‌ها</a>. CI گیت‌هاب و انتشار جدا در <a href="../MEMORY.md">حافظه</a> تأیید می‌شوند. پس از رد دسترسی از مجوز جدید ظاهری/مرورگر استفاده نشد.</p></div>

## Earlier beta.3 progress-window checks — 2026-11-17

Prepared beta.3 now contains the independent native task window and selected MDM-derived failure-mode safeguards. Local verification passed: 23 unit tests, type checks, renderer/native compilation, native integration, connected fixtures and 5 release-policy tests. Native coverage includes explicit SHA-256 success/mismatch/recovery, independent live HTTP caps, lifting a cap without pause, canceled-throttle-debt regression under per-file AND global caps, fast pause during a stalled body, HTML-as-archive rejection, collision preservation, stderr media/postprocessing and missing-FFmpeg rejection. The segmented-resume delay was reproduced before its fix; exact final bytes pass after it. Window work-area bounds and scoped-command policy are tested independently of GUI rendering.

On 2026-11-17 the user confirmed the Firefox popup connects to Baran beta.3 and clicking the supplied public GitHub ZIP link opens Baran's New download window. This accepts that direct-link handoff in the real profile; Chrome, cold-start with Baran fully quit and other request types remain unverified. No progress-window visual acceptance is claimed: permission to open the isolated local preview origin was declined and the service was stopped. At that stage development was local; the owner has since authorized final Windows 2.1.0 publication with explicit limitations. See [active work](WORK-ITEMS.md) and the [reference review](MDM-INTEGRATION-REVIEW.md).

<div dir="rtl" lang="fa" align="right">
<h2>کار محلی پنجرهٔ دانلود — ۲۰۲۶/۱۱/۱۷</h2>
<p>بتا ۳ آماده، پنجرهٔ مستقل وظیفه و حفاظت‌های منتخب بر اساس حالت‌های خطای MDM را دارد. بررسی‌های محلی موفق‌اند: ۲۳ تست واحد، بررسی نوع‌ها، کامپایل رابط/بومی، یکپارچه‌سازی بومی، آزمون خدمات متصل و ۵ تست سیاست انتشار. پوشش بومی شامل موفقیت/شکست/اصلاح SHA-256، سقف زندهٔ مستقل HTTP، برداشتن سقف بدون توقف، رگرسیون نوبت سرعتِ لغوشده زیر سقف هر فایل و سراسری، توقف سریع خواندن گیرکرده، رد HTML به‌جای آرشیو، حفظ تداخل فایل، پیشرفت/پس‌پردازش رسانه از stderr و رد نیاز به FFmpeg در نبود آن است. تأخیر ادامهٔ چندبخشی پیش از اصلاح بازتولید شد و پس از آن بایت‌های نهایی دقیقاً برابرند. حدود جای پنجره و سیاست فرمان محدود به وظیفه، مستقل از رسم GUI آزموده شده‌اند.</p>
<p>در ۲۰۲۶/۱۱/۱۷ کاربر تأیید کرد پنجرهٔ افزونهٔ فایرفاکس به بتا ۳ متصل است و کلیک روی لینک ZIP عمومی گیت‌هاب که ارائه شد، پنجرهٔ دانلود جدید باران را باز می‌کند. انتقال همین لینک مستقیم در پروفایل واقعی پذیرفته شد؛ کروم، شروع با بارانِ کاملاً بسته و انواع دیگر درخواست هنوز بررسی نشده‌اند. پذیرش ظاهری پنجرهٔ پیشرفت ادعا نمی‌شود: مجوز بازشدن مبدأ پیش‌نمایش محلیِ جدا رد و سرویس متوقف شد. در آن مرحله توسعه محلی بود؛ مالک سپس انتشار نهایی ویندوز ۲٫۱٫۰ را با محدودیت‌های روشن تأیید کرد. <a href="WORK-ITEMS.md">کارهای فعال</a> و <a href="MDM-INTEGRATION-REVIEW.md">بررسی مرجع</a> را ببینید.</p>
</div>

## Current source verification — 2026-11-16

Implementation commit `b09c85b95d6f5909a27b92510eb58594c50265ac` on `codex/firefox-and-upstream-fixes` is tracked in [draft PR #1](https://github.com/mehdiporbaba/Baran-Download-Manager/pull/1). GitHub Native Windows build, Windows/Linux source validation and Gitleaks completed successfully. Local checks passed: 20 unit tests, typecheck, native integration, connected-services integration, retained Electron network regressions and 5 release-policy tests. [Project memory](../MEMORY.md) records the continuation state; [upstream review](UPSTREAM-REVIEW-v1.0.16.md) maps fixes and test limitations.

New regression evidence includes a completed local private torrent with its configured TCP port occupied, exact output bytes despite inaccurate media progress, actionable sign-in/private/age errors, durable browser capture before renderer readiness, and local GitHub connection-drop/rate-limit/404 fixtures. Real installed-Firefox conflict/cold-start acceptance, live media accounts, real FFmpeg merging and UDP/DHT collision remain outside this evidence. Passing Gitleaks does not constitute a complete vulnerability audit.

Firefox 1.0.1 is genuinely Mozilla-signed and published. On 2026-11-16, Mozilla also approved 1.0.2 (version 6715167/file 5259252, zero errors/warnings). Its returned signed XPI was downloaded; source JavaScript/HTML/icon bytes match exactly, manifest JSON matches semantically, and signature containers are present. The pinned SHA-256 is `884b395779a9af2a90b12eb2ce81b54c275c45c664c4d5be7af18359bb897120`; native source builds now bundle it. This does not publish a new desktop/extension release or establish installed-Firefox acceptance. Historical sections below describe their named versions, not the current signing state.

<div dir="rtl" lang="fa" align="right">
<h2>بررسی سورس فعلی — ۲۰۲۶/۱۱/۱۶</h2>
<p>کامیت پیاده‌سازی <span dir="ltr">b09c85b95d6f5909a27b92510eb58594c50265ac</span> در شاخهٔ <span dir="ltr">codex/firefox-and-upstream-fixes</span> در <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/pull/1">درخواست تغییر پیش‌نویس شمارهٔ ۱</a> دنبال می‌شود. ساخت بومی ویندوز، بررسی سورس در ویندوز/لینوکس و Gitleaks در گیت‌هاب موفق شدند. بررسی‌های محلی موفق شامل ۲۰ تست واحد، بررسی نوع‌ها، یکپارچه‌سازی بومی، خدمات متصل، رگرسیون شبکهٔ Electron باقی‌مانده و ۵ تست سیاست انتشار هستند. <a href="../MEMORY.md">حافظهٔ پروژه</a> وضعیت ادامهٔ کار و <a href="UPSTREAM-REVIEW-v1.0.16.md">بررسی بالادستی</a> تطبیق اصلاحات و محدودیت آزمایش‌ها را ثبت می‌کنند.</p>
<p>شواهد جدید رگرسیون شامل تکمیل تورنت خصوصی محلی هنگام اشغال پورت TCP تنظیم‌شده، برابری دقیق بایت‌های خروجی با وجود گزارش پیشرفت نادرست رسانه، راهنمای خطاهای ورود/خصوصی/سن، ذخیرهٔ پایدار دریافت مرورگر پیش از آماده‌شدن رابط و شبیه‌سازی قطع اتصال/اتمام سهمیه/۴۰۴ گیت‌هاب در سرور محلی است. پذیرش عملی تداخل افزونه‌ها و شروع سرد در فایرفاکس نصب‌شده، حساب‌های زندهٔ رسانه، ادغام واقعی FFmpeg و تداخل UDP/DHT در این شواهد پوشش داده نشده‌اند. موفقیت Gitleaks به معنی ممیزی کامل آسیب‌پذیری‌ها نیست.</p>
<p>فایرفاکس نسخهٔ <span dir="ltr">1.0.1</span> واقعاً امضای موزیلا دارد و منتشر شده است. در ۲۰۲۶/۱۱/۱۶ موزیلا نسخهٔ <span dir="ltr">1.0.2</span> را نیز تأیید کرد: شناسهٔ نسخهٔ <span dir="ltr">6715167</span> و فایل <span dir="ltr">5259252</span> با صفر خطا و هشدار. فایل XPI امضاشدهٔ برگشتی دریافت شد؛ بایت‌های جاوااسکریپت/HTML/آیکون دقیقاً با سورس برابرند، JSON مانیفست از نظر محتوا یکسان است و فایل‌های امضا وجود دارند. هش ثابت <span dir="ltr">SHA-256: 884b395779a9af2a90b12eb2ce81b54c275c45c664c4d5be7af18359bb897120</span> است؛ ساخت بومی از سورس اکنون همین فایل را در بسته می‌گذارد. این کار انتشار نسخهٔ جدید دسکتاپ/افزونه یا پذیرش عملی در فایرفاکس نصب‌شده نیست. بخش‌های تاریخی پایین، نسخهٔ نام‌بردهٔ خود را توضیح می‌دهند و وضعیت فعلی امضا نیستند.</p>
</div>

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
