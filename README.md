<p align="center">
  <img src="assets/app-icon.png" width="120" alt="Grimoire app icon" />
</p>

<p align="center">
  <img alt="Repository visibility: public source" src="https://img.shields.io/badge/source-public-blue" />
  <img alt="Main CI: not green yet" src="https://img.shields.io/badge/main%20CI-not%20green%20yet-orange" />
  <img alt="Public binary release: not published" src="https://img.shields.io/badge/public%20binary-not%20published-lightgrey" />
</p>

# Grimoire

Grimoire is a local-first memory studio for journals, project work, graph
sensemaking, markdown editing, and AI collaborators that can read the same vault
structure you do.

It is not a public installer yet. It is not a hosted notes service. It is source
you can run today, with public-release blockers tracked openly.

Grimoire is created and maintained by **Srinivas Pendela**
([@sriinnu](https://x.com/sriinnu)).

## What It Is

Grimoire keeps the durable contract boring on purpose: markdown files,
frontmatter, wikilinks, local folders, and Git history. The app adds richer
surfaces on top of that structure:

- **Daily memory**: quick capture, journals, dreams, dated notes, weather/time
  context, and review-oriented workflows.
- **Workbench**: projects, people, procedures, decisions, sources, tasks,
  frontmatter, saved views, and typed notes.
- **Editor**: BlockNote rich editing, raw CodeMirror editing, markdown math,
  wikilinks, slash commands, code blocks, YAML, images, and shared markdown
  semantics.
- **Graph**: active-note Neighborhood mode, whole-vault graph mode, relationship
  and wikilink edges, type-colored nodes, filters, and large-vault caps.
- **Search**: sidebar Spotlight search across open-vault text/docs, note-list
  search, filters, custom columns, sorting, and saved views.
- **AI workspace**: Claude Code, Codex, and Chitragupta CLI panels with
  route/status disclosure. Chitragupta MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions remain readiness-gated contract work.
- **Native shell**: Tauri desktop app, macOS menu/window work, platform-specific
  settings copy, update-feed preferences, local-only vault support, and a source
  doctor for development setup.

## Current Truth

| Area | Current state |
| --- | --- |
| Source repository | Public. |
| Public binary installers | Not published. There is no public packaged release yet. |
| Update feeds | Not published. Stable and alpha feed URLs still 404 until real release assets are generated. |
| Local macOS source/dev | Locally exercised and the active development host. |
| Windows source/dev | Known cfg and SQLite link failures were fixed in source, and hosted Windows Build has passed, but fresh manual `pnpm tauri dev`, `pnpm tauri build`, and `.exe` launch proof is still required. |
| Linux source/dev | Intended source target with documented Tauri dependencies, pending fresh platform QA. |
| Hosted CI | Live-audited, not hardcoded here. Latest `main` is still not green yet; readiness-branch CI must be checked with the audit command before making public claims. |
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

Browser source mode needs Node, pnpm 10+, and Git. It runs the app in Vite mock
mode and is the fastest way to inspect most UI behavior.

Run the native desktop app:

```bash
pnpm tauri dev
```

Native Tauri mode also needs Rust and platform-specific desktop dependencies.
On Windows, `pnpm doctor:source` checks for the MSVC Rust host and Microsoft C++
Build Tools (`cl.exe`), and it warns when the evergreen WebView2 runtime is not
detected. On Linux, the doctor checks pkg-config visibility for WebKitGTK 4.1, GTK 3, libsoup 3, JavaScriptCoreGTK
4.1, libxdo/xdo, OpenSSL, librsvg, and AppIndicator/Ayatana.

Linux and Windows are source-build targets, not public-support claims, until hosted CI and platform QA
prove them on those operating systems. On Windows,
earlier source runs exposed macOS-only menu/reopen guards and a missing
`sqlite3.lib` linker dependency. For those issues, the current source tree contains guards for those paths
and bundles SQLite through `rusqlite` instead of requiring a separate Windows
SQLite import library, but fresh Windows native launch evidence is still
required before this README can call Windows verified.

Linux package examples and the fuller codebase map are in
[Getting Started](docs/GETTING-STARTED.md).

## Starter Vault

The first-run Getting Started flow clones this public starter vault:

https://github.com/sriinnu/grimoire-getting-started

If GitHub is unavailable, packaged apps fall back to the bundled
`starter-vault` resource. In this repository, `demo-vault-v2/` is the tracked
mirror used for tests, development, and review.

The starter vault is a showcase and QA fixture. It demonstrates real surfaces,
but it is not proof that every surface is feature-complete.

## Development Checks

Useful local checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm test:public-doc-links
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
