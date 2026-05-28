# Vault Portability Roadmap

Last updated: 2026-05-25

Grimoire should be easy to enter and easy to leave. The product promise is: writes like Notion, saves as Markdown, moves like a normal folder.

## Product Shape

Portability has three lanes:

- **Import**: bring notes from another app into a Grimoire vault.
- **Export**: write a clean portable copy of the vault.
- **Storage**: choose where the local-first vault lives and how it syncs.

Git already covers versioned sync. It should stay first-class, but not be the only answer.

## Import Sources

Initial importer targets:

- Markdown folder
- Markdown ZIP
- Bear Markdown export
- Day One export converted into Markdown journal notes
- Obsidian vault
- Notion Markdown export
- Spanda practice/session export converted into Sadhana Markdown notes

Importer rules:

- Never mutate the source app export.
- Convert into normal `.md` files and attachments.
- Preserve source timestamps where the export gives them.
- Preserve tags as frontmatter or Markdown tags.
- Preserve internal links where possible.
- Write a local-only Import Autopsy report into the vault so source paths, skips, and failures are visible without leaking through portable exports.

Implemented baseline:

- Markdown folder import copies notes and common attachments into `imports/<source-folder>/`.
- The importer skips code/project junk, hidden local config, local cert/mockup folders, and vault/source containment loops, then writes `import-report.md` beside the imported files.
- Markdown/Bear folder import autopsies count files inside pruned local-only folders such as `.codex`, `.grimoire-local`, `mockups`, and `certs` as skipped while keeping them out of the imported vault copy.
- Markdown folder, Bear, Markdown ZIP, Apple Journal, Day One, Journey, Obsidian, Notion ZIP/folder, and Spanda imports can be previewed before writing. The preview reports planned note copies, asset copies, skipped files, destination folder, and the local-only import report. Settings keeps the latest no-write preview in memory as a compact Import Autopsy timeline; raw machine paths are shortened and the state is cleared on vault changes/imports. Cancellable progress imports preserve the same skipped local-only totals as their preview/import paths.
- Markdown ZIP import extracts a portable archive safely, counts skipped path traversal entries, withholds unsupported binaries, preserves large Markdown notes, and feeds the same Markdown/attachment importer.
- Bear import uses the same Markdown/TextBundle folder path so the original Markdown stays intact.
- Day One and Journey import accept JSON or ZIP exports, convert entries into dated `Journal` Markdown notes, copy referenced media into `attachments/`, and write an import report.
- Obsidian import copies Markdown, attachments, and `.canvas` files while preserving wiki/Markdown link text and skipping `.obsidian` runtime config plus other project junk.
- Notion Markdown import accepts ZIP or folder exports, cleans Notion page IDs from filenames, keeps CSV/assets, and records `source_app`, `source_path`, and `notion_id` frontmatter.
- Spanda import accepts JSON or ZIP exports, converts sessions/practices into local-only `Sadhana` Markdown notes, and keeps the raw source fields inside each note for auditability.
- Import Autopsy reports and any notes marked `locality: local`, `local_only`, `no_sync`, `never_sync`, or `egress: blocked` stay out of portable Markdown ZIP exports.
- Attachments referenced only by local-only Markdown stay out of ZIP export, static HTML export, object-storage mirror sync, and Git staging, including Markdown image links, wikilink embeds, HTML media tags, frontmatter media fields, and `grimoire-canvas` source/preview paths.
- Apple Journal ZIP/HTML/JSON import is ready for `AppleJournalEntries`-style exports; fixture-backed parsing converts recognized entries into local Markdown journal notes and copies referenced media.
- Obsidian/Notion-family app import autopsies count hidden/runtime files such as `.obsidian`, `.vscode`, `.env`, and unsafe ZIP traversal entries as skipped instead of silently dropping them from the report.
- Sanitized golden import corpora now cover Bear/TextBundle, Day One JSON, Day One `photos`/`videos`/`audios`/`pdfs` media folders, Apple Journal HTML, Journey JSON, Obsidian `.canvas` and link-style cases, Notion, and mixed Markdown ZIP manifest rows. The Obsidian link-style corpus also has actual import proof for copied notes/assets/canvas, preserved link text, and withheld runtime config. Mixed Markdown ZIP has actual import proof for large Markdown content, unsupported binary withholding, and unsafe traversal withholding.
- The importer edge-case matrix ranks the remaining provider/app-specific risks, and the first P0 hardening now keeps duplicate nested journal media basenames distinct during preview and import.
- Proof boundary: import adapters are regression and fixture backed. Real export corpora from Bear, Day One, Apple Journal, Obsidian, Notion, Journey, and Markdown ZIP still need live user-file testing before they are called fully proven.

