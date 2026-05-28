# ADR 0099: Exact Import Autopsy Signatures

## Status

Accepted

## Context

Import Autopsy previews are the user's review gate for Markdown folders, ZIP archives, journal exports, and app exports. Before this ADR, JSON/SQLite capsules carried exact preview signatures, while general importers only reused the reviewed source path. A source export could change between preview and import, then write a different file set than the user reviewed.

## Decision

Every import write that enters the vault through Settings must carry the opaque preview signature from its matching no-write Import Autopsy preview. The native command layer validates the current source bytes against that signature before creating import folders, extracting archives, converting journals, or copying app exports.

The signature is local-only and opaque. It binds the import scope, selected source, importable source bytes, and private-path withholding markers without exposing raw content. Known private/local-only folders such as `.grimoire-local`, `.codex`, `.obsidian`, `mockups`, `certs`, and `.env*` files are withheld from content hashing while still affecting the reviewed source shape.

## Consequences

- A stale Markdown folder, ZIP, journal, or app export preview blocks import before disk writes.
- Browser mocks must require non-empty preview signatures so tests do not bypass the real gate.
- Import Autopsy remains a preview-before-write contract, not a best-effort summary.
- Low-level importer functions stay reusable for focused conversion tests; the reviewed command boundary owns product safety.
