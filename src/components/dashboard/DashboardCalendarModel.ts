import type { VaultEntry } from '../../types'

/** Visual lanes a day marker can belong to. */
export type DashboardCalendarLane = 'journal' | 'dream' | 'other'

export interface DashboardCalendarMarker {
  lane: DashboardCalendarLane
  count: number
}

export interface DashboardCalendarDay {
  date: Date
  dateKey: string
  dayNumber: number
  outsideMonth: boolean
  today: boolean
  /** Lane markers for this day, ordered journal -> dream -> other, only non-empty lanes. */
  markers: DashboardCalendarMarker[]
  /** Total mapped entries for the day across every lane. */
  total: number
}

const MS_PER_DAY = 24 * 60 * 60 * 1000
const WEEKS = 6
const DAYS_PER_WEEK = 7
const LANE_ORDER: DashboardCalendarLane[] = ['journal', 'dream', 'other']

/** Weekday header labels, Sunday-first to match the six-week grid start. */
export const DASHBOARD_CALENDAR_WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

/** Format a local Date as a stable YYYY-MM-DD key without UTC drift. */
export function dashboardCalendarDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** First visible grid date (Sunday on/before the 1st) for a six-week month page. */
export function dashboardCalendarGridStart(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  return new Date(first.getTime() - first.getDay() * MS_PER_DAY)
}

/** Human month label for the visible page (e.g. "May 2026"). */
export function dashboardCalendarMonthLabel(month: Date): string {
  return month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** Step the visible month by a signed delta of months, anchored to the 1st. */
export function dashboardCalendarShiftMonth(month: Date, delta: number): Date {
  return new Date(month.getFullYear(), month.getMonth() + delta, 1)
}

/** Map a single entry to its calendar lane. */
export function dashboardCalendarLaneForEntry(entry: VaultEntry): DashboardCalendarLane {
  const type = entry.isA?.trim().toLowerCase()
  if (type === 'journal') return 'journal'
  if (type === 'dream') return 'dream'
  return 'other'
}

/** Resolve the timestamp (seconds) an entry should sit on: modified, else created. */
function entryTimestamp(entry: VaultEntry): number | null {
  const ts = entry.modifiedAt ?? entry.createdAt
  return typeof ts === 'number' && Number.isFinite(ts) && ts > 0 ? ts : null
}

interface DayBucket {
  journal: number
  dream: number
  other: number
}

/** Group entries into per-day lane counts keyed by local date. */
function bucketEntriesByDay(entries: VaultEntry[]): Map<string, DayBucket> {
  const buckets = new Map<string, DayBucket>()
  for (const entry of entries) {
    if (entry.archived) continue
    if (entry.fileKind && entry.fileKind !== 'markdown') continue
    const ts = entryTimestamp(entry)
    if (ts === null) continue
    const key = dashboardCalendarDateKey(new Date(ts * 1000))
    const bucket = buckets.get(key) ?? { journal: 0, dream: 0, other: 0 }
    bucket[dashboardCalendarLaneForEntry(entry)] += 1
    buckets.set(key, bucket)
  }
  return buckets
}

function bucketToMarkers(bucket: DayBucket | undefined): DashboardCalendarMarker[] {
  if (!bucket) return []
  return LANE_ORDER
    .map((lane) => ({ lane, count: bucket[lane] }))
    .filter((marker) => marker.count > 0)
}

/**
 * Build a fixed six-week (42-cell) month matrix for the given month, with each
 * day annotated by its vault-entry lane markers. Pure and deterministic.
 */
export function buildDashboardCalendarMatrix(
  month: Date,
  entries: VaultEntry[],
  today: Date = new Date(),
): DashboardCalendarDay[][] {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const start = dashboardCalendarGridStart(monthStart)
  const todayKey = dashboardCalendarDateKey(today)
  const buckets = bucketEntriesByDay(entries)

  const weeks: DashboardCalendarDay[][] = []
  for (let week = 0; week < WEEKS; week += 1) {
    const days: DashboardCalendarDay[] = []
    for (let weekday = 0; weekday < DAYS_PER_WEEK; weekday += 1) {
      const index = week * DAYS_PER_WEEK + weekday
      const date = new Date(start.getTime() + index * MS_PER_DAY)
      const dateKey = dashboardCalendarDateKey(date)
      const markers = bucketToMarkers(buckets.get(dateKey))
      days.push({
        date,
        dateKey,
        dayNumber: date.getDate(),
        outsideMonth: date.getMonth() !== monthStart.getMonth(),
        today: dateKey === todayKey,
        markers,
        total: markers.reduce((sum, marker) => sum + marker.count, 0),
      })
    }
    weeks.push(days)
  }
  return weeks
}
