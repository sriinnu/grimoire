# Grimoire

Grimoire is a local-first desktop app for Markdown vaults. It is for notes,
journals, projects, linked knowledge, graph exploration, Git-backed history,
import/export work, and AI surfaces that disclose what they are doing.

The source repository is public. Public binary installers are not published yet.
There is no public packaged release yet. Treat this README as a
source-evaluation guide, not a download page or release certificate.
GitHub `/releases/latest` points at the latest source-evaluation release until
signed stable/alpha installer releases exist.

Static status badges, kept as factual labels rather than release proof:

![Repository visibility: public source](https://img.shields.io/badge/source-public-blue)
![Main CI: green on pinned OS matrix](https://img.shields.io/badge/main%20CI-green%20on%20pinned%20OS%20matrix-brightgreen)
![Public binary release: not published](https://img.shields.io/badge/public%20binary-not%20published-lightgrey)

Created and maintained by **Srinivas Pendela**
([@sriinnu](https://x.com/sriinnu)).

## What Grimoire Is

Grimoire keeps the durable model boring on purpose:

- Markdown files and folders
- YAML frontmatter
- wikilinks and backlinks
- attachments beside the notes that use them
- Git history when the vault is Git-backed
- local vault state that can still be inspected outside the app

The product shorthand is "a local operating system for thought", but the actual
contract is simpler: own the files, open them locally, and keep app/AI behavior
reviewable.

Grimoire is not a hosted notes service. It is not a public SaaS product. It is
not a chatbot that happens to read a folder. The useful thing here is the app
shape plus the source-level proof around local files, Markdown semantics,
native shell behavior, and explicit AI boundaries.

## What It Does Today

Current source-mode surfaces include:

- open and work against a Markdown vault
- create, edit, save, rename, archive, trash, and search notes
- edit in rich Markdown or raw Markdown modes
- parse frontmatter, headings, tasks, code, math, links, images, and wikilinks
- show note properties, custom types, saved views, filters, and relationship
  groupings
- navigate backlinks, active-note neighborhoods, and whole-vault graph views
- use dashboard lanes for capture, reflection, organization, crystallization,
  journal/demo flows, and recent work
- inspect Git status, connect remotes explicitly, and use Git-backed vault
  history where configured
- import/export through the source tree's Tauri vault command layer
- run browser source mode for quick UI/product review
- run native Tauri source mode for local folder access, file IO, menus, and
  platform-specific behavior on the current machine
- show Claude Code, Codex, and Chitragupta CLI surfaces with route/status
  disclosure instead of pretending every AI bridge is complete

The starter vault and product tour are editable Markdown fixtures, not a hidden
marketing site. They are useful because each public-facing claim should point
back to a note, file, command, test, or readiness boundary.

## What Is Not Ready

As of the live `main` readiness audit run on 2026-06-04:

- Hosted CI: Live-audited. Latest `main` CI is green on pinned macOS, Ubuntu, and Windows runners; rerun the public-readiness audit before making public claims.
- no stable GitHub Release exists
- no alpha GitHub Release exists
- the latest GitHub Release may be source-only; it is not installer or updater
  evidence
- stable and alpha update feeds return HTTP 404
- release preflight is blocked by missing release secrets
- public binary installers are not published
- Windows and Linux have hosted source link/startup smokes, but still need fresh
  interactive native launch and packaged-launch proof before they can be called
  public support targets
- Linux and Windows now have tagged-release workflow jobs, but they are still not public-support claims until signed artifacts, updater feeds, and fresh platform QA prove them on those operating systems
- Chitragupta MCP memory, recall, wiki, graph, ingest, diagnostics, and source-backed write suggestions remain readiness-gated contract work

The current public-release truth lives in
[docs/PUBLIC-READINESS.md](docs/PUBLIC-READINESS.md). Recheck the live state
before making public claims:

```bash
pnpm audit:public-readiness -- --branch main
```

That command is expected to fail until releases, feeds, secrets, and launch proof
exist.

## Run From Source

Browser source mode is the fastest way to inspect product shape:

```bash
git clone https://github.com/sriinnu/grimoire.git
cd grimoire
corepack enable
pnpm install
pnpm doctor:source -- --mode browser
pnpm dev
```

Browser mode runs through Vite and mock Tauri handlers. It is good for UI,
editor, graph, search, settings copy, and product-tour review. It is not native
file-IO proof. Browser source mode needs Node, pnpm 10+, and Git.

Native source mode runs the Tauri shell:

```bash
pnpm doctor:source -- --mode native
pnpm tauri dev
```

Native mode needs Rust plus platform desktop dependencies. It is the lane for
folder picking, real filesystem writes, native menus, platform copy, and bridge
status. It still does not prove signed installers, updater feeds, notarization,
or packaged Windows/Linux/macOS launch support.

On Windows, the doctor checks for the MSVC Rust host and Microsoft C++ Build
Tools (`cl.exe`), and it warns when the evergreen WebView2 runtime is not
detected.

Earlier Windows source runs exposed macOS-only menu/reopen guards and a missing
`sqlite3.lib` linker dependency. For those issues, the current source tree contains guards for those paths and bundles SQLite through `rusqlite` instead of requiring a separate Windows
SQLite import library.

On Linux, the doctor checks pkg-config visibility for WebKitGTK 4.1, GTK 3, libsoup 3, JavaScriptCoreGTK 4.1, libxdo/xdo, OpenSSL, librsvg, and AppIndicator/Ayatana.

Full setup details are in [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md).
For a guided evaluation path, use
[docs/SOURCE-EVALUATION-PLAYBOOK.md](docs/SOURCE-EVALUATION-PLAYBOOK.md).

## Starter Vault

The first-run Getting Started flow clones the public starter vault:

https://github.com/sriinnu/grimoire-getting-started

Packaged apps also carry a bundled `starter-vault/` fallback sourced from this
repository's tracked `demo-vault-v2/` mirror. The public starter repo is the
runtime onboarding template; `demo-vault-v2/` is the in-repo mirror used for
tests, development, and offline packaged fallback.

Validate the starter story with:

```bash
pnpm test:starter-vault
```

This proves the showcase structure exists, links together, and matches the
tracked/public mirror contract. It does not prove every advertised app surface is
feature-complete.

## Repository Map

```text
src/                         React app, dashboard, editor shell, graph, settings
src-tauri/src/               Tauri commands, vault IO, native menus, bridge code
markdown-editor/packages/js  Shared JavaScript Markdown editor package
markdown-editor/packages/swift
                             Swift Markdown semantics package and parity bridge
mcp-server/                  Bundled MCP bridge package for packaged app lookup
demo-vault-v2/               Tracked starter-vault mirror and product tour
docs/                        Architecture, setup, readiness, release, contracts
scripts/                     Audits, release checks, source doctor, doc guards
```

## Checks

Useful docs/source checks:

```bash
pnpm test:public-doc-links
pnpm test:public-readiness-docs
pnpm test:starter-vault
pnpm audit:public-readiness -- --branch main
pnpm test:source-release-notes
```

Broader local checks:

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
pnpm test:native-tauri-link
pnpm test:native-tauri-startup
cargo test --manifest-path src-tauri/Cargo.toml
```

Release-side checks, when release work is actually in scope:

```bash
pnpm release:preflight
node scripts/scan-secrets.mjs --all
pnpm release:verify-artifacts
```

`pnpm release:preflight` checks release workflow wiring, GitHub Pages, and
required secret names. It does not print secret values and it is not a substitute
for publishing real releases and feeds.

## Docs

- [Docs Index](docs/README.md) - public docs index.
- [docs/PRODUCT-TOUR.md](docs/PRODUCT-TOUR.md) - what to try first and what each
  source-mode check proves.
- [docs/PUBLIC-READINESS.md](docs/PUBLIC-READINESS.md) - current release blockers
  and verification commands.
- [Release Runbook](docs/RELEASE-RUNBOOK.md) - operator checklist for
  signed releases, secrets, workflows, and feeds.
- [docs/RELEASE-RUNBOOK.md](docs/RELEASE-RUNBOOK.md) - direct runbook path for
  release-readiness references.
- [docs/SOURCE-EVALUATION-PLAYBOOK.md](docs/SOURCE-EVALUATION-PLAYBOOK.md) -
  browser/native evaluation boundaries.
- [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) - local setup and codebase
  map.
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - runtime shape and data flow.
- [docs/ABSTRACTIONS.md](docs/ABSTRACTIONS.md) - durable module and product
  contracts.
- [docs/MARKDOWN-SEMANTICS-CONTRACT.md](docs/MARKDOWN-SEMANTICS-CONTRACT.md) -
  shared Markdown and slash-command behavior.
- [docs/CHITRAGUPTA-GRIMOIRE-MCP-CONTRACT.md](docs/CHITRAGUPTA-GRIMOIRE-MCP-CONTRACT.md)
  - Chitragupta boundary and readiness-gated MCP contract.
- [docs/adr](docs/adr) - architecture decision records.

## Security

Report security issues privately as described in [SECURITY.md](SECURITY.md).
Do not commit API keys, signing keys, certificates, local vault contents, or
machine-specific config.

Public issues should not include private vault content, credentials, signing
keys, personal journals, diary entries, dream notes, or private attachments.
For non-security help, use [SUPPORT.md](SUPPORT.md). Conduct concerns are
handled through [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Grimoire's source code is licensed under AGPL-3.0-or-later. User vaults,
journals, dreams, notes, attachments, and imported files remain owned by their
creators and are not licensed by this repository.

See [LICENSING.md](LICENSING.md) for the full project policy. The Grimoire name,
logo, app icon, wordmark, and brand assets remain covered by the
[trademark policy](TRADEMARKS.md).
