# Cinematic Motion Direction

Status: active direction
Ownership: product, frontend, Apple shell

Grimoire motion should make the app feel like an original cinematic storybook for thought: pages, constellations, ink, memory, and working surfaces coming alive just enough to guide attention. It should not copy Pixar, Disney, anime, game cutscenes, or any specific studio language. The reference is not a brand of animation; it is a principle: motion reveals state, relationship, and consequence.

## Direction

The product should feel:

- **Quietly magical**: alive at the edges, never theatrical in core writing.
- **Book-native**: page turns, chapter shifts, margin reveals, ink settling, and table-of-contents movement are better metaphors than bouncing panels.
- **Graph-native**: linked notes can move like constellations, not like social media cards.
- **Tactile**: motion should imply paper, glass, ink, focus, and depth without becoming skeuomorphic.
- **Original**: avoid recognizable studio tropes, mascot behavior, elastic cartoon physics, character-like UI, sparkles as decoration, or "storybook" as childish ornament.

Animation earns its place only when it answers one of these questions:

1. What changed?
2. Where did this come from?
3. Where did it go?
4. What is related?
5. What needs my attention now?

If it cannot answer one, it should probably be still.

## Motion Tokens

Use tokens instead of one-off timings. React/Tauri owns the CSS token names first; SwiftUI can map them to native timing/easing names later.

Implemented in `src/motion.css`:

| CSS token | Timing / easing | Use |
| --- | ---: | --- |
| `--motion-duration-fast` | 120ms | pressed states, small opacity corrections |
| `--motion-duration-base` | 180ms | hover, active row, small control reveals |
| `--motion-duration-slow` | 420ms | panels, command palette, inspector changes |
| `--motion-duration-cinematic` | 2400ms | rare ambient product moments |
| `--motion-delay-memory-thread` | 620ms | staggered Memory signal thread |
| `--motion-ease-standard` | cubic out | calm UI easing |
| `--motion-ease-expressive` | spring-like | occasional accent easing |
| `--motion-ease-cinematic` | ease-in-out | slow memory/storybook motion |

Depth tokens:

- `depth.flat`: no transform; opacity/color only.
- `depth.lift`: 1-2px translate or shadow for hover and drag affordance.
- `depth.page`: 4-8px translate, clip, or scale for navigation between document surfaces.
- `depth.space`: graph/canvas-only parallax or zoom; must preserve orientation.

## Reduced Motion

Reduced motion is a first-class mode, not a cleanup pass.

- Honor OS-level reduced-motion settings by default.
- Provide an app preference later only if users need stricter control than the OS gives.
- Replace movement with opacity, contrast, outline, or instant layout changes.
- Keep timing under `--motion-duration-fast` for necessary feedback.
- Disable ambient animation, parallax, large zoom, graph force movement, and page-turn effects.
- Never make reduced-motion users wait longer for the same state change.

## Where Animation Is Allowed

Allowed:

- Note transitions: opening, closing, retargeting, tab swapping, journal date changes.
- Graph interactions: neighborhood expansion, node focus, edge highlighting, filtered clusters.
- Command surfaces: command palette, slash commands, find/replace, context menus.
- Inspector and side panels: reveal/hide, section expansion, relationship previews.
- Save/sync/git status: subtle state transitions that clarify completion or failure.
- Empty states and onboarding: restrained illustrative motion when no writing surface is active.

Avoid:

- Cursor, typing, selection, IME, and core editor text flow.
- Repeating animation while the user is reading or writing.
- Decorative sparkles, floating objects, bounce-heavy easing, or character-like UI reactions.
- Motion that shifts layout after the user has aimed at a target.
- Animation in error recovery paths unless it makes the recovery clearer.

## Implementation Phases

### Phase 1: Token Foundation

- Add shared motion CSS tokens for duration, easing, reduced-motion fallbacks, and depth. The initial token file is `src/motion.css`.
- Document SwiftUI equivalents before implementing Apple-native surfaces.
- Replace ad hoc transition values in touched UI with tokens only when already editing that area.

### Phase 2: Navigation And Panels

- Apply `motion.standard` to command palette, inspector, side panels, and context surfaces.
- Apply `motion.page` to note open/tab swap transitions only after measuring editor stability.
- Keep editor text surfaces still.

### Phase 3: Graph Cinematics

- Add graph-specific settle, focus, and cluster transitions with `motion.graph`.
- Support reduced-motion graph mode with instant layout and edge emphasis.
- Avoid whole-vault "wow map" animation until active-neighborhood motion is excellent.

### Phase 4: Storybook Moments

- Add rare, original storybook motion to journal review, empty states, and first-run flows.
- Keep these optional, skippable, and disabled under reduced motion.
- Review any illustrative motion against the "not copying a studio" rule before shipping.

## Current Implementation

The first shipped accent is the right-sidebar Memory signal:

- file: `src/components/inspector/MemoryPanel.tsx`
- styles: `src/motion.css`
- behavior: one quiet memory-orb reveal with two relationship threads
- purpose: visually anchor the Memory lane while real capability/status remains in text
- accessibility: hidden from screen readers and disabled under reduced motion

## Canvas Direction

Handwritten notes and whiteboards should animate through the canvas engine, not through Markdown hacks.

Expected motion:

- smooth ink strokes
- optional stroke replay
- lasso/selection easing
- preview image crossfade after save
- crystallize-to-note shimmer when converting sketch to structured Markdown

Storage remains:

- Markdown image preview
- `grimoire-canvas` metadata fence
- editable `*.grimoire-canvas.json` attachment source
- preview `*.png`

## Chitragupta Direction

When Chitragupta backend tools are live, the Memory lane can animate:

- degraded: still orb, muted threads
- searching: slow relationship trace
- results: one pulse per source-backed result group
- crystallizing: brief light pass, then static completion
- diagnostics: no flourish on warnings; use clear severity first

## Acceptance Checklist

- Motion clarifies state or relationship.
- Reduced motion has an equal-quality path.
- Tokens are used instead of raw timings.
- Writing and reading remain calm.
- The result feels like Grimoire, not a borrowed animation style.
