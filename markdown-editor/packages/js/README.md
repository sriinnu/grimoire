# Grimoire Markdown Editor

Reusable markdown editor building blocks for Grimoire-family apps.

This package owns the non-Apple React/BlockNote editor catalog: slash commands,
markdown-safe insertion actions, date helpers, and reusable templates. The app
imports these pieces instead of keeping the editor behavior inside `src/`.

Apple-native apps use the sibling Swift package at `markdown-editor/packages/swift` for
shared markdown semantics. Both packages follow the same markdown contract in
`docs/MARKDOWN-SEMANTICS-CONTRACT.md`.

## Entry Points

- `@grimoire/markdown-editor`: platform-neutral constants and reference mapping.
- `@grimoire/markdown-editor/react`: React/BlockNote editor component and slash command catalog.
- `@grimoire/markdown-editor/math`: shared custom math block type constants.

## Build

```bash
pnpm --filter @grimoire/markdown-editor build
pnpm --filter @grimoire/markdown-editor-baseline build
```

## Current Slash Catalog

- Structure and media commands inherited from BlockNote are annotated with
  Grimoire groups, aliases, and markdown-durability copy.
- Grimoire commands add local dates, daily links, due tasks, note mentions,
  wikilinks, collections/tags, links, tables, callouts, footnotes, source
  blocks, math, Mermaid, frontmatter/property blocks, picked-date placeholders,
  weekly/monthly calendars, weekly/monthly reviews, mood/energy check-ins,
  task rollover, timeline entries, weather placeholders, templates, cleanup, summaries, action extraction,
  wikilink creation, continuation prompts, related context, AI prompt blocks,
  maps of content, backlink reviews, graph nodes, link maps, database tables,
  kanban boards, LLM research notes, and prompt labs.
- Commands that require Grimoire-specific schema nodes fall back to portable
  markdown text when a host app has not registered those nodes.

## Reference Targets

- Mem-like low-friction commands: dates, note mentions, collections/tags,
  templates, clean-up prompts, and related context.
- Bear-like durable markdown: headings, lists, todos, links, wikilinks,
  footnotes, code blocks, tables, and plain-text portability.
- Sensefold-like package boundary: package-owned primitives and grouping,
  app-owned context for templates, recents, file pickers, and live AI actions.
