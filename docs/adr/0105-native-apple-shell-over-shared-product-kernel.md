---
type: ADR
id: "0105"
title: "Native Apple shell over a shared product kernel"
status: active
date: 2026-07-13
supersedes:
  - "0088"
---

## Context

The Tauri app proves Grimoire's product and remains the most complete client, but a transparent webview and CSS-styled controls cannot provide native macOS form behavior, focus, menus, sheets, windowing, accessibility, or Liquid Glass interaction quality. A SwiftUI prototype already exists under `apps/apple`, but it consumes only the small Markdown semantics package and therefore does not represent the current product.

## Decision

**macOS and iOS use SwiftUI/AppKit/UIKit presentation over a shared Grimoire product kernel; Windows and Linux continue through Tauri.**

- The current Tauri macOS app remains shippable until the native macOS client passes an explicit capability and artifact-parity gate.
- Native Apple controls own navigation, toolbars, inspectors, forms, menus, sheets, focus, window management, and platform integrations.
- The reusable web editor may be hosted as a focused WebKit surface while native editing catches up, but it must not turn the whole native window back into a web app.
- Vault, Git, search, context, security, and durable event behavior belong to the shared product kernel, not either presentation client.
- Markdown files and repository files remain durable authority in their domains. Derived UI state stays disposable.

## Options considered

- **Keep Tauri universal**: lowest short-term cost, but it cannot satisfy the explicit native macOS interaction requirement.
- **Rewrite the whole product in Swift immediately**: high native ceiling, but discards mature behavior and creates unsafe parity gaps.
- **Native Apple clients over a shared kernel** (chosen): preserves the working app while native surfaces replace it behind measurable parity gates.

## Consequences

- ADR-0088 is superseded; Tauri is no longer the permanent macOS presentation decision.
- The Apple prototype becomes a real client only as shared kernel capabilities arrive.
- A release does not switch macOS clients merely because the native shell builds or looks polished.
- Windows/Linux and Apple clients may differ visually while sharing durable behavior and wire contracts.
