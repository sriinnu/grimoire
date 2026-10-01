# Chitragupta Grimoire MCP Contract

Last updated: 2026-09-29

This is the stable MCP contract Grimoire needs from Chitragupta. Grimoire owns the Markdown vault and UI. Chitragupta owns memory, recall, wiki projection, graph intelligence, diagnostics, and model routing.

## Current Boundary

Grimoire source now routes native chat and sessions through the shared `chitragupta vertical` connector described below, retaining provider/model disclosure from its reply. Installed-app and live-runtime verification remain separate. That is not the same as this MCP contract being ready. Recall, wiki, graph-neighborhood, ingest, diagnostics, and source-backed write suggestions remain contract requirements until Chitragupta exposes the stable tools below in a ready state.

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

## HTTP and Shared Connector Contract (2026-09-29)

Grimoire source uses the shared CLI connector for its Chitragupta chat and
session requests. Chitragupta owns the HTTP authentication, proof keys,
encrypted credential custody, exact workspace grant, and session bootstrap.
The default origin remains `http://127.0.0.1:3141`, configurable with
`GRIMOIRE_CHITRAGUPTA_SOCKET`; this connector slice accepts loopback origins.
The previous direct bearer-token/`ask` fallback and stdout key-rotation flow
are superseded. A reachable health endpoint or saved token is not readiness.

These are source contracts, not a claim about installed binaries or running
services. This change does not prove the separate MCP tools above are ready.

### Pairing and workspace approval

Open **Chitragupta Hub → Devices → Connect an app**, enter `grimoire`, then use
its visible six-digit code in **Grimoire Settings → Local AI**. Alternatively,
paste its invitation link or import its QR image (PNG/JPEG/WebP, up to 16 MB
and 16 million pixels). Image decoding stays local; no camera, mobile or remote
transport is implied. Both forms use the same short-lived, single-use app
challenge; Grimoire clears the submitted proof and never persists it. Hub's
authenticated operator endpoint `POST /api/operator/app-pairing {app}` creates a purpose-bound
app challenge; it cannot enroll a Hub/browser identity. The menubar can open
Hub. The existing terminal six-digit pairing code remains a CLI compatibility
path.

```text
chitragupta vertical connect grimoire --json
chitragupta vertical status grimoire --json
chitragupta vertical request grimoire --json
```

Other local subprocess apps can run `chitragupta vertical init <app> --output
<new-directory> --json` to generate a runnable Node 22+ sample with the shared
compiled adapter and contract declarations. The parent directory must exist;
reserved app identities, symlinked paths and existing outputs are refused.
The generated sample needs no npm dependencies and stores no credentials.

All inputs travel as JSON on stdin, never as secret-bearing arguments. Common
fields are `{contractVersion:1, baseUrl, projectPath}`; Grimoire canonicalizes
its selected vault before invocation. Missing/unavailable vaults report `PROJECT_REQUIRED`.
The native bridge bounds the entire subprocess exchange, including stdin and
stdout completion, to 30 seconds for connection/status and 300 seconds for
requests. A wrapper exiting while its descendants retain a pipe cannot leave
the UI waiting indefinitely. Timeout never triggers automatic replay.

Connect optionally accepts either `pairingCode` or `pairingInvitation`, plus
`reconnect` and `requestApproval`. Invitation URLs are bounded to 4096 bytes
and checked for the exact app, configured loopback origin, version and expiry.
Ordinary Connect reuses credentials. Status has no pairing or grant-creation
side effects. **Pair again** is an explicit `reconnect:true` action with a fresh
code or invitation to reauthenticate the retained device; history is preserved.
A revoked device cannot be resurrected this way. **Request access again**
explicitly supplies `requestApproval:true` for a denied/revoked/expired workspace grant; it does not grant access itself.

Success is `{contractVersion:1,ok:true,data:{contractVersion:1,state,projectPath,requestId?,reason?,chatReady?,nextAction?,manifest}}`.
States are `pairing_required`, `approval_required`, `ready`, `denied`, `revoked`,
`expired`, `busy`, and `renewal_indeterminate`; optional `reason` is `pairing`
or `workspace`. `ready` means
workspace access is connected, not that a model/session is hot. Grimoire shows
**Connected to this vault**, keeping optional `chatReady` separate. Native
Grimoire adds its own `selectedVaultPath` to the renderer projection so a
canonical-path receipt cannot accidentally update another selected vault.

Failures use `{contractVersion:1,ok:false,error:{code,message,retryable,retryAfterMs?,requestId?}}` and a nonzero exit. Grimoire
fails closed, exposes only safe diagnostics, and never falls back to legacy
credentials after a rejection. Device proof keys and reusable bearer tokens do not appear in stdout
or the renderer. The earlier direct HTTP design is superseded; key rotation,
automatic project allowance, and manual service restarts are not this connection workflow.

### Chat and session requests

Request adds `{operation,params}` to the common input and returns
`{contractVersion:1,ok:true,data:<operation result>}`:

| Operation | Params | Result used by Grimoire |
| --- | --- | --- |
| `chat` | Serialized chat request: `message`, optional `sessionId`, `title`, `provider`, `model`, and vault-relative `sessionLineageKey` | Reply text, session ID, provider/model route |
| `sessions.list` | `{lineageKey?}` | `{sessions:[...]}` from the scoped index, including optional `connector.pendingRequestId` |
| `sessions.get` | `{sessionId}` | Owned session transcript and optional `connector.pendingRequestId` |
| `chat.acknowledge` | `{sessionId,requestId}` | `{sessionId,acknowledgedRequestId}` after exact marker and ownership validation |

History refreshes after a Chitragupta chat completes or fails. **Refresh history**
is also available when the list is empty. Pending requests appear first, then
newest sessions; **Show all sessions** makes every older transcript reachable.

The connector supplies authoritative app/device/workspace identity rather
than trusting identity fields in chat params. A projected note lineage is a
UI association, not daemon session authority. Session continuation hints in
Grimoire are scoped by origin, canonical vault, and note. Pairing renewal
keeps the retained device and continuation history. **Recover connection**
reconciles `RENEWAL_INDETERMINATE` using the existing durable renewal request.
If that recovery fails, **Use a fresh code or invitation** explicitly reauthenticates
the retained device; it never resends chat.
`BUSY` permits a later manual check; no mutation is retried automatically.

`CHAT_INDETERMINATE` requires review of past-session history. If the transcript
has `connector.pendingRequestId`, Grimoire offers **Allow a new message**.
This explicit acknowledgement clears only the verified pending marker. It
never resends the old request or declares that it completed. Ordinary errors,
checks, and navigation do not acknowledge requests automatically; asynchronous
transcript/recovery results are discarded after vault or note changes.
