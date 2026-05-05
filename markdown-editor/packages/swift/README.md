# MarkdownEditor

MarkdownEditor is Grimoire's standalone Swift package for reusable markdown editor semantics and Apple-native editor surfaces.

The core `MarkdownEditor` product is intentionally UI-agnostic:

- The macOS and iOS SwiftUI apps import the library product: `import MarkdownEditor`.
- Non-Apple Tauri surfaces keep a platform adapter with parity tests against these semantics.
- Tauri/native shells can call the `markdown-editor-tool` executable for bridge experiments, fixtures, and parity checks.
- Grimoire-specific vault, git, AI, inspector, telemetry, and command routing stay outside this package.

The `MarkdownEditorUI` product adds reusable SwiftUI surfaces:

- `NativeMarkdownEditorView`: native SwiftUI editor shell with word/link stats and slash-command insertion.
- `WebMarkdownEditorView`: WebKit bridge that can load inline HTML or a hosted web editor such as the baseline JS product.
- `MarkdownEditorCommandCatalog`: Swift command metadata aligned with the package slash-command contract.

## Library Surface

- `MarkdownCompactor.compact(_:)`
- `Frontmatter.split(_:)`
- `Wikilinks.preprocess(_:)`
- `Wikilinks.extractOutgoingLinks(from:)`
- `Wikilinks.extractBacklinkContext(from:matching:maxLength:)`
- `Wikilinks.extractSnippet(from:)`
- `Wikilinks.countWords(in:)`
- `MathMarkdown.preprocess(_:)`
- `MathMarkdown.renderEscapedHTML(latex:displayMode:)`
- `MarkdownDocument`

Semantics are code-aware: wikilinks and compaction ignore inline code spans plus backtick and tilde fenced code blocks. Frontmatter splitting requires complete delimiter lines so body content like `--- not delimiter` stays untouched.

## CLI

The executable reads markdown from stdin:

```bash
swift run markdown-editor-tool compact < note.md
swift run markdown-editor-tool outgoing-links < note.md
swift run markdown-editor-tool split-frontmatter < note.md
swift run markdown-editor-tool backlink-context 2026-04-30 "Project Alpha" --max 160 < note.md
```

The CLI is a bridge and test surface, not the long-term app API.

## Tests

```bash
swift test --package-path markdown-editor/packages/swift
pnpm run test:markdown-editor
```

`pnpm run test:markdown-editor` runs the Tauri parity fixture test and the Swift package test.
