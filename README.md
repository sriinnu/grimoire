<p align="center">
  <img src="assets/app-icon.png" width="120" alt="Grimoire app icon" />
</p>

<p align="center">
  <img alt="Repository visibility: private until public readiness passes" src="https://img.shields.io/badge/repository-private%20until%20ready-lightgrey" />
  <img alt="Hosted CI: blocked by billing or spending limit" src="https://img.shields.io/badge/hosted%20CI-billing%2Fspending%20limit-red" />
  <img alt="Public binary release: not published" src="https://img.shields.io/badge/public%20binary-not%20published-lightgrey" />
</p>

# Grimoire

Grimoire is a local-first memory workspace for journals, project thinking, graph navigation, and AI collaborators.

The core idea is simple: your notes stay as markdown files, but the app gives them enough shape to become a living operating space. A day note can hold weather and mood. A project note can connect people, decisions, meetings, and code. The graph can show what surrounds the current thought. Local agents can read the same structure without needing a hosted database.

Grimoire is created and maintained by **Srinivas Pendela** ([@sriinnu](https://x.com/sriinnu)).

## Product Spine

Grimoire is built around five surfaces:

- **Journal**: local-first dated notes, long-form reflection, weather/context
  snapshots, dreams, and review patterns; the fuller weekly/monthly review
  surfaces are still a next product bet.
- **Workbench**: projects, people, procedures, decisions, sources, and typed notes.
- **Graph**: local neighborhood first, whole-vault map when needed, with relationship-aware filters.
- **Memory**: Git history, backlinks, frontmatter, and agent-readable structure.
- **Native studio**: theme, typography, motion, and macOS behavior treated as product quality, not decoration.

## What Makes Grimoire Different

**The journal is not an afterthought.** Grimoire treats dated notes, dreams,
weather/time context, and reflective writing as first-class knowledge, not loose
text beside the "real" database. Richer review surfaces are part of the public
roadmap, not a packaged-release claim yet.

**The graph starts from the active thought.** The first graph view is the neighborhood around what you are touching now. Whole-vault mode exists, but the product bias is sensemaking, not drawing a pretty hairball.

**Agents read the same world you do.** Frontmatter, wikilinks, relationships, files, and Git history are meant to be legible to local AI tools without turning the vault into a black-box database.

**Markdown remains the contract.** Rich editing, raw editing, math, wikilinks, code blocks, YAML, images, and future exports must preserve understandable markdown.

**The app should feel crafted.** Themes, typography, spacing, animation, graph rendering, keyboard flow, and native macOS behavior are part of the core promise.

## Current Status

- Public readiness is tracked separately in
  [docs/PUBLIC-READINESS.md](docs/PUBLIC-READINESS.md). As of 2026-06-01,
  Grimoire is not ready to make public for general users because hosted CI is
  blocked before checkout/build/test by the GitHub Actions billing or spending
  limit, and no public binary release exists yet.
- Local vault opening and onboarding
- Starter vault clone flow implemented with a public starter repository
- Sidebar filters, folders, type sections, favorites, archive, inbox, and changes
- Sidebar Spotlight search across open vault text/docs, note list search,
  custom columns, sorting, saved views, and Neighborhood mode
- BlockNote rich editor with package-owned slash commands, markdown-compatible math, wikilinks, `#` tag/collection autocomplete, code blocks, formatting, and raw CodeMirror mode
- Inspector for frontmatter, relationships, backlinks, instances, note metadata, and git history
- Knowledge graph with local/vault scope, relationship/wikilink edge filters, type-colored nodes, and large-vault caps
- Weather snapshot command for journal entries using explicit user-provided location
- Claude Code, Codex, and Chitragupta CLI agent panel with route/status disclosure; Chitragupta MCP memory, recall, wiki, graph, ingest, and diagnostics remain readiness-gated contract work
- Git history, commit/push/pull/conflict flows, and local-only Git repositories without a remote
- Light/dark mode, multiple theme presets, and editor font choices
- English and Simplified Chinese UI foundations

## Next Product Bets

- Editor find/replace with a real command contract across rich, raw, and native menus
- Daily notes, templates, weather/time context, and weekly/monthly review surfaces
- Graph clustering, pinned nodes, minimap, incoming-link filters, and semantic suggestions
- Vault image previews, file actions, QuickLook, and better drag/drop behavior
- Theme studio with UI font, heading font, monospace font, line height, editor width, contrast, and motion controls
- Tauri-first editor product with SwiftUI/AppKit support only where Apple-native integration clearly beats the webview path

## Getting Started

There is no public packaged release yet. The previous `Grimoire.app.tar.gz`
link has been removed because GitHub currently has no latest Grimoire release
asset to download.

For now, run Grimoire from source:

```bash
corepack enable
pnpm install
pnpm doctor:source
pnpm dev
```

For the native desktop app:

```bash
pnpm tauri dev
```

The in-app Getting Started vault flow points to:

https://github.com/sriinnu/grimoire-getting-started

That repository is public and contains the starter vault used by the
first-run flow. The tracked `demo-vault-v2/` folder in this repository mirrors
the same showcase content for tests, local development, and review.

## Local Development

Prerequisites:

- Node.js 20+
- pnpm 10+ through Corepack
- Rust stable
- macOS for locally verified source development
- Linux or Windows for intended source development, pending fresh platform QA

Public binary installers are not published yet. The tracked release workflow is
currently macOS-only once signing secrets are configured; Linux and Windows are
source-build targets, not public-support claims, until hosted CI and platform QA
prove them on those operating systems.

Install and run browser mock mode:

```bash
pnpm install
pnpm dev
```

Run the native desktop app:

```bash
pnpm tauri dev
```

Windows native development is not public-ready yet. A Windows `pnpm tauri dev`
run on `main` reported macOS-only Rust cfg errors around the menu bar and reopen
handlers; this branch contains those cfg guards, but a fresh Windows run still
needs to be captured before the README can call Windows verified.

Check that this machine is ready for source development:

```bash
pnpm doctor:source
```

The doctor separates browser source mode from native Tauri mode. Browser mode
needs Node, pnpm, and Git; native mode also needs Rust and platform-specific
Tauri dependencies. If native mode is blocked on Linux, install the packages in
[docs/GETTING-STARTED.md](docs/GETTING-STARTED.md).

Audit public-release truth before advertising Grimoire to general users:

```bash
pnpm audit:public-readiness -- --branch main
```

That command checks repository visibility, discovery topics, starter vault
access, latest GitHub Actions state, GitHub Release assets, update feeds, and
README/public-readiness wording. It is expected to fail until the public
release blockers in `docs/PUBLIC-READINESS.md` are resolved.

Check public-facing Markdown links before publishing docs:

```bash
pnpm test:public-doc-links
```

Before cutting a tagged release, check the live release prerequisites:

```bash
pnpm release:preflight
```

That command verifies release workflow wiring, GitHub Pages, and the required
repo secret names for signed and notarized macOS artifacts. It does not print
secret values.

Build and install a local macOS app bundle:

```bash
pnpm macos:build-app
pnpm macos:install-built-app
```

The local macOS build script cleans generated Tauri bundles first, builds a fresh
app-only bundle, ad-hoc signs it for local use, and verifies that the packaged
app icon matches `src-tauri/icons/icon.icns`. Release DMGs and updater tarballs
must be produced by the tracked release workflow, verified with
`pnpm release:verify-artifacts`, and published through the generated release
Pages lane before the app advertises public updates.

Linux Tauri dependencies are listed in [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md).

## Documentation

- [Docs Index](docs/README.md) - curated public documentation map
- [Architecture](docs/ARCHITECTURE.md) - runtime shape, platform boundaries, data flow
- [Abstractions](docs/ABSTRACTIONS.md) - durable concepts and module contracts
- [Markdown Semantics](docs/MARKDOWN-SEMANTICS-CONTRACT.md) - shared markdown and slash-command contract
- [Platform Roadmap](docs/PLATFORM-NATIVE-ENHANCEMENT-ROADMAP.md) - Tauri-first editor roadmap and Mem/Bear/Obsidian/Notion direction
- [Getting Started](docs/GETTING-STARTED.md) - local setup and codebase map
- [Vision](docs/VISION.md) - product direction
- [Differentiation](docs/GRIMOIRE-DIFFERENTIATION.md) - how Grimoire stays its own product
- [Enhancements](ENHANCEMENTS.md) - prioritized roadmap and research tracks
- [ADRs](docs/adr) - historical architecture decisions

## Security

Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

Grimoire's source code is licensed under AGPL-3.0-or-later. User vaults, journals, dreams, notes, attachments, and imported files remain owned by their creators and are not licensed by this repository.

See [LICENSING.md](LICENSING.md) for the full project policy. The Grimoire name, logo, app icon, wordmark, and brand assets remain covered by the [trademark policy](TRADEMARKS.md).
