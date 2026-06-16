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
  reviewLog: string[]
  handoff: MemoryLedgerHandoff | null
  crystallizeReceipt: string | null
  crystallizeLoop: string | null
}

export interface MemoryLedgerHandoff {
  kind: string
  localHold: boolean
  mode: string | null
  privateGatedLaneCount: number
  readyLaneCount: number
  sourceCount: number
  unavailableLaneCount: number
}

export type MemoryLedgerTone = 'neutral' | 'verified' | 'proposed' | 'warning' | 'danger'

export interface MemoryLedgerDisplayState {
  confidenceLabel: string | null
  confidenceTone: MemoryLedgerTone
  expiryLabel: string | null
  expiryTone: MemoryLedgerTone
  contradictionLabel: string | null
  contradictionTone: MemoryLedgerTone
  sourceLabels: string[]
  contradictionLabels: string[]
  handoffLabel: string | null
  handoffTone: MemoryLedgerTone
  receiptLabel: string | null
  receiptTone: MemoryLedgerTone
  loopLabel: string | null
  reviewLogLabel: string | null
}

export interface MemoryLedgerEvidenceSummary {
  records: number
  sources: number
  contradictions: number
  reviewFlags: number
}

export type MemoryLedgerAuditReason = 'contradiction' | 'expired' | 'expiring' | 'stale' | 'unreviewed'

export interface MemoryLedgerAuditItem {
  path: string
  title: string
  label: string
  reason: MemoryLedgerAuditReason
  tone: MemoryLedgerTone
}

const MEMORY_TYPE_NAMES = new Set(['memory', 'memories'])
const SOURCE_KEYS = ['source', 'sources', 'source_note', 'source_notes', 'sourceNote', 'sourceNotes']
const CONTRADICTION_KEYS = ['contradicts', 'contradicted_by', 'contradictedBy']
const REVIEW_LOG_KEYS = ['memory_review_log', 'review_log', 'memoryReviewLog', 'reviewLog']
const DAY_MS = 86_400_000
const STALE_MEMORY_DAYS = 45

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
    reviewLog: propertyList(entry, REVIEW_LOG_KEYS),
    handoff: handoffProperty(entry),
    crystallizeReceipt: stringProperty(entry, 'crystallize_receipt') ?? stringProperty(entry, 'crystallizeReceipt'),
    crystallizeLoop: stringProperty(entry, 'crystallize_loop') ?? stringProperty(entry, 'crystallizeLoop'),
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

/** Builds quiet UI state for source, confidence, expiry, and contradiction metadata. */
export function buildMemoryLedgerDisplayState(record: MemoryLedgerRecord, now = new Date()): MemoryLedgerDisplayState {
  const expiry = expiryState(record.expiresAt, now)
  const contradictionCount = record.contradicts.length
  return {
    confidenceLabel: confidenceLabel(record.confidence),
    confidenceTone: confidenceTone(record.confidence),
    expiryLabel: expiry.label,
    expiryTone: expiry.tone,
    contradictionLabel: contradictionCount > 0 ? `${contradictionCount} contradiction${contradictionCount === 1 ? '' : 's'}` : null,
    contradictionTone: contradictionCount > 0 ? 'warning' : 'neutral',
    sourceLabels: record.sources.map(memoryReferenceLabel),
    contradictionLabels: record.contradicts.map(memoryReferenceLabel),
    handoffLabel: handoffLabel(record.handoff),
    handoffTone: handoffTone(record.handoff),
    receiptLabel: crystallizeReceiptLabel(record.crystallizeReceipt),
    receiptTone: record.crystallizeReceipt ? 'verified' : 'neutral',
    loopLabel: record.crystallizeLoop ? 'Thread settled' : null,
    reviewLogLabel: latestReviewLogLabel(record.reviewLog),
  }
}

