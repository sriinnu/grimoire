# Getting Started

This is the shortest path to run Grimoire locally and understand where to make changes.

This document covers source builds. Public binary installers are not published
yet. The current release workflow has macOS, Windows, and Linux jobs, but those
jobs are not public install evidence until signing secrets exist and a tagged
release successfully publishes verified artifacts. Stable and alpha update feeds
are generated from GitHub Release assets by the release workflow; they are not
evidence until that workflow has run successfully for a tagged release.

If you are evaluating Grimoire rather than modifying it, browser mode
(`pnpm dev`) is the fast tour and uses mock handlers, while native mode
(`pnpm tauri dev`) exercises real file IO, menus, and platform behavior.

Before cutting a public release tag, run:

```bash
pnpm release:preflight
```

The preflight checks release workflow wiring, GitHub Pages, and required repo
secret names for signed updater artifacts and notarized macOS artifacts. It
reports secret names only; it never prints secret values. The full operator
checklist is in
[RELEASE-RUNBOOK.md](RELEASE-RUNBOOK.md).

The in-app Getting Started flow clones the public starter vault from
`https://github.com/sriinnu/grimoire-getting-started.git` first. If that clone
is unavailable, packaged apps copy the bundled starter-vault resource instead.
The tracked `demo-vault-v2/` directory is that bundled mirror for local
development and test coverage.

## Prerequisites

- Node.js 20+
- pnpm 10+ through Corepack
- Rust stable
- macOS for locally verified source development
- Linux or Windows for intended source development, pending fresh platform QA

Install JavaScript dependencies:

```bash
pnpm install
```

Check this machine before spending time debugging setup:

```bash
pnpm doctor:source -- --mode browser
```

The source doctor reports two readiness lanes:

- Browser source mode: Node.js 20+, pnpm 10+, and Git.
- Native Tauri mode: browser source mode plus Rust/Cargo and platform-specific
  native dependencies. On Linux it verifies the pkg-config packages Grimoire's
  Tauri build expects: WebKitGTK 4.1, GTK 3, libsoup 3, JavaScriptCoreGTK 4.1,
  libxdo/xdo, OpenSSL, librsvg, and AppIndicator/Ayatana.

If the selected lane is blocked, the doctor prints `Next actions` for the missing
toolchain or platform dependency before exiting non-zero.
Use `pnpm doctor:source` to check both lanes, or run
`pnpm doctor:source -- --mode native` before launching the desktop shell.

Run browser mock mode:

```bash
pnpm dev
```

Run the native desktop app:

```bash
pnpm doctor:source -- --mode native
pnpm tauri dev
```

Windows native development is still a recheck item. A Windows `pnpm tauri dev`
run on `main` failed with macOS-only Rust cfg errors around the menu bar and
reopen handlers. A later Windows run failed at link time with
`LNK1181: cannot open input file 'sqlite3.lib'`. The current source includes
guards for the macOS-only paths and bundles SQLite through `rusqlite` instead of
requiring a separately installed Windows SQLite import library, but do not call
Windows verified until a fresh Windows dev/build/open run is captured.
`pnpm test:rust-platform-guards` statically guards the known macOS-only
`menu_bar` and `RunEvent::Reopen` regression paths plus the bundled-SQLite
contract; it is regression coverage, not a replacement for native Windows
launch QA.
`pnpm test:native-tauri-link` runs
`cargo build --manifest-path=src-tauri/Cargo.toml --no-default-features --locked`
and is executed on the pinned macOS, Windows, and Linux CI runners so native
link regressions, including the Windows SQLite import-library failure, cannot
hide behind browser-only source checks. CI also runs
`pnpm test:native-tauri-startup`, which starts the native source process with
`cargo run --manifest-path=src-tauri/Cargo.toml --no-default-features --locked`
and a temporary home directory, then requires the
native `GRIMOIRE_NATIVE_STARTUP_SMOKE_READY process_entry=true` marker. That is
hosted source process-entry proof, not Tauri setup, window, or packaged
installer launch evidence.
`pnpm doctor:source` also checks Windows native setup for the MSVC Rust host and
Microsoft C++ Build Tools (`cl.exe`). If either fails, install Rust's stable
MSVC toolchain and Microsoft's Desktop development with C++ workload before
rerunning `pnpm tauri dev`. The doctor also warns when the evergreen WebView2
runtime is not detected. That warning does not block browser source mode or
native readiness, but a Windows launch/open recheck should verify WebView2 if
the built `.exe` does not display a Tauri window.

