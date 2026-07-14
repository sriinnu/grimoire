# Grimoire Apple

This is the native SwiftUI shell for macOS and iOS.

It is intentionally separate from the Tauri app. The Apple shell imports `MarkdownEditor` for durable markdown behavior and `GrimoireProductContracts` for versioned product-kernel messages, then builds platform-native UX around them.

The macOS target now contains the first vault-backed native notebook slice. It opens and remembers a local Markdown vault, scans pages through the reusable Rust kernel, reads selected pages on demand, creates portable notes, and autosaves edits atomically. Preview documents remain only as a no-vault welcome state. Track replacement of the full Tauri product in [`docs/NATIVE-APPLE-CAPABILITY-PARITY.md`](../../docs/NATIVE-APPLE-CAPABILITY-PARITY.md).

The native information architecture follows the shipping Grimoire product grammar: Library, Pages, the active artifact, and Second Brain. SwiftUI/AppKit owns the presentation; it must not flatten the living notebook into a generic file editor or expose implementation-first diagnostics as the primary experience.

The signature native appearance is Morning Notebook in light mode and Night Notebook in dark mode. Both keep SwiftUI/AppKit controls, accessibility behavior, and system appearance while applying Grimoire's warm paper, indigo, and saffron identity.

## Tooling

- XcodeGen 2.44.1 or newer
- Xcode with macOS 14 / iOS 17 SDKs
- Rust and Cargo for the macOS vault-kernel bridge

## Generate

```bash
cd apps/apple
xcodegen generate
```

Open `GrimoireApple.xcodeproj` in Xcode after generation.

## Build

```bash
cd apps/apple
xcodebuild -project GrimoireApple.xcodeproj -scheme Grimoire -destination 'platform=macOS' CODE_SIGNING_ALLOWED=NO build
xcodebuild -project GrimoireApple.xcodeproj -scheme Grimoire-iOS -destination 'generic/platform=iOS' CODE_SIGNING_ALLOWED=NO build
```

For local archive or TestFlight/App Store work, set signing in Xcode or an untracked local `.xcconfig`. Do not commit a personal development team ID.

## Boundary

Shared:

- markdown/frontmatter semantics from `MarkdownEditor`
- Context Manifest and durable event contracts from `GrimoireProductContracts`
- generated app icon source from `app-icon.png`
- vault compatibility and portable document behavior
- safe vault-root confinement and atomic Markdown read/create/save behavior from `grimoire-core`
- parity fixtures that Tauri also runs

Not shared:

- navigation layout
- editor chrome
- platform menus and shortcuts
- text input, selection, undo, find/replace
- file pickers, document providers, share sheets, and QuickLook
