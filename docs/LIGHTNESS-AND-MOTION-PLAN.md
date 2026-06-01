# Lightness And Motion Plan

Status: active plan
Last updated: 2026-05-27
Ownership: product, frontend, Tauri, Apple shell

## Thesis

Grimoire should feel lighter in three ways:

- Native-light: the app shell should feel like it belongs on macOS, not like a browser window with panels.
- Runtime-light: the first useful screen, note switching, search, and command surfaces should respond before the user feels machinery.
- Emotion-light: motion should guide attention and give the app life without making writing, reading, or privacy feel noisy.

The animation target is Pixar/Disney-level craft in principle, not studio imitation. Use anticipation, staging, arcs, follow-through, and appeal as interaction design principles. Do not copy a house style, character behavior, mascot motion, or recognizable studio tropes.

## Research Signals

Observed on 2026-05-22.

- Cogito proves the market is moving toward quiet, fast, native Markdown for both humans and agents: plain files, no database in the way, folder locations, quick open, tabs, document outline, AI summary, and agent-readable Markdown.
- Cogito's 2026 release notes show the real polish cadence: large-note speed, smoother switching, sidebar resizing, inline rename, tabs, table of contents, Finder Quick Look, smarter AI chat, iCloud responsiveness, and agent-edit undo.
- Clearly is a strong native-writing reference: Finder Quick Look, menu-bar scratchpad, global hotkey, document outline, find/replace, CLI create/open/rebuild, rich Markdown preview, math, Mermaid, and callouts.
- Mem's useful lesson is not "AI chat"; it is capture plus recall: voice mode, structured cleanup, Heads Up related context, chat, collections, templates, and fast follow-up.
- Tana's useful lesson is typed knowledge without a hidden database: supertags make notes act like objects, with fields, default content, AI instructions, voice behavior, and commands attached to the type.
- Bear's useful lesson is restraint: flexible tags, Markdown-first writing, export breadth, privacy options, and an interface that stays out of the way.
- MWeb's useful lesson is pro-writing density: outline, word count, local/network image handling, full-text search, quick search, Folders mode, Library mode, and publishing paths without making the editor feel huge.
- Apple HIG says motion should be purposeful, optional, brief, precise, and cancellable. Materials/vibrancy can make depth feel native, but readability wins over glass.
- Tauri 2 gives us transparent titlebar and platform visual-effect hooks, but true transparent windows on macOS can require private APIs. Keep release builds conservative unless the distribution channel allows it.
- web.dev's performance guidance is non-negotiable: animate compositor-friendly `transform` and `opacity`; avoid layout/paint animation for core interactions.

## Research Matrix

| Reference | What matters | Grimoire response |
| --- | --- | --- |
| Cogito | Plain files, folder locations, quick open, tabs, outline, Finder preview, AI chat over a location, large-note speed, iCloud responsiveness | Keep vaults local-first, add note history and quick-open polish, make TOC/search first-class, measure large-note and iCloud-like paths |
| Clearly | Native Markdown preview, document outline, find/replace, menu-bar scratchpad, Quick Look, CLI, rich preview features | Build Finder Ghost, real document find, menu-bar capture, and CLI create/open/rebuild without cloud or daemon assumptions |
| Mem | Voice Mode, Heads Up, Chat, Collections, Templates, Clean Up, accept/refine/reject flow | Make capture -> context -> refine -> accept into Grimoire's daily loop, with reviewed Markdown writes and local-first voice |
| Tana | Supertags, fields, optional fields, AI instructions per type, commands on typed nodes, voice behavior | Turn Type templates/frontmatter into "living frontmatter" with commands, AI rules, and optional fields while keeping files readable |
| Bear | Polished minimal writing, tags, privacy, export breadth, multi-format sharing | Keep restraint as a design rule; don't let agent surfaces crowd writing; add export quality after Markdown correctness is solid |
| MWeb | Outline, word count, folders/library distinction, image handling, full-text search, publishing | Improve writing tools and long-document controls; separate local vault organization from publish/export lanes |
| Apple HIG | Standard materials, hierarchy, sidebars/toolbars, purposeful optional motion | Use native-feeling shell and semantic materials carefully; never let window controls overlap app controls |
| Tauri 2 | Custom titlebars, transparent titlebar, window effects, private-API caution | Prototype material/titlebar variants behind flags; keep notarized/release behavior conservative |
| web.dev | `transform` and `opacity` are the safe animation baseline | Block layout/paint-heavy motion from core surfaces |
| Animation principles | anticipation, staging, arcs, follow-through, timing, appeal | Use the principles as grammar for state changes, not as cartoon decoration |

## Already In Place

