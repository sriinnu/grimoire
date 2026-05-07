# Markdown Editor Baseline

Tiny Vite/React app for checking the reusable markdown editor package without
booting the full Grimoire vault shell.

The app imports `@grimoire/markdown-editor/react`, renders the markdown-safe
block types, and exposes the Grimoire-owned slash command catalog with a fixed
demo date so screenshots and docs stay deterministic.

## Commands

```bash
pnpm --filter @grimoire/markdown-editor-baseline dev
pnpm --filter @grimoire/markdown-editor-baseline build
pnpm --filter @grimoire/markdown-editor-baseline preview
```
