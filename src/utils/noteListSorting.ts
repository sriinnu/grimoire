import type { VaultEntry } from '../types'
import { APP_STORAGE_KEYS, LEGACY_APP_STORAGE_KEYS, getAppStorageItem } from '../constants/appStorage'
import { getDisplayDate } from './noteListHelpers'

/** Built-in or frontmatter-backed note-list sort target. */
export type SortOption = 'modified' | 'created' | 'title' | 'status' | `property:${string}`

/** Direction used by note-list sort controls and persisted preferences. */
export type SortDirection = 'asc' | 'desc'

/** Persisted note-list sort configuration. */
export interface SortConfig {
  option: SortOption
  direction: SortDirection
}

export const DEFAULT_SORT_OPTIONS: SortOption[] = ['modified', 'created', 'title', 'status']

/** Resolve the default direction for a sort option. */
export function getDefaultDirection(option: SortOption): SortDirection {
  if (option === 'modified' || option === 'created') return 'desc'
  return 'asc'
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'modified', label: 'Modified' },
  { value: 'created', label: 'Created' },
  { value: 'title', label: 'Title' },
  { value: 'status', label: 'Status' },
]

/** Return the human label for a built-in or custom sort option. */
export function getSortOptionLabel(option: SortOption): string {
  if (option.startsWith('property:')) return option.slice('property:'.length)
  return SORT_OPTIONS.find((item) => item.value === option)?.label ?? option
}

/** Extract sortable custom property keys from a list of entries. */
export function extractSortableProperties(entries: VaultEntry[]): string[] {
  const keys = new Set<string>()
  for (const entry of entries) {
    if (entry.properties) {
      for (const key of Object.keys(entry.properties)) keys.add(key)
    }
  }
  return [...keys].sort((a, b) => a.localeCompare(b))
}

/** Sort entries newest-display-date first. */
export function sortByModified(a: VaultEntry, b: VaultEntry): number {
  return (getDisplayDate(b) ?? 0) - (getDisplayDate(a) ?? 0)
}

const STATUS_ORDER: Record<string, number> = {
  Active: 0, Paused: 1, Done: 2, Finished: 3,
}

const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}/

function tryParseDate(s: string): number | null {
  if (!ISO_DATE_RE.test(s)) return null
  const date = new Date(s)
  return isNaN(date.getTime()) ? null : date.getTime()
}

function compareNumericPair(a: unknown, b: unknown): number | null {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return (a ? 1 : 0) - (b ? 1 : 0)
  return null
}

function comparePropertyValues(a: unknown, b: unknown): number {
  const numeric = compareNumericPair(a, b)
  if (numeric !== null) return numeric
  const sa = String(a)
  const sb = String(b)
  const da = tryParseDate(sa)
  const db = tryParseDate(sb)
  if (da !== null && db !== null) return da - db
  return sa.localeCompare(sb)
}

function makePropertyComparator(key: string, flip: number): (a: VaultEntry, b: VaultEntry) => number {
  return (a, b) => {
    const va = a.properties?.[key] ?? null
    const vb = b.properties?.[key] ?? null
    if (va == null && vb == null) return 0
    if (va == null) return 1
    if (vb == null) return -1
    return flip * comparePropertyValues(va, vb)
  }
}

function makeBuiltinComparator(option: string, flip: number): (a: VaultEntry, b: VaultEntry) => number {
  if (option === 'title') return (a, b) => flip * a.title.localeCompare(b.title)
  if (option === 'created') return (a, b) => flip * ((a.createdAt ?? a.modifiedAt ?? 0) - (b.createdAt ?? b.modifiedAt ?? 0))
  if (option === 'status') return (a, b) => {
    const sa = STATUS_ORDER[a.status ?? ''] ?? 999
    const sb = STATUS_ORDER[b.status ?? ''] ?? 999
    if (sa !== sb) return flip * (sa - sb)
    return (getDisplayDate(b) ?? 0) - (getDisplayDate(a) ?? 0)
  }
  return (a, b) => flip * ((getDisplayDate(a) ?? 0) - (getDisplayDate(b) ?? 0))
}

/** Create a comparator for the requested note-list sort option. */
export function getSortComparator(option: SortOption, direction?: SortDirection): (a: VaultEntry, b: VaultEntry) => number {
  const flip = (direction ?? getDefaultDirection(option)) === 'asc' ? 1 : -1
  if (option.startsWith('property:')) return makePropertyComparator(option.slice('property:'.length), flip)
  return makeBuiltinComparator(option, flip)
}

/** Serialize a SortConfig to the string format stored in type frontmatter: "option:direction". */
export function serializeSortConfig(config: SortConfig): string {
  return `${config.option}:${config.direction}`
}

/** Parse a frontmatter sort string ("option:direction") back to SortConfig. */
export function parseSortConfig(raw: string | null | undefined): SortConfig | null {
  if (!raw) return null
  const lastColon = raw.lastIndexOf(':')
  if (lastColon <= 0) return null
  const dir = raw.slice(lastColon + 1)
  if (dir !== 'asc' && dir !== 'desc') return null
  const option = raw.slice(0, lastColon) as SortOption
  return { option, direction: dir }
}

/** Load note-list sort preferences from local app storage. */
export function loadSortPreferences(): Record<string, SortConfig> {
  try {
    const raw = getAppStorageItem('sortPreferences')
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    const result: Record<string, SortConfig> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (typeof value === 'string') {
        const opt = value as SortOption
        result[key] = { option: opt, direction: getDefaultDirection(opt) }
      } else {
        result[key] = value as SortConfig
      }
    }
    return result
  } catch {
    return {}
  }
}

/** Save note-list sort preferences to local app storage. */
export function saveSortPreferences(prefs: Record<string, SortConfig>) {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.sortPreferences, JSON.stringify(prefs))
    localStorage.removeItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)
  } catch { /* ignore */ }
}

/** Remove the `__list__` key from localStorage sort preferences. */
export function clearListSortFromLocalStorage(): void {
  try {
    const raw = getAppStorageItem('sortPreferences')
    if (!raw) return
    const parsed = JSON.parse(raw)
    delete parsed['__list__']
    if (Object.keys(parsed).length === 0) {
      localStorage.removeItem(APP_STORAGE_KEYS.sortPreferences)
      localStorage.removeItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)
    } else {
      localStorage.setItem(APP_STORAGE_KEYS.sortPreferences, JSON.stringify(parsed))
      localStorage.removeItem(LEGACY_APP_STORAGE_KEYS.sortPreferences)
    }
  } catch { /* ignore */ }
}
