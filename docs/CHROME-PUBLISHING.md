# Chrome Web Store publication

Verified from official Chrome documentation on 2026-11-15: ordinary Chrome users on Windows/macOS install extensions hosted and signed by Chrome Web Store. A self-signed CRX or a Firefox-style signed file on GitHub is not an equivalent installation path. Baran does not change enterprise policies or mark a personal browser as managed.

The owner must register a Chrome Web Store developer account, accept its agreement and pay the one-time registration fee. Registration also depends on supported countries/regions. Upload the ZIP, complete listing/privacy/distribution details and submit for Google review. Unlisted store visibility can provide an installation link without public search discovery; store submission/review is still required. No account/payment/publication was performed here.

## Prepared package

Run `node scripts/prepare-chrome-store.cjs`; ZIP the **contents** of `dist/chrome-store-submission` with manifest.json at the root. The package contains no native host executable or Windows installer. Current extension version: 1.0.2. Do not change the already Mozilla-signed Firefox bytes.

Suggested name: Baran Download Manager — Browser Extension.

Summary: Collect links into Baran and optionally hand browser downloads to its persistent inbox.

Single purpose: send user-selected download links to the locally installed Baran download manager.

Permission justification: contextMenus for selected links; activeTab/scripting only after user action to collect page links/visible media; nativeMessaging for `com.baran.downloadmanager`; storage for local preferences; optional downloads permission only after opting into handoff. URLs/source context go to the local inbox; no cookies, Authorization headers, POST bodies, passwords or analytics. Privacy statement: `browser-extension/PRIVACY.md` and its public repository URL.

Reviewer flow: install Baran on Windows, keep it running, register the assigned Chrome extension ID in Browser integration, collect a link. With Baran unavailable the extension reports a connection error and resumes any browser download it paused for handoff. Handoff is optional in the popup.

After approval add the **real** store URL and fixed extension ID to Baran. The install button can register its native origin and open the listing; the user confirms Add to Chrome. Never invent a store URL. Development IDs remain manual until real listings exist.

Official references:
- https://developer.chrome.com/docs/extensions/how-to/distribute
- https://developer.chrome.com/docs/extensions/how-to/distribute/install-extensions
- https://developer.chrome.com/docs/webstore/register
- https://developer.chrome.com/docs/webstore/publish
