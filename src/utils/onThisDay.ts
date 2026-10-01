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
    if (yearsAgo >= 1 && isAnniversary(day, today)) {
      years.push({ entry, kind: 'years', label: yearsLabel(yearsAgo), day })
    } else if (sameDay(day, week)) {
      recent.push({ entry, kind: 'week', label: 'A week ago', day })
    } else if (sameDay(day, month)) {
      recent.push({ entry, kind: 'month', label: 'A month ago', day })
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
