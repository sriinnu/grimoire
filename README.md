<p align="center">
  <img src="docs/assets/grimoire-logo.svg" width="430" alt="Grimoire - Knowledge. Connected." />
</p>

<p align="center">
  <img alt="Latest stable" src="https://img.shields.io/github/v/release/sriinnu/grimoire?display_name=tag" />
  <a href="https://github.com/sriinnu/grimoire/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/sriinnu/grimoire/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/sriinnu/grimoire/actions/workflows/release.yml"><img alt="Build" src="https://github.com/sriinnu/grimoire/actions/workflows/release.yml/badge.svg?branch=main" /></a>
  <a href="https://codecov.io/gh/sriinnu/grimoire"><img alt="Codecov" src="https://codecov.io/gh/sriinnu/grimoire/graph/badge.svg?branch=main" /></a>
  <a href="https://codescene.io/projects/76865"><img alt="CodeScene Hotspot Code Health" src="https://codescene.io/projects/76865/status-badges/hotspot-code-health" /></a>
</p>

# Grimoire

Grimoire is a local-first memory workspace for journals, project thinking, graph navigation, and AI collaborators.

The core idea is simple: your notes stay as markdown files, but the app gives them enough shape to become a living operating space. A day note can hold weather and mood. A project note can connect people, decisions, meetings, and code. The graph can show what surrounds the current thought. Local agents can read the same structure without needing a hosted database.

Grimoire is created and maintained by **Srinivas Pendela** ([@sriinnu](https://x.com/sriinnu)).

## Product Spine

Grimoire is built around five surfaces:

- **Journal**: daily capture, long-form reflection, weather/context snapshots, and review flows.
- **Workbench**: projects, people, procedures, decisions, sources, and typed notes.
- **Graph**: local neighborhood first, whole-vault map when needed, with relationship-aware filters.
- **Memory**: Git history, backlinks, frontmatter, and agent-readable structure.
- **Native studio**: theme, typography, motion, and macOS behavior treated as product quality, not decoration.

## What Makes Grimoire Different

**The journal is not an afterthought.** Grimoire treats daily notes, weather, time context, reviews, and life logs as first-class knowledge, not loose text beside the "real" database.

**The graph starts from the active thought.** The first graph view is the neighborhood around what you are touching now. Whole-vault mode exists, but the product bias is sensemaking, not drawing a pretty hairball.

**Agents read the same world you do.** Frontmatter, wikilinks, relationships, files, and Git history are meant to be legible to local AI tools without turning the vault into a black-box database.

**Markdown remains the contract.** Rich editing, raw editing, math, wikilinks, code blocks, YAML, images, and future exports must preserve understandable markdown.

**The app should feel crafted.** Themes, typography, spacing, animation, graph rendering, keyboard flow, and native macOS behavior are part of the core promise.

## Current Status

- Local vault opening, onboarding, and starter vault cloning
- Sidebar filters, folders, type sections, favorites, archive, inbox, and changes
- Note list search, custom columns, sorting, saved views, and Neighborhood mode
- BlockNote rich editor with package-owned slash commands, markdown-compatible math, wikilinks, `#` tag/collection autocomplete, code blocks, formatting, and raw CodeMirror mode
- Inspector for frontmatter, relationships, backlinks, instances, note metadata, and git history
- Knowledge graph with local/vault scope, relationship/wikilink edge filters, type-colored nodes, and large-vault caps
- Weather snapshot command for journal entries using explicit user-provided location
- Claude Code and Codex CLI agent panel with MCP vault tooling
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

Download the latest release:

[Grimoire.app.tar.gz](https://github.com/sriinnu/grimoire/releases/latest/download/Grimoire.app.tar.gz)

On first launch, Grimoire can clone the Getting Started vault:

https://github.com/sriinnu/grimoire-getting-started

That vault is the fastest way to learn the workflows without risking your own notes.

## Local Development

Prerequisites:

- Node.js 20+
- pnpm 8+
- Rust stable
- macOS or Linux for development

Install and run browser mock mode:

```bash
pnpm install
pnpm dev
```

Run the native desktop app:

```bash
pnpm tauri dev
```

Linux Tauri dependencies are listed in [docs/GETTING-STARTED.md](docs/GETTING-STARTED.md).

## Documentation

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

Grimoire is licensed under AGPL-3.0-or-later. The Grimoire name and logo remain covered by the project's trademark policy.
