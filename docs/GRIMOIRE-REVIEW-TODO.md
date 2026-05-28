# Grimoire Review Todo

Use this as the live review scratchpad while testing Grimoire.

## Now

- [x] Replace muddy sidebar crop with clean manuscript SVG artwork.
- [x] Render Mermaid class diagram fences, including classDiagram and classDiagram-v2 labels.
- [x] Wrap theme preset card text without horizontal scrollbars.
- [x] Make the AI chat composer a 3-line textarea.
- [x] Add an original animated Rosy sidebar companion.
- [x] Fix bundled Caveat font parity across web and Tauri.
- [x] Allow AI chat follow-up messages while an agent response is active.
- [x] Keep settings appearance changes live while the settings panel is open.
- [x] Fix dark-theme sidebar text contrast.
- [x] Fix sidebar logo/title overlap with macOS traffic-light controls.
- [x] Replace plain editor loading text/skeletons with a centered animated SVG loader.
- [x] Fix local AI edit permissions so Claude/Codex can edit without interactive permission prompts.

## Next

- [ ] Work through the Grimoire Specialness Todo tonight: signature loop, Locality Firewall, Crystallize, UX edges, and theme direction.
- [x] Keep Chitragupta, Woosh, and Tring CLI tracked as private local agent lanes, not public implementation dependencies.
- [x] Make transcription a first-class capture path.
  - [x] Import audio from a local file picker.
  - [x] Route through local Whisper/provider contract first.
  - [x] Create raw transcript and cleaned summary notes.
  - [x] Persist reciprocal transcript/clean-note backlinks.
  - [x] Add in-app audio recording.
  - [x] Add explicit cloud-transcription opt-in before any cloud speech provider can run.
- [ ] Shape Grimoire into an LLM second brain: memory graph, recall, contradictions, source-backed answers, and agent-written durable notes.
- [x] Sweep any remaining old-font surfaces, especially manuscript H3/H4 headings.
- [x] Make emoji and built-in SVG type icons render consistently in sidebar, lists, search, and note cards.
- [x] Render Mermaid fenced blocks as diagrams in read/preview mode with a safe code fallback.
- [x] Keep the right sidebar outline useful for every Markdown note.
- [x] Make wikilinks and document linking feel obvious from editor and slash commands.
- [ ] Tighten canvas launch, pen, eraser, and image attachment flows.
  - [x] Make newly inserted canvas blocks show an explicit first local-save state.
  - [x] Disable inert undo/clear controls until strokes exist.
  - [x] Add image placement inside editable canvases.
  - [x] Store placed canvas images as vault-relative attachment refs, not absolute machine paths.
  - [x] Add ordered vector shape, text, and lasso selection/move layers.
  - [x] Keep images nested inside local-only canvas JSON out of Git, ZIP, static HTML, and object-storage sync.
- [x] Keep importer/exporter work visible: Bear, Day One, local Markdown, Git, iCloud, Google Drive, S3, Azure.
- [x] Keep sidebar artwork visible across all theme presets and short windows.
- [x] Add a Settings surface for import, export, storage, and second-brain lanes.
- [x] Build the first real importer flow: Markdown folder to Grimoire vault with import report.
- [x] Add first app importers: Bear folder/TextBundle, Day One JSON/ZIP, Journey JSON/ZIP.
- [x] Add Apple Journal ZIP/HTML/JSON importer with media copy and local-only import report.
- [x] Add Markdown ZIP import/export as the first portable archive round-trip.
- [x] Add static HTML archive export with local-only exclusions.
- [x] Add first Import Autopsy preview for Markdown folder/Bear imports.
- [x] Add Import Autopsy preview for Markdown ZIP imports.
- [x] Add Import Autopsy preview for Obsidian, Notion ZIP/folder, and Spanda imports.
- [x] Add Import Autopsy preview for Apple Journal, Day One, and Journey imports.
- [x] Upgrade the properties panel quick-add flow: Status, Priority, Tags, Date, Owner, URL, Flag, Icon, and smart input inference.
- [x] Give the bottom status bar a subtle health/pending/error presence tone without adding more visible clutter.
- [x] Add filesystem-backed storage health checks for iCloud Drive and Google Drive Desktop.
- [x] Design the S3/Azure local-working-copy sync adapters.
- [x] Add fixture-backed S3/Azure preview/apply commands with local-only exclusions and sync reports.
- [x] Add Settings actions for S3/Azure local-mirror push preview/apply.
- [x] Add Settings actions for S3/Azure local-mirror pull preview/apply.
- [x] Block S3/Azure local-mirror apply until the user has previewed the exact mirror target and unchanged sync plan.
- [x] Show object-storage preview conflict and local-only paths before apply.
- [x] Stamp object-storage preview/apply reports and Settings cards as local-mirror fixtures so planned S3/Azure cannot be confused with live cloud SDK sync.
- [x] Keep attachments referenced by local-only Markdown out of ZIP export and object-storage mirror sync.
- [x] Keep attachments referenced by local-only Markdown out of Git staging and static HTML export.
- [x] Keep `grimoire-canvas` editable source JSON and preview PNG inside the local-only attachment closure.
- [x] Wire real S3/Azure provider preview/apply adapters behind the same preview/apply contract.
- [ ] Run S3/Azure provider Settings lanes against real provider fixtures and failure states before claiming provider-proven sync.
- [x] Keep local AI agent model/provider selection visible and testable.
- [x] Split native AI launcher modules so permission/model routing stays below the code-size guardrail.
- [x] Move Codex/Chitragupta binary discovery, args, and event mapping out of the main AI launcher module.
- [x] Split the oversized Claude CLI module.
- [x] Split the oversized SettingsPanel into sub-400-line setting section modules.
- [x] Fix collapsed left-column traffic-light overlap: reserve a titlebar-safe top zone so the compact rail logo/actions never sit under macOS window controls.
- [x] Fix editor top-left floating controls: breadcrumb/titlebar owns the top row; the floating insert/control pill needs a stable inset below it.
- [x] Show project ownership in the center note list with a compact folder breadcrumb chip, e.g. `astral / docs / architecture`, plus an optional subtle project color stripe.
- [x] Add first knowledge icon pack entries: Vedas, Shaastras, Puranas, Rishi, Star, Brain, and Second Brain.

## Parking Lot

- [x] Consider transcription cleanup summaries after raw Whisper/local transcript notes.
- [x] Add cloud Whisper only behind explicit user configuration.
- [x] Review darker theme palettes for accessible foreground/background contrast.
  - [x] Route Constellation sidebar, note list, editor, AI panel, Settings, and status bar through shared surface tokens instead of hard-coded color islands.
