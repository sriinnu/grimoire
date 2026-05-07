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

## Vault Portability

Vault portability has three separate contracts:

- import source: converts another app export into a Grimoire vault
- export target: writes a portable copy of a Grimoire vault
- storage provider: describes where the local-first vault lives and how it syncs

Git is one storage provider. iCloud Drive and Google Drive Desktop are filesystem-backed providers. S3 and Azure Blob are object-storage providers that need a local working copy plus a sync adapter.

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
- dates, journal blocks, and tasks inserted as durable markdown
- weather snapshot callouts inserted by command
- canvas and handwriting attachments referenced by preview image plus `grimoire-canvas` metadata fences

Editors may render this richly, but they must preserve markdown intent.

## Canvas Attachment

A canvas attachment is an editable drawing or handwriting artifact referenced from a note.

The note stores:

- a Markdown image preview, usually `attachments/<kind>-<yyyy-mm-dd-hhmmss>.png`
- a fenced `grimoire-canvas` metadata block
- a source attachment path, usually `attachments/<kind>-<yyyy-mm-dd-hhmmss>.grimoire-canvas.json`

Tauri renders this with a pointer-event canvas surface that supports pen, highlighter, eraser, and hand/pan tools. Saving writes the editable JSON source and refreshes the preview PNG. Apple support surfaces can render the same contract with PencilKit, because the vault remains the source of truth.

## Type Icon

A Type icon is a visual identifier stored on a Type document.

Supported values:

- Phosphor icon name, for example `rocket`
- emoji
- remote image URL
- Tauri asset URL
- `data:image/*` badge from the built-in image picker or SVG/image upload

Renderers must constrain image icons to the requested icon size with containment, so uploaded SVGs with unusual dimensions do not distort sidebars, chips, search rows, or note titles.

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

Editor slash commands are separate from app commands. They live inside the editor surface and produce durable markdown, such as headings, tasks, dates, tables, wikilinks, media, math, templates, or AI-assisted note transforms. Their cross-shell behavior is defined in `docs/MARKDOWN-SEMANTICS-CONTRACT.md`.

Raw editor find/replace is an editor-local contract. `useCodeMirror` owns the `Mod-f` key binding, `RawEditorFindReplacePanel` owns the UI, and `utils/rawEditorFindReplace.ts` owns match calculation so the behavior can be tested without a CodeMirror DOM.

## Editor Mode

The editor has multiple views over the same markdown:

- rich BlockNote mode
- raw CodeMirror mode
- diff mode
- SwiftUI/WebKit support mode for Apple-native experiments

Shared markdown semantics belong in the `MarkdownEditor` Swift package and the Tauri adapter contract: frontmatter splitting, wikilink round-tripping, math placeholders, compact serialization, snippets, and word counts. The Tauri editor remains the primary product surface. SwiftUI/WebKit support surfaces import the package directly when Apple-native integration is worth carrying.

The Tauri adapter facade is `src/utils/markdownSemanticsAdapter.ts`. It is the renderer-side boundary for semantics that must stay aligned with the Swift package.

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
- Chitragupta

Agent rules:

- vault content stays local unless the selected agent sends it elsewhere
- detection should work from realistic macOS/Linux/Windows install paths
- streamed output must preserve reasoning, tool calls, and errors clearly
- agent tools should operate through the same safe vault commands as the app
- model overrides are installation-local and passed as CLI arguments only when set

MCP project tools:

- project docs are discovered from Markdown-first folder scans
- project boards are durable `BOARD.md` files, not hidden app state
- persisted board tasks carry `grimoire-task` ids so agents can update or delete them safely
- generated board rows include task metadata for priority, origin, source file, and source line
- generated scanner tasks use stable ids derived from source context, so saving `BOARD.md` does not create duplicate task signals on the next scan
- TODO/FIXME/HACK/NOTE markers are readable task signals until source edits are explicitly supported
- project graph edges come from Markdown wikilinks so UI and agents share the same relationship model

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
- per-agent model overrides
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