- [x] Motion tokens live in `src/motion.css`; durable Memory/Crystallize/Import Autopsy accents live in `src/motion-memory.css` so motion layers stay below the LOC guardrail.
- [x] Reduced-motion behavior is covered in `src/motionCss.test.ts`.
- [x] Editor ink settle, agent composer, project workspace, and Memory lane have first tokenized motion.
- [x] Startup import budget test protects the main route from heavy editor, graph, canvas, settings, onboarding, and icon-picker imports.
- [x] Startup import budget test also protects the Inspector-only path from loading the full AI chat, Council, and Markdown rendering stack.
- [x] Large cold surfaces moved behind lazy chunks.
- [x] macOS local builds auto-increment semver and install with the visible app version.
- [x] Bottom bar contrast is scoped so dark status bars do not inherit black text.
- [x] Status bar and Settings shell materials now have one shared owner each: `theme-status-bar.css` for footer rails, `theme-coherence.css` for Settings shell/cards. Component inline styles and theme-specific duplicate blocks no longer own those color surfaces.
- [x] Status bar now remaps Tailwind foreground/muted/popover variables inside the footer so nested buttons, badges, and popovers inherit readable footer-local colors across default light/dark mode, built-in presets, and custom theme packs.
- [x] Status bar component inline colors now use footer-owned token constants instead of raw foreground/muted foreground variables, preventing dark-footer controls and popovers from falling back to black text.
- [x] Status bar rails now stack at mobile/iPad-width windows instead of forcing every local/git/agent/utility control into one cramped row.
- [x] In-note search and TOC controls are visible in the editor metadata strip and open with `Cmd+F` while editor focus is active.
- [x] Note rows render a visible vault-relative folder/project chip instead of hiding context in a theme-specific pseudo-element.
- [x] The Notes column now has a single top-chrome wrapper for header/search, project intelligence, and file/state filters, with project/filter CSS split into focused files below the LOC guardrail.
- [x] AI message route chips are backed by structured Grimoire-owned route state instead of only parsing collapsed reasoning text.
- [x] Production builds report app-shell gzip size against the 380/320/250 KiB budget ladder; latest installed shell is 229.68 KiB gzip in `/Applications/Grimoire.app` 0.1.362.
- [x] Local theme-pack JSON can be loaded/exported from Settings, applied as an app-local override, hot-reloaded from `.grimoire-local/theme-pack.json` in dev, and manually reloaded from Settings when tuning a pack.
- [x] Local theme-pack JSON can carry typography roles for UI, editor body/list text, monospace/code, display headings, and labels.
- [x] Built-in theme-pack JSON now carries the same typography role contract, and runtime font resolution applies those roles before user editor-font overrides or local theme-pack overrides.
- [x] Local theme-pack JSON can carry density and motion profiles that become root attributes and runtime CSS variables.
- [x] Theme-pack motion profiles also export platform-neutral Apple motion bridge constants for future macOS/iOS shell surfaces: seconds, point distances, SwiftUI timing-curve expressions, and a reduced-motion policy that keeps information visible.
- [x] Local theme-pack JSON can carry code-block treatment so writing and AI Markdown previews stop using one generic code shell.
- [x] Local theme-pack JSON can carry graph and canvas visual styles so graph maps, handoff HUDs, and Markdown-backed drawing surfaces stop feeling like generic overlays.
- [x] Theme-pack Settings controls are localized through the shared Settings translator, including JSON import/export/reload feedback, contract summaries, and typography role labels.
- [x] Dialogs, command palette, quick open, and global search now share theme-owned overlay, material, radius, shadow, and density tokens instead of carrying generic popover islands.
- [x] Import/export lanes, Import Autopsy, and object-storage dry runs now use theme-owned portability materials and semantic warning/safe tokens.
- [x] Settings now has a compact iPad/mobile section rail when the desktop rail collapses, using the same theme-owned toolbar/card materials as the full Settings shell.
- [x] Settings navigation is split out of the main Settings body, keeping `SettingsBody.tsx` down to 234 LOC while the compact rail keeps the active section centered as scroll state changes.
- [x] Privacy Settings now shows a local-first egress runway for private capture, cloud transcription, and anonymous diagnostics before the toggles.
- [x] Workflow Settings now shows the daily assistant runway before switches: brief, Inbox triage, flow-through, and title hygiene state read as one local-first loop.
- [x] Theme-pack heading profiles and metadata-strip visibility now change the live editor structure, not just the Settings preview copy.
- [x] Settings portability actions now use intent lanes for Markdown, app, journal, export, and storage controls instead of rendering every provider action at once.
- [x] The full emoji picker catalog is split out of normal note/sidebar icon rendering.
- [x] Type/icon customization opens on a small common icon set first; catalog search now loads a small icon-loader map plus only visible/selected icon renderers instead of one full Phosphor mega-chunk.
- [x] `panel-reveal`, `page-arrive`, and `constellation-focus` now stage command palette, Settings, inspector, graph focus, and note navigation surfaces.
- [x] Built-in theme tokens have contrast-regression coverage for editor, panel, syntax, and sidebar foreground surfaces.
- [x] `memory-trace` stages source-backed Memory Ledger rows once when records appear.
- [x] Browser latency regression covers command palette open, quick open, long-vault search, note switch, document search, and TOC scroll.
- [x] Browser workspace visual regression covers collapsed macOS-safe sidebar spacing, in-note search/TOC, full-surface theme switching, and native shell material variants.
- [x] Latest browser workspace smoke covers the vault-atlas sidebar path in the main workspace/theme-switching run.
- [x] Sidebar artwork now uses one visible theme-aware vault-atlas sigil with page, orbit, memory, route, and protected-keeper layers instead of a disconnected hidden glyph contract.
- [x] Sidebar artwork now uses a cleaner book, vault arch, and memory constellation mark with fewer nodes, stronger silhouette, and explicit theme color channels.
- [x] Sidebar artwork now has a stronger theme-lit aura, core glow, and local-memory jewel so the mark reads as a living Grimoire signature instead of a faint background sketch.
- [x] Sidebar artwork and folder glyphs now inherit one panel-level art palette, and compact/short-height sigils hide low-priority detail to avoid visual soup.
- [x] Sidebar glyphs now have a refinement layer for cel-highlight medallions, semantic selected-row rails, and a stronger ambient sigil crest/crown while remaining cheap CSS/SVG.
- [x] Graph Agent Package chips/cards carry theme-addressable ready/guarded/blocked states, and center-pane chrome uses solid scoped muted text instead of fragile alpha-muted labels.
- [x] Project-scoped note-list chrome now behaves like a stable cockpit: path first, compact metric chips beneath, actions anchored right, with search and flat filters in dedicated rows.
- [x] Memory Ledger rows and badges now carry theme-addressable neutral/proposed/verified/warning/danger state materials instead of isolated utility colors.
- [x] Memory Ledger and Locality Firewall Inspector surfaces now carry theme-owned inner materials, locality attributes, and egress-state lanes instead of generic muted utility islands.
- [x] The virtualized note-list route now stays cold on dashboard startup, moving `react-virtuoso` and note-list CSS into an explicit note-list chunk.
- [x] Provider-bound AI prompt drafts now pass through one privacy helper so composer, dashboard `/ask`, inline wikilink send, and graph Council handoffs share the same local-only redaction and public-reference canonicalization.
- [x] Infinite motion is now treated as a busy-state exception only: pending note save pulses are finite, update/typing loops are reduced-motion-aware, and the editor loading illustration uses one finite compositor-safe settle cue with paint containment.
- [x] The branded Grimoire refresh scene now runs a finite cinematic settle sequence and then rests, instead of looping book/orbit/aura motion forever while a vault is slow to open.
- [x] Dashboard Assistant Brief derives its next-action summary from metadata only, routes its primary action through the existing Attention Mode path, and uses finite compositor-safe entry motion with no protected title/path/body leakage.
- [x] Dashboard quick capture now has explicit date intent chips for Today, Yesterday, and Day before yesterday, while the sidebar owns permanent Notes, Journal, and Dreams browse lanes for exclusive search/filter context.
- [x] Journal/Dream lane creation now follows the selected scope: search placeholders, create labels, and `Cmd+N`/command-palette actions create the correct local Markdown type.
- [x] Mobile capture drafts now reuse the shared local date formatter and write `date` frontmatter, keeping iPhone/iPad capture compatible with desktop life lanes, Time Loom, import/export, and agent packets.
- [x] Bottom-bar AI agent menus now disclose the selected provider/model route from app settings, including Chitragupta's stream-resolved default, without exposing private CLI configuration or MCP internals.
- [x] Agent Council and graph runway surfaces now disclose the same active provider/model route next to source-safe/no-note-payload privacy state, with theme-owned materials and no new polling or startup work.
- [x] Agent Council map now includes explicit live-readiness lanes for source-safe, private, blocked, waiting, and unavailable agent paths instead of relying on dot decoding.
- [x] Graph Agent Package and Agent Runway now share source-safe envelope metrics for packet, privacy, result, source labels, links, and held-local counts before handoff.
- [x] Graph agent eligibility now shows visible source-safe/local-private/blocked/waiting copy and counts on the canvas HUD, so users do not need to decode single-letter orbit chips before Council handoff or confuse policy eligibility with live CLI/MCP health.
- [x] Graph route disclosure now carries the existing CLI missing/checking/installed status into the canvas/runway/Council surface without adding new status polling or startup work, while keeping Locality Firewall policy as the primary state on protected graph selections.
- [x] Selected-node graph orbit lanes now render a secondary health bead for local/installed/checking/missing status while policy state remains the lane's primary color/state, and the graph legend names Route health.
- [x] Background agent UI bridges now back off reconnect attempts and sleep while the app is hidden; MCP bridge calls clear response timers, reject pending work on close/unmount, and reuse one connecting socket.
- [x] Startup update checks and AI-agent CLI status probes now wait for a visible window before touching the network or spawning CLI/version checks.
- [x] Claude CLI, MCP status, vault AI guidance, Git remote status, and Git history startup probes now share the visible-window scheduler so hidden launches stay quiet until Grimoire is visible.
- [x] The lazy status-bar chunk now waits for a visible window too, preserving the lightweight footer fallback while hidden launches avoid loading status menus/badges.
- [x] Bottom status-bar relative-time repaint ticks now sleep while the app is hidden and resume on visibility/focus instead of running a permanent interval.
- [x] Git auto-sync now behaves like a Mac foreground service: hidden windows do not start network sync, recurring pulls use one-shot visible timers instead of a permanent interval, and focus/visibility pulls are debounced on resume.
- [x] AutoGit checkpointing now uses exact one-shot timers instead of a permanent one-second interval, clears while hidden, and preserves visible idle/inactive checkpoint behavior.

