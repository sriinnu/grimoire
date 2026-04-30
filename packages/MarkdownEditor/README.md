# MarkdownEditor

MarkdownEditor is Grimoire's standalone Swift package for reusable markdown editor semantics.

It is intentionally UI-agnostic:

- The macOS and iOS SwiftUI apps import the library product: `import MarkdownEditor`.
- Non-Apple Tauri surfaces keep a platform adapter with parity tests against these semantics.
- Tauri/native shells can call the `markdown-editor-tool` executable for bridge experiments, fixtures, and parity checks.
- Grimoire-specific vault, git, AI, inspector, telemetry, and command routing stay outside this package.

The package is not a shared UI layer. Apple and Tauri shells may be separate implementations; this package keeps their durable markdown behavior aligned.

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

## CLI

The executable reads markdown from stdin:

```bash
swift run markdown-editor-tool compact < note.md
swift run markdown-editor-tool outgoing-links < note.md
swift run markdown-editor-tool split-frontmatter < note.md
```

The CLI is a bridge and test surface, not the long-term app API.
