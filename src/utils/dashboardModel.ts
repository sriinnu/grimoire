import type { VaultEntry } from '../types'
import {
  buildMobileReviewItem,
  mobileReviewState,
  type MobileReviewItem,
  sortMobileReviewItems,
} from '../lib/mobileCaptureMetadata'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { getDisplayDate } from './noteListHelpers'
import { sortByModified } from './noteListSorting'
import { formatTypeCount, pluralizeCount } from './notebookCountLabels'

export interface OpenLoopBucket {
  label: string
  count: number
}

export interface DailyBrief {
  privateHeldCount: number
  primaryLabel: string
  supportingItems: string[]
}

export interface DashboardSummary {
  activeNotes: number
  contextSwitchCount: number
  crystallizedTodayCount: number
  dailyBrief: DailyBrief
  dreamCount: number
  hasDreamToday: boolean
  hasJournalToday: boolean
  journalCount: number
  memoryQueueEntries: VaultEntry[]
  memoryQueueCount: number
  mobileReviewEntries: MobileReviewItem[]
  mobileReviewCount: number
  openLoopBuckets: OpenLoopBucket[]
  openLoopCount: number
  recentEntries: VaultEntry[]
  recentProtectedCount: number
}

const CLOSED_STATUSES = new Set(['done', 'finished', 'closed', 'archived'])
const TRUE_PROPERTY_VALUES = new Set(['1', 'true', 'yes', 'done'])
const SAFE_LOCAL_ONLY_LOOP_LABELS = new Set([
  'calendar',
  'dream',
  'event',
  'journal',
  'meeting',
  'memory',
  'mobile',
  'note',
  'task',
  'todo',
])

function isMarkdown(entry: VaultEntry): boolean {
  return entry.fileKind === 'markdown' || !entry.fileKind
}

function isContentEntry(entry: VaultEntry): boolean {
  return isMarkdown(entry) && entry.isA !== 'Type'
}

function isOpenEntry(entry: VaultEntry): boolean {
  if (!isContentEntry(entry) || entry.archived) return false
  if (isReviewedCrystallizedMemory(entry)) return false
  const normalizedStatus = entry.status?.trim().toLowerCase()
  return !normalizedStatus || !CLOSED_STATUSES.has(normalizedStatus)
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

function entryMatchesDate(entry: VaultEntry, dateKey: string): boolean {
  if (entry.title.includes(dateKey) || entry.filename.includes(dateKey)) return true
  const displayDate = getDisplayDate(entry)
  if (!displayDate) return false
  return localDateKey(new Date(displayDate * 1000)) === dateKey
}

function typeIs(entry: VaultEntry, typeName: string): boolean {
  return entry.isA?.trim().toLowerCase() === typeName.toLowerCase()
}

function normalizedPropertyValues(value: VaultEntry['properties'][string] | undefined): string[] {
  if (value === null || value === undefined) return []
  const values = Array.isArray(value) ? value : [value]
  return values.map((item) => String(item).trim().toLowerCase()).filter(Boolean)
}

function propertyTruthy(entry: VaultEntry, key: string): boolean {
  return normalizedPropertyValues(entry.properties[key]).some((value) => TRUE_PROPERTY_VALUES.has(value))
}

function propertyDateMatches(entry: VaultEntry, key: string, dateKey: string): boolean {
  return propertyTimestamps(entry.properties[key]).some((timestamp) => {
    return localDateKey(new Date(timestamp * 1000)) === dateKey
  })
}

function propertyTimestamps(value: VaultEntry['properties'][string] | undefined): number[] {
  if (Array.isArray(value)) return value.flatMap(propertyTimestamps)
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return [value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value)]
  }
  if (typeof value !== 'string') return []
  const trimmed = value.trim()
  if (!trimmed) return []
  const parsed = Date.parse(trimmed)
  return Number.isNaN(parsed) ? [] : [Math.floor(parsed / 1000)]
}

function hasPendingMobileReview(entry: VaultEntry): boolean {
  return isOpenEntry(entry) && mobileReviewState(entry) !== null
}

function isReviewedCrystallizedMemory(entry: VaultEntry): boolean {
  return typeIs(entry, 'Memory') && propertyTruthy(entry, 'crystallized') && propertyTimestamps(entry.properties.reviewed_at).length > 0
}

function isCrystallizedToday(entry: VaultEntry, todayKey: string): boolean {
  return isReviewedCrystallizedMemory(entry) && propertyDateMatches(entry, 'reviewed_at', todayKey)
}

function buildOpenLoopBuckets(entries: VaultEntry[]): OpenLoopBucket[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    if (!isOpenEntry(entry)) continue
    const label = openLoopLabel(entry)
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5)
}

function openLoopLabel(entry: VaultEntry): string {
  const label = entry.isA?.trim() || 'Note'
  if (!resolveEntryLocalityPolicy(entry).localOnly) return label
  return SAFE_LOCAL_ONLY_LOOP_LABELS.has(label.toLowerCase()) ? label : 'Private'
}

function countOpenLoops(entries: VaultEntry[]): number {
  return entries.reduce((count, entry) => count + (isOpenEntry(entry) ? 1 : 0), 0)
}

