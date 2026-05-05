---
type: ADR
id: "0089"
title: "Project intelligence import from Karya Board"
status: active
date: 2026-05-03
---

## Context

Grimoire is becoming the markdown-first workspace for notes, projects, and agent-assisted work. The older Karya Board project already proved several useful patterns: curated project document discovery, TODO/FIXME scanner extraction, generated Markdown boards, and provider-neutral execution lanes for local AI tools.

Karya also contains runtime data, generated artifacts, a separate React UI system, SQLite state, and Node-specific filesystem code that should not be copied directly into Grimoire's renderer.

## Decision

**Import Karya Board's portable project-intelligence behavior into Grimoire as a small TypeScript layer, while leaving filesystem walking, persistent storage, and process execution to Grimoire/Tauri runtime boundaries.**

The initial import lives under `src/project-intelligence/` and covers:

- curated README / architecture / spec / TODO / review / notes document classification
- document title, preview, ordering, and analytics helpers
- TODO/FIXME/HACK/NOTE extraction from loaded Markdown/code content
- generated Markdown project board content
- provider metadata for Codex, Claude Code, Gemini CLI, Aider, OpenCode, and Chitragupta

## Options considered

- **Copy Karya as a package**: fast, but imports stale UI, SQLite assumptions, Node-only filesystem/process code, and generated/runtime state.
- **Port the portable behavior first** (chosen): keeps Grimoire clean, testable, and compatible with Tauri and future native shells.
- **Rewrite from scratch later**: avoids legacy coupling, but wastes working behavior already validated by Karya's passing tests.

## Consequences

Grimoire now has a reusable project-intelligence layer that can back project markdown filtering, generated boards, graph/task views, and AI handoff UI without depending on the Karya app.

Runtime work remains deliberately separate: Tauri/Rust must provide project file enumeration, command detection, storage, and actual agent dispatch. This keeps browser tests deterministic and prevents Node APIs from leaking into the renderer bundle.

