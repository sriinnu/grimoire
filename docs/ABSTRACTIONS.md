# Abstractions

This document names the durable ideas in Grimoire. Code can move; these concepts should stay recognizable.

## Vault

A vault is a local-first knowledge space backed by a folder of markdown files and assets. The app can track multiple vaults; each vault owns its storage location, content types, saved views, and optional sync/versioning settings. It may be a Git repo, but Git is not required for the vault to be readable.

Vault responsibilities:

- hold notes as `.md`
- hold attachments and media
- hold saved views
- hold type documents and vault-local display config
- contain any mix of notes, journals, dreams, transcripts, and user-defined types
- remain meaningful outside Grimoire

Non-responsibilities:

- store app window state
- store local machine credentials
- depend on a hosted Grimoire service

## Dashboard

The dashboard is the default vault surface. It is not a marketing home page; it is the daily assistant loop over the current local vault.

It shows:

- quick capture for notes, journals, dreams, tasks, memory, and `/ask`
- open-loop counts by type and total
- private journal and dream prompts
- Time Loom activity by local day, type, coarse status, and private counts
- Daily Thread guidance that turns Time Loom and Dream Forge counts into one local next action
- one quiet Attention Mode next action
- memory queue status
- reviewed Crystallize loop status
- recent vault-context notes
- locality and sync badges

Dashboard capture writes normal Markdown notes with readable frontmatter. `/ask` routes into the AI panel instead of creating a note and builds a shared ask context package for the dashboard preview, queued AI prompt, Context Capsule, and Agent Council. Exact app-owned Daily Thread Crystallize prompts carry a typed `crystallize-memory` intent so downstream AI surfaces know this is review-before-write Markdown memory work instead of inferring from prose. Recent non-private Markdown references become visible local context and recent dashboard re-entry rows; Dream, Journal, Memory, private-path, and local-only frontmatter references stay in protected review/prompt lanes or withheld counts without showing protected titles or paths. If every recent item is protected, the Recent Notes panel shows only a held-protected count instead of implying the vault is empty. Durable AI output still goes through Crystallize.

Provider-bound prompt drafts are a Locality Firewall boundary. Composer sends, dashboard `/ask`, inline wikilink sends, and graph Council handoffs share one sanitizer that withholds protected wikilink labels, keeps public references canonical, and leaves protected context as policy markers instead of provider-bound titles, paths, bodies, or exact protected counts.

Crystallize is review-first. The AI panel shows the context, Council, and review state before any durable write. Before it writes a `type: Memory` note under `memory/crystallized/`, the dialog shows a source-safe runway for source count, Locality Firewall state, ledger contract, editable diff size, and local Markdown landing, then editable Markdown plus explicit typed hunks for file creation, ledger frontmatter, source backlinks, ledger contract, memory body text, active-note appends, and any checklist tasks preserved from the response. Dashboard `/ask` source labels survive into `source_note`, optional `source_notes`, and the Source Links section, while protected withheld counts do not become written labels. Source-safe Agent Council synthesis packets can enter the same dialog as `source: "Agent Council"` Memory proposals with their Handoff Gate and safe source labels intact; accepted Council memories also write machine-readable `handoff_*` frontmatter for ready lanes, private-gated lanes, unavailable lanes, source count, and a boolean local-hold flag without exact protected counts. Protected/policy-only Council packets expose no source labels and remain blocked from durable writes. The generated Markdown includes Source Links, a `## Ledger Contract` section, `memory_status`, `memory_review_state`, `memory_source_count`, `expires_at`, `contradicted_by`, `memory_version`, and `reviewed_at` so accepted memory starts inspectable and can age or be contradicted without hidden state. The dashboard reads `crystallized: true` plus `reviewed_at` as closed-loop metadata instead of adding accepted Crystallize notes back into the Memory review queue. When the active editor content is available and the note is not protected by the Locality Firewall, the review can also append an editable `## Crystallized Follow-up` block through the normal local note save path.

