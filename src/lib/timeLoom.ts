import type { PulseCommit, VaultEntry } from '../types'
import { isMobileCaptureEntry, mobileCapturedTimestamp } from './mobileCaptureMetadata'
import { resolveEntryLocalityPolicy } from './localityPolicy'
import { buildTimeLoomGraph, type TimeLoomGraph } from './timeLoomGraph'
import { buildTimeLoomPatterns, type TimeLoomPattern } from './timeLoomPatterns'
import { timeLoomMemoryTypeLabel } from './timeLoomMemory'

/** Count of one note type inside a temporal bucket. */
export interface TimeLoomTypeCount {
  label: string
  count: number
}

/** Coarse status count that avoids leaking user-authored status text. */
export interface TimeLoomStatusCount {
  label: 'Done' | 'Open' | 'Unmarked'
  count: number
}

/** One local-day bucket for the notebook trail. */
export interface TimeLoomBucket {
  dateKey: string
  label: string
  total: number
  protectedCount: number
  statusCounts: TimeLoomStatusCount[]
  typeCounts: TimeLoomTypeCount[]
}

/** Metadata-only temporal summary for the notebook trail. */
export interface TimeLoomSummary {
  buckets: TimeLoomBucket[]
  calendarDays: TimeLoomBucket[]
  totalEvents: number
  protectedEvents: number
  voiceEvents: number
  mobileEvents: number
  memoryReviewEvents: number
  commitEvents: number
  calendarEvents: number
  taskEvents: number
  graph: TimeLoomGraph
  patterns: TimeLoomPattern[]
  activeSpanLabel: string
}

/** Optional sources that can contribute metadata-only marks to the trail. */
export interface TimeLoomSources {
  commits?: PulseCommit[]
}

const CLOSED_STATUSES = new Set(['archived', 'closed', 'done', 'finished'])
const CALENDAR_TYPES = new Set(['appointment', 'calendar', 'event', 'meeting'])
const CALENDAR_PROPERTY_KEYS = [
  'calendar_start',
  'calendar_date',
  'event_start',
  'event_date',
  'scheduled_at',
  'starts_at',
  'start_at',
  'start_time',
  'starts_on',
]
const CALENDAR_TYPE_DATE_KEYS = ['date', 'day', 'start', 'starts']
const TASK_TYPES = new Set(['task', 'todo'])
const TASK_DUE_PROPERTY_KEYS = [
  'due',
  'due_at',
  'due_date',
  'deadline',
  'task_due',
  'scheduled_at',
  'scheduled_for',
  'scheduled_on',
  'target_date',
]
const MS_PER_DAY = 24 * 60 * 60 * 1000
const STATUS_ORDER: TimeLoomStatusCount['label'][] = ['Open', 'Done', 'Unmarked']
const SAFE_PROTECTED_TYPE_LABELS = new Set(['Calendar', 'Voice', 'Mobile', 'Commit', 'Dream', 'Journal', 'Memory', 'Memory review'])
const TYPE_ORDER = ['Mobile', 'Memory review', 'Calendar', 'Voice', 'Commit', 'Dream', 'Journal', 'Private', 'Task', 'Meeting', 'Memory', 'Note']

