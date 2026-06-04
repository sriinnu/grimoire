# Grimoire

Grimoire is a local-first Markdown vault app with review-gated AI surfaces. The
visible source of truth is the user's vault: Markdown files, frontmatter,
wikilinks, folders, attachments, and optional Git history.

## What Grimoire Can Provide To Chitragupta

- project path and active vault path
- active note path, title, headings, frontmatter, body text, and outgoing links
- derived Markdown semantics for ingest
- wikilink/backlink graph context from the vault
- user intent from explicit UI actions or slash commands such as `/recall`,
  `/related`, `/memory`, `/crystallize`, and `/diagnose`
- current bridge/readiness context when Chitragupta surfaces are degraded or
  unavailable

## What Chitragupta May Return

- source-backed recall with paths, durable ids, confidence, and warnings
- clean Markdown wiki or memory pages with provenance
- graph neighborhoods that Grimoire can merge with vault wikilinks
- diagnostics for stale, duplicated, orphaned, contradictory, or unindexed memory
- Markdown proposals or diffs for the user to review before any vault write
- model/provider routing and readiness details when AI work is needed

## Hard Rules

- Markdown is the user-visible source of truth.
- Chitragupta may index, recall, diagnose, and propose; it must not silently
  rewrite notes, frontmatter, backlinks, tasks, or attachments.
- No hidden writes. Every mutation must come back through Grimoire as a reviewed
  proposal, diff, or explicit user action.
- Recall must be source-backed. If sources are missing, stale, partial, or
  degraded, return that warning instead of pretending certainty.
- MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write
  suggestions are readiness-gated. Do not describe them as public-complete unless
  current readiness proof says so.
- Local/private lanes stay local unless the user explicitly chooses an external
  handoff.
