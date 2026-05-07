---
type: Note
---
# Grimoire Markdown Editor

Standalone editor project for Grimoire and future apps.

## Packages

- `packages/js`: `@grimoire/markdown-editor` for Tauri, web, and React/BlockNote apps.
- `packages/swift`: `MarkdownEditor` and `MarkdownEditorUI` Swift packages for macOS/iOS SwiftUI apps.
- `apps/baseline-web`: runnable web product that consumes `@grimoire/markdown-editor`.

## Commands

```bash
pnpm --filter @grimoire/markdown-editor build
pnpm --filter @grimoire/markdown-editor-baseline dev
pnpm --filter @grimoire/markdown-editor-baseline build
swift test --disable-sandbox --package-path markdown-editor/packages/swift
```

Grimoire imports this project through the root workspace so local changes can be
tested inside the app before the editor project is split into its own repository.
