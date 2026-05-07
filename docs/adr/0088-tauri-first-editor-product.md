---
type: ADR
id: "0088"
title: "Tauri-first editor product with Swift as Apple support layer"
status: active
date: 2026-05-01
supersedes:
  - "0086"
  - "0087"
---

## Context

The markdown editor is the core product. It needs slash commands, graph/wiki workflows, backlinks, fast search, AI cleanup, local-first vault access, and consistent behavior across future Grimoire-family apps.

ADR-0086 and ADR-0087 moved toward full platform-native shells, with SwiftUI-first Apple apps and Tauri elsewhere. That remains a valid escape hatch, but it splits the highest-risk product surface: the editor itself. Tauri v2 now explicitly targets desktop and mobile platforms, while Swift, Kotlin, and Rust can still be used where native integration is needed.

## Decision

**Grimoire is Tauri-first for the product editor surface. Swift remains a support layer for Apple packaging, native bridges, parity fixtures, and future native-only surfaces, not a second full editor app by default.**

The primary implementation path is:

- Tauri + React + Rust for the main Grimoire app surface across desktop targets, and as the first mobile feasibility path.
- `@grimoire/markdown-editor` for the reusable React/BlockNote editor package, slash catalog, templates, and markdown-safe insertions.
- `markdown-editor/packages/swift` for Apple-compatible markdown semantics, SwiftUI/WebKit host prototypes, and parity testing.
- Native Apple UI only where it clearly beats Tauri for a user-visible reason: share sheets, widgets, Shortcuts, document providers, QuickLook, App Store packaging, or a hard WebView limitation.

## Options considered

- **Tauri-first with Swift support layer** (chosen): fastest path to one excellent editor, one slash catalog, and one graph/wiki/AI workflow surface.
- **Full SwiftUI app for Apple plus Tauri elsewhere**: better native ceiling, but duplicates the editor and slows the product before the core is proven.
- **Tauri only with no Swift package**: simpler, but loses native Apple escape hatches and parity coverage for future Apple integrations.

## Consequences

- ADR-0086 and ADR-0087 are superseded as product direction. Their useful parts survive as fallback guidance, not default roadmap.
- New editor UX work should land first in `@grimoire/markdown-editor` and the Tauri app.
- SwiftUI work should avoid rebuilding the whole editor unless there is a named native-only requirement.
- The Swift package remains valuable, but it should not drive product velocity away from the Tauri editor.
- Mobile work should first test Tauri mobile constraints before committing to a full native rewrite.
