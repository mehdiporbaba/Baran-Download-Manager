# Baran Download Manager 2.1.0-beta.2

Windows x64 prerelease. Latest stable desktop remains 2.0.0. Connected-services features/limits from [beta.1](RELEASE-2.1.0-beta.1.md) still apply.

- Bundle the exact Mozilla-approved Firefox 1.0.1 XPI inside Setup/Portable; verify its pinned SHA-256 before opening it.
- Browser integration → Firefox → **Install & connect Firefox** registers the current-user native host, detects installed Firefox and opens the bundled local XPI with Firefox, independently of the default browser. The user approves Firefox's install/permission prompt. No silent profile editing or signature bypass.
- **Repair connection** remains for an already installed extension. Missing Firefox/package or checksum errors are reported. Portable/custom Firefox not found through App Paths/standard folders can use manual XPI installation and Repair connection.
- Explain Chrome's real store requirement and prepare a clean submission folder plus permission/privacy/publication notes. Owner registration, payment, Google review and a real store listing remain pending.
- Stamp packaged runtime inventory with the actual desktop package version.

Validation: TypeScript checks, native compilation, bundled-XPI/tamper tests and existing native/connected integrations. Opening Firefox is not an installation acknowledgement. Actual Firefox permission approval and end-to-end native handoff still need profile acceptance testing.

## فارسی

دکمهٔ **نصب و اتصال Firefox** در «تنظیمات ← اتصال مرورگرها ← Firefox» فایل امضاشدهٔ داخل برنامه را با فایرفاکس باز و اتصال محلی را ثبت می‌کند. تأیید نهایی Add با کاربر است. Chrome برای نصب کاربران عادی به انتشار واقعی در Chrome Web Store نیاز دارد.
