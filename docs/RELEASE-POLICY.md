# Permanent English/Persian release policy

Every GitHub Release must contain the **complete** English description and its complete Persian translation. This includes installation, each change, tests, limitations, links and licensing. Historical releases describe their own version; updating their text must not claim newer behavior exists in an older binary.

## Authoring

README uses the same complete-pair validator and RTL renderer, with source in `docs/readme.json`. Run `node scripts/readme.cjs --write`, then `node scripts/readme.cjs`; its version tag must match package.json. CI and documentation-policy tests enforce synchronization. This does not replace semantic review of both translations.

1. Add `docs/releases/<tag>.json`, using schema 1. Provide a bilingual title and ordered blocks (`paragraph`, `heading`, `bullet`). Every block has a unique stable `id` and both `en` and `fa` text. Translate each block fully, rather than collecting English changes into one short Persian summary.
2. Inline Markdown supports bold, code/file names and HTTPS links. Preserve English backtick-delimited tokens and destinations in the Persian pair. Put technical names/file names inside backticks when their direction matters. Do not handwrite RTL markup; the shared renderer owns GitHub-compatible HTML.
3. Run `node scripts/release-notes.cjs --write`, then `node scripts/release-notes.cjs --check` and `node --test tests/release-notes.test.cjs`.
4. Review semantic accuracy. Structural validation detects missing/non-Persian blocks, very short summary substitutes, lost code tokens/links, duplicate IDs and stale generated files. It cannot prove that a translation is linguistically correct or complete in meaning.

Generated `docs/RELEASE-*.md` files contain English plus a Persian `dir="rtl" lang="fa" align="right"` container. Persian paragraphs, headings and list items are right-aligned. Inline code uses GitHub-supported LTR spans; `<bdi>` is stripped by GitHub and must not be used.

## Publication and existing releases

The native Windows, legacy Windows and Firefox publishers all call `loadReleaseNotes(tag)` before publishing. A package version without a matching bilingual source or synchronized generated Markdown fails. CI also runs the checker and regression tests, including a scan of every workflow that creates or updates releases.

**Synchronize bilingual release descriptions** runs when sources, generated notes or the renderer change on main; it can also be run manually. It updates only the body of existing matching releases, verifies the result and preserves tags, target commits, attached assets/digests, publication timestamps and draft/prerelease flags. It does not create missing releases or change latest-release selection. New binaries continue through their normal tested publishing pipeline.

## فارسی

README از همان بررسی جفت‌ترجمهٔ کامل و تولیدکنندهٔ RTL استفاده می‌کند؛ منبع آن `docs/readme.json` است. ابتدا `node scripts/readme.cjs --write` و سپس `node scripts/readme.cjs` را اجرا کنید؛ تگ نسخه باید با package.json یکسان باشد. CI و تست سیاست مستندات، هماهنگی را کنترل می‌کنند. این بررسی جای بازبینی معنایی هر دو ترجمه را نمی‌گیرد.

توضیحات هر انتشار باید ترجمهٔ کامل انگلیسی و فارسی داشته باشد: تک‌تک تغییرات، نصب، آزمون‌ها، محدودیت‌ها، لینک‌ها و مجوز. متن هر بخش در فایل مشترک و به‌صورت جفت انگلیسی/فارسی نوشته می‌شود. فارسیِ خلاصه جایگزین ترجمهٔ کامل نیست. قالب راست‌چین و جهت نام‌های فنی را ابزار مشترک تولید می‌کند.

اگر ترجمه‌ای حذف شود، متن فارسی وجود نداشته باشد، یک متن بلند به خلاصه‌ای بسیار کوتاه تبدیل شود، نام فایل یا مقصد لینک از ترجمه جا بیفتد یا فایل خروجی با منبع هماهنگ نباشد، بررسی خودکار انتشار را متوقف می‌کند. بازبینی انسانیِ وفاداری و کیفیت ترجمه همچنان لازم است. اصلاح توضیحات نسخه‌های موجود فقط متن همان صفحه را تغییر می‌دهد؛ فایل‌های دانلود، چک‌سام‌ها، تگ‌ها و وضعیت انتشار ثابت می‌مانند.
