# Grimoire Upgrade Program — Status & Improvement Roadmap

_Last updated: 2026-11-04. Living artifact of the "Second Brain Envision" program: what shipped, the evidence behind it, and what can be improved next._

## The Arc So Far

The program moved in five waves, each PR-gated with the full suite (5,261+ tests), build, cargo link smoke, and the three-OS CI matrix:

| Wave | PR | What shipped | Evidence |
|---|---|---|---|
| 1. Envision → wired UI | [#80](https://github.com/sriinnu/grimoire/pull/80) | Second Brain rail (graph, stats, memory lanes, connections, outline), dashboard hero + sparkline stats, Chitragupta comms surface, quick-capture auto-promotion, sidebar port | Screenshots: [design/lab/program-editor-dark.png](../design/lab/program-editor-dark.png), [program-dashboard-dark.png](../design/lab/program-dashboard-dark.png) |
| 2. Reliability | #80 | Root error boundary (no more blank-window crashes), `lazyWithRetry` across all 50 lazy surfaces, Tauri transparent-window fix | Recovery surface proof: design-lab artifacts; native session logs |
| 3. Dependency security | [#82](https://github.com/sriinnu/grimoire/pull/82), [#88](https://github.com/sriinnu/grimoire/pull/88) | All Dependabot alerts resolved: 16 npm overrides + MCP SDK + aws-smithy-json, editor stack pinned coherent | `pnpm why` sweeps, wikilink smoke green |
| 4. Editor hot-path performance | [#86](https://github.com/sriinnu/grimoire/pull/86) | Serialization off the keystroke path (idle-debounced with flush contract), derived-state computed once per change, save-wave cascade calmed | Measured: keystroke→frame mean **44→16 ms (−64%)**, p95 **75→17 ms (−77%)**, wall **−70%** |
| 5. Test hardening | #80/#82/#86/#87/#88 | Three timeout layers (app waits 15s, RTL 10s global, vitest 20s per-test), date-pinned Weekly Review tests, CI flake class eliminated | Zero flakes in the last 8 gate runs |

## What the app looks like now

- **Editor + rail**: the WebGL constellation (type-colored glow nodes, direction-encoded edge pulses, breathing halo, sparkles), real vault stats with 7-day deltas, memory lanes with 14-day sparklines, connections, outline, history, privacy card. Legacy inspector is one toggle away.
- **Dashboard**: "Capture. Connect. Remember." hero with the aurora shader, real sparkline stats band, Weekly Review card (7-day strip, streak, week-over-week deltas, type mix — counts only, never private titles).
- **AI panel**: route disclosure with a live daemon orb (checking/idle/tool-executing/error states), serif answer cards, citation chips, tool traces, crystallize write-review card.
- **Quick Capture**: auto-promotion strip with deterministic local lane classification (task/ask/dream/memory/journal), ⌘↵ to promote, focus never stolen.
- **Sidebar**: vision language (sea-glass active states, colored type glyphs, small-caps section headers, calm search).

## What Can Be Improved (the roadmap ahead)

### High impact, ready now

1. **tiptap 3.32 editor-compat pass** — the one intentionally-open editor alert. Needs a dedicated round: wikilink smoke on the bumped stack, prosemirror dual-version guard, extension-link patch review. Pays the security debt without breaking the editor.
2. **glib (rust)** — currently pinned at 0.18 by the tauri tray-icon stack on Linux. Resolution requires a tauri/gtk upgrade, not a Cargo.lock tweak. Schedule with the next tauri minor bump.
3. **Chitragupta live testing** — the daemon runs locally now; exercise the AI comms surface against a real backend (status orb states, recall citations, crystallize loop) and capture the evidence.
4. **Editor measure clamp + typography** — the `--editor-font-size` token is still undefined; content width at 1920px runs past the readable measure. Clamp to the design spec's content width.
5. **Palette consolidation** — the command palette, quick open, and search are three near-identical fuzzy UIs. One surface with modes (Raycast-style) is the right shape.

### Medium horizon

6. **iOS shell** — the design-lab iPhone artifact (`design/lab/iphone-pearl.png` / `iphone-nocturne.png`) is the visual contract; the SwiftUI pass is the platform-native path from `docs/PLATFORM-NATIVE-ENHANCEMENT-ROADMAP.md`.
7. **Git time-travel content preview** — the rail slider opens a diff today; a read-only content preview at that commit would close the loop.
8. **Memory resurfacing** ("On this day" v2) — stale-but-valuable notes resurface with a reason; timestamps + backlinks are all local data.

### Design-system hygiene (the deeper debt)

9. **Token consolidation** — the palette is authored three times (`theme-base.css`, `theme-system-tokens.css`, `presets.json`) with known drift; one generated source → CSS + Swift is the enabler for the SwiftUI shell.
10. **CSS cascade consolidation** — 91 stylesheets, 987 custom properties, 998 `color-mix` uses; the `!important` enforcers in `theme-grimoire-panels.css` (63) and `theme-status-bar.css` (46) should become cascade layers.
11. **Motion tokens actually govern** — components still hardcode durations (140/150/320 ms) despite the token vocabulary; a lint rule would close it.

### Scoped roadmaps for the large items (committed 2026-11-12)

**R1. iOS / Android native shells** (the "all OS" endgame). Phase it: (a) token consolidation first (R2) so the SwiftUI shell inherits one theme; (b) iOS capture-first app from the `design/lab/iphone-*.png` contract — share sheet, widgets, offline vault via the Rust kernel over UniFFI; (c) Android Compose shell over the same kernel. Gate each phase on `NATIVE-APPLE-CAPABILITY-PARITY.md` — a pretty shell is not parity.

**R2. Design-system token consolidation.** One `tokens.json` source generates `theme-base.css`, the Swift palette, and the preset JSON; retire the three hand-authored copies. Sequenced after the current UI work stabilizes; the parity tests (`themeBaseCss.test.ts`, `systemThemesCss.test.ts`) become the migration guard.

**R3. glib / tauri stack upgrade.** glib 0.20 needs a tauri/gtk bump; schedule with the next tauri minor. Until then the alert stays open-by-design (Linux tray path only, documented in #88).

**R4. Editor measure + typography polish.** Define `--editor-font-size`, clamp content to the spec's max-width, and audit the serif/sans pairing against the Clearly-grade writing surface.

### Chitragupta live-testing evidence (2026-11-12)

The AI communication surface was exercised against the real running daemon (not mocks):

- **Daemon live**: `chitragupta-mcp` (pid 6695), the stdio proxy, and the installed `/Applications/Chitragupta.app` runtime all running; `~/.chitragupta/agent.db` present.
- **CLI detectable**: `chitragupta` resolves on PATH (`~/.nvm/versions/node/v22.22.0/bin/chitragupta`), version **v0.1.10** — so the app's agent detection (`src/lib/aiAgents.ts`) reports it `installed` and the AI panel route strip renders the live orb instead of the degraded state.
- **Tauri integration**: the dev instance spawned the ws-bridge (`grimoire_lib::mcp`) cleanly at boot; the route-disclosure/comms layer reads the real `AiAgentsStatus` on this setup.
- Browser-mock mode intentionally reports agents `missing` (no real CLI in jsdom) — the degraded comms rendering was separately verified in `design/lab/ai-comms-dark.png`.

## Program Artifacts

- Design lab: `localhost:5203/#design-lab` (dev-only)
- Evidence captures: [design/lab/](../design/lab/) — full-app windows, rail/sidebar/chitragupta/iPhone artifacts in both modes
- Program map: [design/lab/program-map.png](../design/lab/program-map.png)
- Reports: this file + the audit trail in each PR body