## What "Lighter" Means

### 1. Native Shell Lightness

- [x] Fix collapsed-sidebar traffic-light and logo overlap in source.
  - [x] Reserve a generic macOS traffic-light-safe top zone for the collapsed icon rail.
  - [ ] Verify in a native screenshot.
- [x] Make the sidebar collapse feel structural in source: compact icon rail, stable logo slot, no floating controls stacked over content.
- [x] Prototype macOS titlebar/material variants behind a feature flag:
  - [x] Add app-owned `standard`, `unified`, and `glass-preview` shell materials from Settings.
  - [x] Paint the titlebar/sidebar material through Grimoire CSS tokens instead of native private transparency APIs.
  - [x] Keep release behavior conservative: no true transparent window requirement for the notarized channel.
- [x] Keep the bottom status bar readable and uncramped on every theme by deriving text from the actual bar surface and stacking rails on mobile/iPad-width windows.
  - [x] Split footer rail muted text from status popover muted text and scope footer button resets to rail groups, so menus and sync/agent popovers do not inherit low-contrast rail text on darker or saturated themes.
- [x] Menu-bar quick capture now feels Mac-native without extra background work: Thought, Journal, and Dream actions focus the existing singleton window, preserve visible window geometry, and seed the dashboard capture surface locally instead of writing hidden notes.
- [ ] Make Settings feel native and light: fewer nested cards, clearer left nav, provider panels that expand only on intent.
  - [x] Split import/export/storage controls into a lane-based action deck.
  - [x] Make the Settings rail scroll-aware so manual scrolling updates the active section instead of leaving Sync highlighted forever.
  - [x] Keep S3/Azure provider fields and mirror actions collapsed until explicit provider intent, with report/busy states reopening only the relevant provider.
  - [x] Flatten desktop-storage and object-storage provider proof panels into lightweight inline surfaces to reduce card-inside-card density.
  - [x] Add an active native settings rail and calmer main surface for full-theme coherence.
  - [x] Add theme-specific Settings shell, rail, main-surface, and local/private card materials for built-in presets.
  - [x] Add an iPad/mobile Settings section rail so collapsed Settings still has visible navigation and full-theme material coverage.
  - [x] Move Settings rail, mobile rail, active section buttons, and form controls onto a dedicated token-driven `theme-settings.css` layer instead of ad-hoc background utilities.
  - [x] Split Sync & Updates into a local-first runway so Markdown source, Git, AutoGit, and release feed read as separate native lanes.
  - [x] Split Privacy into a local-first runway so private capture, cloud transcription, and diagnostics show egress state before toggles.
  - [x] Split Workflow into a daily assistant runway so assistant brief, Inbox triage, auto-advance, and title hygiene state are visible before toggles.
  - [ ] Verify theme-specific Settings tuning in native screenshots.

Acceptance:

