# Chitragupta Grimoire MCP Contract

Last updated: 2026-05-25

This is the stable MCP contract Grimoire needs from Chitragupta. Grimoire owns the Markdown vault and UI. Chitragupta owns memory, recall, wiki projection, graph intelligence, diagnostics, and model routing.

## Current Boundary

Grimoire currently has app-side Chitragupta route truth through the local CLI: it launches `chitragupta ask --stream-json`, parses route/status/error events, and shows provider/model disclosure when the CLI emits it. That is not the same as this MCP contract being ready. Recall, wiki, graph-neighborhood, ingest, diagnostics, and source-backed write suggestions remain contract requirements until Chitragupta exposes the stable tools below in a ready state.

## Required Tools

### `chitragupta_status`

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
  results: ChitraguptaRecallResult[]
  warnings: string[]
}
```

```ts
type ChitraguptaRecallResult = {
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
}
```

### `chitragupta_wiki_list` And `chitragupta_wiki_read`

```ts
chitragupta_wiki_list(args?: {
  projectPath?: string
  vaultPath?: string
  limit?: number
}): ChitraguptaWikiPage[]

chitragupta_wiki_read(args: { id: string }): {
  page: ChitraguptaWikiPage
  markdown: string
  sources: ChitraguptaSourceRef[]
}
```

```ts
type ChitraguptaWikiPage = {
  id: string
  title: string
  kind: 'semantic' | 'procedural' | 'episodic' | 'project' | 'person' | 'decision'
  summary: string
  updatedAt: string
  sourceCount: number
  tags: string[]
}
```

The `markdown` field must be clean Markdown, not UI JSON.

### `chitragupta_graph_neighborhood`

```ts
chitragupta_graph_neighborhood(args: {
  id?: string
  notePath?: string
  projectPath?: string
  depth?: number
  limit?: number
}): {
  nodes: ChitraguptaGraphNode[]
  edges: ChitraguptaGraphEdge[]
}
```

```ts
type ChitraguptaGraphNode = {
  id: string
  label: string
  kind: 'note' | 'memory' | 'concept' | 'person' | 'project' | 'decision' | 'task' | 'session'
  sourcePath?: string
  weight?: number
}

type ChitraguptaGraphEdge = {
  from: string
  to: string
  kind: 'mentions' | 'supports' | 'contradicts' | 'depends_on' | 'derived_from' | 'related_to' | 'supersedes'
  weight?: number
  evidence?: string
}
```

Grimoire will merge these edges with its existing vault wikilink graph.

### `chitragupta_ingest_markdown`

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

Grimoire passes derived Markdown semantics from `@grimoire/markdown-editor`. Chitragupta indexes without rewriting the source note unless explicitly asked.

### `chitragupta_memory_diagnostics`

```ts
chitragupta_memory_diagnostics(args?: {
  projectPath?: string
  vaultPath?: string
  limit?: number
}): {
  stale: ChitraguptaDiagnostic[]
  orphaned: ChitraguptaDiagnostic[]
  contradictions: ChitraguptaDiagnostic[]
  suggestedWrites: ChitraguptaSuggestedWrite[]
}
```

Diagnostics map to the Karpathy-style wiki lint loop:

- stale memory
- orphaned concepts
- contradiction detection
- write-back suggestions

Suggested writes must be Markdown patches or full Markdown blocks, never silent filesystem writes.

## Grimoire Runtime Calls

Startup:

```ts
await call("chitragupta_status", {})

await call("vertical.skill.services", {
  projectPath: "/path/to/grimoire"
})

