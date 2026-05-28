import type { VaultEntry } from '../types'
import { resolveEntryLocalityPolicy } from './localityPolicy'

/** Ranked metadata signal shown in the private Dream Forge dashboard. */
export interface DreamForgeSignal {
  label: string
  count: number
}

/** Explicit privacy model for the local-only Dream Forge lane. */
export interface DreamForgePrivacyModel {
  locality: 'local-only'
  bodyAccess: 'forbidden'
  titlePolicy: 'never'
  pathPolicy: 'never'
  signalPolicy: 'local-dashboard-only'
  agentPolicy: 'counts-and-redaction-only'
  exportPolicy: 'explicit-user-action-only'
  badges: readonly ['Local only', 'Metadata only', 'No cloud']
}

/** Local-only dream and journal pattern summary built without note body access. */
export interface DreamForgeSummary {
  privacy: DreamForgePrivacyModel
  dreamCount: number
  journalCount: number
  protectedCount: number
  latestDreamAt: number | null
  rhythm: DreamForgeRhythmPoint[]
  timeline: DreamForgeTimelinePoint[]
  recurringPeople: DreamForgeSignal[]
  symbols: DreamForgeSignal[]
  emotionalWeather: DreamForgeSignal[]
}

/** Metadata-only private rhythm bucket for Dream Forge. */
export interface DreamForgeRhythmPoint {
  label: 'Last night' | 'This week' | 'Earlier'
  dreamCount: number
  journalCount: number
  protectedCount: number
  tone: 'active' | 'deep' | 'recent'
}

/** Count-only private timeline bucket for dream/journal trend review. */
export interface DreamForgeTimelinePoint {
  label: 'Last night' | 'This week' | 'This month' | 'Deep archive'
  dreamCount: number
  journalCount: number
  protectedCount: number
  signalCount: number
  state: 'spark' | 'thread' | 'archive' | 'quiet'
}

/** Non-local-safe Dream Forge privacy report: no titles, paths, bodies, or signal labels. */
export interface DreamForgePrivacyReport {
  locality: 'local-only'
  protectedCount: number
  withheldTitles: number
  withheldPaths: number
  withheldBodies: 'all'
  withheldSignalLabels: number
  allowedEgress: false
}

const SYMBOL_KEYS = ['symbol', 'symbols', 'dream_symbol', 'dream_symbols']
const EMOTION_KEYS = ['emotion', 'emotions', 'emotional_weather', 'mood', 'feeling', 'feelings']
const PEOPLE_KEYS = ['person', 'people', 'persons', 'character', 'characters', 'recurring_people']
const DAY_SECONDS = 24 * 60 * 60

export const DREAM_FORGE_PRIVACY_MODEL: DreamForgePrivacyModel = {
  locality: 'local-only',
  bodyAccess: 'forbidden',
  titlePolicy: 'never',
  pathPolicy: 'never',
  signalPolicy: 'local-dashboard-only',
  agentPolicy: 'counts-and-redaction-only',
  exportPolicy: 'explicit-user-action-only',
  badges: ['Local only', 'Metadata only', 'No cloud'],
}

/** Builds local-only dream/journal pattern metadata without reading note bodies. */
export function buildDreamForgeSummary(
  entries: VaultEntry[],
  nowSeconds = Math.floor(Date.now() / 1000),
): DreamForgeSummary {
  const dreams = entries.filter((entry) => typeIs(entry, 'Dream') && !entry.archived)
  const journals = entries.filter((entry) => typeIs(entry, 'Journal') && !entry.archived)
  const protectedEntries = [...dreams, ...journals].filter((entry) => resolveEntryLocalityPolicy(entry).localOnly)
  return {
    privacy: DREAM_FORGE_PRIVACY_MODEL,
    dreamCount: dreams.length,
    journalCount: journals.length,
    protectedCount: protectedEntries.length,
    latestDreamAt: latestTimestamp(dreams),
    rhythm: dreamRhythm([...dreams, ...journals], nowSeconds),
    timeline: dreamTimeline([...dreams, ...journals], nowSeconds),
    recurringPeople: topSignals(dreams, PEOPLE_KEYS),
    symbols: topSignals(dreams, SYMBOL_KEYS),
    emotionalWeather: topSignals([...dreams, ...journals], EMOTION_KEYS),
  }
}

/** Builds a redacted Dream Forge privacy report for agent/export/sync review surfaces. */
export function buildDreamForgePrivacyReport(entries: VaultEntry[]): DreamForgePrivacyReport {
  const summary = buildDreamForgeSummary(entries)
  return {
    locality: 'local-only',
    protectedCount: summary.protectedCount,
    withheldTitles: summary.dreamCount + summary.journalCount,
    withheldPaths: summary.dreamCount + summary.journalCount,
    withheldBodies: 'all',
    withheldSignalLabels: [
      ...summary.recurringPeople,
      ...summary.symbols,
      ...summary.emotionalWeather,
    ].length,
    allowedEgress: false,
  }
}

