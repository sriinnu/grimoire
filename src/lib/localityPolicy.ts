import type { VaultEntry } from '../types'

type LocalityPolicySubject = Pick<VaultEntry, 'isA' | 'path' | 'properties'>
export type LocalityPolicySource = 'frontmatter' | 'type' | 'path' | 'none'

export interface EntryLocalityPolicy {
  localOnly: boolean
  source: LocalityPolicySource
  reason: string
  badgeLabel: string
}

export type LocalityEgressLaneId = 'agents' | 'export-sync' | 'git-cloud'

export interface LocalityEgressLane {
  allowedMaterial: string
  detail: string
  id: LocalityEgressLaneId
  label: string
  state: string
  stateKey: string
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
  label: string
  reason: string
  source: Exclude<LocalityPolicySource, 'none'>
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
  'agentcontext',
  'exportcontext',
  'synccontext',
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
  'blocked_discarded',
  'blocked_private_lane',
  'blocked_until_review',
  'deny',
  'denied',
  'local',
  'local-only',
  'local_only',
  'local_discarded',
  'local_private_lane',
  'local_until_review',
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
  if (typeof value === 'number') return value === 1
  if (typeof value === 'string') return TRUE_LOCALITY_VALUES.has(normalizeValue(value))
  if (Array.isArray(value)) {
    return value.some((item) => {
      if (typeof item === 'number') return item === 1
      return typeof item === 'string' && TRUE_LOCALITY_VALUES.has(normalizeValue(item))
    })
  }
  return false
}

function frontmatterLocalOnlyReason(entry: LocalityPolicySubject): string | null {
  for (const [key, value] of Object.entries(entry.properties ?? {})) {
    if (LOCAL_ONLY_FIELD_KEYS.has(normalizeKey(key)) && hasTruthyLocalityValue(value)) {
      return `Marked ${key} in frontmatter`
    }
  }
  return null
}

function typeLocalOnlyReason(entry: LocalityPolicySubject): string | null {
  if (isLocalOnlyTypeName(entry.isA)) {
    return `${entry.isA} notes are protected by default`
  }
  return null
}

function pathLocalOnlyReason(entry: LocalityPolicySubject): string | null {
  const segment = localOnlyPathSegment(entry)
  return segment ? `Path is under ${segment}` : null
}

/** Resolves whether an entry must be withheld from export, sync, or AI context by default. */
export function resolveEntryLocalityPolicy(entry: LocalityPolicySubject): EntryLocalityPolicy {
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
export function isEntryLocalOnly(entry: LocalityPolicySubject): boolean {
  return resolveEntryLocalityPolicy(entry).localOnly
}

/** Shared egress matrix for Inspector, agent package review, export, sync, and Git surfaces. */
export function localityEgressLanes(localOnly: boolean): LocalityEgressLane[] {
  return localOnly ? protectedEgressLanes() : vaultContextEgressLanes()
}

/** Returns the egress matrix for a resolved note policy. */
export function entryLocalityEgressLanes(policy: Pick<EntryLocalityPolicy, 'localOnly'>): LocalityEgressLane[] {
  return localityEgressLanes(policy.localOnly)
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
    if (summary.examples.length < exampleLimit && isProtectedLocalitySource(policy.source)) {
      summary.examples.push({
        label: localityExampleLabel(entry, policy.source),
        reason: policy.reason,
        source: policy.source,
      })
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

function isProtectedLocalitySource(source: LocalityPolicySource): source is Exclude<LocalityPolicySource, 'none'> {
  return source !== 'none'
}

function localityExampleLabel(entry: LocalityPolicySubject, source: Exclude<LocalityPolicySource, 'none'>): string {
  if (source === 'type') return `${formatPublicLabel(entry.isA, 'Protected')} note`
  if (source === 'path') return `${formatPublicLabel(localOnlyPathSegment(entry), 'Protected path')} folder note`
  return 'Frontmatter-protected note'
}

function formatPublicLabel(value: string | null | undefined, fallback: string): string {
  const label = value?.trim()
  if (!label) return fallback
  return label
    .split(/[\s_-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ')
}

function localOnlyPathSegment(entry: LocalityPolicySubject): string | null {
  return entry.path
    .split(/[\\/]/)
    .map((segment) => segment.trim().toLowerCase())
    .find((candidate) => LOCAL_ONLY_PATH_SEGMENTS.has(candidate)) ?? null
}

function protectedEgressLanes(): LocalityEgressLane[] {
  return [
    {
      allowedMaterial: 'Policy counts only',
      detail: 'context packets get counts only',
      id: 'agents',
      label: 'Agents',
      state: 'Blocked',
      stateKey: 'blocked',
    },
    {
      allowedMaterial: 'Nothing by default',
      detail: 'note and protected-only attachments stay local',
      id: 'export-sync',
      label: 'Export/sync',
      state: 'Withheld',
      stateKey: 'withheld',
    },
    {
      allowedMaterial: 'Nothing by default',
      detail: 'no default remote egress',
      id: 'git-cloud',
      label: 'Git/cloud',
      state: 'Not staged',
      stateKey: 'not-staged',
    },
  ]
}

function vaultContextEgressLanes(): LocalityEgressLane[] {
  return [
    {
      allowedMaterial: 'Reviewed titles, types, and paths',
      detail: 'reviewed source labels, types, and vault paths only',
      id: 'agents',
      label: 'Agents',
      state: 'Review packet',
      stateKey: 'review',
    },
    {
      allowedMaterial: 'Preview-approved files',
      detail: 'included only through action previews',
      id: 'export-sync',
      label: 'Export/sync',
      state: 'Preview first',
      stateKey: 'preview',
    },
    {
      allowedMaterial: 'Vault setting only',
      detail: 'Git remains optional',
      id: 'git-cloud',
      label: 'Git/cloud',
      state: 'Vault setting',
      stateKey: 'vault-setting',
    },
  ]
}
