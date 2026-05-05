# Grimoire Apple

This is the native SwiftUI shell for macOS and iOS.

It is intentionally separate from the Tauri app. The Apple shell imports `MarkdownEditor` for durable markdown behavior, then builds platform-native UX around it.

## Tooling

- XcodeGen 2.44.1 or newer
- Xcode with macOS 14 / iOS 17 SDKs

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
- generated app icon source from `app-icon.png`
- vault compatibility and portable document behavior
- parity fixtures that Tauri also runs

Not shared:

- navigation layout
- editor chrome
- platform menus and shortcuts
- text input, selection, undo, find/replace
- file pickers, document providers, share sheets, and QuickLook
