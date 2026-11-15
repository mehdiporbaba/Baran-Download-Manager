# Firefox installation: actual Mozilla signing

## Current signed release

Mozilla approved **1.0.1** on **2026-11-15**, version ID 6711549/file ID 5255635. The exact signed file is preserved at `browser-extension/signed/Baran-Firefox-Extension-1.0.1-signed.xpi`; SHA-256: `908de928372ff98ca24f021907b175ceeb686e269db2b605b793d8676dbbc0c8`. This is unlisted/self-distributed, not a public AMO listing. `Publish Mozilla-signed Firefox installer` publishes that pinned file on GitHub `firefox-v1.0.1`. Ordinary Firefox end-to-end installation/handoff acceptance remains; Mozilla approval is not a tested native-host flow.

An unsigned XPI is a development artifact. It cannot be installed permanently in ordinary Firefox Release/Beta. Renaming a ZIP, registering the native host, creating our own certificate, or changing `xpinstall.signatures.required` in Firefox Release does not solve this.

Mozilla's advanced instructions apply to ESR, Developer Edition, Nightly and unbranded builds. They are not the onboarding path for ordinary Baran users. No browser signature protection is changed by Baran.

## Fastest normal-user path: signed, self-distributed XPI

1. Sign in as the project owner at <https://addons.mozilla.org/developers/addon/submit/distribution>. Complete the developer agreement yourself if prompted.
2. Select **On your own** (unlisted/self-distributed). A public store listing is not required for Mozilla signing.
3. Run `node scripts/prepare-firefox.cjs`. ZIP the **contents** of `dist/firefox-submission` with `manifest.json` at the archive root, or upload the development XPI from the release. The package contains readable JavaScript, not minified code, and no Windows executable.
4. Upload it, select Windows compatibility, supply the privacy notice from `browser-extension/PRIVACY.md`, and submit. Review notes: native host `com.baran.downloadmanager`; fixed extension ID `baran-download-manager@mehdiporbaba`; the desktop app's Settings → Browser integration → Firefox → Connect browser registers the host. Without the desktop app, the extension displays a connection error and resumes a paused browser download.
5. Wait for Mozilla's result and download the **signed** XPI. Only that returned file is a normal-user installer. Test in Firefox Release with signature protection enabled, then publish the signed file and its SHA-256 on GitHub. Do not label the current unsigned file as an ordinary installer.
6. Users install the signed XPI through Firefox's file installer or open its download, accept Firefox's permission prompt, then connect the native host inside Baran. Updates for an unlisted extension need a new signed package; automatic update hosting is not yet configured.

For a public AMO listing select **On this site** instead and provide a complete listing. Do not invent an AMO install URL before approval.

## Repeatable signing

After the owner accepts Mozilla's developer agreement, create owner API credentials at <https://addons.mozilla.org/developers/addon/api/key/>. Put the issuer and secret into GitHub **Actions secrets** named `AMO_JWT_ISSUER` and `AMO_JWT_SECRET`; do not paste them into chat, source code, issues or build arguments. Run **Sign Firefox extension with Mozilla**. The workflow uses official `web-ext sign --channel unlisted`, downloads the returned signed XPI and stores it as an artifact. It fails if credentials are missing, review has not returned a signed package, or a signature container is absent. Container presence is a packaging check, not a substitute for acceptance testing by Firefox.

The existing package version is 1.0.1. After a version is submitted, use Mozilla's version management and increment both manifests for subsequent code changes; do not repeatedly submit changed bytes under the same version.

Official references:
- <https://support.mozilla.org/en-US/kb/add-on-signing-in-firefox>
- <https://extensionworkshop.com/documentation/publish/signing-and-distribution-overview/>
- <https://extensionworkshop.com/documentation/publish/submitting-an-add-on/>