- [ ] Native screenshot shows no traffic-light/logo/floating-control overlap.
  - [x] The latest ad-hoc-signed singleton `/Applications/Grimoire.app` build installs and verifies at `0.1.362`; escalated `open` confirms one visible AX window at `56,38` sized `1400x881`.
  - [x] Automated Playwright coverage verifies the collapsed rail safe zone and native shell material targets in the browser harness.
  - [ ] Native screenshot capture now works, but `/tmp/grimoire-native-0.1.362.png` shows Grimoire active with a blank/transparent app window, so native overlap/theme parity is still blocked by rendering, not permission.
- [x] Light and dark themes pass visible contrast checks on sidebar, center pane, editor, inspector, and bottom bar.
- [x] Theme surfaces feel coherent in Settings, not only in the main workspace.
- [x] Dashboard daily flow, ask preview, graph controls, graph nodes, graph agent rails, and mobile-ready shells route through shared material, spacing, radius, shadow, and gradient tokens.
- [x] Menu-bar icon has assistant-grade quick actions for Ask Grimoire and Command Palette in addition to note creation/open/settings/reload.
- [x] macOS reopen restores the singleton main window when the app process is alive but no window is visible.

### 2. Runtime Lightness

- [x] Set hard budgets for the app shell chunk:
  - [x] Latest measured shell after graph/Council CLI status truth polish: 221.81 KiB gzip, under the 250 KiB stretch target.
  - first target: keep gzip under 380 KB,
  - next target: under 320 KB,
  - stretch target: under 250 KB without cutting core UX.
- [x] Split remaining static Tauri/plugin imports behind feature boundaries.
  - [x] Split the emoji picker catalog from saved-icon rendering, moving the shell from 370.34 KiB to 339.89 KiB gzip.
  - [x] Lazy-load folder-only project intelligence and sortable DnD surfaces, moving the shell from 339.89 KiB to 318.09 KiB gzip.
  - [x] Route startup Tauri API usage through a lazy runtime bridge, moving the shell from 318.09 KiB to 313.93 KiB gzip.
  - [x] Replace persistent status-bar Radix tooltips/dropdowns with lightweight footer hints and lazy add-remote loading, moving the shell from 319.18 KiB to 310.33 KiB gzip.
  - [x] Move the inactive editor right panel behind a session-activated lazy boundary; latest verified editor chunk is 626.01 KiB gzip, with the Inspector/AI right panel split to 51.78 KiB gzip.
  - [x] Move raw Markdown mode and CodeMirror behind a raw-mode lazy boundary; latest verified rich editor chunk is 447.34 KiB gzip, with raw mode split to 178.69 KiB gzip.
  - [x] Move the closed editor Search/TOC/Links popover behind a lazy note-navigator boundary; latest verified rich editor chunk is 442.95 KiB gzip.
  - [x] Move the floating formatting toolbar behind a lazy editor boundary; latest verified rich editor chunk is 440.62 KiB gzip.
  - [x] Move the full AI chat/right-panel Markdown stack behind a lazy boundary; latest verified chunks are `EditorRightPanel` 37.79 KiB gzip and `AiChatRightPanel` 31.21 KiB gzip, so Inspector-only reading does not pay for the chat surface upfront.
  - [x] Add a startup import-budget regression so `AiPanel`, `AiMessage`, `MarkdownContent`, and Council UI stay behind the explicit AI-panel intent boundary.
  - [x] Move rich AI response Markdown rendering behind actual response content; `AiMessage` no longer statically imports `MarkdownContent`, while response text keeps a plain-text fallback until the renderer chunk arrives.
  - [x] Split plain AI Markdown rendering from fenced-code, Mermaid, and syntax highlighting work; latest verified chunks are `MarkdownContent` 6.01 KiB gzip and `MarkdownContentRich` 54.01 KiB gzip, so prose answers do not pay for diagram/highlight machinery.
  - [x] Keep that split Markdown-correct by treating CommonMark's up-to-three-space fenced blocks as rich Markdown too, with a regression for indented Mermaid fences.
  - [x] Move note-retargeting dialogs behind explicit retarget intent; latest verified wrapper chunk is 0.72 KiB gzip, `RetargetNoteDialog` stays a 5.01 KiB gzip lazy chunk, and the app shell stays below the 250 KiB stretch target.
  - [x] Move rare update/rename/delete/rebuild notices behind visible state; latest verified chunks are `DeleteProgressNotice` 0.45 KiB gzip, `RenameDetectedBanner` 0.48 KiB gzip, `VaultRebuildProgressNotice` 0.86 KiB gzip, and `UpdateBanner` 1.10 KiB gzip.
  - [x] Move sidebar type customization behind context-menu customize intent; latest verified chunks are `TypeCustomizePopover` 2.26 KiB gzip, `TypeImagePicker` 2.32 KiB gzip, and `useIconOptions` 0.31 KiB gzip.
  - [x] Move audio transcription implementation behind explicit transcribe intent; command registration keeps only the hook shell hot, and the picker/native transcription/note-write module stays cold until requested.
  - [x] Split the small transcription provider config from transcript Markdown builders; hot settings/default-provider code no longer imports the full transcript renderer.
  - [x] Move weather snapshot Open-Meteo parsing and Markdown generation behind the lazy Weather dialog; startup keeps only a tiny Markdown append helper.
  - [x] Move note-list property customization behind explicit column intent; latest verified `ListPropertiesPopover` lazy chunk is 2.10 KiB gzip.
  - [x] Move entity relationship/backlink graph building behind entity-view intent; latest verified `noteRelationships` lazy chunk is 1.09 KiB gzip.
  - [x] Move full Settings/import/export translation tables behind Settings intent; startup keeps only core locale, command, and note-list labels hot, reducing the installed app shell from 284.00 KiB to 276.19 KiB gzip.
  - [x] Add `AudioRecordingDialog` to the startup budget guard so the 2.20 KiB gzip recording surface stays behind explicit record intent.
  - [x] Move entity-only note-list rendering behind entity-view intent; startup keeps `EntityView`, `PinnedCard`, and relationship sort controls cold, reducing the installed app shell from 276.19 KiB to 275.82 KiB gzip with a 0.95 KiB gzip `EntityView` chunk.
  - [x] Move the virtualized note-list route behind note-list intent; dashboard startup no longer imports `react-virtuoso`, reducing the installed app shell from 275.82 KiB to 222.50 KiB gzip with a 43.37 KiB gzip `NoteList` chunk.
  - [x] Move vault pulse preview loading behind the lazy dashboard route; the normal app shell no longer imports `useVaultPulsePreview` before dashboard intent.
