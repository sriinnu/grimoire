import type { VaultEntry } from '../types'

export interface MemoryLedgerRecord {
  path: string
  title: string
  summary: string
  sources: string[]
  confidence: string | number | null
  lastSeen: string | null
  expiresAt: string | null
  contradicts: string[]
  locality: string
  version: string | number | null
  reviewedAt: string | null
}

const MEMORY_TYPE_NAMES = new Set(['memory', 'memories'])
const SOURCE_KEYS = ['source', 'sources', 'source_note', 'source_notes', 'sourceNote', 'sourceNotes']
const CONTRADICTION_KEYS = ['contradicts', 'contradicted_by', 'contradictedBy']

/** Returns true when a vault entry is a durable Memory Ledger note. */
export function isMemoryLedgerEntry(entry: VaultEntry): boolean {
  return MEMORY_TYPE_NAMES.has((entry.isA ?? '').trim().toLowerCase())
}

/** Builds a normalized Memory Ledger record from a Markdown-backed vault entry. */
export function buildMemoryLedgerRecord(entry: VaultEntry): MemoryLedgerRecord {
  return {
    path: entry.path,
    title: entry.title,
    summary: stringProperty(entry, 'summary') ?? entry.snippet ?? '',
    sources: propertyList(entry, SOURCE_KEYS),
    confidence: confidenceProperty(entry),
    lastSeen: stringProperty(entry, 'last_seen') ?? stringProperty(entry, 'lastSeen'),
    expiresAt: stringProperty(entry, 'expires_at') ?? stringProperty(entry, 'expiresAt'),
    contradicts: propertyList(entry, CONTRADICTION_KEYS),
    locality: stringProperty(entry, 'locality') ?? 'vault',
    version: stringProperty(entry, 'memory_version') ?? stringProperty(entry, 'version'),
    reviewedAt: stringProperty(entry, 'reviewed_at') ?? stringProperty(entry, 'reviewedAt'),
  }
}

/** Finds Memory Ledger records that cite or link to the active note. */
export function findMemoryLedgerRecordsForEntry(
  activeEntry: VaultEntry,
  entries: VaultEntry[],
): MemoryLedgerRecord[] {
  const activeTargets = activeEntryTargets(activeEntry)
  return entries
    .filter(isMemoryLedgerEntry)
    .map(buildMemoryLedgerRecord)
    .filter(record => recordReferencesTargets(record, activeTargets))
}

function activeEntryTargets(entry: VaultEntry): Set<string> {
  return new Set([
    entry.title,
    entry.filename.replace(/\.md$/i, ''),
    entry.path,
    entry.path.replace(/\.md$/i, ''),
    entry.path.split('/').pop()?.replace(/\.md$/i, '') ?? '',
  ].filter(Boolean).map(normalizeReference))
}

function recordReferencesTargets(record: MemoryLedgerRecord, activeTargets: Set<string>): boolean {
  return [...record.sources, ...record.contradicts]
    .map(normalizeReference)
    .some(target => activeTargets.has(target))
}

function propertyList(entry: VaultEntry, keys: string[]): string[] {
  return keys.flatMap(key => valueList(entry.properties[key]))
}

function valueList(value: VaultEntry['properties'][string] | undefined): string[] {
  if (typeof value === 'string') return [value]
  if (typeof value === 'number' || typeof value === 'boolean') return [String(value)]
  if (Array.isArray(value)) return value.filter((item): item is string => typeof item === 'string')
  return []
}

function stringProperty(entry: VaultEntry, key: string): string | null {
  const value = entry.properties[key]
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  return null
}

function confidenceProperty(entry: VaultEntry): string | number | null {
  const value = entry.properties.confidence
  if (typeof value === 'string' || typeof value === 'number') return value
  if (typeof value === 'boolean') return String(value)
  return null
}

function normalizeReference(value: string): string {
  return value
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')[0]
    .replace(/\.md$/i, '')
    .trim()
    .toLowerCase()
}
