---
type: ADR
id: "0102"
title: "Sidebar Spotlight search over open vault text"
status: active
date: 2026-06-01
supersedes: "0009"
---

## Context

ADR-0009 removed QMD semantic indexing and kept keyword-only search to avoid a
bundled search binary, indexing state, and release-signing complexity. Since
then Grimoire's vault scanner has grown beyond markdown-only notes: project
vaults can include editable text files such as TypeScript, Rust, YAML, JSON,
plain text, shell scripts, and configuration files.

The left sidebar also lacked a visible search entry point. Search existed behind
shortcuts, but that is too hidden for a public product and too narrow for
project-style vaults.

## Decision

**Keep search keyword-only and index-free, but make the full search panel a
sidebar Spotlight surface that searches every available open vault path across
markdown and editable text files.**

`search_vault` continues to scan files directly with `walkdir`. It now includes
files classified as `markdown` or `text`, skips hidden/dependency/build-output
directories through the same vault scan exclusion model, and keeps binary files
out of search. The React search hook aggregates available open vault scopes,
merges results by score, and lets cross-vault selections switch to the target
vault before opening the file.

## Options Considered

- **Option A (chosen): Sidebar Spotlight over keyword search** - visible,
  local-only, works for project vaults, keeps zero-index startup. Downside:
  substring search is still not fuzzy or semantic.
- **Option B: Note-only search launcher** - smaller UI change, but it would keep
  project text files invisible and make the public claim weaker.
- **Option C: Reintroduce semantic indexing** - richer recall, but it reopens the
  operational and release complexity ADR-0009 removed.

## Consequences

- The sidebar has a visible search launcher in both expanded and collapsed
  states.
- Full search covers markdown notes plus editable project text/docs.
- Search remains local-only and rebuild-free.
- Large code-project vaults depend on the exclusion list staying conservative;
  dependency/build directories must not be searched by default.
- Semantic search remains a future additive layer, not a replacement for the
  file-backed keyword surface.
