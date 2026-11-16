import type { VaultEntry } from '../types'
import {
  buildMobileReviewItem,
  mobileReviewState,
  type MobileReviewItem,
  sortMobileReviewItems,
} from '../lib/mobileCaptureMetadata'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { getDisplayDate } from './noteListHelpers'
import { entryLocalDay } from './onThisDay'
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

export interface DashboardVaultStats {
  /** Active content entries that are not journals. */
  pages: number
  /** Active entries typed as Journal. */
  journals: number
  /** Active entries typed as Dream. */
  dreams: number
  /** Total outgoing wikilinks across active content entries. */
  links: number
  /** Entries touched per day for the last 14 days (oldest → newest). */
  pagesSeries: number[]
  journalsSeries: number[]
  dreamsSeries: number[]
  linksSeries: number[]
}

const STATS_SPARKLINE_DAYS = 14
const DAY_MS = 24 * 60 * 60 * 1000

function sparklineDayIndex(timestampSeconds: number | null | undefined, nowMs: number): number | null {
  if (typeof timestampSeconds !== 'number' || !Number.isFinite(timestampSeconds)) return null
  const daysAgo = Math.floor((nowMs - timestampSeconds * 1000) / DAY_MS)
  if (daysAgo < 0 || daysAgo >= STATS_SPARKLINE_DAYS) return null
  return STATS_SPARKLINE_DAYS - 1 - daysAgo
}

/**
 * Honest big-number stats for the dashboard hero band: counts and per-day
 * buckets only, never titles, so private note labels cannot leak through it.
 */
export function computeDashboardStats(entries: VaultEntry[], now: Date = new Date()): DashboardVaultStats {
  const nowMs = now.getTime()
  const pagesSeries = new Array<number>(STATS_SPARKLINE_DAYS).fill(0)
  const journalsSeries = new Array<number>(STATS_SPARKLINE_DAYS).fill(0)
  const dreamsSeries = new Array<number>(STATS_SPARKLINE_DAYS).fill(0)
  const linksSeries = new Array<number>(STATS_SPARKLINE_DAYS).fill(0)
  let pages = 0
  let journals = 0
  let dreams = 0
  let links = 0

  for (const entry of entries) {
    if (!isContentEntry(entry) || entry.archived) continue
    const index = sparklineDayIndex(entry.modifiedAt ?? entry.createdAt, nowMs)
    const linkCount = entry.outgoingLinks.length

    if (typeIs(entry, 'Journal')) {
      journals += 1
      if (index !== null) journalsSeries[index] += 1
    } else {
      pages += 1
      if (index !== null) pagesSeries[index] += 1
    }
    if (typeIs(entry, 'Dream')) {
      dreams += 1
      if (index !== null) dreamsSeries[index] += 1
    }
    links += linkCount
    if (index !== null) linksSeries[index] += linkCount
  }

  return { pages, journals, dreams, links, pagesSeries, journalsSeries, dreamsSeries, linksSeries }
}

export interface WeeklyReviewTypeCount {
  type: string
  count: number
}

export interface WeeklyReviewDay {
  dateKey: string
  count: number
  isToday: boolean
}

export interface WeeklyReviewLastWeek {
  entriesCreated: number
  entriesModified: number
  journalDaysActive: number
  wordCountDelta: number
}

export interface WeeklyReview {
  weekStartKey: string
  weekEndKey: string
  /** Monday → Sunday of the current week with per-day activity counts. */
  days: WeeklyReviewDay[]
  entriesCreatedThisWeek: number
  entriesModifiedThisWeek: number
  journalDaysActive: number
  /** Consecutive days with any activity, ending today (or yesterday). */
  streakDays: number
  wordCountDelta: number
  typeMix: WeeklyReviewTypeCount[]
  lastWeek: WeeklyReviewLastWeek
}

function startOfWeekMonday(date: Date): Date {
  const start = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  start.setDate(start.getDate() - ((start.getDay() + 6) % 7))
  return start
}

function secondsInWindow(timestamp: number | null, startMs: number, endMs: number): boolean {
  return typeof timestamp === 'number'
    && Number.isFinite(timestamp)
    && timestamp * 1000 >= startMs
    && timestamp * 1000 < endMs
}

interface WindowActivity {
  entriesCreated: number
  entriesModified: number
  wordCountDelta: number
  journalDayKeys: Set<string>
  /** Distinct days with any touched activity, keyed by local date. */
  dayCounts: Map<string, number>
  typeCounts: Map<string, number>
}

