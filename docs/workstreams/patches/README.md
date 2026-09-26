# Work-in-progress patches

Saved from agent worktrees so the work isn't lost. None of these are merged.
Apply on a fresh `feat/*` branch from `claude/dazzling-meitner-xk36qm`, run
the full validation in `docs/DESIGN-OVERHAUL-WORKSTREAMS.md` §0, then merge.

| Patch | Workstream | State | Built on |
| --- | --- | --- | --- |
| `ws2.3-heading-outline-rail.patch` | WS2.3 | Complete commit; its own tests pass. Apply with `git am -3`. Expect small conflicts in `EditorContentLayout.tsx` and `EditorNavigatorControls.tsx` (the base has since changed) | `main` at `a2ea7b5` |
| `ws3.1-wikilink-hover-peek.WIP.patch` | WS3.1 | Unfinished and untested | `main` at `a2ea7b5` |
| `ws3.2-shortcuts-sheet.WIP.patch` | WS3.2 | Unfinished and untested | `5685903` |
| `ws3.3-quick-capture.WIP.patch` | WS3.3 | Unfinished and untested | `5685903` |
| `ws5-on-this-day-pinned.WIP.patch` | WS5 | Unfinished and untested | `5685903` |

Apply the WIP patches with `git apply --3way <file>`. Treat them as a head
start, not as finished work: read the diff, then finish it against the spec.
Delete this folder once everything is merged.
