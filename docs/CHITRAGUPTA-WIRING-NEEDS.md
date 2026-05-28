# Chitragupta Wiring Needs For Grimoire

Last updated: 2026-05-26

This is the practical wiring request. Grimoire can already see the Chitragupta MCP server, but the current exposed tools in this session are only health/bash level. To make Grimoire's second-brain UI real, Chitragupta needs to expose stable memory tools with the shapes below.

## Current Status

- MCP reachable: yes.
- Exposed now: health/status style tools plus Grimoire-scoped `chitragupta_memory_search`, `chitragupta_recall`, and `chitragupta_status`.
- Product state now: degraded, not ready. `chitragupta_status` is visible but can report a stopped daemon, empty capabilities, or product-surface warnings.
- Missing for Grimoire product work: ready status capabilities, wiki, graph, ingest, diagnostics, write-back suggestions, and the clean product recall response shape below.
- Current exposed tools still do not satisfy this contract: Grimoire needs ready `chitragupta_status`, clean args-object recall, wiki, graph-neighborhood, ingest, and diagnostics. Health-only or degraded exposure must be treated as blocked, not ready.
- Fixed 2026-05-20: the Codex Chitragupta proxy now resolves the launching workspace when a stale legacy project default is present. Fresh Grimoire-scoped memory search and recall no longer return project access denied.
- Fixed 2026-05-21: `chitragupta ask --vertical grimoire` now attaches as product consumer `grimoire` under the generic app-consumer runtime profile instead of failing with "Unknown vertical 'grimoire'".
- Open 2026-05-21: the app/CLI path is green, but the Codex-session MCP tool can still close its transport while stale stdio proxy children point at a legacy local project. The launcher needs cleanup so health tools survive across workspaces.
- Fixed 2026-05-23: Grimoire now ships a discoverable `skills/grimoire/SKILL.md` manifest, and the local Codex MCP config includes that skill path. A fresh Chitragupta registry returns Pancha Kosha health for `skills_health("grimoire")`.
- Fixed 2026-05-23: the stale local Codex MCP target-project override was removed so future proxy launches fall back to the launching workspace cwd instead of a pinned legacy project.
- Fixed 2026-05-23: Grimoire has a local-only `.codex/config.toml` MCP override with `cwd` and `CHITRAGUPTA_MCP_PROJECT` pinned to this repo; `.codex/` is ignored so machine-specific paths do not leave disk.
- Observed 2026-05-25: a no-file route probe resolved Chitragupta to a local Ollama route, then failed while loading the local model; this is a local model-load failure, not a Google/Gemini route from Grimoire.
- Fixed 2026-05-25: Grimoire now treats provider overrides as Chitragupta-only, labels unset routes as CLI-chosen, parses route metadata from `--stream-json`, and runs Codex/Chitragupta with closed stdin, concurrent stderr draining, and idle timeouts.
- Boundary 2026-05-25: Grimoire's app proof is CLI stream parsing and route disclosure. MCP recall/wiki/graph/ingest/diagnostics are still this contract's missing product surface, not current Grimoire-ready behavior.
- Fixed 2026-05-26: Grimoire's bottom-bar AI menu and Settings AI Agents section now state that Chitragupta chat health is the local CLI route while MCP memory, recall, wiki, graph, and diagnostics are separate readiness checks.
- Fixed 2026-05-28: Settings now shows a dedicated Chitragupta MCP memory contract card. Live memory lanes remain local-ledger only until recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions are ready.
- Observed 2026-05-25: the shared HTTP MCP host can answer `http://127.0.0.1:3001/mcp` after starting `chitragupta-mcp --streamable-http --port 3001 --agent --project /Users/srinivaspendela/Sriinnu/Personal/grimoire` with Node 22 and restarting the daemon. Manual `chitragupta_status` succeeds only when the tool call includes `consumer: "grimoire"` and `surface: "grimoire.mcp"`; `projectPath` alone still falls through to a generic `mcp` surface and reports empty/stopped capability state.
- Fixed 2026-05-28: fresh Codex MCP launches can use `scripts/chitragupta-codex-mcp-proxy.mjs`, a secret-free wrapper that reads the Codex-local daemon bridge token from `CHITRAGUPTA_HOME`, pins the Node 22 path ahead of Node 25, starts the Codex-local daemon/streamable HTTP host when missing, and forwards stdio to that host. A local stdio smoke initialized the proxy and listed 18 tools.
- Open 2026-05-25: Codex's in-session `mcp__chitragupta__*` transport can remain `Transport closed` even after the shared HTTP host and daemon are healthy. Treat that as host-session state until Codex respawns the MCP client; do not use it to mark Grimoire app-side Chitragupta as broken.
- Still open: the current Codex MCP transport may remain closed after stale proxy cleanup until the host respawns the Chitragupta server.
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
