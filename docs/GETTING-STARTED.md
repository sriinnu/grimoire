# Getting Started

This is the shortest path to run Grimoire locally and understand where to make changes.

## Prerequisites

- Node.js 20+
- pnpm 8+
- Rust stable
- macOS or Linux

Install JavaScript dependencies:

```bash
pnpm install
```

Run browser mock mode:

```bash
pnpm dev
```

Run the native desktop app:

```bash
pnpm tauri dev
```

## Linux Dependencies

Tauri 2 needs WebKit2GTK 4.1 and GTK 3.

Arch / Manjaro:

```bash
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg
```

Debian / Ubuntu 22.04+:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev patchelf
```

Fedora 38+:

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel
```

Install Node from the distro package manager too if you want the bundled MCP server to run from a packaged Linux app.

## Useful Commands

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
```

Smoke tests:

```bash
pnpm playwright:smoke
```

Full Playwright regression:

```bash
pnpm playwright:regression
```

## Codebase Map

```text
src/
  App.tsx                         app orchestrator
  components/
    Editor.tsx                    editor shell
    SingleEditorView.tsx          rich BlockNote editor
    RawEditorView.tsx             CodeMirror source editor
    GraphModal.tsx                knowledge graph UI
    WeatherSnapshotDialog.tsx     explicit weather insertion UI
    Inspector.tsx                 properties and relationships
    CommandPalette.tsx            command launcher
    ui/                           shadcn/ui primitives
  hooks/
    useVaultLoader.ts             entries, folders, views, git state
    useAppCommands.ts             keyboard/menu/command wiring
    useAppSave.ts                 save and rename coordination
    commands/                     command groups
  lib/
    appearance.ts                 theme/font contract
    i18n.ts                       app translations
    themeMode.ts                  light/dark runtime
  utils/
    noteGraph.ts                  graph data model
    graphDisplay.ts               graph layout and filters
    weatherSnapshot.ts            weather markdown block generation
    wikilink.ts                   wikilink resolution
    typeColors.ts                 type accent colors

src-tauri/src/
  lib.rs                          command registration
  menu.rs                         native menu IDs
  settings.rs                     app settings and sanitizers
  commands/                       Tauri command boundary
  vault/                          scanning, parsing, cache, views
  frontmatter/                    frontmatter write helpers
  git/                            git status/history/sync
  ai_agents.rs                    CLI agent facade
  claude_cli.rs                   Claude Code adapter
  mcp.rs                          MCP server support
```

## Development Rules

- Keep markdown files as the durable model.
- Use shadcn/ui primitives for user-facing controls.
- Keep exported utility APIs documented with JSDoc.
- Keep code files under 400 lines where practical.
- Add tests for behavioral changes.
- Do not lower CodeScene thresholds.
- Do not use `--no-verify`.
- Sign commits.
- Do not push until the local feature set is intentionally ready.

## Where To Add Features

Graph behavior:

- data extraction: `src/utils/noteGraph.ts`
- layout/filtering: `src/utils/graphDisplay.ts`
- UI: `src/components/GraphModal.tsx`

Appearance:

- supported values: `src/lib/appearance.ts`
- settings UI: `src/components/AppearanceSettingsSection.tsx`
- CSS tokens: `src/index.css`
- native sanitizer: `src-tauri/src/settings.rs`

Editor:

- rich mode: `src/components/SingleEditorView.tsx`
- raw mode: `src/components/RawEditorView.tsx`
- CodeMirror setup: `src/hooks/useCodeMirror.ts`
- markdown sync: `src/components/editorRawModeSync.ts`

Commands:

- shared IDs and shortcuts: `src/hooks/appCommandCatalog.ts`
- dispatch: `src/hooks/appCommandDispatcher.ts`
- app wiring: `src/hooks/useAppCommands.ts`
- native menu: `src-tauri/src/menu.rs`

## Local Reference Repos

The `.tmp` repos are learning material, not source to copy.

Useful lessons to adapt:

- native text editing can be better for macOS find/replace, undo, IME, and system bindings
- live markdown editors need explicit mount, set-document, flush, command, and find contracts
- file watchers should be native and reliable
- preview, export, QuickLook, and app rendering should share one markdown pipeline
- MCP and CLI features need strict contracts and tests

Use those lessons to improve Grimoire's shape without cloning another app's product identity.
