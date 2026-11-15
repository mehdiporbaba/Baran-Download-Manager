<!-- Generated from docs/releases/v2.1.0-beta.2.json; edit paired translations there. -->
<a id="en-v2-1-0-beta-2"></a>

# Baran Download Manager `2.1.0-beta.2`

[فارسی](#fa-v2-1-0-beta-2)

Windows x64 prerelease. Latest stable desktop remains 2.0.0. Connected-services features and limits from [beta.1](https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/v2.1.0-beta.1) still apply.

- Bundle the exact Mozilla-approved Firefox 1.0.1 XPI inside Setup/Portable; verify its pinned SHA-256 before opening it.

- Browser integration → Firefox → **Install & connect Firefox** registers the current-user native host, detects installed Firefox and opens the bundled local XPI with Firefox, independently of the default browser. The user approves Firefox's install/permission prompt. No silent profile editing or signature bypass.

- **Repair connection** remains for an already installed extension. Missing Firefox/package or checksum errors are reported. Portable/custom Firefox not found through App Paths or standard folders can use manual XPI installation and Repair connection.

- Explain Chrome's real store requirement and prepare a clean submission folder plus permission/privacy/publication notes. Owner registration, payment, Google review and a real store listing remain pending.

- Stamp packaged runtime inventory with the actual desktop package version.

Validation: TypeScript checks, native compilation, bundled-XPI/tamper tests and existing native/connected integrations. Opening Firefox is not an installation acknowledgement. Actual Firefox permission approval and end-to-end native handoff still need profile acceptance testing.

<a id="fa-v2-1-0-beta-2"></a>

<div dir="rtl" lang="fa" align="right">
<h2 align="right">باران دانلود منیجر؛ نسخهٔ <span dir="ltr"><code>2.1.0-beta.2</code></span></h2>
<p align="right"><a href="#en-v2-1-0-beta-2" dir="ltr">English</a></p>
<p align="right">پیش‌انتشار آزمایشی برای ویندوز ۶۴ بیتی. آخرین نسخهٔ پایدار دسکتاپ همچنان ۲٫۰٫۰ است. امکانات و محدودیت‌های سرویس‌های متصلِ <a href="https://github.com/mehdiporbaba/Baran-Download-Manager/releases/tag/v2.1.0-beta.1">نسخهٔ beta.1</a> در این نسخه هم برقرارند.</p>
<ul>
<li align="right">همان فایل افزونهٔ فایرفاکس نسخهٔ ۱٫۰٫۱ با تأیید موزیلا، داخل بستهٔ نصب و نسخهٔ قابل‌حمل قرار گرفته است؛ پیش از بازشدن، هش ثابت و مورد انتظارِ <span dir="ltr"><code>SHA-256</code></span> آن بررسی می‌شود.</li>
<li align="right">دکمهٔ <strong>نصب و اتصال Firefox</strong> در «اتصال مرورگرها ← Firefox»، میزبان بومی را برای کاربر فعلی ثبت می‌کند، فایرفاکس نصب‌شده را پیدا می‌کند و فایل محلی افزونهٔ داخل بسته را با خود فایرفاکس باز می‌کند؛ مستقل از اینکه مرورگر پیش‌فرض چه باشد. تأیید درخواست نصب و دسترسی‌های فایرفاکس بر عهدهٔ کاربر است. پروفایل مرورگر به‌صورت پنهانی ویرایش نمی‌شود و بررسی امضا دور زده نمی‌شود.</li>
<li align="right">دکمهٔ <strong>ترمیم اتصال</strong> برای افزونه‌ای که از قبل نصب شده باقی مانده است. نبود فایرفاکس، نبود فایل بسته یا نادرستی چک‌سام به کاربر گزارش می‌شود. برای نسخه‌های قابل‌حمل یا سفارشی فایرفاکس که از مسیرهای ثبت‌شدهٔ برنامه‌ها یا پوشه‌های استاندارد پیدا نمی‌شوند، می‌توان افزونه را دستی نصب و سپس از ترمیم اتصال استفاده کرد.</li>
<li align="right">الزام واقعی انتشار در فروشگاه کروم در تنظیمات توضیح داده شده و پوشهٔ تمیز مخصوص ارسال به فروشگاه، همراه با توضیحات دسترسی‌ها، حریم خصوصی و مراحل انتشار آماده شده است. ثبت حساب مالک، پرداخت هزینه، بررسی گوگل و ایجاد صفحهٔ واقعی در فروشگاه هنوز انجام نشده‌اند.</li>
<li align="right">شمارهٔ نسخهٔ واقعی بستهٔ دسکتاپ در فهرست اجزای محیط اجرای داخل بسته ثبت می‌شود.</li>
</ul>

<p align="right">بررسی‌ها شامل کنترل نوع‌های <span dir="ltr"><code>TypeScript</code></span>، کامپایل بومی، آزمون فایل افزونهٔ داخل بسته و رد فایل دست‌کاری‌شده و آزمون‌های یکپارچگی قبلیِ نسخهٔ بومی و سرویس‌های متصل است. بازشدن فایرفاکس به معنی تأیید نصب افزونه نیست. تأیید واقعی دسترسی‌ها در فایرفاکس و انتقال کامل دانلود به برنامه همچنان به آزمون پذیرش روی پروفایل مرورگر نیاز دارد.</p>

</div>
