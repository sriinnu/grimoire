import { formatTypeCount, pluralizeCount } from '../utils/notebookCountLabels'

/** Source-safe temporal pattern derived only from counted metadata. */
export interface TimeLoomPattern {
  detail: string
  label: string
  tone: 'attention' | 'private' | 'steady'
}

type TimeLoomStatusLabel = 'Done' | 'Open' | 'Unmarked'

interface BuildTimeLoomPatternsInput {
  activeDays: number
  calendarEvents: number
  commitEvents: number
  memoryReviewEvents: number
  mobileEvents: number
  protectedEvents: number
  statusTotals: Map<TimeLoomStatusLabel, number>
  taskEvents: number
  typeTotals: Map<string, number>
  voiceEvents: number
}

const TYPE_ORDER = ['Mobile', 'Memory review', 'Calendar', 'Voice', 'Commit', 'Dream', 'Journal', 'Private', 'Task', 'Meeting', 'Memory', 'Note']

/** Builds a compact pattern lens without using titles, paths, excerpts, or raw status text. */
export function buildTimeLoomPatterns({
  activeDays,
  calendarEvents,
  commitEvents,
  memoryReviewEvents,
  mobileEvents,
  protectedEvents,
  statusTotals,
  taskEvents,
  typeTotals,
  voiceEvents,
}: BuildTimeLoomPatternsInput): TimeLoomPattern[] {
  const patterns: TimeLoomPattern[] = []
  const topTypes = rankedTypeTotals(typeTotals).slice(0, 3)
  if (topTypes.length > 0) {
    patterns.push({ label: 'Primary thread', detail: topTypes.map((type) => formatTypeCount(type.label, type.count)).join(' / '), tone: 'steady' })
  }

  const openCount = statusTotals.get('Open') ?? 0
  if (openCount > 0) {
    const taskDetail = taskEvents > 0 ? `${taskEvents} due next` : null
    const openDetail = `${openCount} open ${openCount === 1 ? 'marker' : 'markers'} across ${activeDayText(activeDays)}`
    patterns.push({ label: 'Revisit', detail: [taskDetail, openDetail].filter(isPatternDetail).join(' / '), tone: 'attention' })
  }

  const reviewSignals = [
    protectedEvents > 0 ? `${protectedEvents} private` : null,
    memoryReviewEvents > 0 ? `${memoryReviewEvents} memory review` : null,
    mobileEvents > 0 ? `${mobileEvents} mobile` : null,
    voiceEvents > 0 ? `${voiceEvents} voice` : null,
  ].filter(isPatternDetail)
  if (reviewSignals.length > 0) {
    patterns.push({ label: 'Private review', detail: reviewSignals.join(' / '), tone: 'private' })
  }

  const externalSignals = [
    calendarEvents > 0 ? `${calendarEvents} planned` : null,
    commitEvents > 0 ? pluralizeCount(commitEvents, 'saved point') : null,
  ].filter(isPatternDetail)
  if (externalSignals.length > 0) {
    patterns.push({ label: 'External rhythm', detail: externalSignals.join(' / '), tone: 'steady' })
  }
  return patterns.slice(0, 3)
}

function rankedTypeTotals(typeTotals: Map<string, number>): Array<{ count: number; label: string }> {
  return [...typeTotals.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || typeRank(a.label) - typeRank(b.label) || a.label.localeCompare(b.label))
}

function typeRank(label: string): number {
  const index = TYPE_ORDER.indexOf(label)
  return index === -1 ? TYPE_ORDER.length : index
}

function activeDayText(count: number): string {
  return `${count} ${count === 1 ? 'day' : 'days'}`
}

function isPatternDetail(value: string | null): value is string {
  return value !== null
}