/** Creates a Markdown-owned Memory Ledger review event for frontmatter history. */
export function buildMemoryReviewLogEntry({
  at,
  confidence,
  contradicts,
  expiresAt,
  version,
}: {
  at: string
  confidence: string
  contradicts: string[]
  expiresAt: string
  version: number
}): string {
  return [
    `${at} v${version}`,
    confidence ? `confidence=${confidence}` : 'confidence=cleared',
    expiresAt ? `expires=${expiresAt}` : 'expires=cleared',
    contradicts.length > 0 ? `contradicts=${contradicts.join('|')}` : 'contradicts=none',
  ].join('; ')
}

/** Summarizes ledger provenance without reading private note bodies or paths. */
export function summarizeMemoryLedgerEvidence(
  records: MemoryLedgerRecord[],
  now = new Date(),
): MemoryLedgerEvidenceSummary {
  const sourceKeys = new Set<string>()
  let contradictions = 0
  let reviewFlags = 0

  for (const record of records) {
    for (const source of record.sources) {
      const key = normalizedMemoryReferenceKey(source)
      if (key) sourceKeys.add(key)
    }

    const state = buildMemoryLedgerDisplayState(record, now)
    contradictions += record.contradicts.length
    if (state.contradictionTone === 'warning' || state.expiryTone === 'warning' || state.expiryTone === 'danger') {
      reviewFlags += 1
    }
  }

  return {
    records: records.length,
    sources: sourceKeys.size,
    contradictions,
    reviewFlags,
  }
}

/** Builds the owner-visible metadata review queue for Memory Ledger records. */
export function buildMemoryLedgerAuditQueue(
  records: MemoryLedgerRecord[],
  now = new Date(),
): MemoryLedgerAuditItem[] {
  return records
    .map(record => auditItemForRecord(record, now))
    .filter((item): item is MemoryLedgerAuditItem => item !== null)
}

