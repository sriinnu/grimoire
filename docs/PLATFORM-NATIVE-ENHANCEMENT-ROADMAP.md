# Platform-Native Enhancement Roadmap

This roadmap keeps the product direction clear: Grimoire should have Bear-grade markdown writing, Mem-grade capture and recall, Obsidian-grade graph/wiki workflows, and a Tauri-first editor product with native support only where the platform truly matters.

## Current / Prototype / Target

| Area | Shipping today | Prototype now | Target |
|---|---|---|---|
| Main app | Tauri + React + Rust | Shared markdown adapter and reusable editor package | One excellent editor across desktop targets, with mobile feasibility through Tauri first |
| Apple support | Tauri macOS build | Swift package plus SwiftUI/WebKit host prototypes | Native Apple integrations only where they beat Tauri clearly |
| Markdown core | Tauri utilities + Swift package | CLI bridge and fixtures | Shared semantic contract with parity gates |
| Slash commands | `@grimoire/markdown-editor` package: BlockNote defaults plus Grimoire dates, note mentions, collections/tags, tasks, wikilinks, tables, callouts, math, Mermaid, calendars, templates, knowledge graph, wiki, cleanup, summary, action, and related-context commands | Contract in `MARKDOWN-SEMANTICS-CONTRACT.md` | Package-first command brain with interactive date/table controls and AI-backed transforms |
| Memory UX | Search, backlinks, graph, agents | Roadmap | Fast capture, related context, deep recall, cleanup, and chat over notes |
| Vault model | Git-backed Tauri flow; local-only remotes supported | Apple shell reads sample markdown | Markdown files stay readable with Git workflows gated by capability |

## Phase 1: Editor Command Depth

Goal: make slash commands feel obvious, fast, and complete.

- Keep expanding `@grimoire/markdown-editor` into richer controls: picked dates, table row/column actions, and AI-backed cleanup/write actions.
- Add shell-neutral command definitions for Apple and Tauri.
- Keep aliases generous: `h1`, `title`, `todo`, `task`, `date`, `today`, `journal`, `math`, `source`, `quote`, `mem`, `heads up`.
- Add keyboard and slash-command tests for every markdown insertion.
- Keep command descriptions short and practical; no tutorial copy inside the menu.

## Phase 2: Bear-Grade Markdown Writing

Goal: writing should feel calm and native while staying portable.

- Support clean live markdown rendering with source visibility when needed.
- Keep CommonMark-compatible behavior as the baseline where possible.
- Improve tables, task lists, wikilinks, headings, section folding, backlinks, and table of contents.
- Make tags, nested tags, and note links first-class without creating a proprietary database.
- Add polished export/preview contracts for Markdown, HTML, PDF, and rich text later.

Bear references worth matching in spirit: plain-text markdown portability, formatting tools, tables/tasks, wikilinks, tags, backlinks/table-of-contents, and powerful searches like todo/date/image filters. See Bear's official site and markdown FAQ.

Sensefold reference lesson: keep slash filtering, grouping, and insertion primitives package-owned, but let the host app provide contextual chips for vault templates, recent notes, recent collections/tags, file pickers, date pickers, and AI review flows.

## Phase 3: Mem-Grade Capture And Recall

Goal: the editor becomes a memory surface, not only a text box.

- Fast capture from global shortcut, share sheet, clipboard, file drop, and email/import pipelines.
- Voice capture that stores audio, transcript, and cleaned note output.
- One-tap cleanup for messy notes into structured markdown.
- Deep search that handles vague natural-language recall.
- Heads-up related context while writing: notes, collections, people, projects, tasks, and previous decisions.
- Chat that can answer, summarize, reorganize, and create/update notes with explicit write review.
- Collections that can be manual or AI-assisted, while markdown/frontmatter remain authoritative.
- Templates for meetings, interviews, projects, journals, decisions, and task reviews.

Mem references worth matching in spirit: voice mode, cleanup, chat, Heads Up related context, Deep Search, collections, templates, and instant capture. See Mem's official help center.

## Phase 4: Native Support Without Splitting The Product

Goal: keep one serious editor product while using native code for the few places where it actually matters.

- Tauri + React: primary editor, graph/wiki, slash command, memory, AI, and settings surfaces.
- Rust: filesystem, Git, search/cache, packaging, and secure command boundary.
- SwiftUI/AppKit/UIKit/WebKit: share sheets, QuickLook, document providers, widgets, Shortcuts, App Store packaging, and targeted native editor experiments.
- Shared: markdown fixtures, vault model, command concepts, AI write-audit rules, and packaging identity.
- Not duplicated: the full editor roadmap unless a named WebView/native text limitation forces it.

## Definition Of Done

- Markdown survives save/reopen across rich, raw, and native shells.
- Slash commands cover common writing, organizing, date, media, math, and AI workflows.
- Apple and Tauri shells pass parity fixtures for markdown semantics.
- Docs state clearly what is shipping, prototype, and target.
- Every new command has a behavior test and a durable markdown result.

## References

- Mem Help Center: https://help.mem.ai/
- Mem Search: https://help.mem.ai/article/63-search-the-way-you-think
- Bear app: https://bear.app/?lang=en
- Bear Markdown FAQ: https://bear.app/faq/how-to-use-markdown-in-bear/
