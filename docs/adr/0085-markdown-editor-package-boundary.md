---
type: ADR
id: "0085"
title: "Markdown editor package boundary"
status: active
date: 2026-04-30
---

## Context

The markdown editor is Grimoire's core reusable product surface. Future apps, such as a journal app, should be able to reuse the markdown behavior without inheriting Grimoire's vault shell, inspector, git workflow, AI panel, or note-list state.

The current editor code mixes several layers:

- Markdown durability concerns: frontmatter splitting, wikilink round-tripping, math placeholders, markdown compaction, word counts, snippets.
- Editor engine concerns: BlockNote parsing/serialization, CodeMirror raw mode, image URLs, selection, slash menus, and drag/drop.
- Grimoire app concerns: inspector, AI chat, git diff, archive/delete/favorite actions, vault refresh, and conflict banners.

Apple UX is SwiftUI on macOS and iOS. Non-Apple desktop UX remains Tauri. A big-bang package move would export too much app behavior and make the package hard to reuse.

## Decision

Create `packages/MarkdownEditor` as a Swift Package Manager package and make it the owner of editor-neutral markdown semantics for the Apple-native app surfaces first.

The initial package boundary includes:

- compact markdown normalization
- wikilink placeholder preprocessing, outgoing-link extraction, snippets, word counts, and frontmatter splitting
- math preprocessing and escaped fallback HTML for native rendering surfaces
- a `MarkdownDocument` convenience model for SwiftUI state
- a `markdown-editor-tool` executable for bridge experiments, fixtures, and parity checks

The existing Tauri `src/utils/*` modules stay app-local for now. They preserve the current non-Apple Tauri behavior while parity tests and adapter contracts are added. The React editor shell, BlockNote view composition, CodeMirror view hook, image upload, telemetry, inspector, AI, git diff, and vault actions remain inside the app until they can be expressed through narrow adapter props.

## Alternatives considered

- **Extract the full `Editor` component now**: rejected because its prop contract includes AI, inspector, git history, archive/delete actions, vault refresh, and conflict resolution.
- **Create a TypeScript-only workspace package**: rejected because the primary Apple app surfaces need a native Swift package, not a web package that SwiftUI has to wrap.
- **Create only a documentation plan**: too soft; it would not create an enforceable package boundary.
- **Fork a second editor implementation for future apps**: rejected because markdown semantics would drift immediately.

## Consequences

- Markdown round-trip behavior now has a Swift package home that can be reused by the macOS and iOS SwiftUI apps.
- Non-Apple Tauri can continue using the current TypeScript utilities while adapter parity is made explicit.
- The next extraction step should move editor engine contracts behind adapters: suggestions, image upload, theme, telemetry, link navigation, and raw-mode save/flush.
- App-only surfaces must not be added to `MarkdownEditor` unless they are expressed as generic editor adapters.
