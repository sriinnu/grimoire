# Grimoire Active Work

Last updated: 2026-05-10

This file is the working stack for the current Grimoire push. New user requests that are backlog/context should be appended here instead of replacing the current task.

## Current Mission Stack

1. Finish Karya functionality import into Grimoire, then delete Karya once no useful behavior remains.
2. Make project folders Markdown-first, with optional source TODO visibility.
3. Persist project boards/tasks instead of only showing/copying generated board Markdown.
4. Add Grimoire MCP tools for project docs, task CRUD, generated boards, and graph/doc lookup.
5. Keep Chitragupta integrated and visible as a first-class local agent/memory lane.
6. Continue the reusable markdown editor package: slash commands, wikilinks, dates/calendar, graph/wiki, Bear/Mem/Obsidian-grade writing.
7. Keep app polish moving: performance, right-click UX, themes, icons/logo, AI detection, startup reliability.
8. Add vault portability: import from other Markdown apps, export clean archives, and support storage providers beyond Git.
9. Add transcription/voice import: Whisper or local-provider transcription, audio attachments, timestamped Markdown, and cleaned-note output.

## Current Focus: Items 3-7

- 3 Refactor oversized core files so the app can keep moving without turning every change into a merge hazard.
- 4 Finish import/export: Obsidian, Notion, Spanda practice imports, storage health checks, and local-working-copy sync adapters.
- 5 Mature canvas: shapes, text boxes, lasso, image attachments, stroke extraction, and smoother launch/save behavior.
- 6 Sweep themes/fonts: contrast, manuscript font parity, sidebar artwork, live previews, and dark-theme readability.
- 7 Build the second-brain layer: Chitragupta recall/wiki/graph tools, diagnostics, source-backed answers, and durable Markdown write-backs.

## Done In This Push

- Imported Karya's portable project-intelligence behavior into `src/project-intelligence/`.
- Wired folder/project note-list views to show project intelligence.
- Added bounded full-file project scans through existing `get_note_content`.
- Added generated Markdown board copy from folder/project views.
- Added `.mcp.json` with Chitragupta and Pakt MCP servers.
- Added explicit local HTTPS dev mode with ignored local certs: `pnpm dev:https` and `pnpm tauri:https`.
- Verified browser HTTPS mode at `https://localhost:5202/`.
- Added `Save Board` in project intelligence views to persist generated boards as `BOARD.md`.
- Added Grimoire MCP project tools for docs, board read, task CRUD, and wikilink graph.
- Added Markdown-first project workspace search, source-file toggle, live preview, and quick doc creation in folder views.
- Added shared JS/Swift Markdown document semantics for frontmatter, headings, and outline data.
- Added right-sidebar Markdown outline/TOC and YAML state display from shared semantics.
- Added conservative right-sidebar YAML formatter that saves valid frontmatter, preserves unknown keys, and refuses malformed YAML.
- Added right-sidebar generated Markdown TOC insertion/update using a durable `grimoire-toc` block.
- Added project/folder doc-link graph in the project workspace strip.
- Added explicit project task list mode for TODO/FIXME/HACK/NOTE signals in project/folder views.
- Added stable `grimoire-task` metadata to generated project board rows so saved boards do not re-scan themselves as duplicate TODOs.
- Split Vite vault middleware out of `vite.config.ts` to keep config and helper files below the LOC guardrail.
- Split project workspace helper logic out of `ProjectIntelligenceStrip.tsx` to keep the strip below the LOC guardrail before adding more product UI.
- Updated the folder-view behavior test to wait for project scan completion; the old React `act` warning is gone in the focused run.
- Added `docs/CHITRAGUPTA-GRIMOIRE-INTEGRATION-REQUEST.md` as the implementation handoff for Chitragupta's daemon/MCP memory contract.
- Added root `chitragupta.vertical.json` and `SKILL.md` so Chitragupta can auto-discover Grimoire as a vertical.
- Split the exact Chitragupta MCP tool shapes into `docs/CHITRAGUPTA-GRIMOIRE-MCP-CONTRACT.md`.
- Added the first vault portability registry for import sources, export targets, and storage providers.
- Added ADR-0091 and `docs/VAULT-PORTABILITY-ROADMAP.md` for Bear/Day One/Obsidian/Notion import, Markdown export, iCloud/Google Drive, S3, and Azure.
- Added a Chitragupta-ready Memory lane in the right sidebar that shows active-note context, related notes, and pending memory-tool capability count.
- Added reusable Chitragupta memory-context helpers for active-note recall payloads.
- Added package-owned Memory slash commands: `/recall`, `/related`, `/memory`, `/crystallize`, and `/diagnose`.
- Confirmed Markdown math is already implemented through durable inline/display LaTeX round-tripping with JS/Swift parity.
- Added package-owned canvas slash commands for handwritten canvas, whiteboard canvas, and sketch notes.
- Added ADR-0090 for Markdown-durable canvas attachments: editable source JSON plus preview PNG referenced from Markdown.
- Added original cinematic motion direction for Grimoire without copying any studio house style.
- Added shared motion CSS tokens with reduced-motion-safe fallbacks in `src/motion.css`.
- Added the first subtle Chitragupta Memory signal animation in the right sidebar.
- Removed Karya generated/runtime junk: `node_modules`, `.pnpm-store`, `dist`, `*.tsbuildinfo`, `.spanda`, and `karya.db`.
- Added the first real canvas editor surface: pen, highlighter, eraser, hand/pan, colors, stroke sizes, undo/clear, editable JSON source, and PNG preview save.
- Added built-in image badges and SVG/image upload support for custom Type icons.
- Added Spanda-inspired Sadhana slash commands in the shared markdown package and Swift package: practice sessions, panchanga snapshots, japa logs, pranayama logs, and practice prescriptions.
- Moved the canvas editor dialog behind a lazy chunk so handwritten/sketch tooling does not load on startup.
- Moved live canvas Markdown snapshotting out of `SingleEditorView` and off the normal typing serialization path.
- Split the rich editor and secondary app surfaces behind lazy chunks; empty editor state now renders without loading BlockNote.
- Added code-block language auto-detection for common fenced-code content without overriding manual language choices.
- Added image and SVG file previews so vault attachments can be opened directly in the center pane.
- Replaced the AI chat `contenteditable` composer with a stable textarea while preserving wikilink references.
- Added sandboxed HTML previews for `.html`/`.htm` files and standalone HTML documents instead of showing raw tags by default.
- Added static bundled Caveat `@font-face` loading so web and Tauri use the same manuscript font file.
- Added an explicit Settings sidebar appearance preview and preset-driven sidebar surface treatments.
- Added transcription/voice capture to the active product stack.
- Added the first transcription provider contract and Markdown transcript output builder.
- Added the first live Markdown folder importer: Settings opens a folder picker, Rust copies notes/assets into `imports/<source>/`, and the vault gets a visible import report.
- Added app import buttons for Bear, Day One, and Journey plus a Day One/Journey JSON/ZIP-to-Markdown importer.
- Added Markdown ZIP import/export so the vault can round-trip through a portable archive outside the active vault.
- Added a centered animated SVG editor loader for lazy editor startup and note-switch transitions.
- Enhanced the properties panel with a scan-friendly header, broader quick-add slots, and property-name-based add-form type inference.
- Added a bottom-bar presence tone and accessible status summary, then split secondary status-bar controls out of the oversized section file.
- Stabilized Neighborhood-mode note opening so command-click note pivots can await the editor load before Escape history handling.
- Added `docs/CHITRAGUPTA-WIRING-NEEDS.md` with the concrete MCP tools Grimoire needs for real second-brain recall, wiki, graph, ingest, and diagnostics.
- Split local AI agent args, binary discovery, and event mapping into focused modules so `ai_agents.rs` is under the code-size guardrail.
- Added Settings storage health checks that detect whether the active vault lives under iCloud Drive or Google Drive Desktop while keeping S3/Azure marked as planned adapters.