function dreamRhythm(entries: VaultEntry[], nowSeconds: number): DreamForgeRhythmPoint[] {
  const points = [
    { label: 'Last night', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'active' },
    { label: 'This week', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'recent' },
    { label: 'Earlier', dreamCount: 0, journalCount: 0, protectedCount: 0, tone: 'deep' },
  ] satisfies DreamForgeRhythmPoint[]

  for (const entry of entries) {
    const point = points[rhythmIndex(entry, nowSeconds)]
    if (typeIs(entry, 'Dream')) point.dreamCount += 1
    if (typeIs(entry, 'Journal')) point.journalCount += 1
    if (resolveEntryLocalityPolicy(entry).localOnly) point.protectedCount += 1
  }

  return points
}

function rhythmIndex(entry: VaultEntry, nowSeconds: number): 0 | 1 | 2 {
  const age = Math.max(0, nowSeconds - timestamp(entry))
  if (age <= DAY_SECONDS) return 0
  if (age <= 7 * DAY_SECONDS) return 1
  return 2
}

function dreamTimeline(entries: VaultEntry[], nowSeconds: number): DreamForgeTimelinePoint[] {
  const points = [
    { label: 'Last night', dreamCount: 0, journalCount: 0, protectedCount: 0, signalCount: 0, state: 'quiet' },
    { label: 'This week', dreamCount: 0, journalCount: 0, protectedCount: 0, signalCount: 0, state: 'quiet' },
    { label: 'This month', dreamCount: 0, journalCount: 0, protectedCount: 0, signalCount: 0, state: 'quiet' },
    { label: 'Deep archive', dreamCount: 0, journalCount: 0, protectedCount: 0, signalCount: 0, state: 'quiet' },
  ] satisfies DreamForgeTimelinePoint[]

  for (const entry of entries) {
    const point = points[timelineIndex(entry, nowSeconds)]
    if (typeIs(entry, 'Dream')) point.dreamCount += 1
    if (typeIs(entry, 'Journal')) point.journalCount += 1
    if (resolveEntryLocalityPolicy(entry).localOnly) point.protectedCount += 1
    point.signalCount += signalCount(entry)
  }

  return points.map((point) => ({ ...point, state: timelineState(point) }))
}

function timelineIndex(entry: VaultEntry, nowSeconds: number): 0 | 1 | 2 | 3 {
  const age = Math.max(0, nowSeconds - timestamp(entry))
  if (age <= DAY_SECONDS) return 0
  if (age <= 7 * DAY_SECONDS) return 1
  if (age <= 30 * DAY_SECONDS) return 2
  return 3
}

function timelineState(point: DreamForgeTimelinePoint): DreamForgeTimelinePoint['state'] {
  const total = point.dreamCount + point.journalCount
  if (total === 0) return 'quiet'
  if (point.label === 'Deep archive') return 'archive'
  if (point.signalCount > 0) return 'thread'
  return 'spark'
}

function signalCount(entry: VaultEntry): number {
  return [...SYMBOL_KEYS, ...EMOTION_KEYS, ...PEOPLE_KEYS]
    .reduce((total, key) => total + valuesForKey(entry, key).length, 0)
}

function typeIs(entry: VaultEntry, typeName: string): boolean {
  return entry.isA?.trim().toLowerCase() === typeName.toLowerCase()
}

function latestTimestamp(entries: VaultEntry[]): number | null {
  return entries.reduce<number | null>((latest, entry) => {
    const value = timestamp(entry)
    return value > (latest ?? 0) ? value : latest
  }, null)
}

function timestamp(entry: VaultEntry): number {
  return entry.modifiedAt ?? entry.createdAt ?? 0
}

function topSignals(entries: VaultEntry[], keys: string[]): DreamForgeSignal[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    for (const key of keys) {
      for (const value of valuesForKey(entry, key)) {
        const normalized = normalizeSignal(value)
        if (!normalized) continue
        counts.set(normalized, (counts.get(normalized) ?? 0) + 1)
      }
    }
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
    .slice(0, 3)
}

function valuesForKey(entry: VaultEntry, targetKey: string): string[] {
  const values: string[] = []
  for (const [key, value] of Object.entries(entry.properties)) {
    if (normalizeKey(key) === normalizeKey(targetKey)) values.push(...flattenValue(value))
  }
  for (const [key, value] of Object.entries(entry.relationships)) {
    if (normalizeKey(key) === normalizeKey(targetKey)) values.push(...value)
  }
  return values
}

function flattenValue(value: VaultEntry['properties'][string]): string[] {
  if (Array.isArray(value)) return value.flatMap((item) => splitSignal(String(item)))
  if (typeof value === 'string') return splitSignal(value)
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  return []
}

function splitSignal(value: string): string[] {
  return value.split(/[,;\n]/).map((item) => item.trim()).filter(Boolean)
}

function normalizeSignal(value: string): string {
  return value
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')
    .pop()
    ?.trim()
    .replace(/\s+/g, ' ') ?? ''
}

function normalizeKey(key: string): string {
  return key.replace(/[_\-\s]/g, '').toLowerCase()
}
