import type { VaultEntry } from '../../types'
import { relativeDate } from '../../utils/noteListHelpers'
import { humanizePropertyKey } from '../../utils/propertyLabels'
import { resolvePropertyChipLabels } from '../note-item/propertyChipValues'

export const TABLE_ROW_CAP = 500
const BUILT_IN_COLUMNS = ['title', 'type', 'status', 'modified'] as const
type BuiltInColumn = (typeof BUILT_IN_COLUMNS)[number]

export interface NoteTableColumn {
  key: string
  label: string
  builtIn: boolean
}

export function tableColumns(customProperties: readonly string[]): NoteTableColumn[] {
  const custom = customProperties
    .filter((key) => !BUILT_IN_COLUMNS.includes(key.toLowerCase() as BuiltInColumn))
    .map((key) => ({ key, label: humanizePropertyKey(key), builtIn: false }))
  return [
    { key: 'title', label: 'Title', builtIn: true },
    { key: 'type', label: 'Type', builtIn: true },
    { key: 'status', label: 'Status', builtIn: true },
    { key: 'modified', label: 'Modified', builtIn: true },
    ...custom,
  ]
}

/** The text a cell shows; also what sorting and the quick filter compare. */
export function cellText(
  entry: VaultEntry,
  column: NoteTableColumn,
  allEntries: VaultEntry[],
  typeEntryMap: Record<string, VaultEntry>,
): string {
  switch (column.key) {
    case 'title':
      return entry.title
    case 'type':
      return entry.isA ?? ''
    case 'status':
      return entry.status ?? String(entry.properties.status ?? entry.properties.Status ?? '')
    case 'modified':
      return entry.modifiedAt ? relativeDate(entry.modifiedAt) ?? '' : ''
    default:
      return resolvePropertyChipLabels(entry, [column.key], allEntries, typeEntryMap).join(', ')
  }
}

function sortValue(entry: VaultEntry, column: NoteTableColumn, allEntries: VaultEntry[], typeEntryMap: Record<string, VaultEntry>): string | number {
  if (column.key === 'modified') return entry.modifiedAt ?? 0
  return cellText(entry, column, allEntries, typeEntryMap).toLowerCase()
}

export interface NoteTableSort {
  key: string
  direction: 'asc' | 'desc'
}

export function sortRows(
  rows: VaultEntry[],
  sort: NoteTableSort | null,
  columns: NoteTableColumn[],
  allEntries: VaultEntry[],
  typeEntryMap: Record<string, VaultEntry>,
): VaultEntry[] {
  if (!sort) return rows
  const column = columns.find((candidate) => candidate.key === sort.key)
  if (!column) return rows
  const keyed = rows.map((entry) => ({ entry, value: sortValue(entry, column, allEntries, typeEntryMap) }))
  keyed.sort((a, b) => {
    if (a.value === b.value) return a.entry.title.localeCompare(b.entry.title)
    const less = typeof a.value === 'number' && typeof b.value === 'number' ? a.value < b.value : String(a.value) < String(b.value)
    return (less ? -1 : 1) * (sort.direction === 'asc' ? 1 : -1)
  })
  return keyed.map((item) => item.entry)
}
