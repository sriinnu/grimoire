import type { VaultEntry } from '../types'

export type LocalityPolicySource = 'frontmatter' | 'type' | 'path' | 'none'

export interface EntryLocalityPolicy {
  localOnly: boolean
  source: LocalityPolicySource
  reason: string
  badgeLabel: string
}

export interface VaultLocalitySummary {
  total: number
  localOnly: number
  vaultContext: number
  frontmatter: number
  type: number
  path: number
  examples: VaultLocalityExample[]
  protectedTypes: VaultLocalityTypeCount[]
}

export interface VaultLocalityExample {
  title: string
  reason: string
}

export interface VaultLocalityTypeCount {
  type: string
  count: number
}

const LOCAL_ONLY_FIELD_KEYS = new Set([
  'localonly',
  'locality',
  'nosync',
  'neversync',
  'egress',
  'private',
])

const LOCAL_ONLY_TYPE_NAMES = new Set([
  'dream',
  'dreams',
  'health',
  'import report',
  'import-report',
  'journal',
  'journals',
  'memory',
  'private',
  'sadhana',
  'therapy',
])

const LOCAL_ONLY_PATH_SEGMENTS = new Set([
  'dream',
  'dreams',
  'health',
  'journal',
  'journals',
  'local-only',
  'memory',
  'private',
  'therapy',
])

const TRUE_LOCALITY_VALUES = new Set([
  '1',
  'always',
  'blocked',
  'deny',
  'denied',
  'local',
  'local-only',
  'local_only',
  'never',
  'private',
  'true',
  'yes',
])

function normalizeKey(value: string): string {
  return value.toLowerCase().replace(/[_\s-]/g, '')
}

function normalizeValue(value: string): string {
  return value.trim().toLowerCase()
}

function hasTruthyLocalityValue(value: VaultEntry['properties'][string]): boolean {
  if (value === true) return true
  if (typeof value === 'string') return TRUE_LOCALITY_VALUES.has(normalizeValue(value))
  if (Array.isArray(value)) {
    return value.some((item) => typeof item === 'string' && TRUE_LOCALITY_VALUES.has(normalizeValue(item)))
  }
  return false
}

function frontmatterLocalOnlyReason(entry: VaultEntry): string | null {
  for (const [key, value] of Object.entries(entry.properties ?? {})) {
    if (LOCAL_ONLY_FIELD_KEYS.has(normalizeKey(key)) && hasTruthyLocalityValue(value)) {
      return `Marked ${key} in frontmatter`
    }
  }
  return null
}

function typeLocalOnlyReason(entry: VaultEntry): string | null {
  if (isLocalOnlyTypeName(entry.isA)) {
    return `${entry.isA} notes are protected by default`
  }
  return null
}

function pathLocalOnlyReason(entry: VaultEntry): string | null {
  const segments = entry.path
    .split(/[\\/]/)
    .map((segment) => segment.trim().toLowerCase())
    .filter(Boolean)
  const segment = segments.find((candidate) => LOCAL_ONLY_PATH_SEGMENTS.has(candidate))
  return segment ? `Path is under ${segment}` : null
}

/** Resolves whether an entry must be withheld from export, sync, or AI context by default. */
export function resolveEntryLocalityPolicy(entry: VaultEntry): EntryLocalityPolicy {
  const frontmatterReason = frontmatterLocalOnlyReason(entry)
  if (frontmatterReason) {
    return {
      localOnly: true,
      source: 'frontmatter',
      reason: frontmatterReason,
      badgeLabel: 'Local-only',
    }
  }

  const typeReason = typeLocalOnlyReason(entry)
  if (typeReason) {
    return {
      localOnly: true,
      source: 'type',
      reason: typeReason,
      badgeLabel: 'Local-only',
    }
  }

  const pathReason = pathLocalOnlyReason(entry)
  if (pathReason) {
    return {
      localOnly: true,
      source: 'path',
      reason: pathReason,
      badgeLabel: 'Local-only',
    }
  }

  return {
    localOnly: false,
    source: 'none',
    reason: 'No local-only marker',
    badgeLabel: 'Vault context',
  }
}

/** True when an entry should not be placed in remote, export, or AI context by default. */
export function isEntryLocalOnly(entry: VaultEntry): boolean {
  return resolveEntryLocalityPolicy(entry).localOnly
}

/** Summarizes the vault-level Locality Firewall policy for Settings and reviews. */
export function summarizeVaultLocality(entries: VaultEntry[], exampleLimit = 3): VaultLocalitySummary {
  const summary: VaultLocalitySummary = {
    total: entries.length,
    localOnly: 0,
    vaultContext: 0,
    frontmatter: 0,
    type: 0,
    path: 0,
    examples: [],
    protectedTypes: [],
  }
  const typeCounts = new Map<string, number>()

  for (const entry of entries) {
    const policy = resolveEntryLocalityPolicy(entry)
    if (!policy.localOnly) {
      summary.vaultContext += 1
      continue
    }

    summary.localOnly += 1
    if (policy.source === 'frontmatter') summary.frontmatter += 1
    if (policy.source === 'type') summary.type += 1
    if (policy.source === 'path') summary.path += 1
    if (summary.examples.length < exampleLimit) {
      summary.examples.push({ title: entry.title || entry.filename, reason: policy.reason })
    }
    const typeName = entry.isA?.trim() || 'Untyped'
    typeCounts.set(typeName, (typeCounts.get(typeName) ?? 0) + 1)
  }

  summary.protectedTypes = [...typeCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 4)
    .map(([type, count]) => ({ type, count }))
  return summary
}

/** True when a type lane is protected even before resolving an individual note. */
export function isLocalOnlyTypeName(typeName: string | null | undefined): boolean {
  const normalizedTypeName = typeName?.trim().toLowerCase()
  return !!normalizedTypeName && LOCAL_ONLY_TYPE_NAMES.has(normalizedTypeName)
}
