<p align="center">
  <img src="assets/app-icon.png" width="120" alt="Grimoire app icon" />
</p>

<p align="center">
  <img alt="Repository visibility: public source" src="https://img.shields.io/badge/source-public-blue" />
  <img alt="Main CI: green on pinned OS matrix" src="https://img.shields.io/badge/main%20CI-green%20on%20pinned%20OS%20matrix-brightgreen" />
  <img alt="Public binary release: not published" src="https://img.shields.io/badge/public%20binary-not%20published-lightgrey" />
</p>

# Grimoire

Grimoire is a local operating system for thought: a Markdown vault, journal,
graph, writing surface, project workbench, and inspectable AI workspace built
around files you own.

The durable contract is intentionally boring: plain Markdown, YAML
frontmatter, wikilinks, folders, attachments, and Git history. The app can be
rich and native, but the data should stay readable in another editor years from
now.

It is not a hosted notes service. It is not an Obsidian clone. It is not a
chatbot with a file picker. Today, Grimoire is public source you can run,
inspect, and help harden while the remaining release blockers are tracked in
the open.

Created and maintained by **Srinivas Pendela**
([@sriinnu](https://x.com/sriinnu)).

## Product Shape

Most tools split memory into disconnected surfaces: a journal here, a task list
there, a project folder somewhere else, and an AI chat that forgets the shape of
the work as soon as the session ends.

Grimoire tries to keep those surfaces together:

| Lens | What it is for |
| --- | --- |
| Daily Flow | Capture, reflect, organize, and crystallize notes without leaving the dashboard. |
| Vault Workbench | Projects, people, procedures, decisions, sources, tasks, custom note types, saved views, filters, and columns. |
| Markdown Studio | Rich BlockNote editing, raw CodeMirror editing, wikilinks, math, code, frontmatter, images, slash commands, and shared Markdown semantics. |
| Graph And Topography | Active-note neighborhoods, whole-vault graph views, relationship edges, type-colored nodes, filters, and large-vault caps. |
| Sidebar Spotlight | Project-text search across the open vault, note-list search, metadata filters, saved views, and command entry points. |
| Agent Workspace | Claude Code, Codex, and Chitragupta CLI panels with route/status disclosure and review-gated boundaries. |
| Native Shell | Tauri desktop app, vault switching, macOS menu/window work, platform-specific settings copy, update-feed preferences, and source setup diagnostics. |

The AI surface is deliberately conservative. CLI panels and provider settings
exist, but Chitragupta MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions remain readiness-gated contract work, not public-complete claims.

## What Makes It Different

- **Files stay sovereign.** Markdown, frontmatter, folders, attachments,
  wikilinks, and Git are the durable model. The app should make the vault
  richer without trapping it.
- **Daily work has a shape.** Capture, reflection, organization, and
  crystallization live in the same surface as projects, notes, graph, and
  review.
- **Markdown is a shared contract.** The editor, slash commands, raw mode, and
  native semantics package are tested against common Markdown behavior instead
  of drifting into separate editors.
- **AI is inspectable.** Agent panels show routes, readiness, provider
  boundaries, and missing contracts instead of pretending every external tool is
  already safe to use on a private vault.
- **The starter vault is a product fixture.** The public Getting Started vault
  is both a tour and a regression target, so the shipped story has files behind
  it.

## Current Status

Snapshot date: 2026-06-03.

| Area | Truth |
| --- | --- |
| Source repository | Public. |
| Public binary installers | Not published. There is no public packaged release yet. |
| Update feeds | Not published. Stable and alpha feed URLs return 404 until real release assets are generated and deployed. |
| Local macOS source/dev | Locally exercised and the active development host. |
| Windows source/dev | Known cfg and SQLite link failures were fixed in source. Hosted Windows native link and startup smokes now build the Tauri Rust binary and launch the source-mode process to its Rust entry point, but fresh manual `pnpm tauri dev`, `pnpm tauri build`, and `.exe` launch proof is still required. |
| Linux source/dev | Intended source target with documented Tauri dependencies and hosted native link plus startup smoke under Xvfb. Fresh platform launch QA is still required. |
| Hosted CI | Live-audited. Latest `main` CI is green on pinned macOS, Ubuntu, and Windows runners; rerun the public-readiness audit before making public claims. |
| Release readiness | Cross-platform release jobs are configured, but public release is still blocked by missing release secrets, missing GitHub Releases, missing update feeds, and missing tagged platform launch proof. |

Before advertising Grimoire publicly, run the live audit:

```bash
pnpm audit:public-readiness -- --branch main
```

The active readiness notes live in
[docs/PUBLIC-READINESS.md](docs/PUBLIC-READINESS.md). The release operator
checklist is [docs/RELEASE-RUNBOOK.md](docs/RELEASE-RUNBOOK.md).

## Run From Source

Public binary installers are not published yet. For now, run Grimoire from
source.

```bash
git clone https://github.com/sriinnu/grimoire.git
cd grimoire
corepack enable
pnpm install
pnpm doctor:source -- --mode browser
pnpm dev
```

Browser source mode needs Node, pnpm 10+, and Git. It runs the app through Vite
and is the fastest way to inspect UI behavior without opening the Tauri shell.

To run the native desktop app:

```bash
pnpm doctor:source -- --mode native
pnpm tauri dev
```

Native Tauri mode also needs Rust and platform-specific desktop dependencies.
`pnpm doctor:source` defaults to checking both modes, while `--mode browser`
checks only the prerequisites needed for `pnpm dev`.

On Windows, the doctor checks for the MSVC Rust host and Microsoft C++ Build
Tools (`cl.exe`), and it warns when the evergreen WebView2 runtime is not
detected. Earlier Windows source runs exposed macOS-only menu/reopen guards and
a missing `sqlite3.lib` linker dependency. For those issues, the current source tree contains guards for those paths and bundles SQLite through `rusqlite` instead of requiring a separate Windows
SQLite import library.

Hosted CI also runs `pnpm test:native-tauri-link`, which executes:

```bash
cargo build --manifest-path=src-tauri/Cargo.toml --no-default-features --locked
```

It also runs `pnpm test:native-tauri-startup`, which launches the source-mode
Tauri process with a temporary home directory and waits for the native
`GRIMOIRE_NATIVE_STARTUP_SMOKE_READY process_entry=true` marker before exiting.
Those smokes run on the pinned macOS, Windows, and Linux CI matrix so Windows
link and process-entry regressions fail before merge. Fresh Windows native
interactive launch evidence is still required before this README can call
Windows verified.

On Linux, the doctor checks pkg-config visibility for WebKitGTK 4.1, GTK 3, libsoup 3, JavaScriptCoreGTK
4.1, libxdo/xdo, OpenSSL, librsvg, and AppIndicator/Ayatana.

Linux and Windows now have tagged-release workflow jobs, but they are still not public-support claims until signed artifacts, updater feeds, and fresh platform QA prove them on those operating systems.

Full setup notes and Linux package examples are in
[Getting Started](docs/GETTING-STARTED.md).

## Starter Vault And Demo

The first-run Getting Started flow clones this public starter vault:

https://github.com/sriinnu/grimoire-getting-started

If GitHub is unavailable, packaged apps fall back to the bundled
`starter-vault` resource. In this repository, `demo-vault-v2/` is the tracked
mirror used for tests, development, and review.

The starter vault is both a showcase and a QA fixture. It includes editable
notes for the feature tour, Markdown learning, properties and types, Sidebar
Spotlight, wikilinks, journal and dream lanes, calendar/time metadata, canvas
and attachments, audio transcription, local agents, privacy, portability, and
themes.

This is structural proof that the tour content exists and links together. It is
not proof that every advertised surface is feature-complete.

```bash
pnpm test:starter-vault
```

## AI And Privacy

Grimoire is local-first. Vault contents live in folders you choose, not in a
hosted Grimoire account. API keys, signing keys, certificates, local vault
contents, and machine-specific config should never be committed.

Agent surfaces are intentionally explicit about boundaries. CLI chat panels and
external-provider settings are not the same thing as finished Chitragupta MCP
memory or source-backed write tooling. When those contracts are public-ready,
the readiness doc should say so with tests and live evidence.

## Repository Map

```text
src/                         React app, editor shell, dashboard, graph, settings
src-tauri/src/               Tauri commands, vault IO, native menus, bridge code
markdown-editor/packages/js  Shared JavaScript Markdown editor package
markdown-editor/packages/swift
                             Swift Markdown semantics package and parity bridge
demo-vault-v2/               Tracked starter-vault mirror and feature tour
docs/                        Architecture, setup, readiness, release, contracts
scripts/                     Audits, release checks, source doctor, doc guards
```

## Development Checks

Useful local checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm test:public-doc-links
pnpm test:public-readiness-docs
pnpm test:rust-platform-guards
pnpm test:native-tauri-link
pnpm test:native-tauri-startup
pnpm test:starter-vault
cargo test --manifest-path src-tauri/Cargo.toml
```

Before a public release tag, run:

```bash
pnpm release:preflight
pnpm audit:public-readiness -- --branch main
node scripts/scan-secrets.mjs --all
```

`pnpm release:preflight` checks release workflow wiring, GitHub Pages, and the
required secret names for signed/notarized macOS release artifacts. It does not
print secret values.

## Documentation

- [Docs Index](docs/README.md) - curated public documentation map.
- [Getting Started](docs/GETTING-STARTED.md) - local setup and codebase map.
- [Public Readiness](docs/PUBLIC-READINESS.md) - current release blockers and
  verification commands
- [Release Runbook](docs/RELEASE-RUNBOOK.md) - release secrets, signed tags,
  workflow checks, and post-release verification
- [Architecture](docs/ARCHITECTURE.md) - runtime shape and data flow.
- [Abstractions](docs/ABSTRACTIONS.md) - durable module and product contracts.
- [Markdown Semantics](docs/MARKDOWN-SEMANTICS-CONTRACT.md) - shared markdown
  and slash-command behavior
- [Vision](docs/VISION.md) - product direction.
- [Differentiation](docs/GRIMOIRE-DIFFERENTIATION.md) - what makes Grimoire its
  own product
- [Enhancements](ENHANCEMENTS.md) - roadmap and research tracks.
- [ADRs](docs/adr) - architecture decision records.

## Security

Report security issues privately as described in [SECURITY.md](SECURITY.md).
Do not commit API keys, signing keys, certificates, local vault contents, or
machine-specific config.

## License

Grimoire's source code is licensed under AGPL-3.0-or-later. User vaults,
journals, dreams, notes, attachments, and imported files remain owned by their
creators and are not licensed by this repository.

See [LICENSING.md](LICENSING.md) for the full project policy. The Grimoire name,
logo, app icon, wordmark, and brand assets remain covered by the
[trademark policy](TRADEMARKS.md).
