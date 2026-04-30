# Grimoire Apple

This is the native SwiftUI shell for macOS and iOS.

It is intentionally separate from the Tauri app. The Apple shell imports `MarkdownEditor` for durable markdown behavior, then builds platform-native UX around it.

## Generate

```bash
cd apps/apple
xcodegen generate
```

Open `GrimoireApple.xcodeproj` in Xcode after generation.

## Boundary

Shared:

- markdown/frontmatter semantics from `MarkdownEditor`
- vault compatibility and portable document behavior
- parity fixtures that Tauri also runs

Not shared:

- navigation layout
- editor chrome
- platform menus and shortcuts
- text input, selection, undo, find/replace
- file pickers, document providers, share sheets, and QuickLook
