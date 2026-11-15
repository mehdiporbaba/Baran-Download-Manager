<!-- Generated from docs/releases/v2.1.0-beta.1.json; edit paired translations there. -->
<a id="en-v2-1-0-beta-1"></a>

# Baran Download Manager `2.1.0-beta.1`

[فارسی](#fa-v2-1-0-beta-1)

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

<a id="fa-v2-1-0-beta-1"></a>

<div dir="rtl" lang="fa" align="right">
<h2 align="right">باران دانلود منیجر؛ نسخهٔ <span dir="ltr"><code>2.1.0-beta.1</code></span></h2>
<p align="right"><a href="#en-v2-1-0-beta-1" dir="ltr">English</a></p>
<p align="right">این نسخه یک <strong>پیش‌انتشار آزمایشی برای ویندوز ۶۴ بیتی</strong> است تا آزمون پذیرش روی آن انجام شود. آخرین نسخهٔ پایدار دسکتاپ ۲٫۰٫۰ است. سرویس‌های جدید تا زمانی که خودتان فعالشان نکنید خاموش‌اند؛ نصب برنامه هیچ حساب سرویس‌دهنده، تسک بیدارکردن رایانه یا شنوندهٔ شبکهٔ محلی ایجاد نمی‌کند.</p>
<h3 align="right">امکانات اضافه‌شده</h3>
<ul>
<li align="right">بخش «تنظیمات ← سرویس‌ها و کنترل» به دو زبان فارسی و انگلیسی اضافه شده است.</li>
<li align="right">بررسی حساب <span dir="ltr"><code>Real-Debrid</code></span> و تولید لینک مستقیم از لینک میزبان، با افزودن نتیجه به صندوق ماندگار لینک‌گیر. توکن‌ها با <span dir="ltr"><code>DPAPI</code></span> ویندوز برای حساب کاربر فعلی رمزگذاری و جدا از تنظیمات معمولی نگه‌داری می‌شوند. تولید لینک با سرویس <span dir="ltr"><code>Real-Debrid</code></span> ارتباط برقرار می‌کند و ممکن است سهمیهٔ حساب را مصرف کند. نشانی‌های تولیدشده مانند دیگر داده‌های صندوق و صف ذخیره می‌شوند و ممکن است امضاهای حساسِ دسترسی در خود داشته باشند.</li>
<li align="right">کنترل وب از موبایل با فعال‌سازی اختیاری، روی یک نشانی خصوصیِ انتخاب‌شده از نوع <span dir="ltr"><code>IPv4</code></span>. کد اتصال تصادفی ۲۵۶ بیتی فقط در همان نشست معتبر است و امکان مشاهدهٔ نام و وضعیت دانلودها، توقف و ادامه و جمع‌آوری لینک‌های <span dir="ltr"><code>HTTP(S)</code></span> برای بررسی در دسکتاپ را می‌دهد. توقف سرویس، کد را باطل می‌کند و اجرای دوباره کد تازه‌ای می‌سازد. بازکردن یا حذف فایل از راه دور، تغییر تنظیمات، اجرای دستور سیستم و فراخوانی دلخواه امکانات دسکتاپ در دسترس نیست. فایروال و تنظیمات انتقال پورت نیز تغییر نمی‌کنند.</li>
<li align="right">فعال‌سازی اختیاریِ بیدارکردن رایانه با گزینهٔ <span dir="ltr"><code>WakeToRun</code></span> در زمان‌بند وظایف ویندوز، برای نزدیک‌ترین دانلود آینده در صف. اگر باران بسته باشد، می‌تواند دوباره اجرا شود. حساب کاربر باید در ویندوز وارد مانده باشد؛ بیدارشدن به سخت‌افزار و سیاست تایمرهای بیدارباش ویندوز وابسته است و رایانهٔ کاملاً خاموش را روشن نمی‌کند. زمان‌ها با قالب ثابت میلادی نوشته می‌شوند تا روی ویندوز فارسی هم درست کار کنند. غیرفعال‌کردن قابلیت، تسک متعلق به باران را حذف می‌کند؛ هنگام حذف نصب نیز درخواست حذف آن داده می‌شود.</li>
<li align="right"><strong>اتصال آزمایشی به اینترفیس انتخابی، با IPv4 و فقط برای HTTP</strong>. اتصال‌های <span dir="ltr"><code>TCP</code></span> و درخواست‌های <span dir="ltr"><code>DNS</code></span> مبتنی بر <span dir="ltr"><code>IPv4</code></span> به همان اینترفیس مقید می‌شوند؛ از دی‌ان‌اس سیستم یا اینترفیس جایگزین استفاده نمی‌شود. اگر شناسه یا نشانی اینترفیس از دست برود، سوکت‌ها بسته می‌شوند. مسیر جایگزین <span dir="ltr"><code>IPv6</code></span> وجود ندارد. ناقص‌بودن پاسخ دی‌ان‌اس یا نبود دی‌ان‌اسِ <span dir="ltr"><code>IPv4</code></span> باعث خطا می‌شود. زنجیره‌کردن پراکسی پشتیبانی نمی‌شود و تغییر اینترفیس انتقال‌های جاری را متوقف می‌کند. تا وقتی این حالت فعال است، تورنت و ابزارهای خارجی رسانه مسدودند؛ اگر از تورنت استفاده کرده‌اید، پیش از تغییر اینترفیس باران را دوباره اجرا کنید. این قابلیت، قطع‌کن اضطراری VPN برای کل سیستم یا ترافیک تورنت و رسانه <strong>نیست</strong>.</li>
<li align="right">افزونهٔ فایرفاکس نسخهٔ ۱٫۰٫۱ با تأیید و امضای موزیلا ارائه شده است. فایل <strong>signed.xpi</strong> را نصب کنید و سپس در تنظیمات اتصال مرورگرهای باران، اتصال فایرفاکس را فعال کنید. حالت توسعه‌دهنده یا دورزدن بررسی امضا لازم نیست. نسخهٔ توزیع مستقیم امضا شده، اما صفحهٔ عمومی در فروشگاه موزیلا و میزبانی به‌روزرسانی خودکار افزونه هنوز راه‌اندازی نشده‌اند.</li>
</ul>

<h3 align="right">آزمون‌ها و محدودیت‌ها</h3>
<p align="right">آزمون‌های بازگشت نسخهٔ بومی، مهاجرت اطلاعات، لینک‌های منقضی، ادامهٔ بخش‌های فایل، هدرها، پراکسی‌ها، محدودیت سرعت، ماندگاری داده، تورنت خصوصی در شبکهٔ محلی و ابزارهای شبیه‌سازی‌شدهٔ خط فرمان رسانه را پوشش می‌دهند. آزمون‌های سرویس‌های متصل شامل رمزگذاری <span dir="ltr"><code>DPAPI</code></span>، قرارداد ارتباط <span dir="ltr"><code>HTTP</code></span> سرویس <span dir="ltr"><code>Real-Debrid</code></span> با سرور آزمایشی محلی، ثبت و حذف واقعی تسک ویندوز بدون اجرای آن، نشانی مبدأ اتصال <span dir="ltr"><code>TCP</code></span> و بسته‌شدن آن در قطع شبیه‌سازی‌شدهٔ اینترفیس، اتصال و ابطال دسترسی موبایل و مرزهای مجاز میزبان، مبدأ درخواست و فرمان‌ها هستند.</p>
<p align="right">حساب واقعی <span dir="ltr"><code>Real-Debrid</code></span> برای آزمایش ارائه نشده است. اتصال دوبارهٔ VPN واقعی و بررسی نشت مسیر، دی‌ان‌اس و <span dir="ltr"><code>IPv6</code></span>، خواب و بیدارشدن فیزیکی رایانه، آزمون پذیرش با گوشی و فایروال و انتقال کامل دانلود در فایرفاکس معمولی هنوز به آزمایش در محیط واقعی نیاز دارند. کنترل موبایل از <strong>HTTP بدون رمزگذاری</strong> استفاده می‌کند و فقط برای شبکهٔ خصوصی قابل اعتماد است؛ آن را در اینترنت در دسترس قرار ندهید. برای کنترل موبایل، برنامهٔ دسکتاپ باید در حال اجرا بماند؛ این قابلیت یک سرویس مستقلِ بدون رابط گرافیکی نیست.</p>
<p align="right">فایل‌های اجرایی ویندوز تا زمان تهیهٔ هویت امضای معتبرِ تحت کنترل مالک پروژه، بدون امضا باقی می‌مانند. محیط اجرای مشترک <span dir="ltr"><code>WebView2/.NET</code></span> و ابزارهای اختیاری رسانه، پیش‌نیازهای جداگانه‌اند. سرویس‌دهندگان دیگر دبرید، بسته‌های بومی برای سیستم‌عامل‌های غیر ویندوز و اتصال کامل ترافیک تورنت و رسانه به VPN در این نسخه وجود ندارند.</p>

</div>
