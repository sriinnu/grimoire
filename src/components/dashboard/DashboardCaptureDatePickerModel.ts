export type CaptureDateOffset = 0 | 1 | 2

export const CAPTURE_DATE_OPTIONS: { label: string; offset: CaptureDateOffset }[] = [
  { label: 'Today', offset: 0 },
  { label: 'Yesterday', offset: 1 },
  { label: 'Day before yesterday', offset: 2 },
]

/** Returns the local calendar date represented by a dashboard backfill chip. */
export function captureDateForOffset(offset: CaptureDateOffset, base = new Date()): Date {
  const date = new Date(base)
  date.setDate(date.getDate() - offset)
  return date
}