Memory Ledger records stay human-editable after creation. The Inspector can open the underlying Markdown memory note, update confidence, expiry, and contradiction frontmatter, and stamp `memory_version` plus `reviewed_at` so durable memories show their review state without becoming a hidden database. Council-created Memory records surface their source-safe `handoff_*` frontmatter as a quiet ledger chip, so the user can see whether the accepted memory came from a review-gated Council packet without storing exact protected-held counts. The Inspector also derives a metadata-only audit queue for expired, expiring, contradicted, stale, and unreviewed memories; it opens the memory note through normal navigation instead of creating hidden review state. Ledger row, badge, and audit state colors are theme-owned neutral/proposed/verified/warning/danger materials, not hardcoded utility islands.

The Locality Firewall is a product surface, not just a filter. Settings summarizes the current vault's protected and vault-context notes, explains whether protection came from frontmatter, note type, or path, and states the agent/export/sync rule before anything leaves the local working copy.

The Agent Council is the visible agent-of-agents surface. The first implementation is a compact AI-panel strip that names Claude Code, Codex, Chitragupta, local search, vault graph, import/export context, dashboard ask context, Woosh, and Tring CLI, then shows health, permission, stance, source-safe contribution, inspectable evidence rows, clickable safe source badges, synthesis copy, disagreement/friction signals, a current-pass brief with scope/deliverable/safety posture, and a four-step workflow rail: intake, Council pass, synthesis, and review. Local Search evidence comes from active notes, dashboard or graph ask packages, linked context, and Memory Ledger references. Vault Graph evidence comes from source-safe neighbor nodes and edge manifests, not only graph counts. Chitragupta status is deliberately split: chat can be ready through the local CLI route while MCP memory, recall, wiki, graph, and diagnostics remain separate readiness checks. A source-safe synthesis can be crystallized only by opening the normal review dialog; the Council never writes memory invisibly. Protected context blocks intake rather than pretending the Council has the note. Private lane outputs stay approval-gated and private lane internals are not exposed.

Red-Team My Plan is the local critique pass before agent handoff or durable memory writes. The AI panel derives product, code, execution, UX, privacy, and evidence findings from the active note content and metadata, but it returns category-level findings and next actions rather than note excerpts, titles, paths, or raw private status text. The review dialog converts those sanitized findings into checklist Markdown for inspection only; it does not write files or start an agent/export/sync action.

Context Capsules are preview-first agent packages. The AI panel shows the selected active note, linked notes, open-tab context, note-list scope, graph edge count, rules, and local-only exclusions before an agent handoff. The review dialog turns that sanitized preview into read-only Markdown with source labels, rules, project-map counts, exclusions, and a handoff checklist. Dashboard asks with a typed Daily Thread Crystallize intent show that review-before-write Markdown-memory target in both the capsule card and Markdown package preview instead of burying it in prose. A capsule is not a hidden prompt cache, agent handoff, exported file, or write until the user explicitly asks for that.

Dream Forge is the private dream/journal intelligence surface. The dashboard implementation is metadata-first: it counts protected Dream and Journal notes, shows private-safe recency, and summarizes frontmatter or relationship signals such as symbols, emotional weather, and recurring people. It does not read note bodies, show dream titles, call cloud services, or export dream content.

Time Loom is the dashboard's temporal graph preview. It groups recent Markdown activity by local day and type, shows only coarse status buckets, and counts local-only events through the Locality Firewall without returning protected titles, paths, snippets, custom protected type labels, or body-derived content. Mobile capture drafts enter Time Loom as metadata-only counts using their `captured_at` chronology for unscheduled captures; scheduled mobile captures count as both calendar and mobile activity, while device class, capture source, titles, paths, and body text stay out of the temporal surface. Task and Todo due frontmatter enters as task counts and due-date placement only; task titles, project labels, paths, and raw due-key names do not leave the builder. Daily Thread uses those count-only Time Loom lanes plus Dream Forge rhythm counts to suggest one local action, such as reviewing private captures, opening the dream lane, or starting a source-safe Crystallize ask. The Crystallize action seeds `/ask` with a review-before-write memory proposal prompt, visible ask-context preview, and structured Daily Thread intent; it does not auto-write memory or expose private labels as provider context.

Memory Ledger audit pressure also enters Time Loom as metadata only. Expired, expiring, contradicted, stale, or unreviewed Memory notes render as `Memory review` counts; reviewed memories render as `Memory` counts. Time Loom and Daily Thread may show that review pressure exists, but not memory titles, paths, snippets, contradiction labels, source links, provider/device markers, or local-only field values. Dashboard `/ask` plans keep the same Locality Firewall rule, so Daily Thread Crystallize packages can carry public references while protected Memory records stay withheld as policy counts.

