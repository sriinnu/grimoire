---
name: grimoire
description: >
  Chitragupta product skill for Grimoire, the local-first Markdown mind OS
  where agent workflows, vault memory, journals, dreams, and user-owned context
  stay inspectable as files.
license: AGPL-3.0-or-later
version: "1.0.0"
author: grimoire
tags: [grimoire, markdown, vault, local-first, memory, journal, agent]
source:
  type: manual
whenToUse:
  - Grimoire asks for source-backed recall, wiki, graph, ingest, diagnostics, or crystallized Markdown proposals.
  - An agent needs the Grimoire locality rules before reading, exporting, syncing, or summarizing vault context.
  - A product surface needs to explain vaults, private journals, dreams, or agent-of-agents memory behavior.
whenNotToUse:
  - Do not use for hidden rewrites, silent vault writes, or raw private-note export.
  - Do not use when the request is unrelated to Grimoire or its local Markdown vaults.
permissions:
  filesystem:
    read: project
    write: project
  network:
    allowed: false
  localOnly: true
inputSchema:
  type: object
  additionalProperties: true
outputSchema:
  type: object
  additionalProperties: true
---

# Grimoire Product Skill

Grimoire is a local-first Markdown editor, wiki, graph, journal, dream catcher,
and agent workbench. Chitragupta may help recall, connect, and synthesize
context, but the human owns the memory and the visible source of truth stays in
Markdown files.

## Operating Rules

- Private lanes such as journals, diaries, dreams, and local-only vault notes
  never leave the user's machine unless the user explicitly opts in.
- Git is optional. A vault can be a plain local folder, iCloud Drive, Google
  Drive Desktop, S3/Azure-backed working copy, or a Git-backed workspace.
- Chitragupta may index and recall; it must not silently rewrite notes.
- Suggested writes must come back as Markdown proposals or diffs for Grimoire
  to show, review, and accept.
- Recall answers should cite source notes, source paths, or durable memory ids
  whenever possible.
- Degraded subsystems should return warnings and partial results instead of
  crashing the Grimoire bridge.

## Capabilities

### recall / vault-context

Return source-backed context for an active Grimoire note, command, or question.

**Parameters:**
- `query` (string, required): User question or recall intent.
- `projectPath` (string): Grimoire project path.
- `vaultPath` (string): Active vault root.
- `activeNotePath` (string): Active Markdown note.
- `limit` (number, default 10): Maximum result count.

### inspect / locality

Classify what context can leave a vault, what must stay local, and what needs
explicit user confirmation before sync, export, or agent handoff.

**Parameters:**
- `vaultPath` (string, required): Active vault root.
- `path` (string): Note or folder path being inspected.
- `operation` (string): Intended action such as agent, export, sync, or ingest.

### ingest / markdown

Accept Markdown, frontmatter, headings, and wikilinks for indexing without
mutating the underlying note.

**Parameters:**
- `vaultPath` (string, required): Active vault root.
- `path` (string, required): Markdown path inside the vault.
- `content` (string, required): Raw Markdown content.
- `frontmatter` (object): Parsed note frontmatter.
- `headings` (array): Parsed heading outline.

### propose / crystallize

Convert chat, research, or recall results into inspectable Markdown proposals
that Grimoire can show as a diff before writing.

**Parameters:**
- `intent` (string, required): What the user wants to make durable.
- `sources` (array): Source-backed notes, memories, or session references.
- `targetPath` (string): Suggested Markdown destination.

### diagnose / memory

Report stale, orphaned, duplicated, contradictory, or unindexed memory surfaces
as structured diagnostics and Markdown-safe suggestions.

**Parameters:**
- `projectPath` (string): Grimoire project path.
- `vaultPath` (string): Active vault root.
- `limit` (number, default 20): Maximum diagnostic count.

## Examples

### Source-backed active-note recall

- **input**: `{"query":"What was I circling around last month?","vaultPath":"/Users/sriinnu/Grimoire","activeNotePath":"Journal/2026-05-22.md","limit":5}`
- **output**: Return a concise answer with source paths and confidence; never invent invisible memory.

### Locality firewall check

- **input**: `{"vaultPath":"/Users/sriinnu/Grimoire","path":"Dreams/2026-05-22.md","operation":"agent"}`
- **output**: Mark as local-only unless the user explicitly overrides the dream lane policy.

### Crystallize research into Markdown

- **input**: `{"intent":"Save accepted UI review findings","targetPath":"Research/UI Review.md","sources":[{"path":"Research/UI Review Notes.md"}]}`
- **output**: Return proposed Markdown and reasons; Grimoire owns the final write.

## Anti-Patterns

- Do not bypass Grimoire's Locality Firewall because a cloud model is available.
- Do not treat Git as required for vault creation, opening, search, or saving.
- Do not sync or export journals, dreams, private diaries, or local-only files by default.
- Do not return prose that claims source support without source paths or warnings.
- Do not mutate frontmatter, backlinks, tasks, or note bodies during ingest.
