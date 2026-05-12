# Chitragupta Wiring Needs For Grimoire

Last updated: 2026-05-10

This is the practical wiring request. Grimoire can already see the Chitragupta MCP server, but the current exposed tools in this session are only health/bash level. To make Grimoire's second-brain UI real, Chitragupta needs to expose stable memory tools with the shapes below.

## Current Status

- MCP reachable: yes.
- Available now: health/status style tools.
- Missing for Grimoire product work: recall, wiki, graph, ingest, diagnostics, write-back suggestions.
- Grimoire source of truth remains Markdown files on disk.

## Required MCP Tools

### `chitragupta_status`

Returns daemon readiness and capabilities.

```ts
chitragupta_status(): {
  ok: boolean
  daemon: 'running' | 'stopped' | 'degraded'
  version: string
  databasePath?: string
  capabilities: string[]
  warnings: string[]
}
```

Required capabilities:

- `memory.append`
- `memory.search`
- `recall.unified`
- `wiki.list`
- `wiki.read`
- `graph.neighborhood`
- `diagnostics.memory`
- `ingest.markdown`

### `chitragupta_recall`

Used by the active-note Memory lane and `/recall`.

```ts
chitragupta_recall(args: {
  query: string
  projectPath?: string
  vaultPath?: string
  activeNotePath?: string
  limit?: number
  includeSources?: boolean
}): {
  answer: string
  confidence: number
  results: Array<{
    id: string
    title: string
    kind: 'note' | 'memory' | 'session' | 'day' | 'observation' | 'wiki'
    score: number
    summary: string
    sourcePath?: string
    sourceLine?: number
    createdAt?: string
    updatedAt?: string
    tags?: string[]
  }>
  warnings: string[]
}
```

### `chitragupta_wiki_list` and `chitragupta_wiki_read`

Used by the future Wiki tab and save-to-vault flow.

```ts
chitragupta_wiki_list(args?: {
  projectPath?: string
  vaultPath?: string
  limit?: number
}): Array<{
  id: string
  title: string
  kind: 'semantic' | 'procedural' | 'episodic' | 'project' | 'person' | 'decision'
  summary: string
  updatedAt: string
  sourceCount: number
  tags: string[]
}>

chitragupta_wiki_read(args: { id: string }): {
  page: {
    id: string
    title: string
    kind: string
    summary: string
    updatedAt: string
    sourceCount: number
    tags: string[]
  }
  markdown: string
  sources: Array<{ path: string; line?: number; title?: string }>
}
```

`markdown` must be clean Markdown, not UI JSON.

### `chitragupta_graph_neighborhood`

Used to merge memory edges into Grimoire's existing note graph.

```ts
chitragupta_graph_neighborhood(args: {
  id?: string
  notePath?: string
  projectPath?: string
  vaultPath?: string
  depth?: number
  limit?: number
}): {
  nodes: Array<{
    id: string
    label: string
    kind: 'note' | 'memory' | 'concept' | 'person' | 'project' | 'decision' | 'task' | 'session'
    sourcePath?: string
    weight?: number
  }>
  edges: Array<{
    from: string
    to: string
    kind: 'mentions' | 'supports' | 'contradicts' | 'depends_on' | 'derived_from' | 'related_to' | 'supersedes'
    weight?: number
    evidence?: string
  }>
}
```

### `chitragupta_ingest_markdown`

Called when Grimoire saves or opens notes that should be indexed.

```ts
chitragupta_ingest_markdown(args: {
  vaultPath: string
  path: string
  content: string
  frontmatter?: Record<string, unknown>
  headings?: Array<{ level: number; text: string; slug: string; line: number }>
}): {
  accepted: boolean
  observationIds: string[]
  memoryIds: string[]
  warnings: string[]
}
```

No silent Markdown rewrites from ingest.

### `chitragupta_memory_diagnostics`

Used by `/diagnose` and the second-brain diagnostics panel.

```ts
chitragupta_memory_diagnostics(args?: {
  projectPath?: string
  vaultPath?: string
  limit?: number
}): {
  stale: ChitraguptaDiagnostic[]
  orphaned: ChitraguptaDiagnostic[]
  contradictions: ChitraguptaDiagnostic[]
  suggestedWrites: Array<{
    title: string
    targetPath?: string
    markdown: string
    reason: string
  }>
}
```

Suggested writes must be returned as Markdown proposals. Grimoire will ask the user before writing them.

## Acceptance Tests

- Grimoire can call `chitragupta_status` and see all required capabilities.
- Active-note recall returns source-backed results for a known Markdown note.
- Wiki read returns clean Markdown and source refs.
- Graph neighborhood returns nodes and edges for a known note path.
- Ingest accepts a Markdown note plus headings/frontmatter without mutating the note.
- Diagnostics returns empty arrays instead of failing when there are no findings.

## Non-Negotiables

- Local-first.
- No hidden cloud dependency.
- Stable tool names.
- JSON-compatible outputs only.
- Source-backed answers where possible.
- No silent writes into the vault.
- Degraded subsystems return warnings instead of crashing the MCP call.
