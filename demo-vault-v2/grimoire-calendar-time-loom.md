---
type: Note
aliases:
  - "[[Calendar Time Loom Demo]]"
  - "[[Time Loom Demo]]"
belongs_to: "[[grimoire-learning-project]]"
status: Active
priority: High
related_to:
  - "[[grimoire-feature-tour]]"
  - "[[grimoire-journal-demo-2026-05-31]]"
  - "[[grimoire-dream-demo-2026-05-31]]"
  - "[[event-team-sync-2025-01-13]]"
  - "[[grimoire-privacy-and-memory]]"
---

# Calendar and Time Loom Demo

Time Loom is Grimoire's metadata-only calendar substrate. It reads dates, types, and safe counters from the vault, then shows temporal patterns without needing to expose private note titles or bodies.

## Dated substrate

These three editable notes are enough to show the shape:

| Source | Type | Date | Why it matters |
| --- | --- | --- | --- |
| [[grimoire-journal-demo-2026-05-31]] | Journal | 2026-05-31 | Daily reflection can sit beside projects. |
| [[grimoire-dream-demo-2026-05-31]] | Dream | 2026-05-31 | Dream recall can share the same local day. |
| [[event-team-sync-2025-01-13]] | Event | 2025-01-13 | Scheduled work appears as calendar metadata. |

## Privacy rule

Time Loom should prove rhythm without leaking content:

- `type: Journal`, `type: Dream`, and `type: Event` create lanes.
- `date:` creates calendar placement.
- `locality: local-first` and `egress-blocked: true` keep private context local.
- The dashboard can count "Journal 1", "Dream 1", or "Calendar 1" without showing sensitive labels.

## Try it

1. Open the dashboard.
2. Find the Time Loom panel below Quick Capture.
3. Use the calendar to see dated buckets.
4. Open the linked Journal, Dream, and Event notes to inspect the frontmatter that powers the view.

The point is simple: Grimoire turns ordinary Markdown frontmatter into a private temporal map.
