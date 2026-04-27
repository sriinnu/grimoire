<p align="center">
  <img src="docs/assets/grimoire-logo.svg" width="430" alt="Grimoire — Knowledge. Connected." />
</p>

<p align="center">
  <img alt="Latest stable" src="https://img.shields.io/github/v/release/sriinnu/grimoire?display_name=tag" />
  <a href="https://github.com/sriinnu/grimoire/actions/workflows/ci.yml"><img alt="CI" src="https://github.com/sriinnu/grimoire/actions/workflows/ci.yml/badge.svg?branch=main" /></a>
  <a href="https://github.com/sriinnu/grimoire/actions/workflows/release.yml"><img alt="Build" src="https://github.com/sriinnu/grimoire/actions/workflows/release.yml/badge.svg?branch=main" /></a>
  <a href="https://codecov.io/gh/sriinnu/grimoire"><img alt="Codecov" src="https://codecov.io/gh/sriinnu/grimoire/graph/badge.svg?branch=main" /></a>
  <a href="https://codescene.io/projects/76865"><img alt="CodeScene Hotspot Code Health" src="https://codescene.io/projects/76865/status-badges/hotspot-code-health" /></a>
</p>

# Grimoire

Grimoire is a desktop app for Mac and Linux for managing **markdown knowledge bases**. People use it for a variety of use cases:

* Operate second brains and personal knowledge
* Organize company docs as context for AI
* Store OpenClaw/assistants memory and procedures

Grimoire is created and maintained by **Srinivas Pendela** ([@sriinnu](https://x.com/sriinnu)).

Personally, I use it to **run my life**. I have a massive workspace of 10,000+ notes, built from years of research, writing, and personal journaling.

<img width="1000" height="656" alt="1776506856823-CleanShot_2026-04-18_at_12 06 57_2x" src="" />

## Walkthroughs

You can find some Loom walkthroughs below — they are short and to the point:
- [How I Organize My Own Grimoire Workspace](https://www.loom.com/share/bb3aaffa238b4be0bd62e4464bca2528)
- [My Inbox Workflow](https://www.loom.com/share/dffda263317b4fa8b47b59cdf9330571)
- [How I Save Web Resources to Grimoire](https://www.loom.com/share/8a3c1776f801402ebbf4d7b0f31e9882)

## Principles

- 📑 **Files-first** — Your notes are plain markdown files. They're portable, work with any editor, and require no export step. Your data belongs to you, not to any app.
- 🔌 **Git-first** — Every vault is a git repository. You get full version history, the ability to use any git remote, and zero dependency on Grimoire servers.
- 🛜 **Offline-first, zero lock-in** — No accounts, no subscriptions, no cloud dependencies. Your vault works completely offline and always will. If you stop using Grimoire, you lose nothing.
- 🔬 **Open source** — Grimoire is free and open source. I built this for [myself](https://x.com/sriinnu) and for sharing it with others.
- 📋 **Standards-based** — Notes are markdown files with YAML frontmatter. No proprietary formats, no locked-in data. Everything works with standard tools if you decide to move away from Grimoire.
- 🔍 **Types as lenses, not schemas** — Types in Grimoire are navigation aids, not enforcement mechanisms. There's no required fields, no validation, just helpful categories for finding notes.
- 🪄**AI-first but not AI-only** — A vault of files works very well with AI agents, but you are free to use whatever you want. We support Claude Code and Codex CLI (for now), but you can edit the vault with any AI you want. We provide an AGENTS file for your agents to figure out.
- ⌨️ **Keyboard-first** — Grimoire is designed for power-users who want to use keyboard as much as possible. A lot of how we designed the Editor and the Command Palette is based on this.
- 💪 **Built from real use** — Grimoire was created for manage my personal vault of 10,000+ notes, and I use it every day. Every feature exists because it solved a real problem.

## Getting started

Download the [latest release here](https://github.com/sriinnu/grimoire/releases/latest/download/Grimoire.app.tar.gz).

When you open Grimoire for the first time you get the chance of cloning the [getting started vault](https://github.com/sriinnu/grimoire-getting-started) — which gives you a walkthrough of the whole app.

## Open source and local setup

Grimoire is open source and built with Tauri, React, and TypeScript. If you want to run or contribute to the app locally, here is [how to get started](https://github.com/sriinnu/grimoire/blob/main/docs/GETTING-STARTED.md). You can also find the gist below 👇

### Prerequisites

- Node.js 20+
- pnpm 8+
- Rust stable
- macOS or Linux for development

#### Linux system dependencies

Tauri 2 on Linux requires WebKit2GTK 4.1 and GTK 3:

- Arch / Manjaro:
  ```bash
  sudo pacman -S --needed webkit2gtk-4.1 base-devel curl wget file openssl \
    appmenu-gtk-module libappindicator-gtk3 librsvg
  ```
- Debian / Ubuntu (22.04+):
  ```bash
  sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file \
    libxdo-dev libssl-dev libayatana-appindicator3-dev librsvg2-dev \
    libsoup-3.0-dev patchelf
  ```
- Fedora 38+:
  ```bash
  sudo dnf install webkit2gtk4.1-devel openssl-devel curl wget file \
    libappindicator-gtk3-devel librsvg2-devel
  ```

The bundled MCP server still spawns the system `node` binary at runtime on Linux, so install Node from your distro package manager if you want the external AI tooling flow.

### Quick start

```bash
pnpm install
pnpm dev
```

Open `http://localhost:5173` for the browser-based mock mode, or run the native desktop app with:

```bash
pnpm tauri dev
```

## Tech Docs

- 📐 [ARCHITECTURE.md](docs/ARCHITECTURE.md) — System design, tech stack, data flow
- 🧩 [ABSTRACTIONS.md](docs/ABSTRACTIONS.md) — Core abstractions and models
- 🚀 [GETTING-STARTED.md](docs/GETTING-STARTED.md) — How to navigate the codebase
- 📚 [ADRs](docs/adr) — Architecture Decision Records

## Security

If you believe you have found a security issue, please report it privately as described in [SECURITY.md](./SECURITY.md).

## License

Grimoire is licensed under AGPL-3.0-or-later. The Grimoire name and logo remain covered by the project’s trademark policy.
