# Vault Portability Roadmap

Last updated: 2026-05-04

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

Importer rules:

- Never mutate the source app export.
- Convert into normal `.md` files and attachments.
- Preserve source timestamps where the export gives them.
- Preserve tags as frontmatter or Markdown tags.
- Preserve internal links where possible.
- Write an import report into the vault so failures are visible.

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

## Storage Providers

Ready:

- Local folder
- Git remote

Planned:

- iCloud Drive
- Google Drive Desktop
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
3. Markdown folder import wizard.
4. Markdown ZIP export.
5. Bear and Obsidian importers.
6. Day One and Notion importers.
7. iCloud/Google Drive health checks.
8. S3/Azure sync adapter design and prototype.

## Non-Negotiables

- Local-first.
- Clean Markdown on disk.
- No hidden cloud lock-in.
- No silent destructive imports.
- No credentials in the vault.
- Git remains a valid power-user sync path.
