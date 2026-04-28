# Vision

Grimoire is a local operating system for thought.

Not a notes clone. Not a database clone. Not an AI chat wrapper.

The durable core is simple: markdown files, readable structure, relationships, graph navigation, Git history, and local agents that can understand the same workspace the user sees.

## The Bet

People do not need another place to dump text. They need a system that can hold life, projects, research, decisions, routines, memories, and agent instructions without collapsing into folders nobody opens.

Grimoire should make a vault feel like:

- a journal when you are reflecting
- a project workspace when you are executing
- a graph when you are exploring
- a docs site when you are explaining
- a memory system when you are working with AI

Same files. Different lenses.

## Product Principles

**Local first.** The vault should work offline, in Git, in another editor, and years from now.

**Markdown first.** Rich UI is allowed to be beautiful, but markdown stays the durable document.

**Structure without bureaucracy.** Types and relationships should help the user move faster, not punish them for missing fields.

**Graph as a lens.** The graph should reveal useful context, not just draw a spiderweb.

**AI-readable by design.** If a human can understand the vault structure, a local agent should be able to understand it too.

**Native where it matters.** Tauri/React is fine for broad iteration. macOS should get SwiftUI/AppKit where native text, menus, file watching, and polish are objectively better.

**Taste matters.** The UI should feel calm, intentional, and alive. Pixar-level craft here means motion, spacing, contrast, icons, color, and empty states all serve comprehension.

## What Grimoire Is Not

- Not an Obsidian clone.
- Not a hosted Notion replacement.
- Not a proprietary document format.
- Not a cloud knowledge base.
- Not a chatbot with a file picker.
- Not a graph toy.

## North Star Workflows

Daily journal:

- create a day note
- insert optional weather context
- link people, projects, events, and decisions
- see the day in future graph and search flows

Project workspace:

- create a Project note
- relate procedures, responsibilities, meetings, and people
- view Neighborhood mode while executing
- use AI agents against the same local context

Research workspace:

- save sources as notes
- use wikilinks and relationships to connect ideas
- inspect clusters through the graph
- turn selected notes into drafts, docs, or agent briefings

Personal operating system:

- keep routines, goals, health notes, ideas, and decisions together
- use Git history as memory
- use types as lenses
- keep data portable

## Near-Term Direction

1. Finish the core app polish: themes, typography, graph UX, editor find/replace, image previews, file actions, and macOS text behavior.
2. Make the graph useful enough to navigate large vaults: filters, clusters, type coloring, local/global views, and eventually semantic suggestions.
3. Harden the editor contract: raw/rich parity, math while typing, IME, native shortcuts, and safe markdown serialization.
4. Improve journal workflows: templates, daily notes, weather snapshots, calendar/time context, and recurring review surfaces.
5. Explore native macOS layers where they clearly win: SwiftUI shell, AppKit text, FSEvents, QuickLook, export.
6. Keep agent integration local, inspectable, and useful: MCP tools, strict command contracts, and vault-aware context packs.

## Long-Term Direction

Grimoire should become the place where a user's knowledge, routines, projects, and AI collaborators meet.

The app should remain portable enough that the user can leave without losing anything, and powerful enough that they do not want to.