- [x] Keep background services quiet when they cannot help: the UI bridge WebSocket now uses capped exponential backoff, closes while hidden, the MCP bridge clears timers/rejects pending work, AutoGit uses one-shot visible-window timers instead of a permanent one-second poll, Git auto-sync uses one-shot visible-window timers instead of a permanent pull interval, startup update/agent/Claude/MCP/vault-guidance/Git probes wait for visibility, the status-bar chunk waits for a visible window, and the bottom status-bar ticker sleeps in the background.
- [x] Keep type customization responsive by showing common icons immediately, capping visible picker results, and loading exact Phosphor renderers one icon at a time.
- [x] Keep first paint independent from rich editor, graph, settings, onboarding, full icon picker, full emoji picker catalog, importers, and telemetry.
- [x] Virtualize or window any long list that can exceed a few hundred rows.
- [x] Move scan/import/export/rebuild work off the hot UI path and show cancellable progress.
  - [x] Markdown folder, Bear folder, Markdown ZIP, app imports, journal imports, Markdown ZIP export, Static HTML export, and storage sync show cancellable progress.
  - [x] Vault reload/rebuild uses the same native progress/cancel contract.
- [x] Add latency checks for command palette open, quick open, note switch, document search, and TOC jump.

Acceptance:

- [x] Production build reports the shell chunk budget.
- [x] Startup import budget test blocks new heavy static imports.
- [x] Long-vault note lists and long-document search do not visibly lock the UI.

### 3. Writing Surface Lightness

- [x] Add a real document find surface for long notes: shortcut, match count, next/previous, case/regex later.
- [x] Keep a persistent TOC/outline entry point for long notes, with click-to-section and active-heading feedback.
- [x] Keep typing, cursor movement, selection, IME, and checklist toggles still and instant.
  - [x] Guard BlockNote's root, descendants, and pseudo-elements against library transitions/animations.
  - [x] Add regression coverage that note-arrival motion stays on the editor shell, not the typing surface.
  - [x] Re-assert the calm guard after final editor-theme overrides so selection and checklist controls cannot regain transitions.
- [x] Make metadata chips wrap/scroll gracefully instead of compressing the editor.
- [x] Make note rows show project/folder context so cross-vault and project searches are understandable.
- [x] Stack narrow project chrome controls into a single readable rail instead of letting the top actions scatter across the center pane.
- [x] Move file-scope and open/archive filters into the upper note-list chrome so project search, actions, and filters read as one control system.

Acceptance:

- [x] A large Markdown document can be searched without leaving the note.
- [x] TOC navigation is visible and works in preview/editor mode.
- [x] Center-pane note rows show where a result belongs.

### 4. Cinematic Motion Grammar

Use named primitives, not one-off animation values:

- [x] `ink-settle`: note content arrives with opacity and tiny vertical settle.
- [x] `page-arrive`: note navigation shows source-to-destination continuity without moving text while typing.
- [x] `panel-reveal`: inspector, Settings sections, and command surfaces stage in from their logical edge.
- [x] `constellation-focus`: graph neighborhoods focus through scale/opacity and edge emphasis, not whole-vault fireworks.
  - [x] Graph nodes now distinguish source-safe package nodes, protected local nodes, selected focus, and agent-handoff safety in the canvas HUD.
  - [x] Source-safe graph package motion is finite and leaves a persistent Council-ready badge instead of relying on looping motion.
  - [x] Selected source-safe graph nodes now draw finite package tethers to the exact source-safe notes agents may receive; protected nodes remain visibly held and untethered.
  - [x] Graph package cards, agent rails, selected-node orbit lanes, waiting states, and source-safe/agent-package legend marks keep their ready/guarded/blocked/waiting states after theme material overrides.
  - [x] Canvas rail, selected-node orbit, and side-panel Council lanes now share one graph-agent lane model, including Chitragupta as the private memory lane and Claude Code as the real `claude_code` route.
  - [x] Graph package state and legend controls now sit in reserved canvas rails instead of absolutely overlaying graph nodes.
  - [x] Graph package and runway side panels now lead with theme-owned source-safe envelope metrics so agent handoff state reads as one packet instead of loose card stacks.
  - [x] Graph nodes now render local-only state as a compact lock glyph instead of a developer text marker, with the node renderer split out from the canvas to keep future motion polish below the LOC guardrail.
  - [x] `council-map`: Agent Council source labels, explicit live-readiness lanes, friction, held-local counts, review state, and one-answer resolution arrive as a compact source-safe orchestration map.
- [x] `memory-trace`: Chitragupta/Memory source groups pulse once when results arrive.
- [x] `crystallize-accept`: accepted diffs briefly show consequence, then become still Markdown.
- [x] `import-autopsy`: import preview steps reveal as a timeline of files, metadata, attachments, and withheld local-only content.
  - [x] First category-level Settings timeline keeps the last no-write preview visible without exposing raw machine paths.
  - [x] Named rail/step motion primitive stages the no-write preview with reduced-motion parity.
  - [x] Preview arrival is announced to assistive tech, and any out-of-vault planned destination is treated as a warning.
  - [x] Source-safe manifest groups files, metadata, attachments, and guarded local-only skips before the detailed timeline rail.

Rules:

- [x] Core reading and writing stay calm.
  - [x] Writing-core motion is blocked in CSS and by layout tests while note-arrival motion remains on the scroll shell.
  - [x] Final editor-theme CSS now keeps checklist, selection, and theme override layers still too.
- [x] No infinite decorative ambient motion in the workspace.
  - [x] Infinite animation is now allowed only for explicit busy indicators, covered by `src/motionPerformanceCss.test.ts`; ambient pending-save status uses a finite pulse.
