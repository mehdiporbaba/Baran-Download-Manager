<!-- Generated from docs/releases/v1.0.0.json; edit paired translations there. -->
<a id="en-v1-0-0"></a>

# Baran Download Manager `1.0.0`

[فارسی](#fa-v1-0-0)

The first release of **Baran Download Manager**, maintained by Mehdi Porbaba and based on Pulse Download Manager.

## Downloads

- **Setup (Windows x64):** installer with shortcuts and installed-app startup support.

- **Portable (Windows x64):** standalone executable; startup registration is disabled for portable builds.

- **Browser extension ZIP:** Chrome/Edge link and visible-media collection with the included Windows Native Messaging host.

- Verify downloaded files using `SHA256SUMS.txt`.

## New in 1.0

- Independent blue visual identity, compact display-aware windows, custom home page and project documentation.

- Separate Link Grabber and Instagram workspaces, with consistent button spacing and typography.

- Batch links/TXT import, bounded folder scanning, filtering and review before downloading.

- Persistent scheduled starts and a compact rescheduling dialog.

- Independent HTTP/video, torrent download and upload/seeding limits.

- Direct, system/PAC and manual web proxy modes.

- Instagram photo, post/reel/carousel and accessible-story extraction through gallery-dl; yt-dlp for video/audio.

- Windows startup and system tray integration; multilingual UI including Persian RTL.

## Validation and limits

14 automated checks, production build/typecheck, compiled native-host integration and Electron runtime tests for proxy routing, Range integrity, scheduling, persistence and rate limits passed locally on Windows x64.

The Windows binaries are unsigned. Media extraction uses optional tools and depends on site availability and your access; restricted Instagram stories/posts may need your authorized browser session. The extension is unpacked and requires native-host registration. The review inbox is session-only, scheduled jobs need the app running, and web proxy settings do not tunnel torrent peers/DHT. Inherited dependency audit findings remain documented.

[Setup guide](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v1.0.0/docs/GUIDE.md) · [Validation details](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v1.0.0/docs/VALIDATION.md)

GPL-3.0-or-later. Original Pulse copyright and authorship retained.

<a id="fa-v1-0-0"></a>

<div dir="rtl" lang="fa" align="right">
<h2 align="right">باران دانلود منیجر؛ نسخهٔ <span dir="ltr"><code>1.0.0</code></span></h2>
<p align="right"><a href="#en-v1-0-0" dir="ltr">English</a></p>
<p align="right">نخستین انتشار <strong>باران دانلود منیجر</strong>؛ با نگه‌داری مهدی پُربابا و بر پایهٔ برنامهٔ <span dir="ltr"><code>Pulse Download Manager</code></span>.</p>
<h3 align="right">فایل‌های دانلود</h3>
<ul>
<li align="right"><strong>نصب‌کنندهٔ ویندوز ۶۴ بیتی:</strong> همراه میان‌برها و پشتیبانی از اجرای خودکار نسخهٔ نصب‌شده با شروع ویندوز.</li>
<li align="right"><strong>نسخهٔ قابل‌حمل ویندوز ۶۴ بیتی:</strong> فایل اجرایی مستقل؛ ثبت اجرای خودکار با شروع ویندوز در ساخت‌های قابل‌حمل غیرفعال است.</li>
<li align="right"><strong>فایل فشردهٔ افزونهٔ مرورگر:</strong> جمع‌آوری لینک و رسانهٔ قابل مشاهده در کروم و اج، همراه میزبان ارتباط بومی مرورگر برای ویندوز.</li>
<li align="right">صحت فایل‌های دریافتی را با <span dir="ltr"><code>SHA256SUMS.txt</code></span> بررسی کنید.</li>
</ul>

<h3 align="right">امکانات تازه در نسخهٔ ۱٫۰</h3>
<ul>
<li align="right">هویت بصری آبی و مستقل، پنجره‌های جمع‌وجور متناسب با نمایشگر، صفحهٔ خانهٔ اختصاصی و مستندات پروژه.</li>
<li align="right">فضاهای جداگانه برای لینک‌گیر و اینستاگرام، همراه فاصله‌گذاری یکدست دکمه‌ها و تایپوگرافی هماهنگ.</li>
<li align="right">ورود گروهی لینک‌ها و فایل متنی <span dir="ltr"><code>TXT</code></span>، اسکن پوشه با محدودیت‌های مشخص، فیلترکردن و بررسی پیش از دانلود.</li>
<li align="right">ذخیرهٔ ماندگار زمان‌های شروع برنامه‌ریزی‌شده و پنجرهٔ جمع‌وجور برای تغییر زمان‌بندی.</li>
<li align="right">سقف‌های مستقل سرعت برای دانلود HTTP و ویدیو، دانلود تورنت و آپلود یا سیدکردن تورنت.</li>
<li align="right">حالت‌های اتصال مستقیم، پراکسی سیستم و تنظیم خودکار <span dir="ltr"><code>PAC</code></span> و پراکسی دستی برای وب.</li>
<li align="right">استخراج عکس، پست، ریلز، پست چنداسلایدی و استوری‌های قابل دسترس اینستاگرام با <span dir="ltr"><code>gallery-dl</code></span>؛ استفاده از <span dir="ltr"><code>yt-dlp</code></span> برای ویدیو و صدا.</li>
<li align="right">اجرای خودکار با شروع ویندوز و یکپارچگی با ناحیهٔ اعلان سیستم؛ رابط چندزبانه شامل فارسی راست‌به‌چپ.</li>
</ul>

<h3 align="right">آزمون‌ها و محدودیت‌ها</h3>
<p align="right">۱۴ بررسی خودکار، ساخت نهایی و کنترل نوع‌ها، آزمون یکپارچگی میزبان بومیِ کامپایل‌شده و آزمون‌های محیط اجرای <span dir="ltr"><code>Electron</code></span> برای مسیریابی پراکسی، صحت محدودهٔ بایت، زمان‌بندی، ماندگاری داده و محدودیت سرعت به‌صورت محلی روی ویندوز ۶۴ بیتی موفق بودند.</p>
<p align="right">فایل‌های اجرایی ویندوز بدون امضا هستند. استخراج رسانه از ابزارهای اختیاری استفاده می‌کند و به در دسترس بودن سایت و سطح دسترسی شما وابسته است؛ استوری‌ها و پست‌های محدودشدهٔ اینستاگرام ممکن است به نشست مجاز مرورگر شما نیاز داشته باشند. افزونه به‌صورت استخراج‌شده ارائه می‌شود و ثبت میزبان بومی برای آن لازم است. صندوق بررسی لینک‌ها فقط تا پایان نشست نگه‌داری می‌شود، دانلودهای زمان‌بندی‌شده به اجرای برنامه نیاز دارند و پراکسی وب ترافیک همتایان تورنت و <span dir="ltr"><code>DHT</code></span> را از تونل عبور نمی‌دهد. یافته‌های ممیزی امنیتی وابستگی‌های به‌ارث‌رسیده همچنان در مستندات ثبت شده‌اند.</p>
<p align="right"><a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v1.0.0/docs/GUIDE.md">راهنمای راه‌اندازی</a> · <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/v1.0.0/docs/VALIDATION.md">جزئیات اعتبارسنجی</a></p>
<p align="right">مجوز <span dir="ltr"><code>GPL-3.0-or-later</code></span>؛ حق نشر و نام پدیدآورندگان اصلی پالْس حفظ شده است.</p>

</div>
