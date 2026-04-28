# Enhancements

This is the working roadmap. It folds in current Grimoire needs plus lessons from the local `.tmp` reference repos without turning Grimoire into a copy of either project.

## Already Landed Locally

- New Grimoire logo and generated app icons
- Knowledge graph command and modal
- Graph local/vault scope
- Graph relationship vs wikilink edge filters
- Type-colored graph nodes and motion polish
- Weather snapshot insertion command for journal notes
- Appearance presets: Classic, Manuscript, Graphite, Studio, Folio, Nocturne
- Editor font choices: System, Serif, Mono, Readable, Literary, Compact
- Rust settings sanitizer support for the appearance contract

## Ship Next

### Editor Find And Replace

Goal: make editor search feel native and reliable.

- Add `Find in Note` command separate from `Find in Vault`
- Keep `Cmd+F` contract clear across note list search, editor focus, and native menu events
- Add find/replace panel for raw CodeMirror mode first
- Add rich editor find highlighting and selection navigation
- Support replace one / replace all
- Preserve IME composition and macOS text bindings
- Add tests for command routing, focus, and replacement behavior

Reference lesson: Clearly's live editor bridge treats find as an explicit editor contract, not a random browser behavior.

### Markdown Editing Durability

Goal: no markdown feature should corrupt source while typing.

- Keep inline math rendered while typing
- Harden display math serialization
- Stabilize table paste and table cell editing
- Preserve composed IME input across rich/raw modes
- Guard unsafe links
- Keep selection stable around media blocks
- Keep raw/rich mode switching lossless
- Add regression tests for consecutive IME composer input

### File Actions

Goal: make Grimoire feel like a real local file app.

- Basic file actions: rename, move, duplicate, reveal in Finder, copy path
- Handle invalid Windows save paths
- Support non-git vaults without making Git flows noisy
- Preview vault images in-app
- Allow native folder drops where they make sense
- Keep note drops into editors as wikilinks
- Prevent accidental drag/drop behavior from stealing editor focus

### Graph 2

Goal: make the graph useful for navigation, not decorative.

- Cluster by type and relationship family
- Add type and edge legends with toggles
- Add "open neighborhood" and "pin node" actions
- Add backlinks/incoming-only filters
- Add search result path from graph to note list
- Add graph minimap for larger vaults
- Add semantic related-note suggestions as an optional layer

### Journal Workflows

Goal: make Grimoire excellent as a daily journal without becoming a calendar clone.

- Daily note command and templates
- Optional weather snapshot per note
- Optional calendar/time context block
- Mood/energy/status frontmatter helpers
- Weekly and monthly review views
- Timeline view over dated notes and Git history
- Natural date filters for saved views

### Theme And Typography Studio

Goal: make the app visually calm, adjustable, and polished.

- Theme preview should show editor, sidebar, graph, command palette, and code block surfaces
- Add high-contrast and OLED-safe variants
- Add per-vault display preferences where they describe the content
- Add UI font, heading font, monospace font, editor width, line height, and paragraph spacing controls
- Keep all themes token-based
- Verify contrast and reduced-motion behavior

## Native macOS Track

Goal: use SwiftUI/AppKit where native behavior is better, while keeping vault semantics shared.

- Spike a native SwiftUI shell around the same vault model
- Evaluate AppKit `NSTextView` for find/replace, undo, IME, and macOS text bindings
- Add FSEvents file watching for external edits
- Add QuickLook preview for markdown and vault images
- Share markdown rendering/export contracts
- Ensure packaging still produces one seamless app

Reference lesson: Chops and Clearly both show places where native macOS pays off: file watching, text behavior, menu fidelity, and system integration.

## AI And MCP

Goal: agents should understand and operate on the vault safely.

- Generic MCP config support
- Better Codex and Claude CLI detection on macOS/Linux/Windows
- Per-agent capability display
- Agent context packs for active note, neighborhood, graph, and selected files
- Tool-call audit trail
- Safer write confirmation for multi-file agent edits
- Preserve composed AI input
- Support folder drops and note drops in AI input

## Localization And Accessibility

Goal: make the app usable outside one machine and one language.

- Complete localization pass beyond current English/Chinese foundation
- Test command palette and menus under localization
- Keep tooltips inside the window
- Improve keyboard-only settings navigation
- Respect reduced motion
- Verify contrast for every preset
- Disable unwanted native text suggestions in editor surfaces

## Windowing And Packaging

Goal: desktop behavior should feel boringly correct.

- Persist main window placement in logical points
- Restore saved window size after launch
- Publish Intel and Apple Silicon macOS builds with clear artifact names
- Keep Linux AppImage startup hardened
- Keep compact status bar on one row
- Prevent bottom bar wrap at narrow widths
- Keep all native command wrappers covered by tests

## Quality Ratchets

Goal: improve the codebase while adding features.

- Ratchet CodeScene thresholds only upward
- Refactor touched files instead of adding suppressions
- Keep new code files under 400 lines where practical
- Add JSDoc to exported utilities
- Prefer behavior tests
- Keep smoke suite under five minutes
- Never use `--no-verify`
- Sign commits

## Research Backlog

- Semantic search with local embeddings
- Graph clustering and graph layout alternatives
- Markdown rendering pipeline shared by app, export, QuickLook, and publish
- Native Swift editor vs CodeMirror-in-WKWebView tradeoffs
- Local-first sync conflict UX
- Plugin/extension model for custom commands
- Per-vault theme packs
- Published read-only vault sites
- Mobile/iPad read and capture surface
