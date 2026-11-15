<!-- Generated from docs/releases/v2.0.0.json; edit paired translations there. -->
<a id="en-v2-0-0"></a>

# Baran Download Manager `2.0.0` — native Windows x64

[فارسی](#fa-v2-0-0)

The Windows app now uses a C#/.NET Framework backend and the installed Microsoft WebView2 Evergreen Runtime. Electron, Node.js, a fixed Chromium runtime and WebTorrent are absent from this app package. Local builds measure roughly **2.5 MB Setup / 3.2 MB Portable ZIP**, compared with about 130 MB for the first Electron installer. The attached asset sizes and SHA-256 file give the exact published values.

## Downloads

- **Native Setup:** normal Windows installation and shortcuts.

- **Native Portable ZIP:** extract to a stable folder and run `Baran Download Manager.exe`.

- **Chrome/Edge extension ZIP:** development package; public store publication is pending.

- **Firefox unsigned XPI:** package prepared for Mozilla signing, **not a normal-user installer yet**.

- **SHA256SUMS-Native-2.0.0.txt:** checksums for all four packages.

Windows 10/11 x64 needs .NET Framework and Microsoft's shared WebView2 Evergreen Runtime. The runtime is already present on many computers; a missing runtime requires a separate Microsoft download. Optional yt-dlp/gallery-dl/ffmpeg tools are also separate downloads and may be much larger than Baran itself.

## Changes

- Open **All downloads** by default; hamburger navigation starts closed, closes after 15 seconds outside, and can stay pinned through Settings → General.

- Persistent link Inbox, including extracted Instagram filenames; browser imports are acknowledged after durable storage.

- Native segmented HTTP downloads, global HTTP rate control, scheduler and bounded folder scanning.

- Replace expired HTTP links after verifying size, a strong ETag and saved segment boundaries. Preserve partial data on 401/403 or a refused range. Resume without resetting saved offsets.

- Preserve the old queue/partial-file format and create a pre-migration state backup. Close the Electron app before using the native app.

- Native torrent engine with independent download/upload caps; validated with a private local tracker/seeder.

- Optional media tools, authorized browser-cookie settings, tray, startup and in-app native browser host registration.

- Chrome/Firefox-compatible extension sources and optional browser-download handoff that resumes browser downloads if Baran cannot acknowledge receipt.

## Validation and limits

Native integration checks cover exact file bytes, legacy partial offsets, link expiry/replacement failure cases, scheduled starts, HTTP/SOCKS5h routing, pause/rate limits, scanner scope, a private torrent download, compiled browser-host framing, media CLI fixtures and a full-process Inbox restart. The real WebView2 window was inspected through accessibility. This is not a live protected-account test or proof that every media-site challenge works.

**Unsigned Windows binaries:** no trusted signing identity has been supplied. A self-signed certificate would not fix public SmartScreen trust. Firefox signing and browser-store listings still need owner-controlled developer accounts.

Web proxy settings do not tunnel torrent peers/DHT. Schedules still require the app running and do not wake the PC. Debrid, authenticated LAN/mobile control, wake scheduling, VPN kill-switch and native macOS/Linux packages are future work. Native dependency versions need their own update monitoring; this release does not claim a clean vulnerability audit.

[Setup guide](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/GUIDE.md) · [Architecture](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/NATIVE.md) · [Roadmap](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/ROADMAP.md)

GPL-3.0-or-later. Original Pulse authorship retained; native backend and Baran identity maintained by Mehdi Porbaba.

<a id="fa-v2-0-0"></a>

<div dir="rtl" lang="fa" align="right">
<h2 align="right">باران دانلود منیجر؛ نسخهٔ <span dir="ltr"><code>2.0.0</code></span> بومی برای ویندوز ۶۴ بیتی</h2>
<p align="right"><a href="#en-v2-0-0" dir="ltr">English</a></p>
<p align="right">برنامهٔ ویندوز اکنون از بخش پشتیِ بومی با <span dir="ltr"><code>C#/.NET Framework</code></span> و محیط اجرای نصب‌شدهٔ <span dir="ltr"><code>Microsoft WebView2 Evergreen Runtime</code></span> استفاده می‌کند. <span dir="ltr"><code>Electron</code></span>، <span dir="ltr"><code>Node.js</code></span>، محیط اجرای ثابت <span dir="ltr"><code>Chromium</code></span> و <span dir="ltr"><code>WebTorrent</code></span> در بستهٔ برنامه وجود ندارند. حجم ساخت‌های محلی حدود <strong>۲٫۵ مگابایت برای نصب‌کننده و ۳٫۲ مگابایت برای فایل فشردهٔ نسخهٔ قابل‌حمل</strong> است؛ در مقایسه با حدود ۱۳۰ مگابایت برای نخستین نصب‌کنندهٔ مبتنی بر الکترون. اندازهٔ فایل‌های پیوست و فایل <span dir="ltr"><code>SHA-256</code></span>، مقادیر دقیق انتشار را مشخص می‌کنند.</p>
<h3 align="right">فایل‌های دانلود</h3>
<ul>
<li align="right"><strong>نصب‌کنندهٔ بومی:</strong> نصب معمول ویندوز همراه میان‌برها.</li>
<li align="right"><strong>فایل فشردهٔ نسخهٔ بومیِ قابل‌حمل:</strong> آن را در پوشه‌ای با محل ثابت استخراج و <span dir="ltr"><code>Baran Download Manager.exe</code></span> را اجرا کنید.</li>
<li align="right"><strong>فایل فشردهٔ افزونهٔ Chrome/Edge:</strong> بستهٔ مخصوص توسعه؛ انتشار عمومی در فروشگاه هنوز انجام نشده است.</li>
<li align="right"><strong>فایل XPI بدون امضای فایرفاکس:</strong> بسته‌ای آماده برای دریافت امضای موزیلا که در این انتشار <strong>هنوز نصب‌کنندهٔ مناسب کاربر عادی نیست</strong>.</li>
<li align="right"><strong>SHA256SUMS-Native-2.0.0.txt:</strong> چک‌سام هر چهار بسته برای بررسی صحت فایل‌های دریافتی.</li>
</ul>

<p align="right">ویندوز ۱۰ یا ۱۱ نسخهٔ ۶۴ بیتی به <span dir="ltr"><code>.NET Framework</code></span> و محیط اجرای مشترک <span dir="ltr"><code>WebView2 Evergreen Runtime</code></span> مایکروسافت نیاز دارد. این محیط از قبل روی بسیاری از رایانه‌ها وجود دارد؛ در صورت نبود آن، دانلود جداگانه از مایکروسافت لازم است. ابزارهای اختیاری <span dir="ltr"><code>yt-dlp/gallery-dl/ffmpeg</code></span> نیز جداگانه دریافت می‌شوند و ممکن است بسیار حجیم‌تر از خود باران باشند.</p>
<h3 align="right">تغییرات</h3>
<ul>
<li align="right">نمایش پیش‌فرض <strong>همهٔ دانلودها</strong>؛ منوی سه‌خط در شروع بسته است، پس از ۱۵ ثانیه بیرون‌بودن نشانگر یا فوکوس بسته می‌شود و از «تنظیمات ← عمومی» می‌توان آن را همیشه باز نگه داشت.</li>
<li align="right">صندوق ماندگار لینک‌ها، همراه نام فایل‌های استخراج‌شده از اینستاگرام؛ دریافت لینک‌های مرورگر پس از ذخیرهٔ پایدار تأیید می‌شود.</li>
<li align="right">دانلود بخش‌بندی‌شدهٔ بومی با <span dir="ltr"><code>HTTP</code></span>، کنترل کلی سرعت آن، زمان‌بند و اسکن پوشه با محدودیت‌های مشخص.</li>
<li align="right">جایگزینی لینک منقضی‌شدهٔ <span dir="ltr"><code>HTTP</code></span> پس از بررسی اندازه، یک <span dir="ltr"><code>ETag</code></span> قوی و مرز بخش‌های ذخیره‌شده. دادهٔ ناقص در خطاهای ۴۰۱ و ۴۰۳ یا رد درخواست محدودهٔ بایت حفظ می‌شود و ادامهٔ دانلود بدون صفرکردن موقعیت‌های ذخیره‌شده انجام می‌گیرد.</li>
<li align="right">حفظ قالب صف و فایل‌های ناقص نسخهٔ قبلی و تهیهٔ نسخهٔ پشتیبان از وضعیت پیش از مهاجرت. پیش از استفاده از نسخهٔ بومی، برنامهٔ مبتنی بر <span dir="ltr"><code>Electron</code></span> را ببندید.</li>
<li align="right">موتور بومی تورنت با سقف‌های مستقل سرعت دانلود و آپلود؛ عملکرد آن با ردیاب و سیدکنندهٔ خصوصی در شبکهٔ محلی بررسی شده است.</li>
<li align="right">ابزارهای اختیاری رسانه، تنظیمات کوکیِ نشست مجاز مرورگر، فعالیت در ناحیهٔ اعلان سیستم، اجرای خودکار با شروع ویندوز و ثبت میزبان بومی مرورگر از داخل برنامه.</li>
<li align="right">سورس افزونهٔ سازگار با کروم و فایرفاکس و واگذاری اختیاری دانلودهای مرورگر؛ اگر باران نتواند دریافت را تأیید کند، دانلود در خود مرورگر ادامه می‌یابد.</li>
</ul>

<h3 align="right">آزمون‌ها و محدودیت‌ها</h3>
<p align="right">آزمون‌های یکپارچگی نسخهٔ بومی شامل تطبیق دقیق بایت‌های فایل، موقعیت فایل ناقص قدیمی، خطاهای انقضا و تعویض لینک، شروع زمان‌بندی‌شده، مسیریابی <span dir="ltr"><code>HTTP/SOCKS5h</code></span>، توقف و محدودیت سرعت، محدودهٔ اسکنر، دانلود تورنت خصوصی، قالب پیام میزبان کامپایل‌شدهٔ مرورگر، ابزارهای آزمایشی خط فرمان رسانه و بازیابی صندوق پس از راه‌اندازی دوبارهٔ کامل فرایند هستند. پنجرهٔ واقعی <span dir="ltr"><code>WebView2</code></span> از طریق اطلاعات دسترس‌پذیری بررسی شد. این بررسی به معنی آزمایش زندهٔ حساب محدودشده یا تضمین پاسخ‌گویی به همهٔ چالش‌های سایت‌های رسانه نیست.</p>
<p align="right"><strong>فایل‌های ویندوز بدون امضا هستند:</strong> هویت امضای معتبر در اختیار پروژه قرار نگرفته است. گواهی خودامضا مشکل اعتماد عمومی <span dir="ltr"><code>SmartScreen</code></span> را برطرف نمی‌کند. امضای فایرفاکس و انتشار در فروشگاه‌های مرورگر همچنان به حساب‌های توسعه‌دهندهٔ تحت کنترل مالک پروژه نیاز دارند.</p>
<p align="right">تنظیمات پراکسی وب، ترافیک همتایان تورنت و <span dir="ltr"><code>DHT</code></span> را از تونل عبور نمی‌دهد. زمان‌بندی همچنان به اجرای برنامه نیاز دارد و رایانه را بیدار نمی‌کند. دبرید، کنترل موبایل و شبکهٔ محلی با احراز هویت، زمان‌بندی بیدارکردن رایانه، قطع‌کن اضطراری VPN و بسته‌های بومی مک و لینوکس از کارهای آینده‌اند. نسخهٔ وابستگی‌های بومی به پایش و به‌روزرسانی جداگانه نیاز دارد؛ این انتشار ادعای پاک‌بودن کامل ممیزی آسیب‌پذیری‌ها ندارد.</p>
<p align="right"><a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/GUIDE.md">راهنمای راه‌اندازی</a> · <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/NATIVE.md">معماری</a> · <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v2.0.0/docs/ROADMAP.md">نقشهٔ راه</a></p>
<p align="right">مجوز <span dir="ltr"><code>GPL-3.0-or-later</code></span>؛ نام و حقوق پدیدآورندگان اصلی پالْس حفظ شده است. بخش پشتی بومی و هویت باران توسط مهدی پُربابا نگه‌داری می‌شود.</p>

</div>