## Export Targets

Initial export targets:

- current vault folder
- Git remote
- Markdown ZIP
- static HTML archive

Export rules:

- Markdown is the primary export.
- Attachments stay beside notes with relative links.
- App-owned metadata stays readable and documented.
- Export must not require a Grimoire account.

Implemented baseline:

- Markdown ZIP export writes a portable archive to any folder outside the active vault through a same-folder temporary file, replacing the final archive only after the ZIP finishes.
- ZIP export includes normal vault files, skips local build/Git junk, and excludes local-only lanes (`Journal`, `Dream`, `Private`, `Health`, `Therapy`, `local_only`, `no_sync`, `never_sync`) so the archive remains safe and readable in other Markdown tools.
- Static HTML archive export writes a browsable `index.html` plus one HTML page per public Markdown note, copies public attachments, and uses the same local-only exclusions as Markdown ZIP.
- Markdown ZIP and static HTML export reports and completion toasts count files withheld from `.grimoire-local`, `.codex`, `.mcp.json`, `.env*`, `mockups`, and similar local-only folders instead of silently pruning them from the skipped total.

## Storage Providers

Ready:

- Local folder
- Git remote
- iCloud Drive folder
- Google Drive Desktop folder
- Pure JSON snapshot export/import
- Local SQLite snapshot export/import

JSON/SQLite capsule import now requires a matching Locality Firewall proof before preview or apply: Markdown must remain the source of truth, absolute source paths must be redacted, and the proof's withheld count must match the withheld manifest rows. Inbound filtering also follows private `grimoire-canvas` source JSON to withhold nested placed images before restore.

Planned:

- Amazon S3 provider sync
- Azure Blob provider sync through local Azure CLI auth

Storage rules:

- Grimoire always edits a local working copy.
- Filesystem cloud folders are treated as normal local folders plus health warnings; the cloud provider syncs the folder outside Grimoire, and cloud credentials never live in the vault.
- "Ready" for iCloud Drive and Google Drive Desktop means Grimoire can use provider-managed local folders and run a read-only local-folder proof for path shape, folder existence, and readability. It does not prove provider quota, offline conflict, account-auth, or cross-device merge behavior.
- Object storage uses a sync adapter, not direct note editing inside a bucket.
- Credentials are local machine settings, never vault files.
- Conflict handling must produce visible Markdown-safe conflict artifacts.

Object-storage adapter design and prototype:

