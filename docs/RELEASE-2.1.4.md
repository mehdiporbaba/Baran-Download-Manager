<!-- Generated from docs/releases/v2.1.4.json; edit paired translations there. -->
<a id="en-v2-1-4"></a>

# Baran Download Manager `2.1.4` — correct browser file handling

[فارسی](#fa-v2-1-4)

Fixes the reported case where a Google verification download became a sign-in page named identifier. Search Console verification downloads now refuse native capture before acknowledgement or Inbox insertion, so the browser keeps the request with its original session and filename. Known Google sign-in HTML is rejected during native probing instead of being saved as a successful file.

Ordinary HTML attachments remain supported. A local opaque-URL fixture verifies the server Content-Disposition filename and exact file contents are preserved; an explicit user filename remains respected. This scoped fix does not add general browser cookies, Authorization headers or POST-body transfer, and does not claim all authenticated websites are supported.

Quit the previous Baran from Tray after finishing or pausing transfers, then install `Baran-Download-Manager-Native-Setup-2.1.4-x64.exe` or extract the matching Portable ZIP. Settings, Inbox and partial data are preserved. Mozilla-signed Firefox extension 1.0.3 is unchanged; this fix needs only the desktop update. Chrome remains a manual development installation until store publication.

Policy and native integration tests cover exact-host matching, rejection of session-bound capture without Inbox insertion, sign-in HTML rejection, ordinary HTML and attachment filename/content preservation. CI also checks unit tests, type safety, native downloads, connected services and window/browser startup. Live installed-browser acceptance remains required; owner account pages were not replayed.

Windows x64 requires .NET Framework and shared WebView2. Windows signing, Chrome store distribution, native Linux/macOS and full torrent VPN confinement remain pending. Optional media tools are separate. [Guide](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/main/README.md). GPL-3.0-or-later with original Pulse and third-party attribution retained. Previous published binaries are unchanged.

<a id="fa-v2-1-4"></a>

<div dir="rtl" lang="fa" align="right">
<h2 align="right">باران دانلود منیجر <span dir="ltr"><code>2.1.4</code></span>؛ اصلاح دریافت فایل مرورگر</h2>
<p align="right"><a href="#en-v2-1-4" dir="ltr">English</a></p>
<p align="right">حالت گزارش‌شده که دانلود فایل تأیید گوگل به صفحهٔ ورود با نام identifier تبدیل می‌شد اصلاح شد. تحویل دانلود تأیید Search Console اکنون پیش از تأیید دریافت یا درج در صندوق رد می‌شود تا مرورگر درخواست را با نشست و نام اصلی نگه دارد. HTML شناخته‌شدهٔ ورود گوگل هنگام بررسی بومی لینک رد می‌شود و به‌عنوان فایل موفق ذخیره نمی‌شود.</p>
<p align="right">پشتیبانی از پیوست HTML معمولی حفظ شده است. آزمون محلی با URL بدون نام فایل، حفظ نام اعلام‌شدهٔ سرور در Content-Disposition و محتوای دقیق فایل را تأیید می‌کند؛ نام صریح انتخابی کاربر نیز رعایت می‌شود. این اصلاح محدود، انتقال عمومی کوکی مرورگر، هدر Authorization یا بدنهٔ POST را اضافه نمی‌کند و پشتیبانی از همهٔ سایت‌های نیازمند ورود ادعا نمی‌شود.</p>
<p align="right">پس از اتمام یا توقف دانلودها، باران قبلی را از Tray با Quit ببندید؛ سپس <span dir="ltr"><code>Baran-Download-Manager-Native-Setup-2.1.4-x64.exe</code></span> را نصب یا ZIP قابل‌حمل همین نسخه را باز کنید. تنظیمات، صندوق و دادهٔ ناقص حفظ می‌شوند. افزونهٔ فایرفاکس ۱٫۰٫۳ امضاشدهٔ موزیلا تغییر نکرده است؛ این اصلاح فقط به ارتقای دسکتاپ نیاز دارد. کروم تا انتشار استور همچنان نصب دستی توسعه دارد.</p>
<p align="right">آزمون سیاست و یکپارچه‌سازی بومی، تطبیق دقیق میزبان، رد تحویل وابسته به نشست بدون درج در صندوق، رد HTML ورود، حفظ HTML معمولی و نام/محتوای پیوست را پوشش می‌دهند. CI همچنین تست واحد، بررسی نوع‌ها، دانلود بومی، سرویس‌های متصل و شروع پنجره/مرورگر را بررسی می‌کند. پذیرش زندهٔ مرورگر نصب‌شده همچنان لازم است؛ صفحات حساب مالک دوباره درخواست نشدند.</p>
<p align="right">ویندوز ۶۴ بیتی به .NET Framework و WebView2 مشترک نیاز دارد. امضای ویندوز، توزیع استور کروم، نسخهٔ بومی لینوکس/macOS و محصورسازی کامل VPN تورنت باقی‌اند. ابزار رسانهٔ اختیاری جداست. <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/main/README.md">راهنما</a>. مجوز GPL-3.0-or-later و اعتبار اصلی Pulse و اجزای شخص ثالث حفظ می‌شود. فایل‌های منتشرشدهٔ قبلی تغییر نکرده‌اند.</p>

</div>