function parentFolder(entry: VaultEntry): string {
  const parts = entry.path.split('/').filter(Boolean)
  return parts.length > 1 ? parts[parts.length - 2].toLowerCase() : 'root'
}

function contextKey(entry: VaultEntry): string {
  return `${entry.isA ?? 'Note'}:${parentFolder(entry)}`
}

function countContextSwitches(recentEntries: VaultEntry[]): number {
  return recentEntries.reduce((count, entry, index) => {
    const previous = recentEntries[index - 1]
    return previous && contextKey(previous) !== contextKey(entry) ? count + 1 : count
  }, 0)
}

function isVaultContextEntry(entry: VaultEntry): boolean {
  return !resolveEntryLocalityPolicy(entry).localOnly
}

function buildDailyBrief(input: {
  crystallizedTodayCount: number
  hasDreamToday: boolean
  hasJournalToday: boolean
  memoryQueueCount: number
  mobileReviewCount: number
  openLoopBuckets: OpenLoopBucket[]
  openLoopCount: number
  recentProtectedCount: number
}): DailyBrief {
  const items = new Set<string>()
  if (!input.hasJournalToday) items.add('Journal open')
  if (!input.hasDreamToday) items.add('Dream open')
  if (input.memoryQueueCount > 0) items.add(pluralizeCount(input.memoryQueueCount, 'memory review'))
  if (input.mobileReviewCount > 0) items.add(pluralizeCount(input.mobileReviewCount, 'mobile review'))
  if (input.openLoopCount > 0) items.add('Pages to revisit')
  for (const bucket of input.openLoopBuckets.slice(0, 2)) {
    items.add(formatTypeCount(bucket.label, bucket.count))
  }
  if (input.recentProtectedCount > 0) items.add(`${input.recentProtectedCount} private recent held`)
  items.add(input.crystallizedTodayCount > 0 ? 'Memory landed' : 'Remember next')

  const primaryLabel =
    input.memoryQueueCount > 0 ? 'Review memory'
      : input.mobileReviewCount > 0 ? 'Review mobile'
        : !input.hasJournalToday ? 'Journal check-in'
          : !input.hasDreamToday ? 'Catch a dream'
            : input.openLoopCount > 0 ? 'One page today'
              : input.crystallizedTodayCount === 0 ? 'Crystallize'
                : 'Capture freely'

  return {
    privateHeldCount: input.recentProtectedCount,
    primaryLabel,
    supportingItems: [...items].slice(0, 6),
  }
}

/** Builds the local vault dashboard summary without reading note bodies. */
export function buildDashboardSummary(entries: VaultEntry[], now: Date = new Date()): DashboardSummary {
  const activeContent = entries.filter((entry) => isContentEntry(entry) && !entry.archived)
  const openLoopBuckets = buildOpenLoopBuckets(entries)
  const todayKey = localDateKey(now)
  const memoryQueueEntries = activeContent.filter((entry) => (
    typeIs(entry, 'Memory') && isOpenEntry(entry) && !isReviewedCrystallizedMemory(entry)
  ))
  const mobileReviewEntries = activeContent.filter(hasPendingMobileReview)
  const mobileReviewItems = mobileReviewEntries.map(buildMobileReviewItem)
  const recentContextEntries = [...activeContent].sort(sortByModified).slice(0, 6)
  const recentEntries = recentContextEntries.filter(isVaultContextEntry)
  const recentProtectedCount = recentContextEntries.length - recentEntries.length
  const crystallizedTodayCount = activeContent.filter((entry) => isCrystallizedToday(entry, todayKey)).length
  const hasDreamToday = activeContent.some((entry) => typeIs(entry, 'Dream') && entryMatchesDate(entry, todayKey))
  const hasJournalToday = activeContent.some((entry) => typeIs(entry, 'Journal') && entryMatchesDate(entry, todayKey))
  const openLoopCount = countOpenLoops(entries)

  return {
    activeNotes: activeContent.length,
    contextSwitchCount: countContextSwitches(recentContextEntries),
    crystallizedTodayCount,
    dailyBrief: buildDailyBrief({
      crystallizedTodayCount,
      hasDreamToday,
      hasJournalToday,
      memoryQueueCount: memoryQueueEntries.length,
      mobileReviewCount: mobileReviewEntries.length,
      openLoopBuckets,
      openLoopCount,
      recentProtectedCount,
    }),
    dreamCount: activeContent.filter((entry) => typeIs(entry, 'Dream')).length,
    hasDreamToday,
    hasJournalToday,
    journalCount: activeContent.filter((entry) => typeIs(entry, 'Journal')).length,
    memoryQueueEntries: [...memoryQueueEntries].sort(sortByModified).slice(0, 3),
    memoryQueueCount: memoryQueueEntries.length,
    mobileReviewEntries: [...mobileReviewItems].sort(sortMobileReviewItems).slice(0, 3),
    mobileReviewCount: mobileReviewEntries.length,
    openLoopBuckets,
    openLoopCount,
    recentEntries,
    recentProtectedCount,
  }
}
