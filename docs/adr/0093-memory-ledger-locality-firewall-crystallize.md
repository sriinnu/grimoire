---
type: ADR
id: "0093"
title: "Memory Ledger, Locality Firewall, and Crystallize are Markdown-first"
status: active
date: 2026-05-16
---

## Context

Grimoire is becoming a local-first mind OS instead of a notes app with a chat panel. The risky part is not the UI; it is trust. Agent memory must be inspectable, protected notes must not leak through friendly APIs, and AI writeback must not silently mutate the vault.

The app already redacts local-only notes from renderer AI context and excludes protected lanes from ZIP export. MCP vault tools also need the same firewall because external agents can use those tools without touching the UI.

## Decision

Memory Ledger records are normal Markdown notes with `type: Memory` and frontmatter fields such as `source_note`, `confidence`, `last_seen`, `expires_at`, `contradicts`, and `locality`.

Locality Firewall rules apply across renderer AI context, Rust export, and MCP vault/project tools. Dreams, journals, health, therapy, private, and local-only lanes are withheld by default. Any MCP override must be explicit on that one call through `allowLocalOnly`.

Crystallize starts as a reviewed local Markdown write. The AI panel can turn the latest assistant response into a proposed `type: Memory` note under `memory/crystallized/`; Grimoire shows the exact Markdown before creating it. This slice does not silently patch existing notes, frontmatter, backlinks, or tasks.

## Consequences

The vault remains the source of truth. Agent memory is editable and portable because it is Markdown, not an invisible database.

Locality rules now have three implementation surfaces: TypeScript for UI/AI context, Rust for exports, and JavaScript for MCP. Tests must cover all three until a generated shared contract exists.

Crystallize can grow into richer reviewed diffs later, but the first production behavior is intentionally narrow: create a source-backed local memory note after review.

## Alternatives Considered

- Hidden memory database: easier to query, but violates the user's ownership and inspection model.
- Let agents write directly: powerful, but too easy to surprise the user.
- UI-only privacy warnings: comforting theater if MCP/export paths can still leak protected notes.
