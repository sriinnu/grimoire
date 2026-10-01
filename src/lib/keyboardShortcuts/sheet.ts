import { formatChordCaps, type ShortcutPlatform } from './chords'
import { SHORTCUT_GROUPS, type ShortcutEntry, type ShortcutGroupId } from './registry'

export interface ShortcutSheetRow {
  entry: ShortcutEntry
  /** One cap list per alternative chord. */
  caps: string[][]
}

export interface ShortcutSheetGroup {
  id: ShortcutGroupId
  label: string
  rows: ShortcutSheetRow[]
}

/** Groups entries into sheet columns (Navigate, Notes, Writing, View), dropping empty groups. */
export function groupShortcutEntries(
  entries: readonly ShortcutEntry[],
  platform: ShortcutPlatform,
): ShortcutSheetGroup[] {
  return SHORTCUT_GROUPS
    .map(({ id, label }) => ({
      id,
      label,
      rows: entries
        .filter((entry) => entry.group === id)
        .map((entry) => ({ entry, caps: entry.chords.map((chord) => formatChordCaps(chord, platform)) })),
    }))
    .filter((group) => group.rows.length > 0)
}

function rowSearchText(row: ShortcutSheetRow, groupLabel: string): string {
  const capsText = row.caps.flatMap((caps) => [caps.join(''), caps.join('+'), ...caps])
  return [row.entry.label, groupLabel, ...(row.entry.keywords ?? []), ...capsText].join(' ').toLowerCase()
}

/** Keeps rows whose label, group, keywords or key caps contain every query term. */
export function filterShortcutGroups(groups: readonly ShortcutSheetGroup[], query: string): ShortcutSheetGroup[] {
  const terms = query.trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (terms.length === 0) return [...groups]
  return groups
    .map((group) => ({
      ...group,
      rows: group.rows.filter((row) => {
        const text = rowSearchText(row, group.label)
        return terms.every((term) => text.includes(term))
      }),
    }))
    .filter((group) => group.rows.length > 0)
}