Attention Mode is the dashboard's local focus assistant. It picks one next action from vault metadata such as conflicts, memory queue, pending mobile capture review, unresolved open-loop count, active-note drift, recent context-switch drift, journal/dream freshness, pending local changes, reviewed Crystallize memory, and calm recent-thread states that can move into Crystallize review. It is intentionally quiet: no cloud inference, no body analysis, no private title/path prompt stuffing, and no nagging streak system.

Mobile Capture Drafts are the first iPhone/iPad companion contract. A mobile capture is not hidden app state; it becomes a vault-relative Markdown draft with local frontmatter, a V1 schema marker, a stable `mobile_capture_id`, review metadata, source device/source kind, and a Files-provider storage hint. Journal, Dream, and Memory captures start in protected lanes (`journals/mobile`, `dreams/mobile`, and `memory/mobile-inbox`) with `egress: blocked` so mobile capture can sync through a user-owned provider folder without becoming agent/export context by default. Draft filenames, H1s, and frontmatter titles use neutral kind/date identifiers until review; private body text stays only in the Markdown body. Voice, camera, transcript, and Pencil assets are modeled as a local attachment manifest: Markdown shows safe filenames and review checkboxes, while full device paths and checksums stay out of the body/frontmatter. Every draft carries a visible review gate (`review_required`, blocked agent/export context, local-until-review sync context, and pending review outcome) plus a Markdown checklist before it can become durable memory or source context. The dashboard review queue uses a small privacy-safe item (`path`, coarse lane, review state, and capture timestamp) instead of carrying full `VaultEntry` titles/snippets/bodies through the queue. Accepted, merged, moved, discarded, or reviewed outcomes graduate out of that queue; blocked outcomes stay visible as a review action without exposing why through private text. The Inspector has the owner-facing Mobile Review action gate for pending or blocked captures; Accept, Merge, Move, Block, and Discard write only Markdown frontmatter review metadata, and do not export, sync, or send agent context. The dashboard only surfaces mobile drafts through counts, review state, a review action, and Time Loom mobile counts; it does not expose mobile draft titles, paths, device/source values, attachment paths, checksums, or bodies.

## Vault Template

A vault template is a creation-time seed for local Markdown Type definitions. It is not a hosted workspace and does not make Git required.

Current templates include Blank, Journal, Dreams, Project, Research, Personal OS, Reading, People, Work Log, and Creative Studio.

Templates may seed Type notes such as `journal.md`, `dream.md`, `task.md`, or `memory.md`. The files are ordinary Markdown and remain editable by the user.

Create Vault must preview the write before it happens. The creation plan names the selected template, local folder path, storage provider, Git on/off state, and privacy rule. Desktop sync choices such as iCloud Drive and Google Drive Desktop are described as local folders; Grimoire does not store cloud credentials for them.

## Vault Portability

Vault portability has three separate contracts:

- import source: converts another app export into a Grimoire vault
- export target: writes a portable copy of a Grimoire vault
- storage provider: describes where the local-first vault lives
- sync/versioning provider: describes optional history, remote sync, and conflict behavior

Git is the first live sync/versioning provider. It is optional and per-vault: the registry can store `syncProvider: none` for a folder that has `.git`, and Grimoire must then behave as local-only until the user turns Git back on. Local folders, iCloud Drive, Google Drive Desktop, and other desktop sync clients are filesystem-backed storage providers: Grimoire creates and edits a normal local vault folder, can prove the folder is locally readable, and the sync client moves bytes afterward. S3 and Azure Blob are object-storage providers that need a local working copy plus a sync adapter.

The settings UI surfaces these lanes as readiness signals. It must not imply that planned object-storage adapters are live until they can sync a local working copy without placing credentials in the vault. Desktop-folder proof for iCloud Drive and Google Drive Desktop is deliberately local only: active vault path, provider folder shape, readability, and an explicit "no credentials stored" report. Object-storage adapter contracts live beside the portability registry: the native prototype exercises bidirectional preview/apply against a local mirror, Settings exposes that prototype as explicit local-mirror push and pull actions, and S3/Azure have separate read-only live preflights that prove provider reachability without moving files. S3 and Azure also have Settings-visible provider preview/apply lanes. They use transient provider fields, store the exact preview target with the preview signature, and apply only that reviewed target even if the draft fields change afterward. Neither provider is provider-proven until the Settings lanes are run against real provider failure states. S3 credentials come from the local AWS chain; Azure login remains in the local Azure CLI. None of those draft values are persisted. Real provider adapters must keep the same local-machine credentials, local-only exclusions, exact preview-signature apply gate, redacted proof reports, and Markdown-safe conflict artifacts before moving from planned to ready.

