---
type: ADR
id: "0094"
title: "Native menu bar icon is an installation-local setting"
status: active
date: 2026-05-16
---

## Context

Grimoire should be reachable from macOS without keeping the main window in front. The menu bar affordance must be optional because it is machine preference, not vault content, and it should not create a second command system.

## Decision

Add `menu_bar_icon_enabled` to app settings. The setting is installation-local and saved through the existing Rust settings sanitizer.

When enabled, Tauri creates a native tray/menu bar icon from the app icon as a macOS template image. Its context menu exposes quick actions: Open Grimoire, New Note, Quick Open, Settings, Reload Vault, and Quit. Actions that already exist in the app menu emit the same `menu-event` IDs as `menu.rs`, so renderer command routing stays shared.

The Settings panel owns the user-facing toggle. Saving settings applies the native icon immediately and startup restores it when the saved setting is true.

## Consequences

The vault remains untouched because the menu bar icon is app-local. Quick actions reuse the established command catalog, so shortcut, app menu, command palette, and menu bar behavior do not drift.

Future work can replace the default app icon with a hand-tuned 18px template asset, but that should not change the setting contract or command routing.

## Alternatives Considered

- Always-on menu bar icon: convenient, but too opinionated for a desktop app.
- Renderer-only fake tray: impossible outside the app window and not production behavior.
- Separate tray command IDs for every action: easier to reason about locally, but creates drift from native menu and command palette behavior.
