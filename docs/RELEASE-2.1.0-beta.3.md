<!-- Generated from docs/releases/v2.1.0-beta.3.json; edit paired translations there. -->
<a id="en-v2-1-0-beta-3"></a>

# Baran Download Manager `2.1.0-beta.3`

[فارسی](#fa-v2-1-0-beta-3)

Windows x64 prerelease fixing the desktop/Firefox compatibility mismatch. Use this desktop with Firefox extension 1.0.2. Latest stable desktop remains 2.0.0; [beta.2](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/v2.1.0-beta.2) connected-services scope and limits remain applicable.

- Fix the unchecked capture toggle when Firefox 1.0.2 reports `Unsupported browser command` against desktop beta.2. The desktop now answers the extension's connection/capability check and acknowledges an explicit New download request.

- Persist captured URLs before acknowledgement, open New download instead of only navigating to Link Grabber, and retain the pending prompt until the renderer is ready. A failed/incompatible handoff keeps or resumes the browser download. Collected page links still go to the review inbox.

- The registered Native Messaging host can start the saved Baran executable when the app is closed. Repair connection records the current application path; use it after updating or moving a Portable copy.

- Bundle Mozilla-approved Firefox 1.0.2, approved on 2026-11-16 (version 6715167/file 5259252, zero errors/warnings). Its code matches prepared source and the native installer checks its pinned SHA-256. The XPI is unlisted/self-distributed, not a public AMO store listing.

- Firefox can optionally intercept attachment navigation responses before ordinary download creation after the user grants the requested permissions. Private, extension-owned, POST, background and unsupported URL requests are excluded. The extension does not transfer cookies, passwords or Authorization headers.

- Adapt Pulse's busy-port fix to native aria2: try the configured TCP/UDP port, then a dynamic-range fallback. A fixed firewall/forwarding rule may need adjustment. A local private torrent completes with the requested TCP peer port deliberately occupied.

- Native media failures explain YouTube sign-in/private/age restrictions and point to authorized session settings. Media tool paths are absolute; final native media size is read from the actual output file. Retained Electron also receives the FFmpeg path and actual-size fixes, graceful Tray Quit, early app identity and bounded torrent fallback.

- Both engines retry dropped GitHub connections a bounded number of times; native GitHub errors explain API rate limits and inaccessible repositories. HTTP authentication/status failures are not retried automatically. See the full bilingual [upstream review](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/codex/firefox-and-upstream-fixes/docs/UPSTREAM-REVIEW-v1.0.16.md).

## Install or update

- Choose Setup for the installed app, or extract the Portable ZIP into a permanent folder. Quit the running Baran from its tray menu before updating; closing its window may only hide it. User tasks/settings stay in the existing Baran profile. Windows needs the shared WebView2 Runtime and .NET Framework; optional media tools are separate downloads.

- Open beta.3 → Settings → Browser integration → Firefox → Repair connection. Install the bundled signed Firefox 1.0.2 XPI if needed and approve Firefox's prompt. In the extension choose Check connection, then Use Baran for new downloads and grant its requested permissions. The connection should report desktop 2.1.0-beta.3.

- Disable another download manager's Firefox integration yourself when selecting Baran. Firefox does not give this extension exclusive priority or permission to disable other extensions. Canceling another manager's dialog does not re-dispatch its request to Baran. This is not a global Windows default-handler takeover.

- Add an independent native progress window for each task, sharing the existing download engine and WebView2 environment. Keep Baran’s own blue visuals and main layout; status, speed and completion/tool tabs expose overall/range progress, connection rows, pause/resume, folder/open actions and verified expired-link replacement.

- Double-click a row or press Enter to reopen its progress window. Closing/hiding the window keeps downloading; Stop retains partial data. Add automatic-open preference, tray restoration and per-file close-on-completion without automatic file execution. Window commands are restricted to their own task; placement stays within the originating work area.

- Direct HTTP downloads get an independent live speed cap in addition to the global cap. Removing/changing the cap invalidates old throttle waits; pause remains responsive during stalled reads and rate waits. Per-file speed caps for external media/torrents are not included.

- Optional expected SHA-256 for direct files verifies the completed partial data before final-file publication. A mismatch keeps partial bytes and reports an error; a paused task can accept a corrected expected digest and reuse its data. Verification is explicit, not an inferred claim that every downloaded file is safe.

- Reject an HTML login/challenge response when a non-HTML filename was requested; explicit HTML/text downloads remain supported. Read tagged yt-dlp progress from stderr and show postprocessing as verifying. Require FFmpeg for separate-track merging/MP3 postprocessing instead of silently accepting an unmerged selection.

The MDM integration review records the pinned reference source and 588 collected non-PR reports, and distinguishes implemented local safeguards, existing features and remaining gaps. Catalogue coverage does not mean every report was reproduced or all MDM features were merged. The user confirmed a real Firefox click on a public GitHub ZIP opens Baran’s New download window with desktop beta.3. Chrome, fully closed-app startup and visual/mixed-DPI acceptance remain pending.

Validation covers unit/type checks, native compilation and integration, durable browser IPC/startup readiness, bundled signed-XPI digest/tamper tests, local private-torrent file integrity, media CLI fixtures, connected services/local GitHub failures, retained Electron network regressions and release-policy checks. Real installed-Firefox conflict/cold-start acceptance, live media accounts, real FFmpeg merging and UDP/DHT collision are not established by those fixtures.

Windows binaries remain publicly unsigned unless a trusted publisher signature is explicitly provided. Chrome/Edge store publication remains pending. Web proxies do not tunnel torrent peers; experimental VPN binding covers HTTP-only IPv4 and blocks external media/torrents. Waking depends on Windows/hardware/power state and does not power on a shut-down PC. Source-site permissions and DRM are not bypassed. Existing published release files are preserved.

<a id="fa-v2-1-0-beta-3"></a>

<div dir="rtl" lang="fa" align="right">
<h2 align="right">باران دانلود منیجر؛ نسخهٔ <span dir="ltr"><code>2.1.0-beta.3</code></span></h2>
<p align="right"><a href="#en-v2-1-0-beta-3" dir="ltr">English</a></p>
<p align="right">پیش‌انتشار ویندوز ۶۴ بیتی برای رفع ناسازگاری نسخهٔ دسکتاپ و افزونهٔ فایرفاکس. این نسخهٔ دسکتاپ را همراه افزونهٔ فایرفاکس ۱.۰.۲ استفاده کنید. آخرین نسخهٔ پایدار همچنان ۲.۰.۰ است؛ محدوده و محدودیت‌های سرویس‌های متصلِ <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/v2.1.0-beta.2">بتا ۲</a> در این نسخه هم برقرارند.</p>
<ul>
<li align="right">مشکل خاموش‌شدن تیک دریافت دانلود رفع شد؛ افزونهٔ فایرفاکس ۱.۰.۲ هنگام اتصال به دسکتاپ بتا ۲ پیام <span dir="ltr"><code>Unsupported browser command</code></span> می‌داد. برنامه اکنون به بررسی اتصال و قابلیت‌های افزونه پاسخ می‌دهد و درخواست صریح بازشدن پنجرهٔ دانلود جدید را تأیید می‌کند.</li>
<li align="right">نشانی‌های دریافت‌شده پیش از تأیید روی دیسک ذخیره می‌شوند؛ به‌جای صرفاً رفتن به لینک‌گربر، پنجرهٔ دانلود جدید باز می‌شود و درخواست تا آماده‌شدن رابط حفظ می‌شود. هنگام شکست یا ناسازگاری اتصال، دانلود مرورگر حفظ یا ادامه داده می‌شود. لینک‌های جمع‌آوری‌شده از صفحه همچنان به صندوق بررسی می‌روند.</li>
<li align="right">میزبان بومی ثبت‌شده می‌تواند هنگام بسته‌بودن برنامه، فایل اجرایی ذخیره‌شدهٔ باران را اجرا کند. ترمیم اتصال، مسیر فعلی برنامه را ثبت می‌کند؛ پس از به‌روزرسانی یا جابه‌جایی نسخهٔ قابل‌حمل از آن استفاده کنید.</li>
<li align="right">افزونهٔ فایرفاکس ۱.۰.۲ تأییدشدهٔ موزیلا داخل بسته است؛ تأیید در ۲۰۲۶/۱۱/۱۶ با شناسهٔ نسخهٔ ۶۷۱۵۱۶۷ و فایل ۵۲۵۹۲۵۲، با صفر خطا و هشدار انجام شد. کد آن با سورس آماده برابر است و برنامه پیش از نصب افزونه، هش ثابت SHA-256 را بررسی می‌کند. فایل XPI برای توزیع مستقیم امضا شده و صفحهٔ عمومی فروشگاه AMO نیست.</li>
<li align="right">فایرفاکس با انتخاب کاربر و اعطای دسترسی‌های درخواستی می‌تواند پاسخ فایل پیوستِ ناوبری را پیش از ساخت دانلود عادی دریافت کند. درخواست‌های خصوصی، متعلق به افزونه‌های دیگر، POST، پس‌زمینه و نشانی‌های پشتیبانی‌نشده مستثنا هستند. افزونه کوکی، گذرواژه یا هدر Authorization را منتقل نمی‌کند.</li>
<li align="right">اصلاح پورت اشغال‌شدهٔ Pulse به موتور بومی aria2 تطبیق یافت: ابتدا پورت TCP/UDP تنظیم‌شده و سپس پورت جایگزین در بازهٔ پویا امتحان می‌شود. قواعد ثابت فایروال یا انتقال پورت ممکن است نیاز به تغییر داشته باشند. دانلود تورنت خصوصی محلی با پورت TCP عمداً اشغال‌شده موفق بود.</li>
<li align="right">خطاهای رسانهٔ بومی، نیاز به ورود یوتیوب یا خصوصی‌بودن و محدودیت سنی را توضیح می‌دهند و کاربر را به تنظیمات نشست مجاز راهنمایی می‌کنند. مسیر ابزارهای رسانه کامل است و حجم نهایی رسانهٔ بومی از فایل واقعی خروجی خوانده می‌شود. نسخهٔ باقی‌ماندهٔ Electron نیز اصلاح مسیر FFmpeg و حجم واقعی، خروج مرتب از Tray، تنظیم زودهنگام هویت برنامه و پورت جایگزین تورنت با مهلت محدود را دریافت می‌کند.</li>
<li align="right">هر دو موتور برای قطع اتصال گیت‌هاب تعداد محدودی تلاش مجدد انجام می‌دهند؛ خطاهای گیت‌هاب بومی، محدودیت سهمیهٔ API و مخزن غیرقابل‌دسترسی را توضیح می‌دهند. خطاهای احراز هویت یا وضعیت HTTP خودکار تکرار نمی‌شوند. <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/codex/firefox-and-upstream-fixes/docs/UPSTREAM-REVIEW-v1.0.16.md">گزارش کامل دوزبانهٔ بررسی بالادستی</a> را ببینید.</li>
</ul>

<h3 align="right">نصب یا به‌روزرسانی</h3>
<ul>
<li align="right">برای نصب، بستهٔ Setup را انتخاب کنید یا ZIP نسخهٔ قابل‌حمل را در پوشه‌ای دائمی استخراج کنید. پیش از به‌روزرسانی از منوی Tray گزینهٔ خروج باران را بزنید؛ بستن پنجره ممکن است فقط آن را پنهان کند. وظایف و تنظیمات کاربر در پروفایل موجود Baran باقی می‌مانند. ویندوز به WebView2 Runtime مشترک و .NET Framework نیاز دارد؛ ابزارهای اختیاری رسانه جداگانه دانلود می‌شوند.</li>
<li align="right">بتا ۳ را باز کنید و به تنظیمات ← اتصال مرورگرها ← Firefox ← ترمیم اتصال بروید. اگر لازم بود فایل XPI امضاشدهٔ فایرفاکس ۱.۰.۲ داخل بسته را نصب و درخواست فایرفاکس را تأیید کنید. در افزونه، بررسی اتصال و سپس Use Baran for new downloads را انتخاب و دسترسی‌های درخواستی را تأیید کنید. نتیجهٔ اتصال باید نسخهٔ دسکتاپ 2.1.0-beta.3 را نشان دهد.</li>
<li align="right">هنگام انتخاب باران، اتصال فایرفاکسِ دانلودمنیجر دیگر را خودتان غیرفعال کنید. فایرفاکس به این افزونه اولویت انحصاری یا اجازهٔ خاموش‌کردن افزونه‌های دیگر نمی‌دهد. لغو پنجرهٔ دانلودمنیجر دیگر، درخواست آن را دوباره به باران نمی‌فرستد. این قابلیت تصاحب سراسری دانلود در ویندوز نیست.</li>
<li align="right">برای هر وظیفه پنجرهٔ پیشرفت بومی مستقلی با موتور دانلود و محیط WebView2 مشترک اضافه شد. ظاهر آبی و چیدمان اصلی باران حفظ می‌شوند؛ زبانه‌های وضعیت، سرعت و پایان/ابزارها، پیشرفت کلی/بازه‌ها، ردیف‌های اتصال، توقف/ادامه، نمایش پوشه/بازکردن فایل و جایگزینی تأییدشدهٔ لینک منقضی را ارائه می‌کنند.</li>
<li align="right">با دوبارکلیک روی ردیف یا Enter، پنجرهٔ همان دانلود دوباره باز می‌شود. بستن/پنهان‌کردن، دانلود را ادامه می‌دهد و توقف دادهٔ ناقص را حفظ می‌کند. انتخاب بازشدن خودکار، بازیابی از Tray و بستن پس از پایان برای هر فایل بدون اجرای خودکار فایل اضافه شدند. فرمان‌های پنجره فقط روی وظیفهٔ خودش مجازند و جای پنجره در محدودهٔ صفحهٔ مبدأ می‌ماند.</li>
<li align="right">دانلود مستقیم HTTP علاوه بر سقف سراسری، سقف زندهٔ مستقل هر فایل دارد. حذف/تغییر سقف، انتظار سرعت قدیمی را باطل می‌کند و توقف هنگام گیرکردن خواندن یا انتظار سرعت پاسخ‌گو می‌ماند. سقف مستقل ابزار رسانهٔ بیرونی/تورنت در این تغییر نیست.</li>
<li align="right">SHA-256 مورد انتظار اختیاری برای فایل مستقیم، دادهٔ ناقصِ کامل‌شده را پیش از تحویل فایل نهایی بررسی می‌کند. عدم تطابق، بایت‌ها را نگه می‌دارد و خطا می‌دهد؛ وظیفهٔ متوقف‌شده می‌تواند هش اصلاح‌شده را بگیرد و از همان داده استفاده کند. بررسی صریح است و به معنی ادعای امن‌بودن همهٔ فایل‌های دریافت‌شده نیست.</li>
<li align="right">پاسخ HTML ورود/چالش هنگامی که نام غیرِ HTML درخواست شده رد می‌شود؛ دانلود صریح HTML/متن همچنان پشتیبانی می‌شود. پیشرفت نشانه‌گذاری‌شدهٔ yt-dlp از stderr خوانده و پس‌پردازش با وضعیت بررسی نمایش داده می‌شود. برای ادغام جریان‌های جدا/پس‌پردازش MP3، وجود FFmpeg الزامی است تا انتخاب ادغام‌نشده بی‌صدا پذیرفته نشود.</li>
</ul>

<p align="right">گزارش ادغام MDM، سورس مرجع با کامیت ثابت و ۵۸۸ گزارش غیرِ Pull Request جمع‌آوری‌شده را ثبت و حفاظت‌های محلی تازه، امکانات موجود و کمبودها را تفکیک می‌کند. پوشش فهرست به معنی بازتولید هر گزارش یا ادغام همهٔ امکانات MDM نیست. کاربر تأیید کرد کلیک واقعی در فایرفاکس روی ZIP عمومی گیت‌هاب، پنجرهٔ دانلود جدید باران را با دسکتاپ بتا ۳ باز می‌کند. بررسی کروم، شروع با برنامهٔ کاملاً بسته و پذیرش ظاهری/نمایشگرهای با DPI متفاوت همچنان باقی‌اند.</p>
<p align="right">بررسی‌ها شامل آزمون واحد و نوع‌ها، کامپایل و یکپارچه‌سازی بومی، ارتباط پایدار مرورگر و انتظار آماده‌شدن رابط، هش افزونهٔ امضاشدهٔ داخل بسته و رد دست‌کاری، صحت فایل تورنت خصوصی محلی، ابزار رسانهٔ آزمایشی، سرویس‌های متصل و خطاهای محلی گیت‌هاب، رگرسیون شبکهٔ Electron باقی‌مانده و سیاست انتشار است. این شبیه‌سازی‌ها، پذیرش عملی تداخل/شروع سرد در فایرفاکس نصب‌شده، حساب‌های زندهٔ رسانه، ادغام واقعی FFmpeg یا تداخل UDP/DHT را اثبات نمی‌کنند.</p>
<p align="right">فایل‌های ویندوز همچنان امضای عمومی معتبر ندارند، مگر اینکه امضای ناشر مورد اعتماد صریحاً ارائه شده باشد. انتشار در فروشگاه Chrome/Edge باقی مانده است. پراکسی وب ترافیک همتایان تورنت را تونل نمی‌کند؛ اتصال آزمایشی VPN فقط HTTP روی IPv4 را پوشش می‌دهد و ابزارهای رسانه/تورنت بیرونی را مسدود می‌کند. بیدارکردن به ویندوز، سخت‌افزار و وضعیت برق بستگی دارد و رایانهٔ خاموش را روشن نمی‌کند. دسترسی‌های سایت مبدأ و DRM دور زده نمی‌شوند. فایل‌های انتشارهای قبلی حفظ می‌شوند.</p>

</div>