/** Counts created/touched activity inside [startMs, endMs) — shared by the weekly and monthly reviews. */
function collectWindowActivity(entries: VaultEntry[], startMs: number, endMs: number): WindowActivity {
  let entriesCreated = 0
  let entriesModified = 0
  let wordCountDelta = 0
  const journalDayKeys = new Set<string>()
  const dayCounts = new Map<string, number>()
  const typeCounts = new Map<string, number>()

  for (const entry of entries) {
    if (!isContentEntry(entry) || entry.archived) continue
    const created = entry.createdAt
    const touched = entry.modifiedAt ?? entry.createdAt

    if (secondsInWindow(created, startMs, endMs)) {
      entriesCreated += 1
      wordCountDelta += entry.wordCount
      const type = entry.isA?.trim() || 'Note'
      typeCounts.set(type, (typeCounts.get(type) ?? 0) + 1)
    }

    if (touched != null && secondsInWindow(touched, startMs, endMs)) {
      entriesModified += 1
      const touchedKey = localDateKey(new Date(touched * 1000))
      dayCounts.set(touchedKey, (dayCounts.get(touchedKey) ?? 0) + 1)
      if (typeIs(entry, 'Journal')) journalDayKeys.add(touchedKey)
    }
  }

  return { entriesCreated, entriesModified, wordCountDelta, journalDayKeys, dayCounts, typeCounts }
}

function sortedTypeMix(typeCounts: Map<string, number>): WeeklyReviewTypeCount[] {
  return [...typeCounts.entries()]
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count || a.type.localeCompare(b.type))
    .slice(0, 3)
}

/**
 * This-week review band for the dashboard: created/touched counts, journal
 * days, streak, word-count delta, top types, and last week's comparison
 * numbers. Counts and day buckets only — never note titles.
 */
export function computeWeeklyReview(entries: VaultEntry[], now: Date = new Date()): WeeklyReview {
  const weekStart = startOfWeekMonday(now)
  const weekStartMs = weekStart.getTime()
  const weekEndMs = weekStartMs + 7 * DAY_MS
  const prevWeekStartMs = weekStartMs - 7 * DAY_MS
  const todayKey = localDateKey(now)

  const current = collectWindowActivity(entries, weekStartMs, weekEndMs)
  const previous = collectWindowActivity(entries, prevWeekStartMs, weekStartMs)

  const activityDayKeys = new Set<string>()
  for (const entry of entries) {
    if (!isContentEntry(entry) || entry.archived) continue
    for (const timestamp of [entry.createdAt, entry.modifiedAt ?? entry.createdAt]) {
      if (typeof timestamp !== 'number' || !Number.isFinite(timestamp)) continue
      const key = localDateKey(new Date(timestamp * 1000))
      if (key <= todayKey) activityDayKeys.add(key)
    }
  }

  let streakDays = 0
  const streakCursor = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  if (!activityDayKeys.has(todayKey)) streakCursor.setDate(streakCursor.getDate() - 1)
  while (activityDayKeys.has(localDateKey(streakCursor))) {
    streakDays += 1
    streakCursor.setDate(streakCursor.getDate() - 1)
  }

  const days: WeeklyReviewDay[] = []
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + offset)
    const dateKey = localDateKey(day)
    days.push({ dateKey, count: current.dayCounts.get(dateKey) ?? 0, isToday: dateKey === todayKey })
  }

  return {
    weekStartKey: localDateKey(weekStart),
    weekEndKey: days[6].dateKey,
    days,
    entriesCreatedThisWeek: current.entriesCreated,
    entriesModifiedThisWeek: current.entriesModified,
    journalDaysActive: current.journalDayKeys.size,
    streakDays,
    wordCountDelta: current.wordCountDelta,
    typeMix: sortedTypeMix(current.typeCounts),
    lastWeek: {
      entriesCreated: previous.entriesCreated,
      entriesModified: previous.entriesModified,
      journalDaysActive: previous.journalDayKeys.size,
      wordCountDelta: previous.wordCountDelta,
    },
  }
}

export type MoodTone = 'great' | 'good' | 'okay' | 'low' | 'rough'

export interface MoodDay {
  dateKey: string
  mood: MoodTone | null
  isToday: boolean
}

export interface MoodDistribution {
  /** Monday → Sunday of the current week, one dot per day. */
  days: MoodDay[]
  /** Mood recorded on today's journal, when one is set. */
  todayMood: MoodTone | null
}

/** Liberal mood matching: common synonyms fold into the five tones, everything else is null. */
const MOOD_TONE_ALIASES: Record<string, MoodTone> = {
  great: 'great', amazing: 'great', excellent: 'great', wonderful: 'great', energized: 'great', awesome: 'great',
  good: 'good', happy: 'good', calm: 'good', fine: 'good', content: 'good', positive: 'good', steady: 'good',
  okay: 'okay', ok: 'okay', meh: 'okay', neutral: 'okay', average: 'okay', 'so-so': 'okay', middling: 'okay',
  low: 'low', down: 'low', tired: 'low', sad: 'low', drained: 'low', blue: 'low', flat: 'low',
  rough: 'rough', awful: 'rough', terrible: 'rough', anxious: 'rough', stressed: 'rough', bad: 'rough', hard: 'rough', dark: 'rough',
}

/** Parses a raw frontmatter `mood:` value into a tone; unknown values map to null. */
export function parseMoodTone(value: VaultEntry['properties'][string] | undefined): MoodTone | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (raw === null || raw === undefined) return null
  const key = String(raw).trim().toLowerCase()
  if (!key) return null
  return MOOD_TONE_ALIASES[key] ?? null
}

