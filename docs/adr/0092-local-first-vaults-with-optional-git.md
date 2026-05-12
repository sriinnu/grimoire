---
type: ADR
id: "0092"
title: "Local-first vaults with optional Git"
status: active
date: 2026-05-12
supersedes: "0034"
---

## Context

ADR-0034 made Git a blocking prerequisite for opening a vault. That protected Git-only features, but it made the wrong concept the product boundary. ADR-0014 also assumed Git for cache change detection; this ADR supersedes that prerequisite, not the rule that caches live outside the vault. A Grimoire vault is a local-first knowledge space backed by Markdown files. Notes, journals, dreams, and custom types should be usable in any normal folder, including folders synced by iCloud Drive or Google Drive Desktop.

Git remains valuable for history, commits, remote push/pull, Pulse, conflict resolution, and automation, but those are optional capabilities layered onto the vault.

## Decision

Grimoire treats a vault as a readable local folder first. Opening or creating a vault must not require `.git`.

Git is now an optional capability:

- local-only vaults can open, scan, edit, and save Markdown
- Git-backed vaults enable changes, commits, history, remote status, pull/push, and AutoGit
- empty vault creation defaults to no Git repo
- explicit Git initialization remains available through the `init_git_repo` command
- adding a remote from a local-only vault initializes Git first, then connects the remote
- the persisted vault registry can carry storage and sync provider metadata without breaking old `vaults.json` files

## Consequences

The app must gate Git features on Git capability instead of blocking the entire shell. A failed Git status read is not the same thing as a local-only vault.

Filesystem-backed cloud folders remain ordinary local vaults. Object storage providers such as S3 or Azure Blob still require a local working copy and a future sync adapter; Grimoire does not edit notes directly inside buckets.

## Alternatives Considered

- Keep blocking non-Git vaults: protects Git features, but rejects valid local-first and cloud-folder workflows.
- Auto-initialize Git for every vault: convenient, but surprising and wrong for users who want a plain folder.
- Add direct cloud APIs as vault roots: tempting, but weaker for offline editing, conflict handling, file watching, and Markdown portability.
