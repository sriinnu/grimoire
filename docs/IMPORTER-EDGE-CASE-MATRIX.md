# Importer Edge-Case Matrix

Last updated: 2026-05-27

This is the working proof map for Grimoire import support. It is not a readiness certificate. A lane moves from fixture-backed to fully proven only after sanitized fixtures, regression tests, and real user/export-file testing agree.

## Source Signals

- Bear exports Markdown and TextBundle V2 from the official export flow; TextBundle is the attachment-preserving Markdown path. Source: <https://bear.app/faq/export-your-notes/>
- Day One JSON exports can include media organized into `photos`, `videos`, `audios`, and `pdfs` folders. Markdown/plain-text export does not include photos. Source: <https://dayoneapp.com/guides/tips-and-tutorials/exporting-entries/>
- Apple Journal exports all entries as a single `AppleJournalEntries` ZIP and says photos, locations, and other media are included. Source: <https://support.apple.com/en-lamr/121822>
- Journey supports entry and bulk export/backup to ZIP, with web backup unavailable for Google Drive sync. Source: <https://help.journey.cloud/en/article/archive-journal-entries-to-zip-format-v6dsvi/>
- Obsidian vaults are normal local folders with Markdown notes; attachments are regular files and can live in several configured locations. Sources: <https://help.obsidian.md/data-storage>, <https://obsidian.md/help/attachments>
- Notion exports pages/workspaces as Markdown and CSV ZIPs; databases become CSV with Markdown subpages, callouts may become HTML, and long nested paths can be an extraction problem. Source: <https://www.notion.com/en-gb/help/back-up-your-data>

## Ranked Edge Cases

| Rank | Importer | Edge case | Why it matters | Current state |
| --- | --- | --- | --- | --- |
| P0 | Day One, Journey, Apple Journal | Duplicate media basenames in nested folders, such as two different `photo.jpg` files | Silent overwrite or wrong-link corruption is worse than an import failure | Fixed in current branch: media lookup prefers exact relative paths, ambiguous filename/stem fallbacks are ignored, and attachment destinations become unique |
| P0 | All ZIP/folder importers | Path traversal, hidden runtime folders, local-only config, mockups, certs, `.env*`, and `.mcp.json` | Protected or executable local context must never enter imported/exported public lanes | Regression-backed for Markdown ZIP, Markdown/Bear folders, Obsidian/Notion app imports, object-storage mirrors, static HTML, and Git staging |
| P0 | All exporters/sync lanes | Local-only notes and attachments referenced only by local-only notes | Dreams, journals, private notes, mockups, and local files must stay local | Regression-backed for Git staging, Markdown ZIP, static HTML, and object-storage mirrors |
| P1 | Day One | JSON media references by md5, filename, relative path, and folder category | Official JSON media can be split across `photos`, `videos`, `audios`, and `pdfs` | Fixture-backed for md5/path media and all four official media folders; needs real export samples |
| P1 | Apple Journal | `AppleJournalEntries` ZIP package shape, HTML/JSON variants, locations, voice, images, video, and handwritten/sketch content | Apple states export includes photos, locations, and other media, but the exact package shape may vary by iOS release | Fixture-backed for HTML/JSON-style entries and media; needs live Apple export corpus |
| P1 | Bear/TextBundle | TextBundle `text.*`, `info.json`, and `assets/` mapping; Markdown export without media | Bear has both plain Markdown and attachment-preserving TextBundle paths | Sanitized TextBundle fixture-backed; needs real Bear exports from macOS and iOS |
| P1 | Notion | Nested page folders, page IDs in filenames, database CSV, callout HTML blocks, long paths, and assets beside Markdown | Notion exports are a Markdown/CSV/HTML hybrid, not pure Markdown | Fixture-backed for nested Markdown, CSV/assets, and page-ID cleanup; needs real workspace export corpus |
| P1 | Obsidian | Wikilinks, embeds, attachment folder settings, `.obsidian` runtime config, `.canvas`, and non-Markdown attachment files | Obsidian is already local-first, but vaults can encode links and attachment paths several ways | Fixture-backed for preview and actual import of Markdown, attachments, runtime config skips, `.canvas`, wiki embeds, Markdown links, and relative attachment paths; needs real vault export samples |
| P2 | Journey | ZIP backup structure differs across desktop/mobile/web/cloud providers | Journey export paths vary by platform and sync backend | Sanitized JSON fixture-backed; needs real ZIP exports from desktop/mobile |
| P2 | Mixed Markdown ZIP | Archives from arbitrary tools may contain unsafe paths, duplicate names, missing extensions, and unsupported binaries | This is the broad escape hatch importer | Golden fixture covers notes, assets, local-only paths, and unsafe traversal; actual import regression covers large notes, unsupported binaries, and unsafe traversal |

## Latest Hardening

- [x] Added a journal media planner so preview, normal import, and progress import use the same attachment resolution.
- [x] Exact relative media paths now win over filename/stem fallbacks.
- [x] Ambiguous filename/stem fallbacks are ignored instead of guessing the wrong file.
- [x] Distinct attachments with the same basename are copied as unique vault-relative links such as `attachments/photo.jpg` and `attachments/photo-2.jpg`.
- [x] Added a regression proving duplicate nested media basenames stay distinct in preview and import.
- [x] Added a sanitized Day One media-category corpus proving `photos`, `videos`, `audios`, and `pdfs` all emit exact Import Autopsy rows.
- [x] Added a sanitized Obsidian link-style corpus proving `.canvas`, wiki embeds, Markdown links, and relative attachments emit exact Import Autopsy rows.
- [x] Added an actual Obsidian link-style import regression proving link/embed text is preserved, `.canvas` and attachments are copied, and `.obsidian` runtime config stays withheld.
- [x] Added a mixed Markdown ZIP stress regression proving a large Markdown note imports intact while unsupported binaries and unsafe traversal stay withheld.

## Next Proof Work

- [ ] Add real-export fixture captures for Day One media across `photos`, `videos`, `audios`, and `pdfs`.
- [ ] Add real Apple Journal `AppleJournalEntries` ZIP corpus with location and audio/media examples.
- [ ] Add Bear macOS and iOS TextBundle corpora with inline image references.
- [ ] Add Notion workspace export corpus with database CSV, callout HTML, nested assets, and long-path cases.
- [ ] Add real Obsidian vault samples for `.canvas`, wiki embeds, Markdown links, attachment-folder settings, and mobile/desktop-created vault variants.