/** Builds a local day trail without reading note bodies or returning titles. */
export function buildTimeLoomSummary(
  entries: VaultEntry[],
  now: Date = new Date(),
  sources: TimeLoomSources = {},
): TimeLoomSummary {
  const buckets = new Map<string, TimeLoomBucket>()
  let totalEvents = 0
  let protectedEvents = 0
  let voiceEvents = 0
  let mobileEvents = 0
  let memoryReviewEvents = 0
  let commitEvents = 0
  let calendarEvents = 0
  let taskEvents = 0
  const statusTotals = new Map<TimeLoomStatusCount['label'], number>()
  const typeTotals = new Map<string, number>()

  for (const entry of entries) {
    if (!shouldIncludeEntry(entry)) continue
    const taskTimestamp = taskDueTimestamp(entry)
    const scheduledTimestamp = taskTimestamp ? null : calendarEventTimestamp(entry)
    const mobileTimestamp = isMobileCaptureEntry(entry) ? mobileCapturedTimestamp(entry) : null
    const timestamp = taskTimestamp ?? scheduledTimestamp ?? mobileTimestamp ?? entry.modifiedAt ?? entry.createdAt
    if (!timestamp) continue

    const date = new Date(timestamp * 1000)
    const bucket = getOrCreateBucket(buckets, date, now)
    const localOnly = resolveEntryLocalityPolicy(entry).localOnly
    const mobileCapture = isMobileCaptureEntry(entry)
    const memoryTypeLabel = timeLoomMemoryTypeLabel(entry, now)
    const rawTypeLabel = memoryTypeLabel ?? (taskTimestamp ? 'Task' : scheduledTimestamp ? 'Calendar' : eventTypeLabel(entry))
    const typeLabel = displayTypeLabel(rawTypeLabel, localOnly)
    const status = statusLabel(entry)

    addBucketEvent(bucket, {
      isProtected: localOnly,
      status,
      type: typeLabel,
    })
    incrementSummaryTotals(statusTotals, typeTotals, status, typeLabel)
    totalEvents += 1
    if (localOnly) protectedEvents += 1
    if (typeLabel === 'Voice') voiceEvents += 1
    if (mobileCapture) mobileEvents += 1
    if (memoryTypeLabel === 'Memory review') memoryReviewEvents += 1
    if (typeLabel === 'Calendar') calendarEvents += 1
    if (taskTimestamp) taskEvents += 1
    buckets.set(bucket.dateKey, bucket)
  }

  for (const commit of sources.commits ?? []) {
    if (!isUsableCommitEvent(commit)) continue
    const bucket = getOrCreateBucket(buckets, new Date(commit.date * 1000), now)
    const localOnly = commitTouchesLocalOnlyPath(commit)
    addBucketEvent(bucket, {
      isProtected: localOnly,
      status: 'Done',
      type: 'Commit',
    })
    incrementSummaryTotals(statusTotals, typeTotals, 'Done', 'Commit')
    totalEvents += 1
    if (localOnly) protectedEvents += 1
    commitEvents += 1
    buckets.set(bucket.dateKey, bucket)
  }

  const calendarDays = [...buckets.values()]
    .sort((a, b) => b.dateKey.localeCompare(a.dateKey))
    .map((bucket) => ({
      ...bucket,
      statusCounts: bucket.statusCounts
        .sort((a, b) => STATUS_ORDER.indexOf(a.label) - STATUS_ORDER.indexOf(b.label)),
      typeCounts: bucket.typeCounts
        .sort((a, b) => (
          b.count - a.count
          || typeRank(a.label) - typeRank(b.label)
          || a.label.localeCompare(b.label)
        )),
    }))

  const sortedBuckets = calendarDays
    .map((bucket) => ({
      ...bucket,
      statusCounts: [...bucket.statusCounts],
      typeCounts: bucket.typeCounts.slice(0, 3),
    }))
    .slice(0, 5)

  return {
    buckets: sortedBuckets,
    calendarDays,
    totalEvents,
    protectedEvents,
    voiceEvents,
    mobileEvents,
    memoryReviewEvents,
    commitEvents,
    calendarEvents,
    taskEvents,
    graph: buildTimeLoomGraph(sortedBuckets),
    patterns: buildTimeLoomPatterns({
      activeDays: sortedBuckets.length,
      calendarEvents,
      commitEvents,
      memoryReviewEvents,
      mobileEvents,
      protectedEvents,
      statusTotals,
      taskEvents,
      typeTotals,
      voiceEvents,
    }),
    activeSpanLabel: spanLabel(sortedBuckets),
  }
}

function addBucketEvent(
  bucket: TimeLoomBucket,
  event: { isProtected: boolean; status: TimeLoomStatusCount['label']; type: string },
) {
  bucket.total += 1
  if (event.isProtected) bucket.protectedCount += 1
  incrementStatus(bucket.statusCounts, event.status)
  incrementType(bucket.typeCounts, event.type)
}

function shouldIncludeEntry(entry: VaultEntry): boolean {
  if (entry.archived) return false
  if (entry.fileKind && entry.fileKind !== 'markdown') return false
  if (entry.isA?.trim().toLowerCase() === 'type') return false
  return true
}

function getOrCreateBucket(
  buckets: Map<string, TimeLoomBucket>,
  date: Date,
  now: Date,
): TimeLoomBucket {
  const dateKey = localDateKey(date)
  return buckets.get(dateKey) ?? {
    dateKey,
    label: labelForDate(date, now),
    total: 0,
    protectedCount: 0,
    statusCounts: [],
    typeCounts: [],
  }
}

function statusLabel(entry: VaultEntry): TimeLoomStatusCount['label'] {
  const status = entry.status?.trim().toLowerCase()
  if (!status) return 'Unmarked'
  if (CLOSED_STATUSES.has(status)) return 'Done'
  return 'Open'
}

function eventTypeLabel(entry: VaultEntry): string {
  if (isMobileCaptureEntry(entry)) return 'Mobile'
  if (isVoiceCaptureEntry(entry)) return 'Voice'
  return entry.isA?.trim() || 'Note'
}

function displayTypeLabel(label: string, localOnly: boolean): string {
  if (!localOnly) return label
  return SAFE_PROTECTED_TYPE_LABELS.has(label) ? label : 'Private'
}