await call("bridge.bootstrap", {
  verticalId: "grimoire",
  projectPath: "/path/to/grimoire",
  surface: "desktop"
})
```

Active-note recall:

```ts
await call("chitragupta_recall", {
  query: "What matters for this note?",
  projectPath: "/path/to/grimoire",
  vaultPath: "/path/to/vault",
  activeNotePath: "notes/example.md",
  limit: 8,
  includeSources: true
})
```

Markdown ingest:

```ts
await call("chitragupta_ingest_markdown", {
  vaultPath: "/path/to/vault",
  path: "notes/example.md",
  content: markdown,
  frontmatter,
  headings
})
```

## UI Plan After Chitragupta Ships Tools

1. Upgrade the existing Memory lane with live recall, related memories, and source-backed results.
2. Add a Wiki tab for Chitragupta wiki pages, Markdown preview, and save-to-vault.
3. Extend graph with a Vault links / Chitragupta memory edges toggle.
4. Add diagnostics for stale, orphaned, and contradictory memory.
5. Upgrade `/recall`, `/related`, `/memory`, `/crystallize`, and `/diagnose` from placeholders to live actions.

## Grimoire Slice 1

- Memory Ledger records are normal Markdown notes with `type: Memory` and source/confidence/last-seen/expiry/contradiction metadata.
- Locality Firewall is enforced before renderer AI context, Rust Markdown ZIP export, and MCP vault/project tool responses.
- Crystallize currently creates a reviewed local Markdown memory note from the latest AI response. It does not silently patch existing notes.

## Non-Negotiables

- Local-first, with no hidden cloud dependency.
- Stable MCP tool names and JSON shapes.
- Source-backed results wherever possible.
- Clean Markdown output.
- No silent writes into the user's vault.
- Grimoire's vault remains the user-visible source of truth.
- Degraded subsystems return warnings instead of failing the whole MCP server.

## First Milestone

1. `chitragupta_status`
2. stable `chitragupta_recall`
3. `chitragupta_wiki_list`
4. `chitragupta_wiki_read`
5. `chitragupta_graph_neighborhood`

## HTTP Socket Contract (2026-07-16)

Grimoire now talks to the serve daemon directly at `http://127.0.0.1:3141`
(override: `GRIMOIRE_CHITRAGUPTA_SOCKET`). The CLI remains the fallback when
the daemon is unreachable. This section is the live truth for the HTTP
boundary; the older env-var guidance (`GRIMOIRE_CHITRAGUPTA_TOKEN`,
`daemon.api-key`) is superseded.

### Auth (works today — do not break)

- Bearer token, minted per consumer: `chitragupta secret rotate api-key
  --consumer grimoire --store config`. Grimoire stores its copy in the macOS
  Keychain (`app.grimoire.ai-provider-keys` / `chitragupta-socket`); env
  fallback `CHITRAGUPTA_API_KEY`. Never in the repo, never in an .env.
- 401 = unauthenticated, 403 = authenticated but out of scope. Keep these
  distinct — Grimoire's status pill relies on it.

### P0 — needed for a seamless loop

1. **Hot-reload of `apiKeys`** (or `POST /api/auth/refresh-keys`): today a
   freshly rotated key 401s until serve restarts, which breaks one-click
   pairing. Grimoire ships a "waiting for daemon refresh" state as a stopgap.
2. **Project registration for vaults**: Grimoire sends the vault path as
   `projectPath` on every call; unregistered paths 403 ("Project path is not
   allowed on this serve runtime"). Either auto-allow paths for
   `consumer=grimoire` keys or expose registration (CLI `chitragupta project
   allow <path>` or `POST /api/projects`) that Grimoire pairing can call.
3. **Machine-readable error codes**: `{ok:false, error:{code:
   "PROJECT_NOT_ALLOWED", ...}}` instead of prose-only, so Grimoire can offer
   the right fix affordance.
4. **Pinned `/api/chat` response schema**: one canonical text field —
   `{ok, data:{reply, sessionId, route?}}`. Grimoire currently guesses among
   six candidate field names; pin it and the guessing is deleted.
5. **Pinned session summary shape** for `GET /api/sessions`:
   `{id, title, createdAt, updatedAt, messageCount, gist?, sessionLineageKey,
   consumer}` — plus a **`lineageKey` query filter** so per-note lists don't
   fetch-and-filter client-side. Grimoire sets `sessionLineageKey` to the
   vault-relative note path on every chat.

### P1 — big wins

6. **Session gists**: a stored one-line summary per session makes the
   per-note history list actually scannable (requested explicitly).
7. **Streaming chat**: SSE on `/api/chat` (`Accept: text/event-stream`,
   `delta {text}` events, `done {sessionId}`) or the blessed WS route —
   Grimoire will render token-by-token the day it exists.
8. **HTTP context build**: `POST /api/context/build {query, projectPath,
   limit}` matching the CLI `context build --json` output — removes the last
   CLI spawn from the hot path.
9. **Capabilities in `/api/health`**: e.g. `{chat:{stream}, sessions:
   {lineageFilter}, context:{http}, projects:{selfRegister}}` — Grimoire
   feature-detects instead of version-sniffing while the API evolves.

### P2 — later

10. WS push for session/memory updates (live-refresh the past-sessions list).
11. `/api/memory/search` pinned schema for Grimoire's similar-notes surface.
