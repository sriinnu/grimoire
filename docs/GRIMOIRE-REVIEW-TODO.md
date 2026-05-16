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
- [ ] Keep Chitragupta, Woosh, and Tring CLI tracked as private local agent lanes, not public implementation dependencies.
- [ ] Make transcription a first-class capture path: record/import audio, local Whisper/provider routing, transcript note, summary note, backlinks.
- [ ] Shape Grimoire into an LLM second brain: memory graph, recall, contradictions, source-backed answers, and agent-written durable notes.
- [ ] Sweep any remaining old-font surfaces, especially manuscript H3/H4 headings.
- [ ] Make emoji and built-in SVG type icons render consistently in sidebar, lists, search, and note cards.
- [ ] Render Mermaid fenced blocks as diagrams in read/preview mode with a safe code fallback.
- [ ] Keep the right sidebar outline useful for every Markdown note.
- [ ] Make wikilinks and document linking feel obvious from editor and slash commands.
- [ ] Tighten canvas launch, pen, eraser, and image attachment flows.
- [x] Keep importer/exporter work visible: Bear, Day One, local Markdown, Git, iCloud, Google Drive, S3, Azure.
- [x] Keep sidebar artwork visible across all theme presets and short windows.
- [x] Add a Settings surface for import, export, storage, and second-brain lanes.
- [x] Build the first real importer flow: Markdown folder to Grimoire vault with import report.
- [x] Add first app importers: Bear folder/TextBundle, Day One JSON/ZIP, Journey JSON/ZIP.
- [x] Add Markdown ZIP import/export as the first portable archive round-trip.
- [x] Upgrade the properties panel quick-add flow: Status, Priority, Tags, Date, Owner, URL, Flag, Icon, and smart input inference.
- [x] Give the bottom status bar a subtle health/pending/error presence tone without adding more visible clutter.
- [x] Add filesystem-backed storage health checks for iCloud Drive and Google Drive Desktop.
- [ ] Design the S3/Azure local-working-copy sync adapters.
- [ ] Keep local AI agent model/provider selection visible and testable.
- [x] Split native AI launcher modules so permission/model routing stays below the code-size guardrail.
- [x] Move Codex/Chitragupta binary discovery, args, and event mapping out of the main AI launcher module.
- [ ] Split the oversized Claude CLI module.
- [ ] Split the oversized SettingsPanel into sub-400-line setting section modules.

## Parking Lot

- [ ] Consider transcription cleanup summaries after raw Whisper/local transcript notes.
- [ ] Add cloud Whisper only behind explicit user configuration.
- [ ] Review darker theme palettes for accessible foreground/background contrast.
