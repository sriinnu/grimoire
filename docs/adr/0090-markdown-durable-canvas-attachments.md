---
type: ADR
id: "0090"
title: "Markdown-durable canvas attachments"
status: active
date: 2026-05-04
---

## Context

Grimoire should support handwritten notes, sketches, and whiteboards without turning Markdown notes into an app-only database. Tauri can provide a web canvas or Excalidraw/Tldraw-style surface. Apple support surfaces can use PencilKit. Those engines should not define different vault semantics.

Markdown cannot faithfully store pressure-sensitive strokes, layers, embedded images, and future whiteboard metadata by itself. Storing stroke JSON inline inside the note would make normal notes noisy, fragile, and unpleasant to edit outside Grimoire.

## Decision

**Canvas and handwriting notes are durable attachments referenced from Markdown.**

The Markdown note owns a readable preview and a fenced metadata block:

````markdown
![Handwritten Canvas](attachments/handwriting-2026-05-04-143012.png)

```grimoire-canvas
type: handwriting
source: attachments/handwriting-2026-05-04-143012.grimoire-canvas.json
preview: attachments/handwriting-2026-05-04-143012.png
```
````

The initial command catalog inserts this portable contract. The future canvas editor will create and update:

- an editable source file, initially `*.grimoire-canvas.json`
- a preview image, usually `*.png`
- the Markdown reference block in the note body

Initial slash-command stems include the local date and time down to seconds, for example
`handwriting-2026-05-04-143012`, so two canvases created on the same day do not overwrite the
same attachment paths. The future canvas editor should still de-duplicate if a same-second collision
already exists on disk.

## Options Considered

- **Attachment-backed canvas contract** (chosen): keeps notes portable, lets Tauri and PencilKit share one saved format, and lets other editors at least show the preview image.
- **Inline stroke JSON in Markdown**: one file, but it makes notes noisy and hard to edit by hand.
- **PNG-only handwriting**: portable preview, but no editable strokes or layers.
- **Platform-specific files**: tempting for PencilKit or Excalidraw internals, but it would split vault semantics by app shell.

## Consequences

- The vault remains the source of truth: Markdown references attachments, and attachments live beside notes.
- Canvas engines are replaceable as long as they read/write the same source + preview contract.
- The raw editor can always show the Markdown reference and metadata block.
- Future work should add an actual canvas editor surface that opens `grimoire-canvas` blocks, writes the source JSON, and regenerates the preview PNG.
