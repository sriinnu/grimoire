# Grimoire design direction

## The feeling

Grimoire is a private reading and thinking space, not an AI dashboard. It should
feel quiet, native to macOS, and immediately legible before it feels clever.
The interface carries a lot of capability; the visual system must remove noise,
not add ceremony around every feature.

## Surface hierarchy

There are four surfaces, in order:

1. **App field** — the uninterrupted background behind the workspace.
2. **Anchored panes** — sidebar, list, and Second Brain; divided with one
   hairline, never a drop shadow or decorative gradient.
3. **Active selection** — the only strong local surface in a list or nav.
4. **Reading sheet** — the editor canvas. It may be a distinct surface because
   it is the work itself, not another dashboard card.

Do not turn normal rows, inspector sections, or toolbars into floating cards.
Use spacing and hairline dividers to group content. A card is reserved for a
temporary decision, a focused form, or content that needs a bounded reading
surface.

## Semantic colour

Colour communicates one thing at a time and always has a text/icon label.

- Blue: navigation and documents
- Teal: local, protected, verified, or safe
- Amber: capture, recency, and attention
- Violet: relationships, graph, and intelligence
- Orange: caution
- Red: destructive action

Neutral controls are neutral. Never use a rainbow merely to make a toolbar
look busy. Semantic colour must preserve contrast in light and dark modes.

## Panel rules

### Sidebar

- One calm navigation field; group labels are quiet, not boxed.
- The active destination is the only filled navigation row.
- Folders always use the same recognisable folder silhouette. Their semantic
  state comes from colour: normal document folders blue, journals amber,
  protected/vault folders teal, and relationship/agent/research folders violet.
- Icons do not live inside ornamental squares. Keep a consistent hit target and
  provide a label or tooltip for every action.

### Note list

- Notes are rows, never a masonry of cards.
- The selected row has one restrained tint and a thin leading signal; hover is
  weaker than selection.
- Metadata is secondary. It must never compete with the note title.

### Second Brain

- The panel is an anchored inspector, not a second dashboard.
- Use one compact context/status strip followed by readable sections.
- Sections are separated by rhythm and hairlines. No nested white boxes, accent
  bars, fake node diagrams, or decorative gradients.
- Show only real graph relationships, source state, and actions.

## Typography, depth, and motion

- Prefer the system UI font for chrome. Reserve reading typography for note
  content.
- Use regular and semibold weights before adding size or colour.
- No gradients in normal chrome. No glow on selection. No decorative shadow on
  anchored panes.
- Interaction feedback is a 120–180ms colour or opacity transition; respect
  reduced-motion settings.

## Guardrails

- Do not imitate a web AI dashboard.
- Do not use more than one visible elevation level in a single pane.
- Do not rely on colour alone for private, unsafe, or destructive states.
- Do not ship an icon that a new user cannot identify in two seconds.
- Verify every change in both light and dark themes, at a narrow and a wide
  window size, in the installed singleton app.