function entryMood(entry: VaultEntry): MoodTone | null {
  for (const [key, value] of Object.entries(entry.properties)) {
    if (key.trim().toLowerCase() === 'mood') return parseMoodTone(value)
  }
  return null
}

/**
 * Mood dots for the current week: each day's tone comes from that day's
 * journal frontmatter (`mood:`), matched liberally. Days without a mood stay
 * null. Tones and date keys only — never journal titles or bodies.
 */
export function computeMoodDistribution(entries: VaultEntry[], now: Date = new Date()): MoodDistribution {
  const weekStart = startOfWeekMonday(now)
  const weekStartMs = weekStart.getTime()
  const weekEndMs = weekStartMs + 7 * DAY_MS
  const todayKey = localDateKey(now)
  // Several journals can land on one day; the last-touched one wins.
  const moodByDay = new Map<string, { mood: MoodTone; touched: number }>()

  for (const entry of entries) {
    if (!isContentEntry(entry) || entry.archived) continue
    if (!typeIs(entry, 'Journal')) continue
    const day = entryLocalDay(entry)
    if (!day) continue
    const dayDate = new Date(day.year, day.month - 1, day.day)
    if (dayDate.getTime() < weekStartMs || dayDate.getTime() >= weekEndMs) continue
    const mood = entryMood(entry)
    if (mood === null) continue
    const touched = entry.modifiedAt ?? entry.createdAt ?? 0
    const dateKey = localDateKey(dayDate)
    const existing = moodByDay.get(dateKey)
    if (!existing || touched >= existing.touched) moodByDay.set(dateKey, { mood, touched })
  }

  const days: MoodDay[] = []
  for (let offset = 0; offset < 7; offset += 1) {
    const day = new Date(weekStart)
    day.setDate(day.getDate() + offset)
    const dateKey = localDateKey(day)
    days.push({ dateKey, mood: moodByDay.get(dateKey)?.mood ?? null, isToday: dateKey === todayKey })
  }

  return { days, todayMood: moodByDay.get(todayKey)?.mood ?? null }
}

export interface MonthlyReviewDay {
  dateKey: string
  count: number
  isToday: boolean
}

export interface MonthlyReviewLastMonth {
  entriesCreated: number
  entriesModified: number
  journalDaysActive: number
  /** Distinct days with any activity in the previous month. */
  activeDays: number
}

export interface MonthlyReview {
  year: number
  /** 1-based month number. */
  month: number
  monthStartKey: string
  monthEndKey: string
  /** Day 1 → last day of the month with per-day activity counts. */
  days: MonthlyReviewDay[]
  entriesCreatedThisMonth: number
  entriesModifiedThisMonth: number
  journalDaysActive: number
  /** Distinct days with any created or touched activity this month. */
  activeDays: number
  typeMix: WeeklyReviewTypeCount[]
  lastMonth: MonthlyReviewLastMonth
}

/**
 * This-month review band: same windowing as the weekly review over a calendar
 * month, with previous-month comparison numbers. Counts and day buckets only —
 * never note titles.
 */
export function computeMonthlyReview(entries: VaultEntry[], now: Date = new Date()): MonthlyReview {
  const year = now.getFullYear()
  const monthIndex = now.getMonth()
  const monthStart = new Date(year, monthIndex, 1)
  const nextMonthStart = new Date(year, monthIndex + 1, 1)
  const prevMonthStart = new Date(year, monthIndex - 1, 1)
  const monthStartMs = monthStart.getTime()
  const monthEndMs = nextMonthStart.getTime()
  const todayKey = localDateKey(now)

  const current = collectWindowActivity(entries, monthStartMs, monthEndMs)
  const previous = collectWindowActivity(entries, prevMonthStart.getTime(), monthStartMs)

  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate()
  const days: MonthlyReviewDay[] = []
  for (let dayOfMonth = 1; dayOfMonth <= daysInMonth; dayOfMonth += 1) {
    const date = new Date(year, monthIndex, dayOfMonth)
    const dateKey = localDateKey(date)
    days.push({ dateKey, count: current.dayCounts.get(dateKey) ?? 0, isToday: dateKey === todayKey })
  }

  return {
    year,
    month: monthIndex + 1,
    monthStartKey: localDateKey(monthStart),
    monthEndKey: localDateKey(new Date(year, monthIndex, daysInMonth)),
    days,
    entriesCreatedThisMonth: current.entriesCreated,
    entriesModifiedThisMonth: current.entriesModified,
    journalDaysActive: current.journalDayKeys.size,
    activeDays: current.dayCounts.size,
    typeMix: sortedTypeMix(current.typeCounts),
    lastMonth: {
      entriesCreated: previous.entriesCreated,
      entriesModified: previous.entriesModified,
      journalDaysActive: previous.journalDayKeys.size,
      activeDays: previous.dayCounts.size,
    },
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