## Next Tasks

- [ ] Add Grimoire local HTTPS dev support.
  - [x] Create or copy local certs into Grimoire.
  - [x] Update `vite.config.ts` to enable HTTPS only when cert files exist and HTTPS mode is requested.
  - [x] Keep normal Tauri dev on HTTP; add explicit `pnpm tauri:https` for HTTPS dev.
  - [x] Verify HTTPS browser mode locally.
  - [ ] Verify Tauri HTTPS mode locally.
- [ ] Persist generated project boards/tasks.
  - [x] Store generated board as a durable Markdown artifact.
  - [x] Track project task status, priority, source file, and source marker.
  - [x] Allow TODO-derived tasks to be saved without duplicating themselves.
  - Allow TODO-derived tasks to update source files directly when explicitly requested.
- [ ] Add MCP tools for the imported project intelligence.
  - [x] List project docs.
  - [x] Read project board.
  - [x] List/create/update/delete project tasks.
  - [x] Return project graph/doc links.
- [ ] Improve project-folder UX.
  - Keep Markdown as the default view.
  - [x] Add explicit source TODO/task mode.
  - [x] Add project file search scoped to Markdown docs first, with an explicit "show source files" expansion.
  - [x] Add project live preview for selected Markdown docs/boards beside or inside the project strip.
  - [x] Add quick actions to create/import docs into the current project folder.
  - [x] Add quick TOC creation for selected Markdown docs.
  - [x] Add doc-link graph view for the selected project/folder.
  - [x] Keep project workspace strip below the code-size guardrail by moving helper logic out.
- [ ] Harden Chitragupta MCP continuity.
  - [x] Write a concrete Chitragupta handoff note describing the daemon/MCP contract Grimoire needs.
  - [x] Write the concrete Grimoire-side MCP wiring request for Chitragupta memory tools.
  - [x] Add root vertical discovery files for Chitragupta.
  - [x] Add a right-sidebar Memory lane as the Grimoire landing zone for Chitragupta recall/wiki/graph data.
  - [x] Add editor slash-command entry points for Chitragupta-backed memory workflows.
  - [x] Add a visible Memory signal so the lane feels alive before backend recall lands.
  - [x] Add per-agent local CLI model overrides for Claude Code, Codex, and Chitragupta.
  - Diagnose why Chitragupta context/unified recall says daemon unavailable.
  - Keep a repo-visible active work file updated even when MCP memory is unavailable.
  - Write project memory whenever the mission stack changes.