- [x] Reduced motion has equal information quality.
  - [x] Add a CSS gate that blocks reduced-motion fallbacks from hiding product cues with `display: none`, `visibility: hidden`, or `opacity: 0`.
  - [x] Add browser coverage proving the Settings portability Proof Ledger keeps support, proof-level, and remaining-proof text visible under reduced motion.
  - [x] Busy indicators stop motion under reduced motion while retaining static visible state.
- [x] User actions remain cancellable during animation.
  - [x] Portability progress and vault rebuild progress mark their surfaces as cancellable and keep Cancel above animated/progress layers with pointer events enabled.
  - [x] Progress bars and rebuild spinner stop their local animation/transition in reduced-motion mode.
  - [x] Shared motion CSS now gives every `[data-motion-cancellable]` surface an isolated stacking context and every `[data-motion-cancel-action]` a protected interactive z-layer.
- [x] CSS uses `transform` and `opacity` for moving UI.
  - [x] Product motion CSS now has a regression gate for compositor-safe keyframes, finite animation, and reduced-motion awareness.
  - [x] `grimoire-state-pulse` and `grimoire-agent-ready` no longer animate `box-shadow`; static glow stays still while the pulse uses opacity/transform.

### 5. Theme Studio, Not Color Presets

Themes must include:

- [x] surface material and border behavior,
- [x] sidebar artwork/glyph behavior,
- [x] editor width, line height, paragraph rhythm, and code block treatment,
- [x] heading/body/list/mono/font-label roles,
- [x] inspector, Settings, status bar, dialogs, command palette, and import/export surfaces,
  - [x] Settings, status bar, dialogs, command palette, quick open, global search, import/export lanes, and object-storage previews route through shared theme material tokens.
  - [x] Memory Ledger and Locality Firewall Inspector cards route through theme-owned materials and explicit source-safe/local-only state attributes.
- [x] motion profile,
- [x] density profile,
- [x] graph/canvas contrast,
- [x] reduced-motion and high-contrast overrides.

Next implementation:

- [x] Extend theme preset JSON into a real theme-pack manifest.
- [x] Add Settings import/export for local theme JSON.
- [x] Add dev hot reload and a Settings reload action for local theme JSON while keeping user theme files local.
- [x] Route Constellation through shared surface tokens so sidebar, list, editor, AI rail, Settings, and status bar read as one theme.
- [x] Add CSS regression coverage that blocks raw Constellation hex/rgba panel islands from returning.
- [x] Add semantic accent/text tokens for theme packs so type colors, status dots, tooltips, navigator surfaces, and sidebar effects do not fall back to generic base palettes.
- [x] Calm the note-list workspace chrome by sharing tokenized materials across header/search, project actions, graph canvas, graph insight panels, selected rows, AI reference chips, Settings, and bottom filters.
- [x] Route every bottom status rail group, including utility controls, through footer contrast tokens so dark themes cannot inherit black text.
- [x] Keep status popovers on popover-owned foreground/muted tokens and load screenshot polish after the system theme layer so final preset tuning wins the cascade.
- [x] Give non-Git vaults a dedicated bottom-bar "Local only" state so local-first files do not look like a missing remote problem.
- [x] Route dialogs and command/search palettes through shared theme material, overlay, radius, shadow, and density tokens.
- [x] Route import/export portability cards, lane rails, Import Autopsy, and object-storage preview stats through shared theme material and status tokens.
- [x] Route sandboxed HTML previews through resolved theme tokens so embedded tables, links, code, and frame chrome do not fall back to hardcoded browser colors.
- [x] Route editor heading profiles and metadata-strip field visibility through runtime root attributes so JSON packs change writing structure as well as color.
- [x] Add Settings typography role controls for heading/display, body/list, code, and label fonts that save through the validated local theme-pack JSON path.
- [x] Add browser coverage proving Settings typography edits update live root font variables and local theme-pack JSON storage.
- [x] Give every shipped preset explicit UI/editor/mono/display/label typography roles, then guard the runtime path so built-in themes change type system as well as color/material.
- [x] Curate Settings theme presets into Signature, Studio, and Lab groups so strong directions surface first while weaker/experimental presets stop reading as equal defaults.
- [x] Replace the ambient sidebar sketch with a theme-tinted vault-map glyph: book, memory orbit, constellation nodes, and star signal.
- [x] Repair the sidebar glyph display contract and move the mark toward a cleaner vault-atlas identity: book/map, source routes, local keeper, memory trace, and finite arrival motion with reduced-motion parity.
- [x] Add a second sidebar glyph polish pass so row medallions, nav/rail/section marks, and the ambient sigil share route beads, bright/memory inks, and finite reduced-motion-safe arrival cues.
- [x] Add a third sidebar glyph polish pass so primary nav, collapsed rail, and section icons get matching halo, route, and bead anatomy instead of isolated icon chips.
- [x] Add a fourth sidebar glyph polish pass so nav/rail glyphs carry paired route beads, section glyphs carry a matching thread, folder medallions carry a small constellation layer, and agent/import/export/provider/astral folder names resolve to authored semantic glyphs.
- [x] Add a fifth sidebar glyph polish pass so agent/Council, storage/sync/provider, and astral folders use distinct SVG anatomy while keeping the effect in cheap CSS/SVG layers.
- [x] Add a sixth sidebar glyph polish pass so vault, private/local-only, research/evidence, and template folders have authored SVG anatomy and motif-specific route/thread/constellation behavior without runtime image weight.
- [x] Add a heavier ambient sidebar sigil redraw with vault shell, atlas ridge, compass, and source-route bloom in a focused `sidebar-artwork-atlas.css` layer.
- [x] Replace raw fallback folder icons with authored Grimoire folder glyphs, plus Sanskrit/Hindi/transliteration aliases and motif-specific Vedas/Shaastras/Puranas/Rishi/Brain anatomy.
- [x] Make selected folder rows semantic-tone aware so the row chrome follows the glyph motif instead of forcing a fixed blue selection.
- [x] Add an eighth sidebar glyph refinement layer so nav, rail, section, and folder glyphs share cel highlights and selected folder rows get semantic tone rails without extra image assets.
- [x] Remove weak presets once Nocturne, Living, one light mode, and one retro direction cover the ecosystem.
  - [x] Retire `research-cockpit` and standalone `manuscript` from the shipped catalog; keep the manuscript writing voice inside Living Archive through font/style roles.
