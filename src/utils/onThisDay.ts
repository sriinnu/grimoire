import type { VaultEntry } from '../types'

/** A calendar day in the local timezone; month is 1-12. */
export interface LocalDay {
  year: number
  month: number
  day: number
}

export type OnThisDayKind = 'years' | 'week' | 'month'

export interface OnThisDayItem {
  entry: VaultEntry
  kind: OnThisDayKind
  /** "1 year ago", "3 years ago", "A week ago", "A month ago". */
  label: string
  /** The local day the entry belongs to. */
  day: LocalDay
  /**
   * Quiet resurfacing reason from local data only — age bucket plus backlink
   * count, e.g. "last touched 90 days ago · 14 backlinks". Counts and ages
   * never, ever titles.
   */
  reason: string
}

const TITLE_DATE = /\b(\d{4})-(\d{2})-(\d{2})\b/

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month, 0).getDate()
}

export function localDayOf(date: Date): LocalDay {
  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() }
}

function sameDay(a: LocalDay, b: LocalDay): boolean {
  return a.year === b.year && a.month === b.month && a.day === b.day
}

function parseTitleDay(title: string): LocalDay | null {
  const match = TITLE_DATE.exec(title)
  if (!match) return null
  const [year, month, day] = match.slice(1).map(Number)
  if (month < 1 || month > 12 || day < 1 || day > daysInMonth(year, month)) return null
  return { year, month, day }
}

/**
 * The day an entry belongs to. A journal's title date ("Journal 2025-09-26")
 * wins over the file's createdAt, since captures can be backdated and file
 * dates get reset by copies and clones; everything else uses createdAt.
 */
export function entryLocalDay(entry: VaultEntry): LocalDay | null {
  if (entry.isA?.trim().toLowerCase() === 'journal') {
    const titleDay = parseTitleDay(entry.title)
    if (titleDay) return titleDay
  }
  if (typeof entry.createdAt === 'number' && Number.isFinite(entry.createdAt) && entry.createdAt > 0) {
    return localDayOf(new Date(entry.createdAt * 1000))
  }
  return parseTitleDay(entry.title)
}

/** Same month and day; Feb 29 entries surface on Feb 28 in non-leap years. */
export function isAnniversary(entryDay: LocalDay, today: LocalDay): boolean {
  if (entryDay.month === today.month && entryDay.day === today.day) return true
  return entryDay.month === 2 && entryDay.day === 29
    && today.month === 2 && today.day === 28 && !isLeapYear(today.year)
}

function weekAgo(today: LocalDay): LocalDay {
  return localDayOf(new Date(today.year, today.month - 1, today.day - 7))
}

/** Same day last month, clamped to the month's end (Mar 31 → Feb 28). */
function monthAgo(today: LocalDay): LocalDay {
  const year = today.month === 1 ? today.year - 1 : today.year
  const month = today.month === 1 ? 12 : today.month - 1
  return { year, month, day: Math.min(today.day, daysInMonth(year, month)) }
}

function yearsLabel(years: number): string {
  return years === 1 ? '1 year ago' : `${years} years ago`
}

function isCandidate(entry: VaultEntry): boolean {
  if (entry.archived) return false
  if (entry.fileKind && entry.fileKind !== 'markdown') return false
  return entry.isA !== 'Type'
}

function byRecentlyTouched(a: OnThisDayItem, b: OnThisDayItem): number {
  return (b.entry.modifiedAt ?? 0) - (a.entry.modifiedAt ?? 0)
}

const REASON_DAY_MS = 24 * 60 * 60 * 1000

/** "last touched this week" / "…this month" / "…90 days ago" / "…180 days ago" / "…over a year ago". */
function touchedAgeLabel(touchedSeconds: number, now: Date): string {
  const days = Math.floor((now.getTime() - touchedSeconds * 1000) / REASON_DAY_MS)
  if (days <= 7) return 'last touched this week'
  if (days <= 30) return 'last touched this month'
  if (days <= 90) return 'last touched 90 days ago'
  if (days <= 180) return 'last touched 180 days ago'
  return 'last touched over a year ago'
}

/** Entries linking to the target, matched the same way the inspector counts backlinks. */
function countBacklinks(target: VaultEntry, entries: readonly VaultEntry[]): number {
  const stem = target.filename.replace(/\.md$/, '')
  const pathStem = target.path.replace(/^.*\/Grimoire\//, '').replace(/\.md$/, '')
  const targets = new Set([target.title, ...target.aliases, stem, pathStem])

  let count = 0
  for (const entry of entries) {
    if (entry.path === target.path) continue
    if (entry.outgoingLinks.some((link) => targets.has(link) || targets.has(link.split('/').pop() ?? ''))) {
      count += 1
    }
  }
  return count
}

function buildReason(entry: VaultEntry, entries: readonly VaultEntry[], now: Date): string {
  const parts: string[] = []
  const touched = entry.modifiedAt ?? entry.createdAt
  if (typeof touched === 'number' && Number.isFinite(touched) && touched > 0) {
    parts.push(touchedAgeLabel(touched, now))
  }
  const backlinks = countBacklinks(entry, entries)
  parts.push(backlinks === 1 ? '1 backlink' : `${backlinks} backlinks`)
  return parts.join(' · ')
}

/**
 * Pages from this day in earlier years, nearest year first. When no earlier
 * year has anything, falls back to exactly a week or a month ago.
 */
export function selectOnThisDay(
  entries: readonly VaultEntry[],
  now: Date = new Date(),
  limit = 3,
): OnThisDayItem[] {
  const today = localDayOf(now)
  const week = weekAgo(today)
  const month = monthAgo(today)
  const years: OnThisDayItem[] = []
  const recent: OnThisDayItem[] = []

  for (const entry of entries) {
    if (!isCandidate(entry)) continue
    const day = entryLocalDay(entry)
    if (!day) continue
    const yearsAgo = today.year - day.year
    const reason = buildReason(entry, entries, now)
    if (yearsAgo >= 1 && isAnniversary(day, today)) {
      years.push({ entry, kind: 'years', label: yearsLabel(yearsAgo), day, reason })
    } else if (sameDay(day, week)) {
      recent.push({ entry, kind: 'week', label: 'A week ago', day, reason })
    } else if (sameDay(day, month)) {
      recent.push({ entry, kind: 'month', label: 'A month ago', day, reason })
    }
  }

  if (years.length > 0) {
    return years
      .sort((a, b) => (b.day.year - a.day.year) || byRecentlyTouched(a, b))
      .slice(0, limit)
  }
  return recent
    .sort((a, b) => (a.kind === b.kind ? byRecentlyTouched(a, b) : a.kind === 'week' ? -1 : 1))
    .slice(0, limit)
}
