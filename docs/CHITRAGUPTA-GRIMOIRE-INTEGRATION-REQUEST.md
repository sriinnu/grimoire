# Chitragupta Grimoire Integration Request

Last reviewed by Grimoire: 2026-06-01

This is the handoff note between Grimoire and Chitragupta. Grimoire has app-side UI and CLI route/status disclosure for Chitragupta, but the Chitragupta MCP memory/wiki/graph product surface is not public-ready until the stable Grimoire-facing facade below is implemented and re-verified.

The exact MCP tool shapes live in [Chitragupta Grimoire MCP Contract](CHITRAGUPTA-GRIMOIRE-MCP-CONTRACT.md).

## Current Verdict

Grimoire is app-bridge-ready for local CLI chat and route disclosure, but the MCP memory integration is still contract-gated.

Already in place:

- Grimoire has a local capability model and UI placeholders for memory, recall, wiki, graph, ingest, and diagnostics.
- `.mcp.json` points to Chitragupta MCP in agent mode.
- Chitragupta is listed as an AI agent option in Grimoire.
- Grimoire has MCP vault tools for notes, project docs, project boards, project tasks, and wikilink graph.
- Project/folder views are Markdown-first and can show docs, task signals, generated `BOARD.md`, and project graph.
- Shared Markdown semantics extract headings/frontmatter and power the right-sidebar outline/TOC/YAML view.
- The right sidebar has a Chitragupta-ready Memory lane for active-note context and pending capability count.
- The shared slash-command package includes `/recall`, `/related`, `/memory`, `/crystallize`, and `/diagnose` placeholders.
- Earlier local validation recorded basic Chitragupta project memory append from
  this repo; public readiness does not rely on that path until the MCP facade is
  re-verified.

Missing for automatic enablement:

- Chitragupta must auto-discover Grimoire through `chitragupta.vertical.json` and `SKILL.md`.
- Chitragupta still needs a stable Grimoire-facing MCP facade for the tools in the contract doc.
- Some requested services map to existing internal Chitragupta building blocks, but they are not all exposed with Grimoire's exact tool names and response shapes yet.
- Live context/recall may still report degraded or unavailable until that facade lands.

Correct product boundary:

- Grimoire provides clean note context and renders returned results.
- Chitragupta remembers, recalls, routes, heals, and explains what happened.
- Grimoire must not learn Chitragupta internals.

## Vertical Handshake

Grimoire now exposes a machine-readable root handshake:

- `chitragupta.vertical.json`
- `SKILL.md`

The vertical config identifies Grimoire as an `app-consumer`, points Chitragupta at this handoff, and requests:

- `memory.append`
- `memory.search`
- `recall.unified`
- `wiki.list`
- `wiki.read`
- `graph.neighborhood`
- `diagnostics.memory`
- `ingest.markdown`

The skill file tells Chitragupta what Grimoire can provide:

- active note path, title, headings, frontmatter, outgoing links, and related notes
- vault path and project path
- Markdown content and derived document semantics for ingest
- graph context from wikilinks
- slash-command intent from `/recall`, `/related`, `/memory`, `/crystallize`, and `/diagnose`

## Product Goal

Grimoire should feel like:

- a Markdown editor that writes clean files to disk
- an Obsidian-style local wiki and graph
- a Mem-style recall surface
- a local AI workbench where agents can ask Chitragupta what matters

Chitragupta should be the deeper memory engine underneath:

- raw observations
- durable memory/wiki pages
- semantic/procedural consolidation
- graph edges
- stale/orphan/contradiction diagnostics
- recall with citations back to local notes or memory records

## Runtime Flow

Startup:

1. Grimoire asks Chitragupta for status.
2. Grimoire asks for available vertical services.
3. Grimoire bootstraps or resumes a Grimoire session.
4. Chitragupta returns capabilities and warnings instead of failing the whole bridge when a subsystem is degraded.

Active-note recall:

1. Grimoire sends project path, vault path, active note path, headings, frontmatter, outgoing links, and local related-note context.
2. Chitragupta returns source-backed recall results with confidence, citations, and warnings.
3. Grimoire renders those results in the Memory lane.

Markdown ingest:

1. Grimoire sends Markdown content plus derived semantics.
2. Chitragupta indexes without mutating the source note.
3. Any suggested write-back returns as Markdown patches or blocks for user approval.

## Required Chitragupta Tools

The first stable facade should expose:

- `chitragupta_status`
- `chitragupta_recall`
- `chitragupta_wiki_list`
- `chitragupta_wiki_read`
- `chitragupta_graph_neighborhood`
- `chitragupta_ingest_markdown`
- `chitragupta_memory_diagnostics`

See [Chitragupta Grimoire MCP Contract](CHITRAGUPTA-GRIMOIRE-MCP-CONTRACT.md) for exact JSON shapes.

## Grimoire UI Plan After The Facade Lands

1. Upgrade the right-sidebar Memory lane:
   - live recall input
   - related memories for active note
   - source-backed results

2. Add a Wiki tab:
   - list Chitragupta wiki pages
   - preview Markdown
   - save selected page into vault as `.md`

3. Extend graph:
   - toggle Vault links / Chitragupta memory edges
   - show mixed note-memory-concept graph

4. Add diagnostics:
   - stale/orphan/contradiction list
   - write suggested note or insert suggestion actions

5. Upgrade slash commands from Markdown placeholders to live actions:
   - `/recall`
   - `/related`
   - `/memory`
   - `/crystallize`
   - `/diagnose`

## Non-Negotiables

- Local-first.
- No hidden cloud dependency.
- Stable MCP tool names and JSON shapes.
- Source-backed results wherever possible.
- Clean Markdown output.
- No silent writes into the user's vault.
- Chitragupta memory can be richer than Grimoire, but Grimoire's vault remains the user-visible source of truth.
- Degraded subsystems must report warnings, not fail the whole MCP server.

## First Milestone

Implement these first on the Chitragupta side:

1. `chitragupta_status`
2. stable `chitragupta_recall`
3. `chitragupta_wiki_list`
4. `chitragupta_wiki_read`
5. `chitragupta_graph_neighborhood`

Once those are stable, Grimoire can connect the existing Memory lane and slash commands to live Chitragupta results, then build the mixed graph UI.