- [x] Add theme-pack graph/canvas profiles: Constellation and Nocturne use luminous map/blueprint surfaces, Living/Daylight use ledger-paper surfaces, and Retro uses terminal graph/canvas materials.

Acceptance:

- [ ] Switching a theme changes the full workspace feel, including Settings.
  - [x] Playwright covers Living Archive switching across the workspace editor, note list, and navigator material.
  - [x] CSS/unit coverage keeps status bar and Settings shell material ownership centralized in theme coherence instead of theme-specific islands.
  - [x] Playwright covers iPad-width Settings after the desktop rail collapses, including themed compact navigation and no horizontal overflow.
  - [x] Context Capsule card/dialog route surfaces now reuse active agent route truth and theme-owned materials, keeping the package boundary coherent with the footer, Council, graph, and Settings route state.
  - [x] Context Capsule package review now includes an explicit capsule manifest in both the dialog and Markdown packet: review mode, source-safe sources, held-local items, trimmed graph items, and the next gate.
  - [ ] Native-window theme parity remains unproven here; current proof is browser/token level plus installed bundle verification.
- [x] Theme JSON validates before use and cannot break core readability.
- [x] Older local theme JSON derives semantic accent/text tokens instead of failing import.
- [x] User-imported theme files are local-only app settings, not committed fixtures.

### 6. Signature Product Motion

Motion should serve the parts that make Grimoire special:

- [x] Agent Council: agent stances appear as sourced cards, conflicts stage clearly, synthesis resolves into one answer.
  - [x] Council member cards now stage in with shared control timing, and the synthesis row has a dedicated reduced-motion-safe settle primitive.
  - [x] Council member cards now expose structured claim confidence, source counts, and conflict counts alongside the prose stance.
  - [x] Red-Team My Plan now appears inside the Council pass as a source-safe critique lane instead of only a separate side card.
  - [x] Council synthesis now includes source-safe Red-Team next actions so the critique has reviewable follow-through before any durable write.
  - [x] Chitragupta now appears as a private MCP-contract memory lane instead of a generic available CLI participant.
  - [x] Chitragupta route labels now distinguish local CLI default from explicit provider/model overrides.
  - [x] Chitragupta stream JSON now reports route resolution and CLI errors into the Grimoire reasoning lane, so provider/model identity is evidence-backed instead of guessed by the model.
  - [x] Graph Council prompts and context packages now carry source-safe edge manifests so the Vault graph stance is relationship-backed instead of count-only.
  - [x] Agent Council now stages approved Memory Ledger contradictions as warning-toned source chips and synthesis friction instead of burying conflicts in text.
  - [x] Graph Ask Council now opens a source-safe review dialog before AI handoff, showing source labels, graph counts, held-local counts, edge manifest, and exact prompt text.
  - [x] Agent Council now resolves into one visible source-safe answer card with confidence, source count, friction count, and the next review/Crystallize step.
  - [x] Council conflict, withheld, and Memory Ledger source chips stay visible before overflow ask refs, and protected asks cannot leak contradiction labels into policy-only passes.
  - [x] Council synthesis now carries an explicit review-gated handoff preflight with ready, private-gated, unavailable, source-safe, and held-local counts before any durable Markdown write.
  - [x] Source-safe Council synthesis can now step into Crystallize review as an `Agent Council` Memory proposal, preserving handoff preflight, safe source provenance, and protected-packet blocking.
  - [x] Council friction now stages through a compact friction-to-synthesis-to-answer rail with protected labels withheld, theme-owned materials, finite compositor-only motion, and reduced-motion parity.
  - [x] Council map now names live lane readiness explicitly: source-safe external lanes, private local lanes, unavailable contracts, waiting checks, and blocked protected-context paths.
- [x] Memory Ledger: memory confidence, contradictions, expiry, and source links change state visibly but quietly.
  - [x] Inspector ledger rows now expose confidence tone, expiry urgency, contradiction count, source links, and reviewed/version state as quiet chips while keeping the one-shot `memory-trace` arrival.
  - [x] Ledger row and badge state colors now come from `theme-memory-ledger.css` so verified, proposed, warning, and expired memories follow the active theme.
  - [x] Memory panel stats, orchestration rows, signal surface, and protected local state now use theme-owned ledger/protected materials instead of generic muted utility islands.
- [x] Locality Firewall: "what can leave" gates feel serious and legible, not scary.
  - [x] Context Capsule, Graph Council handoff, and Agent Council synthesis review dialogs now include a shared Locality Firewall preflight strip for allowed context, held-local counts, and trimmed counts.
  - [x] Per-note Inspector Firewall lanes now expose blocked/withheld/review/preview/vault-setting egress states with theme-owned guarded, blocked, and review materials.
