# Grimoire Differentiation

This repo has reference DNA from local research projects and an earlier branch-off point. Those repos are useful as lessons, not as a destination. Grimoire needs its own product spine.

## Product Thesis

Grimoire is not only a markdown knowledge-base app. It is a local memory studio where journaling, graph sensemaking, native desktop polish, and AI-readable structure meet.

The differentiator is the combination:

- journal-native capture
- graph-native navigation
- agent-readable local files
- Mac-grade interaction quality
- user-owned markdown as the durable contract

## Where We Must Diverge

### 1. Journal First, Not Just Notes First

Daily notes, weather, mood, time context, calendar context, reviews, and personal logs should feel like primary workflows. A project workspace is important, but Grimoire should also understand a person's day.

Distinctive work:

- daily note command
- journal templates
- optional weather blocks
- weekly and monthly review views
- timeline lens over dated notes and Git history

### 2. Graph As Working Memory

The graph should answer "what surrounds this thought?" before it tries to impress anyone with a whole-vault map.

Distinctive work:

- active-neighborhood default
- pinned node trails
- incoming/outgoing edge filters
- clusters by type, time, project, and relationship family
- semantic suggestions as an overlay, not a replacement for links

### 3. Agent Memory, Not Chat Bolted On

Agents should operate on the same files and structures the user sees. They should not require a cloud database, hidden state, or proprietary workspace model.

Distinctive work:

- active-note and neighborhood context packs
- graph context packs
- selected-file context packs
- tool-call audit trails
- explicit write confirmation for multi-file edits

### 4. Platform-Native Craft As Product Surface

Tauri + React remains the non-Apple desktop shell. Apple UX should be SwiftUI-first where the platform is objectively better. The apps may be separate implementations as long as the vault and markdown semantics stay one product.

Distinctive work:

- SwiftUI macOS shell
- SwiftUI iOS shell
- AppKit/TextKit editing spike
- native find/replace behavior
- FSEvents-backed vault watching
- QuickLook previews
- artifact names and packaging that feel boringly professional

### 5. Theme Studio, Not Color Picker Theater

Themes should change the feel of the whole workspace: editor rhythm, graph contrast, command surfaces, typography, motion, code blocks, and reading density.

Distinctive work:

- UI font, heading font, editor font, monospace font
- editor width, line height, paragraph spacing
- contrast presets
- reduced-motion-first animation tokens
- graph-specific color and motion tokens

## Product Tests

Before adding a major feature, ask:

1. Does this make the vault more useful as a journal, graph, memory system, or agent workspace?
2. Does it keep markdown and frontmatter readable outside the app?
3. Does it feel better because it is Grimoire, not because another app already did it?
4. Would this still make sense in a native macOS surface?
5. Can an AI agent understand the same structure without secret app state?

If the answer is no, it belongs in the backlog until it earns its place.
