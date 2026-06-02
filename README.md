<p align="center">
  <img src="assets/app-icon.png" width="120" alt="Grimoire app icon" />
</p>

<p align="center">
  <img alt="Repository visibility: public source" src="https://img.shields.io/badge/source-public-blue" />
  <img alt="Main CI: green on pinned OS matrix" src="https://img.shields.io/badge/main%20CI-green%20on%20pinned%20OS%20matrix-brightgreen" />
  <img alt="Public binary release: not published" src="https://img.shields.io/badge/public%20binary-not%20published-lightgrey" />
</p>

# Grimoire

Grimoire is a local-first memory workbench for people who want their notes,
journals, projects, graph, and AI collaborators to share the same durable
substrate: plain markdown, frontmatter, wikilinks, folders, and Git history.

It is not a hosted notes service. It is not a public installer yet. Today,
Grimoire is public source you can run, inspect, and help harden while the real
release blockers are tracked in the open.

Grimoire is created and maintained by **Srinivas Pendela**
([@sriinnu](https://x.com/sriinnu)).

## Why It Exists

Most tools split memory into disconnected surfaces: a journal here, a task list
there, a project folder somewhere else, and an AI chat that forgets the shape of
the work as soon as the session ends.

Grimoire keeps those surfaces together without hiding the data model. The app
can feel rich and native, but the long-lived contract stays boring on purpose:
files you can read, links you can grep, history you can diff, and vaults you can
carry elsewhere.

## What You Can Explore

- **Daily flow**: capture, reflect, organize, and crystallize notes with a
  review-oriented dashboard, quick capture, journals, dreams, events, and dated
  memory surfaces.
- **Vault workbench**: projects, people, procedures, decisions, tasks, sources,
  custom note types, frontmatter, saved views, filters, sorting, and columns.
- **Markdown editor**: BlockNote rich editing, raw CodeMirror editing, math,
  wikilinks, slash commands, code blocks, YAML, images, and shared markdown
  semantics across editor modes.
- **Graph and topography**: active-note neighborhood view, whole-vault graph,
  wikilink and relationship edges, type-colored nodes, filters, and large-vault
  caps.
- **Sidebar Spotlight search**: project-text search across the open vault,
  note-list search, metadata filters, and saved views.
- **Agent workspace**: Claude Code, Codex, and Chitragupta CLI panels with
  route/status disclosure. Chitragupta MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions remain readiness-gated contract work, not public-complete claims.
- **Native shell**: Tauri desktop app, local vault switching, macOS menu/window
  work, platform-specific settings copy, update-feed preferences, and source
  setup diagnostics.

## Current Truth

Snapshot date: 2026-06-02.

| Area | Current state |
| --- | --- |
| Source repository | Public. |
| Public binary installers | Not published. There is no public packaged release yet. |
| Update feeds | Not published. Stable and alpha feed URLs still return 404 until real release assets are generated and deployed. |
| Local macOS source/dev | Locally exercised and the active development host. |
| Windows source/dev | Known cfg and SQLite link failures were fixed in source, and hosted Windows Build has passed, but fresh manual `pnpm tauri dev`, `pnpm tauri build`, and `.exe` launch proof is still required. |
| Linux source/dev | Intended source target with documented Tauri dependencies, pending fresh platform QA. |
| Hosted CI | Live-audited. Latest `main` CI is green on pinned macOS, Ubuntu, and Windows runners; rerun the public-readiness audit before making public claims. |
| Release readiness | Blocked by missing release secrets, missing GitHub Releases, and missing update feeds. |

Run the live audit before advertising Grimoire publicly:

```bash
pnpm audit:public-readiness -- --branch main
```

The active readiness notes live in
[docs/PUBLIC-READINESS.md](docs/PUBLIC-READINESS.md). The release operator
checklist is [docs/RELEASE-RUNBOOK.md](docs/RELEASE-RUNBOOK.md).

## Run From Source

Public binary installers are not published yet. For now, run Grimoire from the
source tree.

```bash
corepack enable
pnpm install
pnpm doctor:source
pnpm dev
```

Browser source mode needs Node, pnpm 10+, and Git. It runs the app through Vite
and is the fastest way to inspect most UI behavior.

Run the native desktop app:

```bash
pnpm tauri dev
```

Native Tauri mode also needs Rust and platform-specific desktop dependencies.
`pnpm doctor:source` separates browser source readiness from native desktop
readiness so setup failures are easier to diagnose.

On Windows, the doctor checks for the MSVC Rust host and Microsoft C++ Build
Tools (`cl.exe`), and it warns when the evergreen WebView2 runtime is not
detected. Earlier Windows source runs exposed macOS-only menu/reopen guards and
a missing `sqlite3.lib` linker dependency. For those issues, the current source tree contains guards for those paths and bundles SQLite through `rusqlite` instead of requiring a separate Windows
SQLite import library, but fresh Windows native launch evidence is still
required before this README can call Windows verified.

On Linux, the doctor checks pkg-config visibility for WebKitGTK 4.1, GTK 3, libsoup 3, JavaScriptCoreGTK
4.1, libxdo/xdo, OpenSSL, librsvg, and AppIndicator/Ayatana.

Linux and Windows are source-build targets, not public-support claims, until hosted CI and platform QA prove them on those operating systems.

Full setup notes and Linux package examples are in
[Getting Started](docs/GETTING-STARTED.md).

## Starter Vault

The first-run Getting Started flow clones this public starter vault:

https://github.com/sriinnu/grimoire-getting-started

If GitHub is unavailable, packaged apps fall back to the bundled
`starter-vault` resource. In this repository, `demo-vault-v2/` is the tracked
mirror used for tests, development, and review.

The starter vault is both a showcase and a QA fixture. It demonstrates real
surfaces in the app, but it is not proof that every surface is feature-complete.

## AI And Privacy

Grimoire is local-first. Vault contents live in folders you choose, not in a
hosted Grimoire account. API keys, signing keys, certificates, local vault
contents, and machine-specific config should never be committed.

Agent surfaces are intentionally explicit about boundaries. CLI chat panels and
external-provider settings are not the same thing as finished Chitragupta MCP
memory or source-backed write tooling. When those contracts are public-ready,
the readiness doc should say so with tests and live evidence.

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
pnpm test:starter-vault
cargo test --manifest-path src-tauri/Cargo.toml
```

Before a public release tag:

```bash
pnpm release:preflight
pnpm audit:public-readiness -- --branch main
node scripts/scan-secrets.mjs --all
```

`pnpm release:preflight` checks release workflow wiring, GitHub Pages, and the
required secret names for signed/notarized macOS release artifacts. It does not
print secret values.

## Documentation

- [Docs Index](docs/README.md) - curated public documentation map
- [Getting Started](docs/GETTING-STARTED.md) - local setup and codebase map
- [Public Readiness](docs/PUBLIC-READINESS.md) - current release blockers and
  verification commands
- [Release Runbook](docs/RELEASE-RUNBOOK.md) - release secrets, signed tags,
  workflow checks, and post-release verification
- [Architecture](docs/ARCHITECTURE.md) - runtime shape and data flow
- [Abstractions](docs/ABSTRACTIONS.md) - durable module and product contracts
- [Markdown Semantics](docs/MARKDOWN-SEMANTICS-CONTRACT.md) - shared markdown
  and slash-command behavior
- [Vision](docs/VISION.md) - product direction
- [Differentiation](docs/GRIMOIRE-DIFFERENTIATION.md) - what makes Grimoire its
  own product
- [Enhancements](ENHANCEMENTS.md) - roadmap and research tracks
- [ADRs](docs/adr) - architecture decision records

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