/** Converts a Markdown wikilink/reference value into a human-facing label. */
export function memoryReferenceLabel(value: string): string {
  return value
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')[0]
    .replace(/\.md$/i, '')
    .trim()
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

function handoffProperty(entry: VaultEntry): MemoryLedgerHandoff | null {
  const kind = stringProperty(entry, 'handoff')
  if (!kind) return null
  return {
    kind,
    localHold: booleanProperty(entry, 'handoff_local_hold') || numberProperty(entry, 'handoff_held_local') > 0,
    mode: stringProperty(entry, 'handoff_mode'),
    privateGatedLaneCount: numberProperty(entry, 'handoff_private_gated_lanes'),
    readyLaneCount: numberProperty(entry, 'handoff_ready_lanes'),
    sourceCount: numberProperty(entry, 'handoff_source_count'),
    unavailableLaneCount: numberProperty(entry, 'handoff_unavailable_lanes'),
  }
}

function numberProperty(entry: VaultEntry, key: string): number {
  const value = entry.properties[key]
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

function booleanProperty(entry: VaultEntry, key: string): boolean {
  const value = entry.properties[key]
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value > 0
  if (typeof value === 'string') return /^(true|yes|1)$/i.test(value.trim())
  return false
}

function handoffLabel(value: MemoryLedgerHandoff | null): string | null {
  if (!value) return null
  const parts = [
    `${value.readyLaneCount} ready`,
    value.privateGatedLaneCount > 0 ? `${value.privateGatedLaneCount} gated` : null,
    value.unavailableLaneCount > 0 ? `${value.unavailableLaneCount} unavailable` : null,
    value.sourceCount > 0 ? `${value.sourceCount} sources` : null,
    value.localHold ? 'local hold' : null,
  ].filter((part): part is string => Boolean(part))
  return value.kind === 'agent_council' ? `Council ${parts.join(' · ')}` : `${value.kind} ${parts.join(' · ')}`
}

function handoffTone(value: MemoryLedgerHandoff | null): MemoryLedgerTone {
  if (!value) return 'neutral'
  if (value.mode === 'policy-only' || value.localHold || value.privateGatedLaneCount > 0 || value.unavailableLaneCount > 0) return 'warning'
  return 'proposed'
}

function latestReviewLogLabel(value: string[]): string | null {
  const latest = value.at(-1)?.trim()
  return latest || null
}

function crystallizeReceiptLabel(value: string | null): string | null {
  const normalized = value?.trim()
  if (!normalized) return null
  const safeReceipt = normalized.match(/^crys-[a-z0-9-]+/i)?.[0]
  return safeReceipt ? `Receipt ${safeReceipt.slice(0, 24)}` : 'Receipt recorded'
}

function confidenceLabel(value: string | number | null): string | null {
  if (value === null) return null
  if (typeof value === 'number') return `${Math.round(value * 100)}%`
  return value.trim() || null
}

function confidenceTone(value: string | number | null): MemoryLedgerTone {
  if (value === null) return 'neutral'
  if (typeof value === 'number') {
    if (value >= 0.8) return 'verified'
    if (value >= 0.5) return 'proposed'
    return 'warning'
  }
  const normalized = value.toLowerCase()
  if (/(verified|high|certain|confirmed)/.test(normalized)) return 'verified'
  if (/(proposed|draft|tentative|working)/.test(normalized)) return 'proposed'
  if (/(low|weak|stale|uncertain)/.test(normalized)) return 'warning'
  return 'neutral'
}

function expiryState(value: string | null, now: Date): { label: string | null; tone: MemoryLedgerTone } {
  if (!value) return { label: null, tone: 'neutral' }
  const expiresAt = Date.parse(value)
  if (!Number.isFinite(expiresAt)) return { label: `Expires ${value}`, tone: 'neutral' }
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const expiryDay = Date.UTC(new Date(expiresAt).getUTCFullYear(), new Date(expiresAt).getUTCMonth(), new Date(expiresAt).getUTCDate())
  const days = Math.ceil((expiryDay - today) / DAY_MS)
  if (days < 0) return { label: `Expired ${value}`, tone: 'danger' }
  if (days === 0) return { label: 'Expires today', tone: 'danger' }
  if (days <= 14) return { label: `Expires in ${days}d`, tone: 'warning' }
  return { label: `Expires ${value}`, tone: 'neutral' }
}

function auditItemForRecord(record: MemoryLedgerRecord, now: Date): MemoryLedgerAuditItem | null {
  const display = buildMemoryLedgerDisplayState(record, now)
  if (record.contradicts.length > 0) {
    return auditItem(record, 'contradiction', display.contradictionLabel ?? 'Contradiction', 'warning')
  }
  if (display.expiryTone === 'danger') {
    return auditItem(record, 'expired', display.expiryLabel ?? 'Expired', 'danger')
  }
  if (display.expiryTone === 'warning') {
    return auditItem(record, 'expiring', display.expiryLabel ?? 'Expiring soon', 'warning')
  }
  const staleLabel = staleMemoryLabel(record.lastSeen, now)
  if (staleLabel) return auditItem(record, 'stale', staleLabel, 'warning')
  if (!record.reviewedAt) return auditItem(record, 'unreviewed', 'Needs first review', 'proposed')
  return null
}

function auditItem(
  record: MemoryLedgerRecord,
  reason: MemoryLedgerAuditReason,
  label: string,
  tone: MemoryLedgerTone,
): MemoryLedgerAuditItem {
  return { label, path: record.path, reason, title: record.title, tone }
}

function staleMemoryLabel(value: string | null, now: Date): string | null {
  if (!value) return null
  const lastSeen = Date.parse(value)
  if (!Number.isFinite(lastSeen)) return null
  const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())
  const seenDay = Date.UTC(new Date(lastSeen).getUTCFullYear(), new Date(lastSeen).getUTCMonth(), new Date(lastSeen).getUTCDate())
  const days = Math.floor((today - seenDay) / DAY_MS)
  return days >= STALE_MEMORY_DAYS ? `Stale ${days}d` : null
}

function normalizeReference(value: string): string {
  return memoryReferenceLabel(value).toLowerCase()
}

function normalizedMemoryReferenceKey(value: string): string {
  return normalizeReference(value).trim()
}
