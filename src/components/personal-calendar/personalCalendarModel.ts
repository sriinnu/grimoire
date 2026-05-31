export type PersonalCalendarLane = 'all' | 'journal' | 'dream' | 'open' | 'private'

export interface PersonalCalendarCount {
  label: string
  count: number
}

export interface PersonalCalendarDay {
  dateKey: string
  label?: string
  protectedCount: number
  statusCounts: PersonalCalendarCount[]
  total: number
  typeCounts: PersonalCalendarCount[]
}

export interface PersonalCalendarCell {
  date: Date
  dateKey: string
  dayNumber: number
  outsideMonth: boolean
  today: boolean
}

const MS_PER_DAY = 24 * 60 * 60 * 1000

/** Format a local Date as a stable calendar key without UTC drift. */
export function personalCalendarDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

/** Parse a local YYYY-MM-DD key into a local Date. */
export function personalCalendarDateFromKey(dateKey: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey)
  if (!match) return new Date(Number.NaN)
  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day))
}

/** Return the first visible month date for a six-row calendar grid. */
export function personalCalendarGridStart(month: Date): Date {
  const first = new Date(month.getFullYear(), month.getMonth(), 1)
  return new Date(first.getTime() - first.getDay() * MS_PER_DAY)
}

/** Build a fixed six-week grid so the calendar never jumps during month nav. */
export function buildPersonalCalendarCells(month: Date, today = new Date()): PersonalCalendarCell[] {
  const monthStart = new Date(month.getFullYear(), month.getMonth(), 1)
  const todayKey = personalCalendarDateKey(today)
  const start = personalCalendarGridStart(monthStart)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start.getTime() + index * MS_PER_DAY)
    const dateKey = personalCalendarDateKey(date)
    return {
      date,
      dateKey,
      dayNumber: date.getDate(),
      outsideMonth: date.getMonth() !== monthStart.getMonth(),
      today: dateKey === todayKey,
    }
  })
}

/** Human month label for the visible calendar page. */
export function personalCalendarMonthLabel(month: Date): string {
  return month.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
}

/** Short label for a selected day. */
export function personalCalendarDayLabel(date: Date, today = new Date()): string {
  const key = personalCalendarDateKey(date)
  const todayKey = personalCalendarDateKey(today)
  if (key === todayKey) return 'Today'

  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (key === personalCalendarDateKey(yesterday)) return 'Yesterday'

  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

/** Find the metadata bucket for a day. */
export function findPersonalCalendarDay(days: PersonalCalendarDay[], dateKey: string): PersonalCalendarDay | null {
  return days.find((day) => day.dateKey === dateKey) ?? null
}

/** Whether a metadata day belongs to the selected lane. */
export function personalCalendarDayMatchesLane(day: PersonalCalendarDay | null, lane: PersonalCalendarLane): boolean {
  if (!day) return false
  if (lane === 'all') return day.total > 0
  if (lane === 'private') return day.protectedCount > 0
  if (lane === 'open') return day.statusCounts.some((status) => status.label.toLowerCase() === 'open' && status.count > 0)
  return day.typeCounts.some((type) => type.label.toLowerCase() === lane && type.count > 0)
}

/** Human label for a calendar lane. */
export function personalCalendarLaneLabel(lane: PersonalCalendarLane): string {
  if (lane === 'journal') return 'Journal'
  if (lane === 'dream') return 'Dream'
  if (lane === 'open') return 'Open'
  if (lane === 'private') return 'Private'
  return 'All'
}

/** Visible count chips for the selected lane. */
export function personalCalendarVisibleCounts(
  day: PersonalCalendarDay | null,
  lane: PersonalCalendarLane,
): PersonalCalendarCount[] {
  if (!day) return []
  if (lane === 'all') return [...day.typeCounts, ...day.statusCounts]
  if (lane === 'private') return day.protectedCount > 0 ? [{ label: 'Held local', count: day.protectedCount }] : []
  if (lane === 'open') return day.statusCounts.filter((status) => status.label.toLowerCase() === 'open' && status.count > 0)
  return day.typeCounts.filter((type) => type.label.toLowerCase() === lane && type.count > 0)
}