Packaged desktop apps also try to start Grimoire's local MCP WebSocket bridge
from the bundled `mcp-server` resource. Node.js must be discoverable on `PATH`
or in common Node install locations for that optional external-AI bridge to run,
but normal vault browsing and editing must still open without it. Grimoire checks
Homebrew, `/usr/local`, Volta, nvm, nvm-windows, Program Files, LocalAppData, and
Scoop-style Node locations before treating the bridge as unavailable. A Windows
recheck should cover both app launch and bridge status after `pnpm tauri build`.

## Linux Dependencies

Tauri 2 needs WebKit2GTK 4.1 and GTK 3.

Arch / Manjaro:

```bash
sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl appmenu-gtk-module libappindicator-gtk3 librsvg xdotool
```

Debian / Ubuntu 22.04+:

```bash
sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev libsoup-3.0-dev patchelf
```

Fedora 38+:

```bash
sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file libappindicator-gtk3-devel librsvg2-devel libxdo-devel
```

Install Node from the distro package manager too if you want the bundled MCP
server to run from a packaged Linux app.

## Useful Commands

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm run test:markdown-editor:js
pnpm build
pnpm test:native-tauri-link
pnpm test:native-tauri-startup
cargo test --manifest-path src-tauri/Cargo.toml
```

macOS-only Swift parity check:

```bash
swift test --package-path markdown-editor/packages/swift
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
    SearchPanel.tsx               Spotlight search across open vault text/docs
    WeatherSnapshotDialog.tsx     explicit weather insertion UI
    Inspector.tsx                 properties and relationships
    sidebar/SidebarRail.tsx       collapsed left-column icon rail
    CommandPalette.tsx            command launcher
    ui/                           shadcn/ui primitives
  hooks/
    useVaultLoader.ts             entries, folders, views, git state
    useAppCommands.ts             keyboard/menu/command wiring
    useAppSave.ts                 save and rename coordination
    useSidebarColumnCollapse.ts   local collapsed-sidebar preference
    commands/                     command groups
  lib/
    appearance.ts                 theme/font contract
    fontConfig.ts                 local font assets and role mapping
    i18n.ts                       app translations
    themeMode.ts                  light/dark runtime
  utils/
    markdownSemanticsAdapter.ts       Tauri markdown semantics facade
    noteGraph.ts                  graph data model
    graphDisplay.ts               graph layout and filters
    weatherSnapshot.ts            weather markdown block generation
    wikilink.ts                   wikilink resolution
    typeColors.ts                 type accent colors

src-tauri/src/
  lib.rs                          command registration
  menu.rs                         native menu IDs
  menu_bar.rs                     optional native menu bar quick actions
  settings.rs                     app settings and sanitizers
  commands/                       Tauri command boundary
  vault/                          scanning, parsing, cache, views
  frontmatter/                    frontmatter write helpers
  git/                            git status/history/sync
  ai_agents.rs                    CLI agent facade
  claude_cli.rs                   Claude Code adapter
  mcp.rs                          MCP server support

markdown-editor/packages/swift/
  Sources/MarkdownEditor          Swift markdown semantics package
  Sources/MarkdownEditorTool      CLI bridge for parity experiments
  Fixtures/markdown-parity.json   shared Swift/Tauri fixture corpus

apps/apple/
  project.yml                     XcodeGen project source
  Sources/Shared                  SwiftUI/WebKit support shell shared by macOS/iOS
  Assets.xcassets                 Apple app icon catalog
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
- bundled font roles: `src/lib/fontConfig.ts` and `assets/fonts/`
- settings UI: `src/components/AppearanceSettingsSection.tsx`
- CSS tokens: `src/index.css`
- native sanitizer: `src-tauri/src/settings.rs`

Editor:

- rich mode: `src/components/SingleEditorView.tsx`
- raw mode: `src/components/RawEditorView.tsx`
- CodeMirror setup: `src/hooks/useCodeMirror.ts`
- markdown sync: `src/components/editorRawModeSync.ts`
- semantics facade: `src/utils/markdownSemanticsAdapter.ts`
- slash menu package: `markdown-editor/packages/js`
- baseline package consumer: `markdown-editor/apps/baseline-web`
- compatibility re-export: `src/components/grimoireEditorFormattingConfig.ts`
- Swift support package: `markdown-editor/packages/swift`

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
