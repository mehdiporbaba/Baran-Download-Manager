<!-- Generated from docs/releases/v2.1.3.json; edit paired translations there. -->
<a id="en-v2-1-3"></a>

# Baran Download Manager `2.1.3` — browser cold-start fix

[فارسی](#fa-v2-1-3)

Windows maintenance release: keep Baran alive when a browser download starts the completely closed app. Includes the compact All downloads view and previous window/ZIP fixes.

- The native messaging host launches Baran outside its browser-owned Windows job, without inherited pipe handles and with an explicit working directory. Closing the temporary host no longer kills the launched app. If Windows policy rejects independent launch, handoff fails safely and the browser can continue; it does not retry with a vulnerable child process.

A Windows kill-on-close job fixture reproduces termination with the old child launch and verifies the detached child survives host cleanup. Framed browser handoff regression passes. This tests process lifetime, not live installed Firefox/Chrome or WebView2 first paint; installed-browser cold-start acceptance remains required.

Quit the old app from Tray after finishing or pausing transfers, then install `Baran-Download-Manager-Native-Setup-2.1.3-x64.exe` or extract the matching Portable ZIP. Settings and partial data remain. The installer refreshes native browser registration. Firefox signed extension 1.0.3 is unchanged; no new Mozilla signature is needed for this desktop-host correction.

Windows x64 requires .NET Framework and shared WebView2. Windows code signing, Chrome store distribution, native Linux/macOS and full torrent VPN confinement remain pending. Optional media tools remain separate. [Guide](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/main/README.md). GPL-3.0-or-later; Pulse and third-party attribution retained.

<a id="fa-v2-1-3"></a>

<div dir="rtl" lang="fa" align="right">
<h2 align="right">باران دانلود منیجر <span dir="ltr"><code>2.1.3</code></span>؛ اصلاح شروع از مرورگر</h2>
<p align="right"><a href="#en-v2-1-3" dir="ltr">English</a></p>
<p align="right">انتشار اصلاحی ویندوز: باران پس از راه‌اندازی از دانلود مرورگر، هنگامی که برنامه کاملاً بسته بوده، باز می‌ماند. فهرست فشردهٔ همهٔ دانلودها و اصلاحات قبلی پنجره/ZIP نیز همراه آن است.</p>
<ul>
<li align="right">واسط ارتباط بومی، باران را بیرون job ویندوزِ متعلق به مرورگر، بدون ارث‌بری دسته‌های لوله و با پوشهٔ کاری مشخص اجرا می‌کند. بسته‌شدن واسط موقت دیگر برنامهٔ اجراشده را نمی‌بندد. اگر سیاست ویندوز اجرای مستقل را رد کند، تحویل با خطای امن پایان می‌یابد و مرورگر می‌تواند ادامه دهد؛ تلاش دوباره با فرایند فرزند آسیب‌پذیر انجام نمی‌شود.</li>
</ul>

<p align="right">آزمون job ویندوز با پایان اجباری هنگام بسته‌شدن، خاتمهٔ فرزند در روش قدیمی را بازتولید و زنده‌ماندن فرزند مستقل پس از پاک‌سازی واسط را تأیید می‌کند. آزمون رگرسیون تحویل پیام مرورگر نیز موفق است. این بررسی عمر فرایند را می‌آزماید، نه فایرفاکس/کروم نصب‌شده یا اولین نمایش WebView2؛ پذیرش شروع سرد در مرورگر نصب‌شده همچنان لازم است.</p>
<p align="right">پس از اتمام یا توقف دانلودها، برنامهٔ قبلی را از Tray با Quit ببندید؛ سپس <span dir="ltr"><code>Baran-Download-Manager-Native-Setup-2.1.3-x64.exe</code></span> را نصب یا ZIP قابل‌حمل همین نسخه را باز کنید. تنظیمات و دادهٔ ناقص حفظ می‌شوند. نصاب ثبت واسط بومی مرورگر را تازه می‌کند. افزونهٔ امضاشدهٔ فایرفاکس ۱٫۰٫۳ تغییر نکرده است؛ این اصلاح واسط دسکتاپ به امضای تازهٔ موزیلا نیاز ندارد.</p>
<p align="right">ویندوز ۶۴ بیتی به .NET Framework و WebView2 مشترک نیاز دارد. امضای کد ویندوز، توزیع استور کروم، نسخهٔ بومی لینوکس/macOS و محصورسازی کامل VPN تورنت باقی‌اند. ابزار رسانهٔ اختیاری جدا می‌ماند. <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/main/README.md">راهنما</a>. مجوز GPL-3.0-or-later و اعتبار Pulse و اجزای شخص ثالث حفظ شده‌اند.</p>

</div>
