import type { VaultEntry } from '../types'
import type { ParsedFrontmatter } from '../utils/frontmatter'

export type LivingFrontmatterHintKind =
  | 'missing-field'
  | 'stale-status'
  | 'duplicate-concept'
  | 'relationship-hint'

export type LivingFrontmatterHintSeverity = 'info' | 'warn'
export type LivingFrontmatterSuggestedValue = string | number | boolean | string[]

export interface LivingFrontmatterHint {
  id: string
  kind: LivingFrontmatterHintKind
  label: string
  detail: string
  severity: LivingFrontmatterHintSeverity
  field?: string
  suggestedValue?: LivingFrontmatterSuggestedValue
}

export interface LivingFrontmatterInput {
  entry: VaultEntry
  entries: VaultEntry[]
  frontmatter: ParsedFrontmatter
  now?: Date
}

interface RequiredField {
  field: string
  aliases?: string[]
}

const ACTIVE_STATUSES = new Set(['active', 'open', 'in_progress', 'in progress', 'started', 'todo', 'doing'])
const STALE_ACTIVE_DAYS = 30

const TYPE_REQUIRED_FIELDS: Record<string, RequiredField[]> = {
  dream: [
    { field: 'date', aliases: ['created_at', 'dreamed_at'] },
    { field: 'symbols', aliases: ['symbol', 'dream_symbols'] },
    { field: 'emotional_weather', aliases: ['emotion', 'mood', 'feeling'] },
  ],
  journal: [
    { field: 'date', aliases: ['created_at', 'journaled_at'] },
    { field: 'mood', aliases: ['emotion', 'feeling', 'emotional_weather'] },
  ],
  memory: [
    { field: 'source_note', aliases: ['source', 'sources', 'source_notes'] },
    { field: 'confidence' },
    { field: 'last_seen', aliases: ['lastSeen'] },
    { field: 'locality' },
    { field: 'memory_version', aliases: ['version'] },
  ],
  project: [
    { field: 'status' },
    { field: 'owner' },
  ],
  task: [
    { field: 'status' },
    { field: 'due', aliases: ['due_at', 'due_date'] },
  ],
}

/** Builds transparent frontmatter suggestions without mutating Markdown or app state. */
export function buildLivingFrontmatterHints({
  entry,
  entries,
  frontmatter,
  now = new Date(),
}: LivingFrontmatterInput): LivingFrontmatterHint[] {
  return [
    ...missingFieldHints(entry, frontmatter, now),
    ...staleStatusHints(entry, frontmatter, now),
    ...duplicateConceptHints(entry, entries),
    ...relationshipHints(entry, frontmatter),
  ]
}

function missingFieldHints(entry: VaultEntry, frontmatter: ParsedFrontmatter, now: Date): LivingFrontmatterHint[] {
  const typeName = entryType(entry, frontmatter)
  const hints: LivingFrontmatterHint[] = []
  if (!typeName) {
    hints.push({
      id: 'missing-type',
      kind: 'missing-field',
      label: 'Add type',
      detail: 'A type field would make this note easier to filter, template, and hand to agents.',
      severity: 'info',
      field: 'type',
      suggestedValue: entry.isA?.trim() || 'Note',
    })
    return hints
  }

  const required = TYPE_REQUIRED_FIELDS[normalizeType(typeName)] ?? []
  for (const requirement of required) {
    if (hasField(entry, frontmatter, requirement)) continue
    hints.push({
      id: `missing-${requirement.field}`,
      kind: 'missing-field',
      label: `Add ${humanizeField(requirement.field)}`,
      detail: `${typeName} notes are stronger with ${humanizeField(requirement.field).toLowerCase()} in frontmatter.`,
      severity: requirement.field === 'status' ? 'warn' : 'info',
      field: requirement.field,
      suggestedValue: suggestedMissingFieldValue(requirement.field, typeName, now),
    })
  }
  return hints
}

function staleStatusHints(
  entry: VaultEntry,
  frontmatter: ParsedFrontmatter,
  now: Date,
): LivingFrontmatterHint[] {
  const status = String(frontmatterValue(frontmatter, ['status']) ?? entry.status ?? '').trim()
  if (!ACTIVE_STATUSES.has(status.toLowerCase())) return []

  const ageDays = daysSince(entry.modifiedAt ?? entry.createdAt, now)
  if (ageDays === null || ageDays < STALE_ACTIVE_DAYS) return []

  return [{
    id: 'stale-active-status',
    kind: 'stale-status',
    label: 'Review active status',
    detail: `Still marked ${status}, but untouched for ${ageDays} days.`,
    severity: 'warn',
    field: 'status',
  }]
}

