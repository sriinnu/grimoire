# ADR 0098: Local Portability Capsule Snapshots

Date: 2026-05-28

## Status

Accepted

Supersedes the snapshot portion of [ADR 0091](0091-vault-portability-import-export-storage.md).

## Context

Grimoire needs portable exits beyond Markdown ZIP and static HTML: a human-diffable JSON snapshot for audits/agents and a local SQLite snapshot for read-optimized tools. These exits must not weaken the core product rule: Markdown files on disk remain the vault source of truth, and local-only lanes stay local.

## Decision

Add reviewed Portability Capsule export and import paths with two local formats:

- JSON snapshot: pretty-printed, vault-relative paths only, UTF-8 text inline, binary assets base64 encoded, withheld rows included with reasons.
- SQLite snapshot: local `.sqlite` file with `capsule_meta`, `capsule_files`, `withheld_files`, and `locality_proof` tables.
- Both formats share one Locality Firewall inventory, with journals, dreams, private lanes, `.grimoire-local`, `.codex`, `.mcp.json`, `.env*`, mockups, and attachments referenced only by local-only notes withheld before writing.
- SQLite is a read-optimized export artifact only. It is not the live vault, not a hidden database, and not a replacement for Markdown.
- Export and import apply both require the exact preview signature from the reviewed dry run; changed vault/capsule inputs reject as stale before any disk write.
- Import preview/apply restores JSON and SQLite capsules into `imports/<capsule-name>/`, writes a local-only import report, verifies byte counts and SHA-256 hashes, rejects capsule sources inside the active vault, and rejects unsafe relative paths before writes.
- Incoming capsules are untrusted: withheld rows are never recreated, inbound local-only Markdown and its directly referenced attachments stay withheld, and SQLite is opened read-only as an import artifact.

## Consequences

This adds `rusqlite` so the app can write real SQLite files without shelling out to a system `sqlite3` binary. The dependency is isolated to export generation.

JSON and SQLite capsule export/import now have local regression proof. This is a local round-trip lane only; it does not claim cloud sync/provider proof.
