# Vault Portability Roadmap

Last updated: 2026-05-09

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
- Write an import report into the vault so failures are visible.

Implemented baseline:

- Markdown folder import copies notes and common attachments into `imports/<source-folder>/`.
- The importer skips code/project junk, refuses vault/source containment loops, and writes `import-report.md` beside the imported files.
- Markdown ZIP import extracts a portable archive safely, skips path traversal entries, and feeds the same Markdown/attachment importer.
- Bear import uses the same Markdown/TextBundle folder path so the original Markdown stays intact.
- Day One and Journey import accept JSON or ZIP exports, convert entries into dated `Journal` Markdown notes, copy referenced media into `attachments/`, and write an import report.

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

- Markdown ZIP export writes a portable archive to any folder outside the active vault.
- ZIP export includes normal vault files and skips local build/Git junk so the archive remains readable in other Markdown tools.

## Storage Providers

Ready:

- Local folder
- Git remote
- iCloud Drive folder
- Google Drive Desktop folder

Planned:

- Amazon S3
- Azure Blob Storage

Storage rules:

- Grimoire always edits a local working copy.
- Filesystem cloud folders are treated as normal local folders plus health warnings.
- Object storage uses a sync adapter, not direct note editing inside a bucket.
- Credentials are local machine settings, never vault files.
- Conflict handling must produce visible Markdown-safe conflict artifacts.

## Implementation Order

1. Shared portability registry in `src/lib/vaultPortability.ts`.
2. Settings UI showing import/export/storage status.
3. Markdown folder import wizard. ✅
4. Markdown ZIP import/export. ✅
5. Bear and Obsidian importers. Bear ✅, Obsidian next.
6. Day One, Journey, and Notion importers. Day One ✅, Journey ✅, Notion next.
7. iCloud/Google Drive health checks.
8. S3/Azure sync adapter design and prototype.

## Second-Brain Loop

Portability feeds the LLM second brain:

- Journal entries, project notes, todos, transcripts, and imported app notes stay as Markdown.
- The shared markdown layer extracts headings, links, frontmatter, tasks, diagrams, math, and attachments.
- The app derives graph edges, backlinks, search indexes, and agent context from those files.
- Agents write durable summaries, decisions, and work briefs back into Markdown instead of trapping them in chat.
- Object storage and cloud folders sync the vault; they do not become the source of truth.

## Non-Negotiables

- Local-first.
- Clean Markdown on disk.
- No hidden cloud lock-in.
- No silent destructive imports.
- No credentials in the vault.
- Git remains a valid power-user sync path.
