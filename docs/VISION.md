# Vision

Grimoire is a local operating system for thought.

Not a notes clone. Not a database clone. Not an AI chat wrapper.

The durable core is simple: markdown files, readable structure, relationships, journal context, graph navigation, Git history, and local agents that can understand the same workspace the user sees.

## The Bet

People do not need another place to dump text. They need a system that can hold life, projects, research, decisions, routines, memories, and agent instructions without collapsing into folders nobody opens.

Grimoire should make a vault feel like:

- a journal when you are reflecting
- a workbench when you are executing
- a graph when you are exploring
- a studio when you are shaping ideas into output
- a memory system when you are working with AI

Same files. Different lenses.

## The Grimoire Shape

Grimoire should not inherit its identity from its starting point. The repo can learn from reference apps and local research projects, but the product must be its own thing.

The unique shape:

- **Journal-native**: daily notes, weather, mood, time, review, and personal context are first-class.
- **Graph-native**: the active note's neighborhood is the default sensemaking view.
- **Agent-native**: local AI tools see markdown, frontmatter, graph context, and Git history.
- **Platform-native where it matters**: Apple UX can be SwiftUI/AppKit/UIKit, while Windows/Linux stay Tauri; text editing, menus, file access, QuickLook/share surfaces, and polish should belong to the platform that does them best.
- **Theme-studio aware**: typography, density, contrast, motion, and graph readability are adjustable surfaces, not afterthought settings.

## Product Principles

**Local first.** The vault should work offline, in Git, in another editor, and years from now.

**Markdown first.** Rich UI is allowed to be beautiful, but markdown stays the durable document.

**Structure without bureaucracy.** Types and relationships should help the user move faster, not punish them for missing fields.

**Journal as a timeline.** A day note is not a random note with a date. It is a memory anchor that can collect weather, people, meetings, decisions, tasks, and emotional context.

**Graph as working memory.** The graph should reveal useful context, not just draw a spiderweb.

**AI-readable by design.** If a human can understand the vault structure, a local agent should be able to understand it too.

**Native where it matters.** Tauri/React is right for non-Apple desktop. macOS and iOS should be SwiftUI-first where native text, menus, gestures, file access, and polish are objectively better.

**Taste matters.** The UI should feel calm, intentional, and alive. High craft here means motion, spacing, contrast, icons, color, and empty states all serve comprehension. The cinematic motion direction lives in [Cinematic Motion Direction](CINEMATIC-MOTION-DIRECTION.md).

## What Grimoire Is Not

- Not an Obsidian clone.
- Not a hosted Notion replacement.
- Not a proprietary document format.
- Not a cloud knowledge base.
- Not a chatbot with a file picker.
- Not a graph toy.
- Not a reskinned branch of its starting point.

## North Star Workflows

Daily journal:

- create a day note
- insert optional weather context
- add mood, energy, location, and time blocks when useful
- link people, projects, events, and decisions
- see the day in future graph and search flows
- review weeks and months without leaving markdown

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

AI memory workspace:

- select an active note or graph neighborhood
- send a scoped context pack to a local agent
- inspect what the agent read and changed
- accept multi-file edits explicitly
- keep the full trail in files and Git

Personal operating system:

- keep routines, goals, health notes, ideas, and decisions together
- use Git history as memory
- use types as lenses
- keep data portable

## Near-Term Direction

1. Finish the core app polish: experience profiles, typography, graph UX, editor find/replace, image previews, file actions, and Apple-native text behavior.
2. Build Grimoire's journal layer: daily notes, templates, weather snapshots, mood/time context, timeline, and review surfaces.
3. Make the graph useful enough to navigate large vaults: filters, clusters, type coloring, local/global views, minimap, and semantic suggestions.
4. Harden the editor contract: raw/rich parity, math while typing, IME, native shortcuts, and safe markdown serialization.
5. Build the platform-native split deliberately: SwiftUI macOS/iOS shells, Tauri Windows/Linux shell, shared markdown/vault semantics, parity fixtures.
6. Keep agent integration local, inspectable, and useful: MCP tools, strict command contracts, and vault-aware context packs.

## Long-Term Direction

Grimoire should become the place where a user's knowledge, routines, projects, and AI collaborators meet.

The app should remain portable enough that the user can leave without losing anything, and powerful enough that they do not want to.