The Markdown folder importer is the first live import source. Its preview/autopsy path counts planned notes, assets, skips, and the destination folder without writing to the vault. Settings keeps only the latest preview in React memory as a compact Import Autopsy timeline; it is not persisted, sent to agents, or used as telemetry, and full machine paths are shortened for display. Markdown ZIP preview extracts into a temporary workspace, counts unsafe ZIP entries as skipped, and reuses that same no-write planner. The import path copies importable notes and attachments under `imports/<source-folder>/`, leaves the source untouched, skips hidden local config/cert/mockup lanes, and writes a visible local-only Markdown import report into the imported root. Progress import variants preserve the same skipped-count policy as preview/import so cancellable imports do not hide protected local-only inputs.

Apple Journal, Day One, and Journey imports convert recognized ZIP/HTML/JSON exports into `Journal` Markdown notes under `imports/<app-export>/`. Those journal adapters now share the no-write Import Autopsy preview contract before import. Bear imports reuse the Markdown folder path because Bear can export Markdown/TextBundle content directly. Obsidian import preserves Markdown vault structure while skipping app runtime config. Notion Markdown import accepts ZIP and folder exports, cleans page IDs from filenames, and records source metadata. Spanda import converts sessions into local-only `Sadhana` Markdown notes with source fields kept for auditability. Obsidian, Notion, and Spanda also share the no-write Import Autopsy preview contract before import, including skipped counts for unsafe ZIP traversal entries. Import reports are local-only because they can contain machine paths. Markdown ZIP import/export provides a safe portable archive round-trip, and static HTML export provides a read-only browsable archive. ZIP export writes through a same-folder temporary archive before replacing the target. Both export paths exclude local-only Markdown and attachments referenced only from local-only notes; object storage remains a sync-adapter problem, not a direct editing surface.

Portability Capsules are local export artifacts generated from the same Locality Firewall inventory. JSON snapshots are pretty-printed and agent-friendly: vault-relative paths only, UTF-8 text inline, binary assets base64 encoded, and withheld rows with reasons. SQLite snapshots are read-optimized local `.sqlite` files with metadata, file, withheld, and locality-proof tables. Neither format becomes the live vault or a hidden source of truth; Markdown on disk remains authoritative. Reversible JSON/SQLite import still needs its own preview/apply proof before capsule round-trip is complete.

## Note

A note is one markdown file plus YAML frontmatter.

Current renderer shape: `VaultEntry`.

Important fields include `path`, `filename`, `title`, `isA`, aliases, relationships, outgoing links, icon/color, status, archive/favorite/organized flags, word count, snippet, and dates.

The `VaultEntry` is an index record, not a second source of truth. If it conflicts with the markdown file, reload from disk.

The Inspector may derive Living Frontmatter hints from the current note and local vault index. These hints can point out missing schema fields, stale active status, possible duplicate concepts, or wikilinks that could become relationship fields, but they are read-only until the user explicitly edits Markdown/frontmatter.

## Markdown Body

The markdown body is the durable content surface.

Supported product expectations include headings, lists, code blocks, Spelllinks (`[[note]]` Markdown wikilinks), inline/display math, tables, images, vault attachments, dates, journal blocks, tasks, weather snapshot callouts, canvas/handwriting attachments, and audio transcripts.

Editors may render this richly, but they must preserve markdown intent.

## Transcript Note

A transcript note is generated from an audio file through an explicit user action. Audio can come from a local file picker or the in-app recorder. App-recorded microphone captures are saved under `Private/attachments/recordings/`, which is a local-only vault lane. Grimoire also creates a sibling clean note locally from the same transcript text; no cloud summarization is implied. Cloud-capable speech providers are blocked unless Settings has an explicit cloud transcription opt-in and the native command receives `allowCloud: true`.