function duplicateConceptHints(entry: VaultEntry, entries: VaultEntry[]): LivingFrontmatterHint[] {
  const activeNames = conceptNames(entry)
  const matches = entries
    .filter(candidate => candidate.path !== entry.path)
    .filter(candidate => overlaps(activeNames, conceptNames(candidate)))
    .map(candidate => candidate.title)
    .slice(0, 3)

  if (matches.length === 0) return []

  return [{
    id: 'duplicate-concept',
    kind: 'duplicate-concept',
    label: 'Possible duplicate',
    detail: `Looks close to ${matches.join(', ')}.`,
    severity: 'warn',
  }]
}

function relationshipHints(entry: VaultEntry, frontmatter: ParsedFrontmatter): LivingFrontmatterHint[] {
  const structuredRelationships = Object.values(entry.relationships ?? {}).some(values => values.length > 0)
    || Object.values(frontmatter).some(valueHasWikilink)

  if (structuredRelationships || (entry.outgoingLinks ?? []).length === 0) return []

  return [{
    id: 'promote-wikilinks',
    kind: 'relationship-hint',
    label: 'Promote links',
    detail: 'Frequent wikilinks here could become belongs_to or related_to fields.',
    severity: 'info',
    field: 'related_to',
    suggestedValue: entry.outgoingLinks.map(label => `[[${label}]]`),
  }]
}

function hasField(entry: VaultEntry, frontmatter: ParsedFrontmatter, requirement: RequiredField): boolean {
  const keys = [requirement.field, ...(requirement.aliases ?? [])]
  if (frontmatterValue(frontmatter, keys) != null) return true
  if (entryValue(entry, keys) != null) return true
  return false
}

function frontmatterValue(frontmatter: ParsedFrontmatter, fields: string[]): unknown {
  const normalizedFields = new Set(fields.map(normalizeFieldKey))
  return Object.entries(frontmatter)
    .find(([key, value]) => normalizedFields.has(normalizeFieldKey(key)) && value != null)?.[1] ?? null
}

function entryValue(entry: VaultEntry, fields: string[]): unknown {
  for (const field of fields) {
    if (normalizeFieldKey(field) === 'status' && entry.status) return entry.status
    const property = Object.entries(entry.properties ?? {})
      .find(([key, value]) => normalizeFieldKey(key) === normalizeFieldKey(field) && value != null)?.[1]
    if (property != null) return property
  }
  return null
}

function entryType(entry: VaultEntry, frontmatter: ParsedFrontmatter): string | null {
  const value = frontmatterValue(frontmatter, ['type', 'is_a', 'Is A'])
  return String(value ?? entry.isA ?? '').trim() || null
}

function conceptNames(entry: VaultEntry): Set<string> {
  return new Set([
    entry.title,
    entry.filename.replace(/\.md$/i, ''),
    ...(entry.aliases ?? []),
  ].map(normalizeConcept).filter(Boolean))
}

function overlaps(left: Set<string>, right: Set<string>): boolean {
  return [...left].some(value => right.has(value))
}

function daysSince(timestampSeconds: number | null, now: Date): number | null {
  if (!timestampSeconds) return null
  const elapsedMs = now.getTime() - timestampSeconds * 1000
  return elapsedMs < 0 ? 0 : Math.floor(elapsedMs / 86_400_000)
}

function valueHasWikilink(value: unknown): boolean {
  if (Array.isArray(value)) return value.some(valueHasWikilink)
  return typeof value === 'string' && value.includes('[[')
}

function normalizeConcept(value: string): string {
  return value
    .replace(/\.md$/i, '')
    .replace(/\b(copy|duplicate|draft)\b/gi, '')
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .toLowerCase()
}

function normalizeType(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeFieldKey(key: string): string {
  return key.trim().replace(/[\s-]+/g, '_').toLowerCase()
}

function humanizeField(field: string): string {
  return field.replace(/_/g, ' ')
}

function suggestedMissingFieldValue(
  field: string,
  typeName: string,
  now: Date,
): LivingFrontmatterSuggestedValue | undefined {
  const normalizedField = normalizeFieldKey(field)
  const normalizedTypeName = normalizeType(typeName)
  if (normalizedField === 'status') return normalizedTypeName === 'task' ? 'Todo' : 'Active'
  if (normalizedField === 'confidence') return 'proposed'
  if (normalizedField === 'last_seen') return now.toISOString().slice(0, 10)
  if (normalizedField === 'locality') return 'local-only'
  if (normalizedField === 'memory_version') return 1
  return undefined
}
