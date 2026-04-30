---
type: ADR
id: "0086"
title: "Platform-native app shells over shared vault semantics"
status: active
date: 2026-04-30
supersedes:
  - "0001"
  - "0005"
---

## Context

Grimoire started as a Tauri + React desktop app, and ADR-0005 extended that direction to an iPad prototype through Tauri iOS. That was useful for proving product shape quickly, but it is no longer the right long-term platform strategy.

The app's core is the markdown editor and the local-first vault model. Those must stay coherent across platforms. The app shell, however, should not be forced through one UI stack when platforms need different interaction quality:

- macOS and iOS should feel Apple-native, with SwiftUI/AppKit/UIKit where text editing, windows, menus, file access, share sheets, focus, gestures, and system behavior matter.
- Linux and Windows should continue through the Tauri app, where React/TypeScript and Rust are still the pragmatic cross-platform shell.
- The vault, markdown semantics, command concepts, and sync model must not fork.

## Decision

Use separate platform-native app shells over shared product semantics.

Apple platforms use SwiftUI-first apps for macOS and iOS. Non-Apple desktop platforms use the Tauri app. It is acceptable to rebuild a shell from scratch when that produces a better app for the platform. Shared code is a tool, not a requirement.

The shared boundary is:

- durable markdown and frontmatter behavior
- vault file model and portable filename rules
- wikilinks, snippets, word counts, math placeholders, and compact serialization
- command identities and user workflows where they are truly cross-platform
- parity fixtures that prove Swift and Tauri adapters agree where semantics must match

The non-shared boundary is:

- navigation layout
- editor chrome
- menus and shortcuts
- platform file pickers, document providers, drag/drop, share sheets, and QuickLook
- native text input, IME, undo, find/replace, and selection behavior
- release packaging and update mechanics

## Alternatives considered

- **One Tauri app everywhere**: fastest code reuse, but compromises Apple UX and repeats the WebView text/input problems on the platforms where native quality matters most.
- **One SwiftUI app everywhere**: best for Apple, but abandons Windows/Linux and forces non-Apple platforms through an unsuitable stack.
- **Shared UI package across all platforms**: attractive in theory, but it makes the editor shell lowest-common-denominator. The editor is the product; this is the wrong place to over-share.
- **Separate shells with shared semantics** (chosen): more implementation work, but it keeps the product coherent while letting each platform be good on its own terms.

## Consequences

- ADR-0001 is superseded as a global stack decision. Tauri + React remains the non-Apple shell, not the universal app stack.
- ADR-0005 is superseded. iOS should not be a Tauri WebView production target; it should be a SwiftUI app over the shared vault/editor semantics.
- The Swift `MarkdownEditor` package becomes the Apple-native editor semantics home.
- Tauri keeps app-local TypeScript adapters and parity tests instead of importing SwiftUI concerns.
- Features may be implemented separately per shell. Before sharing code, the team must name the contract being shared and prove that sharing improves correctness, speed, or consistency.
- Cross-platform QA must focus on vault compatibility and semantic parity, not pixel parity.
