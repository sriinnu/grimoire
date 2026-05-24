import type { VaultEntry } from '../types'
import { getDisplayDate, sortByModified } from './noteListHelpers'

export interface OpenLoopBucket {
  label: string
  count: number
}

export interface DashboardSummary {
  activeNotes: number
  dreamCount: number
  hasDreamToday: boolean
  hasJournalToday: boolean
  journalCount: number
  memoryQueueEntries: VaultEntry[]
  memoryQueueCount: number
  openLoopBuckets: OpenLoopBucket[]
  openLoopCount: number
  recentEntries: VaultEntry[]
}

const CLOSED_STATUSES = new Set(['done', 'finished', 'closed', 'archived'])

function isMarkdown(entry: VaultEntry): boolean {
  return entry.fileKind === 'markdown' || !entry.fileKind
}

function isContentEntry(entry: VaultEntry): boolean {
  return isMarkdown(entry) && entry.isA !== 'Type'
}

function isOpenEntry(entry: VaultEntry): boolean {
  if (!isContentEntry(entry) || entry.archived) return false
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

function buildOpenLoopBuckets(entries: VaultEntry[]): OpenLoopBucket[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    if (!isOpenEntry(entry)) continue
    const label = entry.isA || 'Note'
    counts.set(label, (counts.get(label) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 5)
}

function countOpenLoops(entries: VaultEntry[]): number {
  return entries.reduce((count, entry) => count + (isOpenEntry(entry) ? 1 : 0), 0)
}

/** Builds the local vault dashboard summary without reading note bodies. */
export function buildDashboardSummary(entries: VaultEntry[], now: Date = new Date()): DashboardSummary {
  const activeContent = entries.filter((entry) => isContentEntry(entry) && !entry.archived)
  const openLoopBuckets = buildOpenLoopBuckets(entries)
  const memoryQueueEntries = activeContent.filter((entry) => typeIs(entry, 'Memory') && isOpenEntry(entry))
  const todayKey = localDateKey(now)

  return {
    activeNotes: activeContent.length,
    dreamCount: activeContent.filter((entry) => typeIs(entry, 'Dream')).length,
    hasDreamToday: activeContent.some((entry) => typeIs(entry, 'Dream') && entryMatchesDate(entry, todayKey)),
    hasJournalToday: activeContent.some((entry) => typeIs(entry, 'Journal') && entryMatchesDate(entry, todayKey)),
    journalCount: activeContent.filter((entry) => typeIs(entry, 'Journal')).length,
    memoryQueueEntries: [...memoryQueueEntries].sort(sortByModified).slice(0, 3),
    memoryQueueCount: memoryQueueEntries.length,
    openLoopBuckets,
    openLoopCount: countOpenLoops(entries),
    recentEntries: [...activeContent].sort(sortByModified).slice(0, 6),
  }
}
