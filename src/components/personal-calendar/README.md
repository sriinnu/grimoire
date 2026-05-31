# Personal Calendar

Reusable local-first calendar surface for Grimoire's date-oriented lanes.

## Contract

- Inputs are day-level metadata only: `dateKey`, total counts, type counts, status counts, and protected counts.
- Hosts should pass the full sanitized day set for the month/year view, not only a recent dashboard slice.
- Journal and Dream capture callbacks receive a local `Date`.
- Day cells expose a date-scoped context menu for selecting the day, capturing Journal/Dream entries, and switching lane filters.
- Journal and Dream capture flows may create a dated blank template; body text is optional for these lanes.
- Lane filters must affect both calendar highlighting and the selected-day agenda.
- The component must not read note bodies, paths, snippets, provider names, or attachment metadata.
- The grid is always 42 cells so month navigation does not shift the surrounding layout.
- Use `density="compact"` inside dashboards or side panels; standalone surfaces can keep the default comfortable density.

## Reuse

Import from `src/components/personal-calendar`:

```ts
import { PersonalCalendar, type PersonalCalendarDay } from '@/components/personal-calendar'
```

Host surfaces can wire `onCaptureJournal`, `onCaptureDream`, and `onDateSelect` without depending on dashboard code.
