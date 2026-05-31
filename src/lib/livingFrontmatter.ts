import type { VaultEntry } from '../types'
import type { ParsedFrontmatter } from '../utils/frontmatter'

export type LivingFrontmatterHintKind =
  | 'missing-field'
  | 'stale-status'
  | 'duplicate-concept'
  | 'relationship-hint'
  | 'type-schema'

export type LivingFrontmatterHintSeverity = 'info' | 'warn'
export type LivingFrontmatterHintSource =
  | 'body-wikilinks'
  | 'built-in-rule'
  | 'type-note'
  | 'vault-neighborhood'
export type LivingFrontmatterSuggestedValue = string | number | boolean | string[]

export interface LivingFrontmatterHint {
  id: string
  kind: LivingFrontmatterHintKind
  label: string
  detail: string
  severity: LivingFrontmatterHintSeverity
  source: LivingFrontmatterHintSource
  field?: string
  suggestedValue?: LivingFrontmatterSuggestedValue
}

/** Owner-visible review summary for Living Frontmatter suggestions. */
export interface LivingFrontmatterReviewPlan {
  applicableCount: number
  fieldCount: number
  readOnlyCount: number
  sourceLabels: string[]
  storagePolicy: 'markdown-on-disk'
  writePolicy: 'frontmatter-only'
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
const SOURCE_LABELS: Record<LivingFrontmatterHintSource, string> = {
  'body-wikilinks': 'Wikilinks',
  'built-in-rule': 'Built-in rules',
  'type-note': 'Type notes',
  'vault-neighborhood': 'Vault neighbors',
}

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
  return dedupeHints([
    ...typeSchemaHints(entry, entries, frontmatter, now),
    ...missingFieldHints(entry, frontmatter, now),
    ...staleStatusHints(entry, frontmatter, now),
    ...duplicateConceptHints(entry, entries),
    ...relationshipHints(entry, frontmatter),
  ])
}

/** Builds a count-only review plan for the Inspector UI before frontmatter is changed. */
export function buildLivingFrontmatterReviewPlan(hints: LivingFrontmatterHint[]): LivingFrontmatterReviewPlan {
  const writableHints = hints.filter(hasSuggestedWrite)
  const fieldKeys = new Set(writableHints.map((hint) => normalizeFieldKey(hint.field)))
  const sourceLabels = [...new Set(hints.map((hint) => SOURCE_LABELS[hint.source]))]

  return {
    applicableCount: writableHints.length,
    fieldCount: fieldKeys.size,
    readOnlyCount: hints.length - writableHints.length,
    sourceLabels,
    storagePolicy: 'markdown-on-disk',
    writePolicy: 'frontmatter-only',
  }
}

function typeSchemaHints(
  entry: VaultEntry,
  entries: VaultEntry[],
  frontmatter: ParsedFrontmatter,
  now: Date,
): LivingFrontmatterHint[] {
  const typeName = entryType(entry, frontmatter)
  const typeEntry = findTypeEntry(entries, typeName)
  if (!typeName || !typeEntry) return []

  return typeSchemaFields(typeEntry)
    .filter(schemaField => !hasField(entry, frontmatter, { field: schemaField.field }))
    .map(({ field, required }) => ({
      id: `type-schema-${normalizeFieldKey(field)}`,
      kind: 'type-schema',
      label: `Add ${humanizeField(field)}`,
      detail: `${typeName} type asks for ${humanizeField(field).toLowerCase()} in readable Markdown frontmatter.`,
      severity: required ? 'warn' : 'info',
      source: 'type-note',
      field,
      suggestedValue: suggestedMissingFieldValue(field, typeName, now),
    }))
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
      source: 'built-in-rule',
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
      source: 'built-in-rule',
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
    source: 'built-in-rule',
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
    source: 'vault-neighborhood',
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
    source: 'body-wikilinks',
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

function findTypeEntry(entries: VaultEntry[], typeName: string | null): VaultEntry | null {
  if (!typeName) return null
  const normalized = normalizeType(typeName)
  return entries.find(candidate =>
    candidate.isA === 'Type' && normalizeType(candidate.title) === normalized
  ) ?? null
}

function typeSchemaFields(typeEntry: VaultEntry): { field: string; required: boolean }[] {
  const required = [
    ...propertyList(typeEntry.properties.required_fields),
    ...propertyList(typeEntry.properties.required),
    ...propertyList(typeEntry.properties.fields),
  ]
  const displayed = typeEntry.listPropertiesDisplay
  const fields = new Map<string, { field: string; required: boolean }>()

  for (const field of required) addSchemaField(fields, field, true)
  for (const field of displayed) addSchemaField(fields, field, false)

  return [...fields.values()]
}

function addSchemaField(
  fields: Map<string, { field: string; required: boolean }>,
  field: string,
  required: boolean,
): void {
  const clean = field.trim()
  if (!clean) return
  const key = normalizeFieldKey(clean)
  const existing = fields.get(key)
  fields.set(key, { field: existing?.field ?? clean, required: required || !!existing?.required })
}

function propertyList(value: unknown): string[] {
  if (Array.isArray(value)) return value.flatMap(propertyList)
  if (typeof value === 'string') return value.split(',').map(part => part.trim()).filter(Boolean)
  return []
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

function dedupeHints(hints: LivingFrontmatterHint[]): LivingFrontmatterHint[] {
  const seen = new Set<string>()
  return hints.filter((hint) => {
    const key = hint.field ? `field:${normalizeFieldKey(hint.field)}` : `id:${hint.id}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function hasSuggestedWrite(
  hint: LivingFrontmatterHint,
): hint is LivingFrontmatterHint & { field: string; suggestedValue: LivingFrontmatterSuggestedValue } {
  return !!hint.field && hint.suggestedValue !== undefined
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
