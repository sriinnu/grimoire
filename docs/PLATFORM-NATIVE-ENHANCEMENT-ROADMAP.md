# Platform-Native Enhancement Roadmap

This roadmap keeps the product direction clear: Grimoire should have Bear-grade markdown writing, Mem-grade capture and recall, Obsidian-grade graph/wiki workflows, and native Apple clients over a reusable product kernel without abandoning the proven Tauri app before parity.

The feature-by-feature replacement gate lives in [Native Apple Capability Parity](NATIVE-APPLE-CAPABILITY-PARITY.md). A native build or attractive shell is not product parity.

## Current / Prototype / Target

| Area | Shipping today | Prototype now | Target |
|---|---|---|---|
| Main app | Tauri + React + Rust | Shared product contracts and reusable editor packages | Platform clients over one UI-neutral Rust kernel |
| Apple support | Tauri macOS build | Swift package plus SwiftUI/WebKit host prototype | Native SwiftUI/AppKit macOS client after explicit feature parity |
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

## Phase 4: Native Apple Client Without Splitting Product Truth

Goal: keep one serious editor product while using native code for the few places where it actually matters.

- Tauri + React: Windows/Linux client and shipping macOS fallback until parity.
- Rust product kernel: filesystem, Git, search/cache, context/events, privacy, recovery, and secure service boundaries.
- SwiftUI/AppKit/UIKit/WebKit: native Apple shell, forms, inspectors, window behavior, platform integrations, and focused rich-editor hosting during migration.
- Shared: markdown fixtures, vault model, command concepts, AI write-audit rules, and packaging identity.
- Not duplicated: vault, Git, privacy, context, event, and persistence behavior.

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
