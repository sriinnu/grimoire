# Grimoire

Grimoire is a local-first desktop app for Markdown vaults — notes, journals,
projects, linked knowledge, graph exploration, and Git-backed history, with AI
surfaces that show what they read and change.

Your vault is plain Markdown files and folders on disk. Open them in Grimoire,
in another editor, or straight from Git — nothing is locked in a proprietary
format.

Created and maintained by [Srinivas Pendela](https://x.com/sriinnu).

## Features

- Open any folder of Markdown as a vault; create, edit, rename, archive, trash,
  and search notes
- Rich Markdown and raw Markdown editing, with frontmatter, headings, tasks,
  code, math, links, images, and wikilinks
- Note properties, custom types, saved views, filters, and relationship
  groupings
- Backlinks, active-note neighborhoods, and a whole-vault graph
- Dashboard lanes for capture, reflection, organization, and recent work
- Git-backed history: inspect status, connect remotes, and review changes
- Import and export through the native vault layer
- Local AI surfaces (Claude Code, Codex, Chitragupta) that disclose their route
  and status

Grimoire runs natively via Tauri on macOS, Windows, and Linux, and in the
browser for quick UI review.

## Getting started

Requires Node.js 20+, pnpm 10+, and Git.

```bash
git clone https://github.com/sriinnu/grimoire.git
cd grimoire
corepack enable
pnpm install
```

Run in the browser — the fastest way to look around. It uses mock Tauri
handlers, so there is no real file IO:

```bash
pnpm dev
```

Run the native desktop app for real filesystem access, native menus, and
platform behavior. This needs Rust and your platform's desktop dependencies:

```bash
pnpm tauri dev
```

`pnpm doctor:source` checks your toolchain and prints what is missing for each
mode. Full setup details, including platform dependencies, are in
[docs/GETTING-STARTED.md](docs/GETTING-STARTED.md).

Prebuilt installers are not published yet — build from source for now.

## First run

On first launch Grimoire clones a starter vault from
https://github.com/sriinnu/grimoire-getting-started. Packaged builds also carry
a bundled fallback mirrored from `demo-vault-v2/` in this repository.

## Repository layout

```text
src/             React app: dashboard, editor, graph, settings
src-tauri/       Tauri commands, vault IO, native menus, bridges
markdown-editor/ Shared Markdown editor (JS + Swift parity packages)
mcp-server/      Bundled MCP bridge for the packaged app
demo-vault-v2/   Starter-vault mirror and product tour
docs/            Architecture, setup, and contracts
scripts/         Build, audit, and release tooling
```

## Development

```bash
pnpm lint
pnpm exec tsc --noEmit
pnpm test
pnpm build
cargo test --manifest-path src-tauri/Cargo.toml
```

See [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md) for the full workflow and
[AGENTS.md](AGENTS.md) for contributor conventions.

## Docs

- [Getting Started](docs/GETTING-STARTED.md) — setup and codebase map
- [Architecture](docs/ARCHITECTURE.md) — runtime shape and data flow
- [Abstractions](docs/ABSTRACTIONS.md) — core modules and contracts
- [Docs index](docs/README.md) — everything else

## Security

Report security issues privately as described in [SECURITY.md](SECURITY.md). Do
not commit API keys, signing keys, certificates, or private vault contents. For
other help see [SUPPORT.md](SUPPORT.md); conduct concerns go through
[CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).

## License

Grimoire's source code is licensed under AGPL-3.0-or-later. Your vault content —
notes, journals, attachments, and imported files — stays yours and is not
licensed by this repository. See [LICENSING.md](LICENSING.md) for the full
policy and the [trademark policy](TRADEMARKS.md) for the Grimoire name and
brand.
