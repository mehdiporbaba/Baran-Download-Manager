# Repository instructions

## Permanent bilingual documentation and release policy

- README and every GitHub Release must contain a complete Persian translation of the English content, including all changes, installation steps, validation, limitations and links. Do not replace the Persian text with a short summary.
- Release descriptions are authored only in `docs/releases/<tag>.json` as ordered English/Persian block pairs. Every heading, paragraph and bullet needs both languages. Preserve code/file names and link destinations in both languages.
- Run `node scripts/release-notes.cjs --write` after changing paired notes, then `node scripts/release-notes.cjs --check`. Generated `docs/RELEASE-*.md` files must stay synchronized; do not hand-edit a separate body in a publishing workflow.
- All publishing workflows must call `loadReleaseNotes(tag)` before creating/publishing a release. A new desktop version needs a matching bilingual source document before publication.
- Persian release HTML uses the shared renderer's `dir="rtl"`, `lang="fa"`, right alignment and supported `<span dir="ltr">` for inline code/names. GitHub strips `<bdi>`; do not rely on it. Keep command blocks in an LTR container when used elsewhere in documentation.
- Correcting a published description changes only its body. Preserve release tags, commits, attached binaries, checksums, draft/prerelease state and latest-release selection. Use the dedicated description-sync workflow.
- Automated structural checks enforce translation coverage; a human-quality semantic review must still ensure every paired translation is complete and faithful. Do not claim that an automatic check proves translation accuracy.
