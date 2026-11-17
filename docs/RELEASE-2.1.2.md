<!-- Generated from docs/releases/v2.1.2.json; edit paired translations there. -->
<a id="en-v2-1-2"></a>

# Baran Download Manager `2.1.2` — browser and window fixes

[فارسی](#fa-v2-1-2)

Windows x64 maintenance release with Mozilla-signed Firefox 1.0.3: fixes binary ZIP/CDN interception, progress-window startup presentation and remembered main-window sizing. Previously published versions and assets remain unchanged.

- All downloads uses compact data rows with file/source, received/total bytes, percentage, status, speed and ETA. Summary cards become a short strip; search shares the top toolbar. Container-width layouts retain essential fields without horizontal overflow, and more actions remain available through each row’s menu. This improves information density on laptop-sized windows.

- Firefox source now recognizes archive/installer binary MIME responses, including application/zip without Content-Disposition, before its internal downloader begins. Signed query parameters are preserved through the transfer. HTML challenge pages, redirects, private/background/POST requests remain excluded and failure leaves the browser able to download.

- Progress windows show a native theme-matched loading cover with the filename and progress while WebView2 initializes. Theme/language/direction are injected before page CSS. The cover is removed after React is ready, with a fallback for occluded paint frames. This removes the deliberate blank surface; it does not promise zero WebView2 startup time.

- The main window reserves native resize edges outside WebView2 so its corners can receive resize hit tests. Normal bounds and maximized state are saved separately from download settings and restored on the next launch. Changed/disconnected monitors are handled by fitting the saved rectangle into an available work area.

## Build and installation status

Install `Baran-Download-Manager-Native-Setup-2.1.2-x64.exe`, or extract the matching Portable ZIP. Finish/pause transfers and Quit the old app from Tray first. Settings, Inbox and partial files remain. Firefox users must update to the bundled `Baran-Firefox-Extension-1.0.3-signed.xpi`, then check connection and enable capture. Its SHA-256 is `4e237fb53fea0f73e5876827885e53d46cc91a39fe1f2d52c1ceff2df4b2ac6f`. Chrome development source is version 1.0.3; store publication is still pending.

Local checks cover the CDN ZIP MIME case and signed URL, HTML/redirect exclusions, failed handoff, window-placement round trips, changed/negative/small work areas, all resize edges and light/dark bootstrap with immediate or delayed document creation. Firefox lint reports zero errors/warnings. Actual Firefox 1.0.3 capture, visible first-paint behavior and manual corner drag/restart still need installed-app acceptance.

Windows x64 requires .NET Framework and shared WebView2. Optional media tools remain separate; Windows signing, Chrome store publication, native Linux/macOS and full torrent VPN/proxy confinement remain pending. [Guide](https://github.com/mehdiporbaba/Baran-Download-Manager/blob/main/README.md) and [previous release](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/v2.1.1) describe unchanged 2.1 capabilities and limits.

GNU GPL v3.0 or later. Original Pulse authors and Mehdi Porbaba retain their credits; third-party components retain their licenses.

<a id="fa-v2-1-2"></a>

<div dir="rtl" lang="fa" align="right">
<h2 align="right">باران دانلود منیجر <span dir="ltr"><code>2.1.2</code></span>؛ اصلاح مرورگر و پنجره</h2>
<p align="right"><a href="#en-v2-1-2" dir="ltr">English</a></p>
<p align="right">انتشار اصلاحی ویندوز ۶۴ بیتی با فایرفاکس ۱٫۰٫۳ امضاشدهٔ موزیلا: دریافت ZIP/CDN باینری، نمایش آغازین پنجرهٔ پیشرفت و ذخیرهٔ اندازهٔ پنجرهٔ اصلی اصلاح شده‌اند. نسخه‌ها و فایل‌های منتشرشدهٔ قبلی تغییر نکرده‌اند.</p>
<ul>
<li align="right">همهٔ دانلودها از ردیف فشرده با فایل/مبدأ، مقدار دریافت‌شده/کل، درصد، وضعیت، سرعت و زمان باقی‌مانده استفاده می‌کند. کارت آمار به نوار کوتاه تبدیل و جست‌وجو در نوار بالا قرار می‌گیرد. چیدمان وابسته به عرض محتوا، اطلاعات اصلی را بدون سرریز افقی حفظ می‌کند و عملیات بیشتر از منوی ردیف در دسترس است. این تغییر تراکم اطلاعات را در پنجرهٔ لپ‌تاپ بهتر می‌کند.</li>
<li align="right">سورس فایرفاکس اکنون پاسخ باینری آرشیو/نصاب، از جمله application/zip بدون Content-Disposition را پیش از آغاز دانلود داخلی تشخیص می‌دهد. پارامتر امضاشدهٔ URL هنگام انتقال حفظ می‌شود. صفحهٔ چالش HTML، تغییرمسیر و درخواست خصوصی/پس‌زمینه/POST همچنان کنار گذاشته می‌شوند و شکست اتصال مانع دانلود مرورگر نمی‌شود.</li>
<li align="right">پنجرهٔ پیشرفت هنگام آماده‌شدن WebView2، پوشش بارگذاری بومیِ هم‌رنگ تم با نام فایل و پیشرفت نشان می‌دهد. تم/زبان/جهت پیش از CSS صفحه اعمال می‌شوند. پوشش پس از آماده‌شدن React و با مسیر جایگزین برای فریم پنهان برداشته می‌شود. سطح خالی اولیه حذف می‌شود، ولی زمان راه‌اندازی صفر WebView2 تضمین نمی‌شود.</li>
<li align="right">پنجرهٔ اصلی لبهٔ بومی تغییر اندازه را بیرون WebView2 نگه می‌دارد تا گوشه‌ها فرمان کشیدن را دریافت کنند. اندازه/مکان عادی و وضعیت حداکثر جدا از تنظیمات دانلود ذخیره و در اجرای بعد بازگردانی می‌شوند. با تغییر/قطع مانیتور، مستطیل ذخیره‌شده در محدودهٔ کاریِ در دسترس جا داده می‌شود.</li>
</ul>

<h3 align="right">وضعیت ساخت و نصب</h3>
<p align="right">فایل <span dir="ltr"><code>Baran-Download-Manager-Native-Setup-2.1.2-x64.exe</code></span> را نصب یا ZIP قابل‌حمل همین نسخه را باز کنید. ابتدا دانلود را تمام/متوقف و از Tray برنامهٔ قبلی Quit را انتخاب کنید. تنظیمات، صندوق و فایل ناقص می‌مانند. کاربران فایرفاکس باید به <span dir="ltr"><code>Baran-Firefox-Extension-1.0.3-signed.xpi</code></span> همراه بسته ارتقا دهند و اتصال/دریافت را بررسی و فعال کنند. هش SHA-256 آن <span dir="ltr"><code>4e237fb53fea0f73e5876827885e53d46cc91a39fe1f2d52c1ceff2df4b2ac6f</code></span> است. سورس توسعهٔ کروم نسخهٔ ۱٫۰٫۳ است؛ انتشار استور همچنان باقی است.</p>
<p align="right">بررسی محلی شامل MIME فایل ZIP در CDN و URL امضاشده، کنارگذاشتن HTML/تغییرمسیر، شکست تحویل، ذخیره/خواندن اندازه، نمایشگر تغییرکرده/منفی/کوچک، تمام لبه‌ها و آغاز تم روشن/تاریک با ایجاد فوری یا تأخیردار سند است. lint فایرفاکس صفر خطا/هشدار دارد. دریافت واقعی فایرفاکس ۱٫۰٫۳، ظاهر اولین نمایش و کشیدن دستی گوشه/اجرای دوباره هنوز پذیرش در برنامهٔ نصب‌شده می‌خواهند.</p>
<p align="right">ویندوز ۶۴ بیتی به .NET Framework و WebView2 مشترک نیاز دارد. ابزار رسانه جداست؛ امضای ویندوز، استور کروم، نسخهٔ بومی لینوکس/macOS و محصورسازی کامل VPN/پراکسی تورنت باقی‌اند. <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/blob/main/README.md">راهنما</a> و <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/v2.1.1">انتشار قبلی</a>، امکانات و محدودیت‌های بدون تغییر ۲٫۱ را شرح می‌دهند.</p>
<p align="right">مجوز عمومی همگانی گنو نسخهٔ ۳ یا بالاتر. اعتبار پدیدآورندگان اصلی Pulse و مهدی پُربابا و مجوز اجزای شخص ثالث حفظ می‌شود.</p>

</div>
