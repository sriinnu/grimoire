import type { VaultEntry } from '../types'

export type LocalityPolicySource = 'frontmatter' | 'type' | 'path' | 'none'

export interface EntryLocalityPolicy {
  localOnly: boolean
  source: LocalityPolicySource
  reason: string
  badgeLabel: string
}

const LOCAL_ONLY_FIELD_KEYS = new Set([
  'localonly',
  'nosync',
  'neversync',
  'private',
])

const LOCAL_ONLY_TYPE_NAMES = new Set([
  'dream',
  'dreams',
  'health',
  'journal',
  'journals',
  'private',
  'therapy',
])

const LOCAL_ONLY_PATH_SEGMENTS = new Set([
  'dream',
  'dreams',
  'health',
  'journal',
  'journals',
  'local-only',
  'private',
  'therapy',
])

const TRUE_LOCALITY_VALUES = new Set([
  '1',
  'always',
  'local',
  'local-only',
  'local_only',
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

/** True when a type lane is protected even before resolving an individual note. */
export function isLocalOnlyTypeName(typeName: string | null | undefined): boolean {
  const normalizedTypeName = typeName?.trim().toLowerCase()
  return !!normalizedTypeName && LOCAL_ONLY_TYPE_NAMES.has(normalizedTypeName)
}
