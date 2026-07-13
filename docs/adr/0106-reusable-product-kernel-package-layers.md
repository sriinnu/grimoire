---
type: ADR
id: "0106"
title: "Reusable product kernel package layers"
status: active
date: 2026-07-13
supersedes:
  - "0085"
---

## Context

The existing reusable packages are intentionally narrow: `@grimoire/markdown-editor` contains a small React/BlockNote surface and command catalog, while the Swift package contains Markdown semantics and prototype editor views. Most production behavior still lives in the Tauri app and its Rust crate. Treating either editor package as the reusable product kernel would force UI concerns into domain code and still leave native clients without vault, Git, privacy, context, and execution behavior.

## Decision

**Grimoire uses layered reusable packages instead of one universal editor package.**

- `grimoire-core` is a UI-neutral Rust crate for versioned context and event contracts, vault and repository services, Git, search, privacy enforcement, recovery, and future execution primitives.
- `@grimoire/markdown-editor` owns the reusable React/BlockNote editor engine, serialization adapters, rich-editor commands, and host callback contracts.
- `MarkdownEditor` and `MarkdownEditorUI` own Swift Markdown semantics and Apple-native editor adapters.
- Language-neutral JSON fixtures prove serialized contract parity across Rust, TypeScript, and Swift.
- Tauri and SwiftUI clients own presentation and compose the packages through narrow adapters.

Existing Context Capsule and locality behavior must be adapted into the versioned Context Manifest contract rather than reimplemented beside it. Chitragupta remains outside the kernel until its real integration contract is audited.

## Options considered

- **Grow the React editor package into the whole app**: unusable from native Swift and couples editor reuse to vault workflows.
- **Duplicate product logic per client**: fast for prototypes, but guarantees security and persistence drift.
- **Shared Rust kernel plus platform editor packages** (chosen): keeps durable behavior portable without forcing a shared UI.

## Consequences

- ADR-0085's first extraction is preserved but superseded as the complete package strategy.
- The Tauri Rust crate must gradually become an adapter over `grimoire-core` instead of the only implementation home.
- Native UI work waits for real kernel capabilities instead of recreating app behavior with sample data.
- Cross-language contract changes require parity fixtures and version bumps.
