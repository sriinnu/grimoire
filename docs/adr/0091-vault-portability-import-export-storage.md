---
type: ADR
id: "0091"
title: "Vault portability import export and storage providers"
status: active
date: 2026-05-04
---

## Context

Grimoire already treats the vault as a normal folder of Markdown files and supports Git-backed sync. Users also need to import from other Markdown-adjacent apps, export their vault, and store/sync through iCloud Drive, Google Drive, S3, Azure, or similar systems.

Those are related but different capabilities. Mixing them into one "sync" feature would make the system brittle and unclear.

## Decision

Grimoire separates vault portability into three contracts:

- **Import source**: reads another app export and creates normal Grimoire Markdown files.
- **Export target**: writes a portable copy of a Grimoire vault.
- **Storage provider**: describes where the local-first vault lives and how it syncs.

The initial shared registry lives in `src/lib/vaultPortability.ts`. Git and local folders are ready providers. Bear, Day One, Obsidian, Notion, iCloud Drive, Google Drive Desktop, S3, and Azure Blob are planned entries until their importers or sync adapters exist.

## Consequences

- Git remains first-class without becoming the only sync path.
- Cloud folders can be supported as local folders with provider-specific health checks.
- Object storage providers require a local working copy and sync adapter; Grimoire should not edit notes directly inside buckets.
- Credentials stay in local machine settings, never in the vault.
- Import/export UI can show honest readiness instead of pretending every provider is wired.

## Alternatives Considered

- **Git-only sync**: already strong, but excludes users who expect iCloud/Google Drive or object storage.
- **Direct cloud APIs as the vault**: tempting for S3/Azure, but weak for conflict handling, offline editing, file watching, and plain-editor interoperability.
- **Generic folder import only**: simple, but misses app-specific metadata cleanup needed for Bear, Day One, Obsidian, and Notion exports.
