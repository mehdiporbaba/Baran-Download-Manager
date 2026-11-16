---
name: baran-maintenance
description: Maintain Baran Download Manager's native Windows app, browser handoff, upstream adaptations and bilingual release documentation. Use for Baran implementation or project handoffs; not for unrelated download-manager recommendations.
---

# Baran maintenance

Read the repository's `AGENTS.md` and `MEMORY.md` before continuing work. Resolve these paths from the repository root, three directories above this skill folder. Memory records the last observed state; verify current branches, releases, signatures and pending user input before acting. Preserve current user instructions and authorization.

## Architecture and upstream fixes

Baran ships a C#/.NET Framework backend with shared WebView2 and aria2. `src/main` retains an Electron implementation for development/rollback. Identify which engine a bug affects; an Electron patch alone does not fix the native app. When reviewing Pulse changes, map the failure to Baran, adapt relevant fixes, and record already-fixed/non-applicable changes and test limits. Use `docs/UPSTREAM-REVIEW-v1.0.16.md` as the existing evidence, not a reason to import all upstream UI or packaging.

Keep Baran Download Manager identity, blue palette, adaptive window sizing, Persian RTL, All downloads startup and collapsible navigation preferences. Read current code rather than reimplementing completed features from memory.

## Browser integration

Separate link collection from an explicit download request. Preserve the durable Inbox before acknowledgement, renderer readiness during startup, connection diagnostics, and browser continuation when native handoff fails. A generic import ACK is not proof that a download prompt opened. Preserve excluded private/extension-owned/unsupported requests and the opt-in permissions flow.

Firefox extensions cannot disable arbitrary competing download-manager extensions or guarantee exclusive priority. Do not claim a global default-handler takeover; explain the competing-extension setting when relevant. Keep browser security/permission prompts visible to the user. URL transfer does not imply cookie/header/session transfer or support for POST/blob/DRM.

For Firefox packaging, read `docs/FIREFOX-SIGNING.md` and current signed metadata. Preserve the exact Mozilla-signed binary and pinned digest. A new source version or a lint-clean unsigned XPI is not signed. Obtain and inspect the genuine signed result before changing bundled files/pins. Never bypass Firefox signature checking. Store registrations, legal acceptance and permission expansions require their applicable authorization; this skill grants none.

## Validation and releases

Choose checks for changed boundaries: TypeScript/unit tests; native compile and native integration for C# engine/IPC; connected integration for provider/mobile/VPN/API contracts; retained Electron network checks when that path changes; web-ext lint for Firefox source. Record actual results and manual acceptance gaps. Fixture media/local private torrents do not establish live-account extraction, public DHT, real FFmpeg merging or installed-browser conflict behavior.

README and every release require a complete, faithful Persian translation and correct RTL. Read `docs/RELEASE-POLICY.md` before release work. Author paired notes only in `docs/releases/<tag>.json`; run `node scripts/release-notes.cjs --write`, then `--check`. Publishers must call `loadReleaseNotes(tag)`. Preserve code/link destinations in both languages and use the shared RTL renderer. Structural checks do not prove translation accuracy.

Use a new version and matching paired notes for a new desktop publication. Never replace already-published binaries/checksums with a changed build. Description corrections use the dedicated body-only sync workflow and preserve release identity/assets/flags/latest selection. A request to save memory or synchronize documentation does not itself request publication.

## Handoff

Update root `MEMORY.md` with released versus source-only changes, branch/PR/implementation commit, verification evidence, blockers, and the concrete next action. Link detailed docs instead of copying logs. Keep stable procedure here and changing state in memory. Never store tokens, cookies, private account details or browser profiles. Synchronize the requested repository and verify its resulting commit/branch; do not silently merge or publish just to record progress.