function typeRank(label: string): number {
  const index = TYPE_ORDER.indexOf(label)
  return index === -1 ? TYPE_ORDER.length : index
}

function isVoiceCaptureEntry(entry: VaultEntry): boolean {
  if (entry.isA?.trim().toLowerCase() === 'transcript') return true
  return typeof entry.properties?.source_audio === 'string'
    && typeof entry.properties?.transcription_provider === 'string'
}

function calendarEventTimestamp(entry: VaultEntry): number | null {
  const explicitTimestamp = firstTemporalProperty(entry, CALENDAR_PROPERTY_KEYS)
  if (explicitTimestamp) return explicitTimestamp
  if (!isCalendarTypedEntry(entry)) return null
  return firstTemporalProperty(entry, CALENDAR_TYPE_DATE_KEYS)
}

function isCalendarTypedEntry(entry: VaultEntry): boolean {
  return CALENDAR_TYPES.has(entry.isA?.trim().toLowerCase() ?? '')
}

function taskDueTimestamp(entry: VaultEntry): number | null {
  if (!isTaskTypedEntry(entry)) return null
  return firstTemporalProperty(entry, TASK_DUE_PROPERTY_KEYS)
}

function isTaskTypedEntry(entry: VaultEntry): boolean {
  return TASK_TYPES.has(entry.isA?.trim().toLowerCase() ?? '')
}

function firstTemporalProperty(entry: VaultEntry, keys: string[]): number | null {
  for (const key of keys) {
    const timestamp = parseTemporalProperty(entry.properties?.[key])
    if (timestamp) return timestamp
  }
  return null
}

function parseTemporalProperty(value: VaultEntry['properties'][string] | undefined): number | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const timestamp = parseTemporalProperty(item)
      if (timestamp) return timestamp
    }
    return null
  }
  if (typeof value === 'number') return parseNumericTimestamp(value)
  if (typeof value === 'string') return parseTemporalString(value)
  return null
}

function parseNumericTimestamp(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null
  const seconds = value > 1_000_000_000_000 ? Math.floor(value / 1000) : Math.floor(value)
  return seconds > 0 ? seconds : null
}

function parseTemporalString(value: string): number | null {
  const trimmed = value.trim()
  if (!trimmed) return null
  const localDate = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed)
  if (localDate) {
    const [, year, month, day] = localDate
    return Math.floor(new Date(Number(year), Number(month) - 1, Number(day)).getTime() / 1000)
  }
  const parsed = Date.parse(trimmed)
  return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000)
}

function isUsableCommitEvent(commit: PulseCommit): boolean {
  return Number.isFinite(commit.date) && commit.date > 0
}

function commitTouchesLocalOnlyPath(commit: PulseCommit): boolean {
  return commit.files.some((file) => resolveEntryLocalityPolicy({
    isA: 'Note',
    path: file.path,
    properties: {},
  }).localOnly)
}

function incrementStatus(
  statusCounts: TimeLoomStatusCount[],
  label: TimeLoomStatusCount['label'],
) {
  const existing = statusCounts.find((item) => item.label === label)
  if (existing) {
    existing.count += 1
    return
  }
  statusCounts.push({ label, count: 1 })
}

function incrementType(typeCounts: TimeLoomTypeCount[], label: string) {
  const existing = typeCounts.find((item) => item.label === label)
  if (existing) {
    existing.count += 1
    return
  }
  typeCounts.push({ label, count: 1 })
}

function incrementSummaryTotals(
  statusTotals: Map<TimeLoomStatusCount['label'], number>,
  typeTotals: Map<string, number>,
  status: TimeLoomStatusCount['label'],
  type: string,
) {
  statusTotals.set(status, (statusTotals.get(status) ?? 0) + 1)
  typeTotals.set(type, (typeTotals.get(type) ?? 0) + 1)
}

function spanLabel(buckets: TimeLoomBucket[]): string {
  if (buckets.length === 0) return 'Quiet trail'
  if (buckets.length === 1) {
    const bucket = buckets[0]
    return `${bucket.total} ${pluralize(bucket.total)} ${bucket.label === 'Today' ? 'today' : `on ${bucket.label}`}`
  }
  const eventCount = buckets.reduce((sum, bucket) => sum + bucket.total, 0)
  return `${eventCount} ${pluralize(eventCount)} across ${buckets.length} days`
}

function pluralize(count: number): string {
  return count === 1 ? 'mark' : 'marks'
}

function labelForDate(date: Date, now: Date): string {
  const todayStart = startOfLocalDay(now).getTime()
  const dateStart = startOfLocalDay(date).getTime()
  const dayDelta = Math.round((todayStart - dateStart) / MS_PER_DAY)
  if (dayDelta === 0) return 'Today'
  if (dayDelta === 1) return 'Yesterday'
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

function startOfLocalDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate())
}

function localDateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}
