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

Grimoire is a local-first desktop workspace for markdown notes, journals, typed knowledge bases, and AI-readable project memory.

It is not trying to be Obsidian with another skin, and it is not trying to be Notion with local files. The useful shape is in between: plain markdown on disk, YAML frontmatter for structure, wikilinks for flow, a graph for sensemaking, Git for history, and local AI agents that can understand the vault without a hosted database.

Grimoire is created and maintained by **Srinivas Pendela** ([@sriinnu](https://x.com/sriinnu)).

## What It Is For

- Daily journals, logs, and long-form personal notes
- Project, person, event, procedure, responsibility, and topic workspaces
- A Notion-like operating space without proprietary storage
- A graph view over frontmatter relationships and body wikilinks
- Markdown notes that can carry explicit context, such as opt-in weather snapshots
- Local AI context for Claude Code, Codex CLI, and future agent integrations
- Large vaults where speed, keyboard flow, and durability matter more than cloud collaboration

## What Makes It Different

**Files stay the source of truth.** Notes are markdown files in your vault. The app can be deleted and the vault still makes sense.

**Structure is readable.** Types, relationships, status, icons, colors, and views are plain frontmatter or vault-local config. Humans and AI agents can inspect the same structure.

**The graph is part of the product.** Relationships and wikilinks are not decorative backlinks. They are rendered as a typed graph, filterable by scope and edge kind.

**The editor respects markdown.** Rich editing, raw CodeMirror editing, math, wikilinks, code blocks, and YAML frontmatter all preserve markdown as the durable document model.

**AI is local by default.** Grimoire integrates with local CLI agents and MCP. It does not require vault content to live on a Grimoire server.

**The UI is meant to feel native.** The current app is Tauri + React. The product direction includes a native macOS SwiftUI/AppKit surface where that gives better text editing, menus, file watching, QuickLook, or system integration.

## Current Product Surface

- Local vault opening, onboarding, and Getting Started vault cloning
- Sidebar filters, folders, type sections, favorites, archive, inbox, and changes
- Note list search, custom columns, sorting, saved views, and Neighborhood mode
- BlockNote rich editor with markdown-compatible math, wikilinks, code blocks, formatting, and raw CodeMirror mode
- Inspector for frontmatter, relationships, backlinks, instances, note metadata, and git history
- Knowledge graph with local/vault scope, relationship/wikilink edge filters, type-colored nodes, and large-vault caps
- Weather snapshot command for journal entries using explicit user-provided location
- Claude Code and Codex CLI agent panel with MCP vault tooling
- Git history, commit/push/pull/conflict flows, and non-git vault support
- Light/dark mode, multiple theme presets, and editor font choices
- English and Simplified Chinese UI foundations

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
- [Getting Started](docs/GETTING-STARTED.md) - local setup and codebase map
- [Vision](docs/VISION.md) - product direction
- [Enhancements](ENHANCEMENTS.md) - prioritized roadmap and research tracks
- [ADRs](docs/adr) - historical architecture decisions

## Security

Report security issues privately as described in [SECURITY.md](SECURITY.md).

## License

Grimoire is licensed under AGPL-3.0-or-later. The Grimoire name and logo remain covered by the project's trademark policy.
