# Markdown Semantics Contract

Markdown is the durable document format for every Grimoire shell. SwiftUI, Tauri rich mode, raw CodeMirror mode, future journal apps, and AI tools may have different UI implementations, but they must agree on the markdown they read and write.

## Current Surfaces

| Surface                          | Status           | Contract                                                                                    |
| -------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| Tauri rich editor                | Shipping         | BlockNote UI, `@grimoire/markdown-editor` slash menu, app-local TypeScript markdown adapter |
| Tauri raw editor                 | Shipping         | CodeMirror source editing, app-local TypeScript markdown adapter                            |
| `markdown-editor/packages/js`    | Shipping package | React/BlockNote slash menu catalog and markdown-safe insertion helpers                      |
| `markdown-editor/packages/swift` | Shipping package | Swift package for Apple-native markdown semantics, native SwiftUI editor, and WebKit bridge |
| Apple SwiftUI apps               | Prototype        | Native shell importing `MarkdownEditor`; editor UX still thin                               |
| Journal or other future apps     | Target           | Reuse this contract without inheriting Grimoire vault UI                                    |

## Semantic Rules

- YAML frontmatter is split only when opening and closing delimiters are complete delimiter lines.
- Wikilinks are recognized as [[target]] and [[target|display]].
- Wikilinks inside inline code, backtick fences, or tilde fences are literal text.
- Word counts remove wikilinks outside code but keep wikilink text inside inline or fenced code.
- Math placeholders are editor transport only; saved markdown must stay readable.
- Compaction must not rewrite code block contents.
- Tauri and Swift parity fixtures live in `markdown-editor/packages/swift/Fixtures/markdown-parity.json`.
- Non-Apple Tauri adapters import `src/utils/markdownSemanticsAdapter.ts` and `@grimoire/markdown-editor`; Apple apps import `MarkdownEditor`.

## Slash Command Contract

Slash commands are editor commands, not app commands. They insert or transform markdown at the cursor and must preserve the source format after save/reopen.

Command items must have:

- stable `key`
- human title
- useful aliases, such as `h1`, `todo`, `date`, `table`
- group, such as Structure, Lists, Dates, Media, AI
- markdown-safe insertion behavior
- shell-specific implementation only behind the same user-facing command meaning

The Tauri rich editor currently imports `@grimoire/markdown-editor/react`, which ships default BlockNote structure/media command metadata plus Grimoire commands for dates, picked-date placeholders, due tasks, `@` note mentions, wikilinks, Mem-style tags/collections, markdown links, bold/code inline text, simple and comparison tables, frontmatter/property blocks, callouts, footnotes, source blocks, inline/display math, Mermaid diagrams, daily journal, meeting, decision, weekly plan, weekly/monthly calendars, weekly/monthly reviews, mood/energy check-ins, task rollover, timeline entries, weather placeholders, project brief, brain dump, clean up, summarize, extract actions, create wikilinks, continue writing, related context, prompt blocks, maps of content, backlink review, graph nodes, link maps, database tables, kanban boards, LLM research notes, and prompt labs. Apple-native editors mirror the `grimoire_*` command IDs with portable markdown templates so docs, telemetry, and future command bridges do not drift.

The Grimoire host app may append vault-context slash rows for recent notes, existing tags/collections, type templates, create-note, and create-tag flows. Those rows are app-owned because they depend on the open vault, but they must still insert durable markdown or call the app-owned vault creation API.

## Product References

Mem is the interaction reference for low-friction capture:

- `/today`, `/tomorrow`, and `/yesterday` insert local dates.
- `@` starts note/person mention flow.
- `#` maps to collection/topic organization.
- templates are available from slash search.
- vault templates, recent note links, recent tags, and create-new note/tag rows may appear as host-owned slash rows.
- Clean Up, Heads Up, and Chat-style actions are surfaced as memory commands.

Bear is the durability reference for plain markdown:

- headings, lists, todos, quotes, code, links, wikilinks, footnotes, and tables must save as readable markdown.
- rich UI is allowed only when reopening the note preserves the markdown meaning.

## Command Catalog Target

Structure:

- paragraph
- heading 1 through heading 6
- block quote
- divider / horizontal rule
- code block with language
- callout/admonition
- collapsible section where the target shell supports durable markdown

Inline formatting:

- bold
- italic
- strikethrough
- inline code
- link
- wikilink
- tag
- highlight when the export format is defined

Lists and tasks:

- bullet list
- numbered list
- checklist item
- indent / outdent
- task with due date
- task rollover for journal notes

Tables and data:

- table
- add row / column
- delete row / column
- property block
- frontmatter field insertion

Dates and journal:

- today
- tomorrow
- yesterday
- picked date
- time now
- daily note link
- meeting note
- decision note
- weekly plan
- weekly review
- monthly review
- mood / energy check-in
- task rollover
- timeline entry
- project brief
- weather snapshot
- review section

Media and attachments:

- image
- audio
- video
- file
- web link preview
- pasted source block

Math and technical writing:

- inline math
- display math
- mermaid diagram
- footnote
- citation/source
- handwritten canvas attachment
- whiteboard canvas attachment
- sketch note scaffold

Canvas commands save as Markdown references plus a `grimoire-canvas` metadata fence. The editable strokes live in a timestamped attachment source file and the note shows a preview image, so Tauri canvas and Apple PencilKit surfaces can share one vault contract without same-day canvas collisions. Tauri now writes the editable stroke JSON and a refreshed PNG preview; future native surfaces must preserve the same paths and metadata keys.

AI and memory:

- brain dump / inbox capture
- clean up rough note
- summarize current note
- extract action items
- create wikilinks
- suggest related notes
- continue writing
- answer from vault context
- convert selection to template
- Chitragupta recall placeholder
- related memory/context map
- durable memory note
- crystallize working notes into wiki lessons
- memory diagnostics for stale, orphaned, and contradictory context

Knowledge graph and wiki:

- map of content / hub note
- backlink review
- graph node / atomic note
- link map / typed edges
- Notion-style markdown database table
- kanban board
- LLM research note
- prompt lab with rubric

## Quality Gates

- Add a parity fixture before changing markdown serialization.
- Add a shell-level behavior test before adding a slash command.
- Commands that only work in one shell must still be listed in the roadmap until parity exists.
- No slash command may silently write app-only metadata into the markdown body.
- Host apps may enrich the package catalog with vault context, but the saved markdown result must still match the command contract.