- [ ] Refactor oversized native agent modules.
  - [x] Split Codex/Chitragupta binary discovery and discovery tests out of `ai_agents.rs`.
  - [x] Split Codex argument building, prompt assembly, stream event mapping, and error formatting out of `ai_agents.rs`.
  - [x] Split Chitragupta argument building and error formatting out of `ai_agents.rs`.
  - Split `claude_cli.rs` into args, streaming, detection, and tests.
- [ ] Continue markdown editor package depth.
  - Slash commands for headings (`#`, `##`, etc.) with friendly labels.
  - Date/week/calendar commands.
  - Wikilink creation/linking/autocomplete.
  - TOC, graph/wiki, callouts, tables, tasks, math, Mermaid, cleanup/summarize.
  - [x] Confirm math formulas are durable Markdown and shared across Tauri/Swift.
  - [x] Add canvas/handwritten-note command contract with Markdown attachment references.
  - [x] Add Chitragupta memory workflow placeholders to the shared slash-command catalog.
  - [x] Add right-sidebar outline/TOC for the active Markdown document.
  - [x] Add frontmatter/YAML formatting and validation that preserves clean Markdown on disk.
  - [x] Build the actual canvas editor surface that opens `grimoire-canvas` blocks and writes source JSON + preview PNG.
  - [x] Add portable Sadhana/practice commands derived from the useful Spanda workflow model.
  - Add shape tools, text boxes, lasso select, and stroke-to-Markdown extraction.
  - [x] Auto-detect code block languages from unlabeled code fences.
  - [x] Render standalone HTML files/documents as sandboxed previews with raw mode still available.
  - [x] Fix AI chat textbox typing duplication/regression; typing must not repeat words or replay composition input.
  - Keep Swift package and JS package aligned through fixtures.
- [ ] Improve custom Type creation/customization.
  - [x] Add predefined image badges for new and existing custom Types.
  - [x] Allow users to upload SVG/image badges that adapt to current icon size.
  - Add optional per-type icon size/crop controls if real vault usage shows it is needed.
- [ ] Add original cinematic motion polish.
  - [x] Document animation direction as Grimoire-native cinematic storybook motion, not a copied studio style.
  - [x] Add CSS motion tokens and reduced-motion behavior.
  - [x] Add the first Memory lane animation.
  - Map the CSS tokens to SwiftUI animation constants for Apple shell surfaces.
  - Apply tokenized transitions to command palette, inspector panels, graph focus, and note navigation.
- [ ] Continue performance hardening.
  - [x] Lazy-load Mermaid rendering, canvas editor surfaces, rich editor, and secondary app surfaces.
  - [x] Avoid full-editor Markdown serialization during normal typing.
  - [x] Keep empty editor startup out of the BlockNote import path.
  - Split the remaining app-shell chunk by moving static Tauri/plugin imports behind feature boundaries.
  - Add a startup budget test for heavyweight editor/graph/canvas imports.
- [ ] Polish asset and preview parity.
  - [x] Show images and SVGs as first-class vault previews.
  - [x] Load the Caveat manuscript font through the bundled CSS asset path for Tauri/web parity.
  - [x] Make the left sidebar appearance selectable and previewable through Settings theme presets.
  - Verify Tauri dev visually uses the same Caveat face as the browser build.
- [ ] Add vault portability.
  - [x] Define import/export/storage providers in a shared app registry.
  - [x] Document the import/export/storage split and storage-provider safety model.
  - [x] Add Settings UI for provider readiness and import/export/second-brain lanes.
  - [x] Add actionable import/export buttons once the first wizard is implemented.
  - [x] Build Markdown folder import wizard.
  - [x] Build Markdown ZIP import/export.
  - [x] Build Bear import through the Markdown/TextBundle folder path.
  - [x] Build Day One JSON/ZIP import adapter.
  - [x] Build Journey JSON/ZIP import adapter.
  - Build Obsidian import adapter.
  - Build Notion import adapter.
  - Build Spanda practice/session import adapter.
  - [x] Add iCloud Drive and Google Drive Desktop vault health checks.
  - Design S3 and Azure Blob sync adapters around a local working copy.
- [ ] Add transcription and voice-note workflow.
  - [x] Define provider contract for Whisper/local transcription backends.
  - [x] Add command-palette audio picker and "Transcribe Audio..." action.
  - [x] Save timestamped transcript Markdown beside the source audio.
  - [x] Support local/offline provider first through the Local Whisper CLI path.
  - Add cleaned-note summary beside the raw transcript.
  - Cloud Whisper only when explicitly configured.

## Parking Lot

- Decide whether Karya certs/config should be deleted after Grimoire HTTPS/MCP config is settled.
- Delete the rest of Karya only after persisted project tasks and MCP tools exist in Grimoire.