- [x] Crystallize: AI output becomes Markdown diffs with source-backed provenance and a satisfying accept moment.
- [x] Time Loom: journal, dream, task, meeting, voice, commit, and calendar events become a calm temporal graph.
  - [x] The dashboard Time Loom now reduces voice, commit, and scheduled calendar/event Markdown into counts before rendering, so private filenames, paths, locations, and messages stay out of the visual surface.
  - [x] The dashboard Time Loom now reduces mobile capture drafts into metadata-only mobile counts before rendering, so iPhone/iPad titles, paths, device/source metadata, and bodies stay out of the visual surface.
  - [x] Scheduled mobile captures now count as mobile and calendar activity without exposing device/source/title/path metadata.
  - [x] Time Loom now counts Git pulse commits that touch protected paths as private and coarsens every protected custom type label before rendering.
  - [x] The dashboard Time Loom now renders a metadata-only temporal map with finite node arrival, shared signal material, and protected-count markers instead of only a text list.
  - [x] The dashboard Time Loom now adds a compact Pattern Lens for primary thread, open-loop pressure, private-review pressure, and external rhythm, all from counted metadata with privacy regression coverage.
  - [x] Task/Todo due frontmatter now enters Time Loom as date placement and task counts only; task titles, paths, projects, and due-key names stay out of the dashboard model.
  - [x] Memory Ledger audit pressure now enters Time Loom and Daily Thread as count-only `Memory` / `Memory review` lanes; protected titles, paths, contradiction labels, source links, provider/device markers, snippets, and local-only fields stay out of preview and `/ask` packages.
  - [x] Daily Thread now fuses Time Loom counts with Dream Forge rhythm into one theme-owned next-action rail, using only count/type/date/frontmatter-safe state and no private labels or provider claims.
  - [x] Daily Thread `Crystallize the day` now seeds the existing `/ask` plus ask-context preview path with a source-safe Crystallize-ready prompt and structured `crystallize-memory` intent; the same intent now appears in Context Capsule card/package review, so the daily workflow points toward reviewable memory instead of another journal prompt or prose-only inference.
  - [x] Time Loom now has a count-only temporal graph layer: day, lane, held-local, and link nodes render through shared signal/private material without exposing titles, paths, snippets, providers, device metadata, or raw local-only fields.
  - [x] Focused Time Loom graph verification passed on 2026-05-30: 22 tests across the Time Loom model, guidance, dashboard graph panel, dashboard privacy, and dashboard CSS contracts.
- [x] Dream Forge: local-only analysis uses private visual language and never implies cloud processing.
  - [x] Dream Forge now owns its private visual layer in `DreamForgePanel.css`, keeping the dashboard shell small while rendering a theme-owned private-lens contract for records, held-local count, and frontmatter-only signals.
  - [x] Dream Forge now has a private-local dashboard material, explicit local-only surface markers, a finite private signal map, and a no-cloud/egress-blocked loading fallback.
  - [x] Dream Forge now shows recency instead of latest dream title in the dashboard shell, keeping private labels out of ambient surfaces.
  - [x] Dream Forge now adds a metadata-only private rhythm rail for last-night, this-week, and older activity counts without titles, paths, bodies, or cloud language.
  - [x] Dream Forge now adds a private timeline rail for last-night, weekly, monthly, and archive bands using only record counts, held-local counts, and signal counts; titles, paths, bodies, and signal labels stay out of the timeline model.
  - [x] Dream Forge now exposes a count-only local manifest for Lens, Read, Egress, and Export so the private-only rule is visible before any handoff/export while non-local reports stay redacted.

## Implementation Order

1. P0: native shell overlap fixes, status/readability audit, and document search/TOC usability.
2. P0: performance budget reporting and split remaining startup imports.
   - [x] Defer the bottom status-bar rail into its own startup-safe lazy chunk with a stable-height local-only fallback.
   - [x] Keep native CLI agent launches light and deterministic by prepending the resolved toolchain bin directory to `PATH` before running Chitragupta/Codex shebang CLIs.
   - [x] Run Chitragupta with `--stream-json` and parse route/status/error events before treating output as answer text.
3. P1: JSON theme-pack schema, local import/export, and dev hot reload.
4. P1: apply motion primitives to command palette, Settings, inspector, graph focus, and note navigation. Done for the first semantic pass; continue with richer product moments.
5. P1: one strong light theme and one retro theme, then remove weak presets.
6. P2: Agent Council, Crystallize, Import Autopsy, and Time Loom cinematic moments.

## Verification Plan

- [x] `pnpm build`
- [x] focused motion/theme tests
- [x] startup import budget test
- [x] `pnpm test`
- [x] `pnpm lint`
- [x] `pnpm exec tsc --noEmit`
- [x] `cargo test --manifest-path src-tauri/Cargo.toml`
- [x] built-in theme contrast regression test
- [x] Playwright screenshots for main workspace, Settings, long note search/TOC, collapsed sidebar, and theme switching
  - [x] Settings/theme-switching screenshot regression attaches Nocturne, Living Archive, Manuscript, and portability-panel captures.
  - [x] Settings iPad screenshot regression attaches the collapsed compact section rail with themed material and no horizontal overflow.
  - [x] Workspace screenshot regression attaches main workspace, macOS-safe collapsed sidebar, long-note search, TOC, and themed editor navigator captures.
  - [x] Reduced-motion screenshot/regression covers Settings, workspace arrival, in-note search, TOC jump, and navigator target highlight.
  - [x] Forced-colors screenshot/regression covers workspace, Settings, status bar, focus outline, and editor navigator surfaces.
- [x] Focused Playwright latency spec for command palette, quick open, note switch, document search, and TOC scroll
- [ ] native Tauri screenshot from `/Applications/Grimoire.app` (capture works for 0.1.362, but the app window is blank/transparent despite menu ownership and visible AX window metadata)
- [x] reduced-motion runtime check
  - [x] latest bundle chunk report attached to the session notes: app shell `229.68 KiB` gzip, `NoteList` cold chunk `43.79 KiB` gzip, SettingsPanel cold chunk `82.23 KiB` gzip, rich editor `549.94 KiB` gzip, raw editor `180.09 KiB` gzip, graph modal lazy chunk `15.28 KiB` gzip, AI right-panel lazy chunk `38.38 KiB` gzip

## Sources

- Cogito: https://cogito.md/
- Cogito Releases: https://cogito.md/releases
- Clearly: https://clearly.md/
- Clearly CLI: https://clearly.md/cli
- Mem Help Center: https://help.mem.ai/
- Tana Supertags: https://tana.inc/docs/supertags
- Tana AI: https://tana.inc/docs/tana-ai
- Bear: https://bear.app/
- MWeb: https://www.mweb.im/
- MWeb Editor: https://www.mweb.im/en-mweb-editor
- Apple HIG Materials: https://developer.apple.com/design/human-interface-guidelines/materials
- Apple HIG Motion: https://developer.apple.com/design/Human-Interface-Guidelines/motion
- Tauri window customization: https://v2.tauri.app/learn/window-customization
- web.dev animation performance: https://web.dev/articles/animations-guide
- UI animation principles reference: https://www.interaction-design.org/literature/article/ui-animation-how-to-apply-disney-s-12-principles-of-animation-to-ui-design
