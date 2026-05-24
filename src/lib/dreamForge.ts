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
  titlePolicy: 'local-dashboard-only'
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
  latestDreamTitle: string | null
  recurringPeople: DreamForgeSignal[]
  symbols: DreamForgeSignal[]
  emotionalWeather: DreamForgeSignal[]
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

export const DREAM_FORGE_PRIVACY_MODEL: DreamForgePrivacyModel = {
  locality: 'local-only',
  bodyAccess: 'forbidden',
  titlePolicy: 'local-dashboard-only',
  pathPolicy: 'never',
  signalPolicy: 'local-dashboard-only',
  agentPolicy: 'counts-and-redaction-only',
  exportPolicy: 'explicit-user-action-only',
  badges: ['Local only', 'Metadata only', 'No cloud'],
}

/** Builds local-only dream/journal pattern metadata without reading note bodies. */
export function buildDreamForgeSummary(entries: VaultEntry[]): DreamForgeSummary {
  const dreams = entries.filter((entry) => typeIs(entry, 'Dream') && !entry.archived)
  const journals = entries.filter((entry) => typeIs(entry, 'Journal') && !entry.archived)
  const protectedEntries = [...dreams, ...journals].filter((entry) => resolveEntryLocalityPolicy(entry).localOnly)
  return {
    privacy: DREAM_FORGE_PRIVACY_MODEL,
    dreamCount: dreams.length,
    journalCount: journals.length,
    protectedCount: protectedEntries.length,
    latestDreamTitle: latestTitle(dreams),
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

function typeIs(entry: VaultEntry, typeName: string): boolean {
  return entry.isA?.trim().toLowerCase() === typeName.toLowerCase()
}

function latestTitle(entries: VaultEntry[]): string | null {
  return [...entries]
    .sort((a, b) => timestamp(b) - timestamp(a))[0]?.title ?? null
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