The note stores:

- `type: Transcript` frontmatter
- the source audio path
- the transcription provider, such as `local_whisper`
- a timestamped Markdown transcript when the provider returns segments

The sibling clean note stores `locality: local`, links back to the raw transcript with a wikilink, and contains deterministic summary/action sections beside clean prose. The raw transcript links to that clean note too, so normal Markdown backlinks can connect them. The raw audio remains a private attachment for app recordings or an external file for picker imports. Grimoire owns the Markdown transcript and clean note, not a hidden speech database.

## Canvas Attachment

A canvas attachment is an editable drawing or handwriting artifact referenced from a note.

The note stores:

- a Markdown image preview, usually `attachments/<kind>-<yyyy-mm-dd-hhmmss>.png`
- a fenced `grimoire-canvas` metadata block
- a source attachment path, usually `attachments/<kind>-<yyyy-mm-dd-hhmmss>.grimoire-canvas.json`

Tauri renders this with a pointer-event canvas surface that supports pen, highlighter, eraser, hand/pan, shape, text, lasso, and placed image tools. Images are copied into vault attachments and stored inside the editable canvas JSON as vault-relative paths so the source stays portable and does not leak absolute machine paths. Drawable layers keep explicit order in JSON so undo, render, and lasso movement follow the user's creation sequence. Saving writes the editable JSON source and refreshes the preview PNG. Apple support surfaces can render the same contract with PencilKit, because the vault remains the source of truth.

## Type Icon

A Type icon is a visual identifier stored on a Type document.

Supported values:

- Phosphor icon name, for example `rocket`
- emoji
- remote image URL
- Tauri asset URL
- `data:image/*` badge from the built-in image picker or SVG/image upload

Renderers must constrain image icons to the requested icon size with containment, so uploaded SVGs with unusual dimensions do not distort sidebars, chips, search rows, or note titles.

## Sidebar Column

The left sidebar has two app-local presentations:

- full column: complete navigation tree with sections, folders, views, favorites, and artwork
- compact rail: 68px icon navigation for fast switching between primary filters

The compact rail is presentation state, not vault state. It persists to local app storage because it describes this installation's workspace preference, while section/folder/type data still comes from the vault.

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
- optional field guidance through `required_fields`, `required`, `fields`, or `_list_properties_display`

Types do not enforce required fields. They may ask for fields, and Living Frontmatter can turn that Markdown-owned guidance into Inspector hints on notes of the same type. The product should help users organize without turning notes into brittle database rows.

## Relationship

A relationship is a frontmatter field whose values point at other notes.

Examples:

- `belongs_to`
- `related_to`
- `has`
- user-defined relationship keys

Relationships are rendered in the Inspector, Note List Neighborhood mode, and Knowledge Graph.

## Spelllink

A Spelllink is Grimoire's user-facing name for an inline Markdown wikilink:

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
- backlinks / Spelllinks

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
- `components/GraphCanvas.tsx` owns the SVG node surface, selected-node state styling, degree badges, type badges, and source-safe agent-package HUD.
- `components/GraphInsightPanel.tsx` owns the selected-node detail card, connector summary, graph-side Council lanes, and Agent Council handoff controls.
- `utils/graphCouncilPrompt.ts` builds the source-safe prompt and note references for graph-originated Agent Council asks.

Edge kinds:

- `relationship`: frontmatter relationship
- `body-link`: markdown wikilink

The graph must stay inspectable without a graph database. If a graph database ever appears, it is an index, not authority.

Graph-to-agent handoff must pass through the Locality Firewall. Public selected nodes can queue an Agent Council prompt with source references. Protected selected nodes can still be opened locally, but the Council action is blocked and no protected title/path/body enters the prompt queue. The graph-side Council lanes show which lanes stay local/private and which source-safe handoff lanes are blocked before any prompt leaves the graph surface.

## Appearance

Appearance has three layers:

