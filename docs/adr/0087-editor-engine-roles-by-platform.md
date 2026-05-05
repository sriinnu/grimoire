---
type: ADR
id: "0087"
title: "Editor engine roles by platform"
status: superseded
date: 2026-04-30
superseded_by: "0088"
supersedes:
  - "0022"
---

## Context

ADR-0022 chose BlockNote as Grimoire's primary rich text editor when the app was a single Tauri/React surface. ADR-0086 now splits the product into platform-native shells: SwiftUI/AppKit/UIKit on Apple platforms and Tauri on non-Apple desktop platforms.

The editor is still the core product surface, but "one primary editor engine" is no longer the right abstraction. The durable abstraction is markdown semantics, slash-command intent, and vault compatibility.

## Decision

BlockNote remains the rich editor engine for the Tauri shell. CodeMirror remains the raw markdown editor for the Tauri shell. Apple shells use native SwiftUI/AppKit/UIKit editor surfaces over the `MarkdownEditor` Swift package.

Shared behavior moves to contracts:

- `markdown-editor/packages/swift` for Swift markdown semantics
- `src/utils/markdownSemanticsAdapter.ts` for Tauri parity
- `markdown-editor/packages/swift/Fixtures/markdown-parity.json` for shared fixtures
- `docs/MARKDOWN-SEMANTICS-CONTRACT.md` for markdown and slash-command expectations

Slash commands are editor-level commands. They may be implemented differently per shell, but their saved markdown result and user-facing meaning must stay aligned where the command is marked portable.

## Consequences

- ADR-0022 is scoped to historical Tauri rich editor selection and superseded as the global editor decision.
- BlockNote-specific behavior should not leak into the Swift package.
- Native Apple editor work should not be forced through BlockNote or WKWebView unless a specific bridge proves better.
- New markdown serialization changes need Swift and Tauri parity fixtures.
- New slash commands need shell behavior tests and a durable markdown result.
