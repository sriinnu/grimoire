# Abstractions

This document names the durable ideas in Grimoire. Code can move; these concepts should stay recognizable.

## Vault

A vault is a local folder of markdown files and assets. It may be a Git repo, but Git is not required for the vault to be readable.

Vault responsibilities:

- hold notes as `.md`
- hold attachments and media
- hold saved views
- hold type documents and vault-local display config
- remain meaningful outside Grimoire

Non-responsibilities:

- store app window state
- store local machine credentials
- depend on a hosted Grimoire service

## Note

A note is one markdown file plus YAML frontmatter.

Current renderer shape: `VaultEntry`.

Important fields:

- `path`, `filename`, `title`
- `isA` / type
- `aliases`
- `relationships`
- `outgoingLinks`
- `icon`, `color`
- `status`, `archived`, `favorite`, `organized`
- `wordCount`, `snippet`, dates

The `VaultEntry` is an index record, not a second source of truth. If it conflicts with the markdown file, reload from disk.

## Markdown Body

The markdown body is the durable content surface.

Supported product expectations:

- headings
- lists
- code blocks
- wikilinks
- inline and display math
- tables where the editor supports them
- images and vault attachments
- weather snapshot callouts inserted by command

Editors may render this richly, but they must preserve markdown intent.

## Frontmatter

Frontmatter is structured metadata. It should stay readable by a human and an AI agent.

Examples:

```yaml
---
type: Project
status: active
related_to:
  - "[[Launch Plan]]"
icon: rocket
color: green
---
```

Rules:

- Prefer stable snake_case keys on disk.
- Humanize labels in the UI.
- Use underscore-prefixed keys for app-owned system metadata.
- Write through frontmatter helpers instead of ad hoc string replacement.
- Keep relationship values as wikilink-compatible strings where possible.

## Type

A type is a note whose own type is `Type`. Types are lenses, not schemas.

Types can define:

- sidebar label
- icon
- color
- default sort
- visible properties
- template hints

Types do not enforce required fields. The product should help users organize without turning notes into brittle database rows.

## Relationship

A relationship is a frontmatter field whose values point at other notes.

Examples:

- `belongs_to`
- `related_to`
- `has`
- user-defined relationship keys

Relationships are rendered in the Inspector, Note List Neighborhood mode, and Knowledge Graph.

## Wikilink

A wikilink is an inline markdown reference:

```markdown
See [[Project Alpha]] or [[projects/alpha|Alpha]].
```

Resolution should accept useful human forms:

- exact title
- alias
- filename stem
- path suffix
- humanized filename

Broken links should be visible and recoverable, not silently discarded.

## Neighborhood

Neighborhood mode is the local relationship view for a selected note.

It pins the source note and groups nearby notes by:

- outgoing relationships
- inverse relationships
- backlinks / wikilinks

The Knowledge Graph uses the same mental model visually: the user can inspect the active note's neighborhood or widen to the vault graph.

## View

A view is a saved note-list definition. It is stored in the vault as a `.yml` file and can define filters, sorting, and visible columns.

Views should reuse the same filtering/sorting primitives as built-in lists.

## Search

Search currently means keyword search over local files and indexed note metadata.

Search surfaces:

- quick open
- note list filtering
- full search panel
- graph filter
- future semantic search

Semantic search should be additive. It can suggest related notes and clusters, but markdown and frontmatter remain the durable structure.

## Graph

The graph is a derived projection over notes.

Data builder:

- `utils/noteGraph.ts` creates nodes and edges from `VaultEntry[]`.

Display builder:

- `utils/graphDisplay.ts` scopes, caps, filters, counts, lays out, and colors the graph.

Edge kinds:

- `relationship`: frontmatter relationship
- `body-link`: markdown wikilink

The graph must stay inspectable without a graph database. If a graph database ever appears, it is an index, not authority.

## Appearance

Appearance has three layers:

- theme mode: light or dark
- theme preset: Classic, Manuscript, Graphite, Studio, Folio, Nocturne
- editor font: System, Serif, Mono, Readable, Literary, Compact

Contract:

- TypeScript normalizes supported values.
- Rust settings sanitize persisted values.
- CSS consumes root attributes and semantic variables.
- localStorage mirrors the values before native settings load to avoid startup flash.

New UI must use semantic tokens instead of hardcoded palette choices.

## Command

A command is an action with one identity across:

- keyboard shortcut
- command palette
- native macOS menu
- Linux React menu
- test bridge

Command IDs live in the app command catalog. New commands should be registered once and routed through the shared dispatcher.

## Editor Mode

The editor has multiple views over the same markdown:

- rich BlockNote mode
- raw CodeMirror mode
- diff mode
- SwiftUI mode on macOS and iOS

Shared markdown semantics belong in the `MarkdownEditor` Swift package: frontmatter splitting, wikilink round-tripping, math placeholders, compact serialization, snippets, and word counts. The macOS/iOS SwiftUI apps import that package directly. Non-Apple Tauri surfaces keep platform adapters with parity tests until a native bridge is worth carrying.

Do not implement markdown semantics separately per mode unless the behavior is genuinely mode-specific.

## Weather Snapshot

Weather is explicit journal context, not background tracking.

Flow:

1. User runs `Insert Weather Snapshot`.
2. User enters a location and unit preference.
3. Renderer calls Open-Meteo geocoding and forecast APIs.
4. A markdown block is appended through the normal editor update path.

No automatic location read. No silent network call.

## AI Agent

An AI agent is a local CLI process plus optional MCP tools.

Current agents:

- Claude Code
- Codex CLI

Agent rules:

- vault content stays local unless the selected agent sends it elsewhere
- detection should work from realistic macOS/Linux/Windows install paths
- streamed output must preserve reasoning, tool calls, and errors clearly
- agent tools should operate through the same safe vault commands as the app

## Settings

Settings split by portability:

Vault-local:

- type display
- views
- vault guidance
- content structure

Installation-local:

- appearance
- language
- window state
- update channel
- agent preference
- telemetry consent

## Native Platform Surface

Native is an abstraction boundary, not a replacement goal.

Use native macOS code when it materially improves:

- text editing fidelity
- find/replace
- file watching
- window/menu behavior
- QuickLook/export
- packaging reliability

Keep the vault, command IDs, markdown semantics, and settings contracts shared.