- theme mode: light or dark
- theme preset: Nocturne Constellation, Daylight Atelier, Living Archive, Nocturne, Retro Terminal
- editor font: System, Serif, Mono, Readable, Literary, Compact, Handwritten
- font roles: UI, editor body, monospace, display headings, sidebar labels
- local theme pack: a validated JSON override stored in app-local browser storage and never written into the vault
- theme-pack typography: optional safe CSS font stacks for UI, editor body/list text, monospace/code, display headings, and labels
- theme-pack density: compact, comfortable, or spacious runtime spacing for panels, dashboard cards, note-list chrome, and workspace rhythm
- theme-pack motion: calm, standard, or expressive runtime timing for shared motion primitives while preserving reduced-motion overrides
- theme-pack code blocks: plain, notebook, or terminal treatment shared by editor code blocks and AI Markdown previews
- theme-pack headings: graph, manuscript, system, or terminal treatment for the live editor heading structure
- theme-pack metadata strip: badges, quiet, or terminal treatment plus visible metadata-field selection for the editor note strip
- theme-pack visuals: graph style (`constellation`, `ledger`, `terminal`) and canvas style (`paper`, `blueprint`, `terminal`) for graph maps, handoff HUDs, and Markdown-backed drawing surfaces
- theme-pack modal and portability surfaces: dialogs, command palette, quick open, global search, sandboxed HTML previews, import/export lanes, Import Autopsy, and object-storage previews share theme-owned material, status, radius, shadow, and density tokens

Contract:

- TypeScript normalizes supported values.
- preset metadata lives in `src/themes/presets.json` and must match the supported preset IDs.
- `fontConfig.ts` maps theme, editor choices, and local theme-pack typography to font roles and bundled font assets.
- `themeDefinition.ts` maps theme-pack code block treatment, heading style, metadata-strip style/fields, density, motion, and graph/canvas visual styles to root attributes plus CSS variables consumed by editor, dashboard, note-list, AI Markdown, graph, canvas, shared dialog/palette surfaces, sandboxed HTML previews, and shared motion surfaces.
- Rust settings sanitize persisted values.
- CSS consumes root attributes and semantic variables.
- localStorage mirrors the values before native settings load to avoid startup flash.
- Settings can import/export theme-pack JSON locally; dev hot reload watches `.grimoire-local/theme-pack.json`, which is gitignored, and Settings can manually reload that file while tuning a pack.

New UI must use semantic tokens instead of hardcoded palette choices or raw font stacks.

## Command

A command is an action with one identity across:

- keyboard shortcut
- command palette
- native macOS menu
- Linux React menu
- test bridge

Command IDs live in the app command catalog. New commands should be registered once and routed through the shared dispatcher.

Editor slash commands are separate from app commands. They live inside the editor surface and produce durable markdown, such as headings, tasks, dates, tables, Spelllinks, media, math, templates, or AI-assisted note transforms. Their cross-shell behavior is defined in `docs/MARKDOWN-SEMANTICS-CONTRACT.md`.

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

## Editor Navigator

The editor navigator is a local tool over the active Markdown buffer, not a vault-wide search index.

It has two modes:

- search: line-level matches with previews, using the same raw-editor match semantics
- table of contents: headings parsed through the shared Markdown semantics adapter

The composer bar hosts the navigator beside the prompt affordance. Its note tools must stay usable without a live agent, and opening the prompt still routes through the configured local agent panel rather than inventing a second chat surface.

## Local Insight Surface

The Inspector can show a local heuristic insight surface for the active note.

It may summarize the first readable sentences, show frontmatter/checklist key points, map linked concepts from relationships and Spelllinks, and display recent edit activity. These are transparent derivations from `VaultEntry` plus current note content; they are not remote inference, hidden embeddings, or proof that an agent is watching.

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
- provider/model route disclosure is visible in the AI panel and added to the agent system prompt; if the CLI route only says default, the agent must say the exact model is not disclosed instead of guessing

Private local lanes:

- Chitragupta
- Woosh
- Tring CLI

These lanes are tracked as private-local capabilities only. Grimoire may show health, permissions, and user-approved outputs, but repo paths, prompts, credentials, configs, and implementation details stay local and are not public app dependencies.

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
- menu bar icon visibility
- update channel
- agent preference
- per-agent model overrides
- portability provider readiness
- telemetry consent

## Native Platform Surface

Native is an abstraction boundary, not a replacement goal.

Use native macOS code when it materially improves:

- text editing fidelity
- find/replace
- file watching
- window/menu behavior
- menu bar quick actions
- QuickLook/export
- packaging reliability

Keep the vault, command IDs, markdown semantics, and settings contracts shared.