- S3 and Azure now have provider preview/apply command surfaces behind the same exact-preview contract, plus Settings-visible lanes separate from the local-mirror fixture. Azure uses the local Azure CLI login instead of storing credentials in Grimoire.
- The native fixture-backed prototype uses a local mirror folder to exercise the same bidirectional preview/apply contract without cloud credentials.
- Preview/apply reports explicitly include `adapter_phase: local-mirror-prototype` and `prototype_mode: local-mirror-fixture`, and the Settings dry-run card shows the same fixture label so this cannot be mistaken for live cloud SDK sync.
- S3 also has a read-only live preflight that uses local AWS configuration only, calls `HeadBucket` and `ListObjectsV2` with `max_keys=1`, and returns redacted status without object keys, credentials, or local paths. Settings accepts bucket, region, and prefix as a transient preflight draft; those values are not written to vault files or saved settings.
- Azure Blob has a read-only live preflight through the local Azure CLI login. It checks `az storage container exists` and a one-item `az storage blob list` with `--auth-mode login`, reports missing CLI/login/permission/container/network states, and never returns CLI output, credentials, object keys, or local paths.
- S3 and Azure also have ignored live provider-sync proof tests. Run them with `pnpm test:object-storage-live -- --report .tmp/object-storage-live-proof.json` after setting `GRIMOIRE_S3_LIVE_WRITE_PROOF=1` or `GRIMOIRE_AZURE_LIVE_WRITE_PROOF=1` plus the required provider scope. The runner reports only set/missing env state, creates a generated proof prefix, runs Grimoire's provider preview/apply/pull path, verifies local-only journal notes stay withheld, then deletes the generated public proof object/blob. The optional report records only redacted pass/fail/missing-config evidence. These tests prove the app provider contract is reachable; Settings provider lanes still need real failure-state runs before they become provider-proven sync.
- Settings also keeps a Proof Ledger that labels ready import/export/desktop-sync lanes separately from S3/Azure proof-boundary evidence: read-only preflight, provider preview/apply contracts, and local-mirror fixtures.
- Settings exposes iCloud Drive and Google Drive Desktop local-folder proof buttons. The native check only verifies the active vault path and local folder readability, and reports that Grimoire stores no cloud credentials.
- The local vault folder is always the working copy; the remote bucket/container is only a mirror target.
- The first command contract is `storage_health_check`, `storage_pull_preview`, `storage_push_preview`, `storage_sync_apply`, and `storage_disconnect`; the fixture prototype currently covers health, previews, and exact-preview-gated apply. Provider command contracts are `storage_s3_provider_*` and `storage_azure_provider_*` preview/apply commands.
- Settings exposes the local-mirror prototype as S3/Azure push and pull preview/apply buttons. These choose a local mirror folder every time and do not collect cloud credentials. Settings also exposes explicit S3 and Azure provider push/pull preview/apply buttons that reuse transient provider drafts and apply only the target captured by the matching preview.
- Every push/pull preview must show the provider target, files to upload/download/delete, excluded local-only files and referenced attachments with reasons, and conflict plan before apply. The local-mirror prototype now shows a visible Settings dry-run card with compact mirror labels, conflict examples, local-only withheld examples, and the exact-preview apply lock. Progress previews and non-progress previews use the same local-only exclusion policy so Settings cannot show mockups/certs/local config as upload candidates.
- Object-storage Settings keeps local-mirror fixture actions visually separate from provider lanes. S3 provider reports are labeled `provider-sdk-adapter` / `s3-live-provider`; Azure provider reports are labeled `provider-sdk-adapter` / `azure-live-provider`. The S3/Azure live preflights remain separate read-only proof lanes.
- Apply requires the preview signature from the exact dry run; if local or mirror files change after preview, Grimoire rejects the apply and asks for a fresh preview. Settings provider lanes also reject apply when bucket/container/account/prefix/direction changes after preview, and they block conflicts instead of copying over ambiguous remote/local state.
- S3 and Azure provider comparisons use Grimoire-owned SHA-256 metadata (`grimoire-sha256` on S3, `grimoire_sha256` on Azure) so same-size divergent remote content becomes a conflict. Remotes without that metadata are treated conservatively as conflicts until a verified upload establishes the content hash.
- Explicit Settings provider drafts do not silently fall back to hidden AWS/Azure environment values; env fallback remains only for lower-level/direct proof helpers where it is intentionally requested.
- Credentials live in local machine settings or keychain. Bucket/container names and non-secret prefixes may be displayed in Settings, but access keys, SAS tokens, connection strings, and provider caches never enter the vault.
- Local-only lanes are excluded by default using the same policy as Markdown ZIP export: protected frontmatter, protected note types, protected paths, and attachments reachable only from protected notes stay local.
- Hidden local config, local certs, and mockup folders are reported as local-only exclusions by object-storage mirror previews, then skipped by portable export and mirror apply.
- Conflicts write visible Markdown-safe local artifacts. If a conflict includes protected content, the conflict artifact is also local-only and never uploaded.

## Implementation Order

1. Shared portability registry in `src/lib/vaultPortability.ts`.
2. Settings UI showing import/export/storage status.
3. Markdown folder import wizard. ✅
4. Markdown ZIP import/export. ✅
5. Bear and Obsidian importers. Bear ✅, Obsidian ✅.
6. Day One, Journey, Notion, and Spanda importers. Day One ✅, Journey ✅, Notion ✅, Spanda ✅.
7. iCloud/Google Drive health checks.
8. Apple Journal import ✅.
9. Static HTML archive export ✅.
10. S3/Azure sync adapter design ✅, local-mirror preview/apply prototype ✅, S3/Azure read-only live preflight ✅, opt-in live round-trip proof harness ✅, S3/Azure provider preview/apply surfaces ✅, live provider failure-state proof next.
11. Journal import previews ✅.

## Second-Brain Loop

Portability feeds the LLM second brain:

- Journal entries, project notes, todos, transcripts, and imported app notes stay as Markdown.
- The shared markdown layer extracts headings, links, frontmatter, tasks, diagrams, math, and attachments.
- The app derives graph edges, backlinks, search indexes, and agent context from those files.
- Agents write durable summaries, decisions, and work briefs back into Markdown instead of trapping them in chat.
- Object storage and cloud folders sync the vault; they do not become the source of truth.
- JSON and SQLite are local portability snapshots, not hidden app state. JSON must stay human-diffable and agent-friendly; SQLite may accelerate local audit/search/export checks, but Markdown remains the source of truth and every import/apply path must pass preview, Locality Firewall, and reversible manifest proof. Imported capsules are untrusted until their proof flags, withheld manifest count, and inbound local-only attachment closure validate.

## Non-Negotiables

- Local-first.
- Clean Markdown on disk.
- No hidden cloud lock-in.
- No silent destructive imports.
- No credentials in the vault.
- Git remains a valid power-user sync path.
