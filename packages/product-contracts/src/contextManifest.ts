export const CONTEXT_MANIFEST_SCHEMA_VERSION = 'grimoire.context-manifest.v1' as const

export type ContextIntentV1 =
  | 'explain'
  | 'edit'
  | 'plan'
  | 'debug'
  | 'research'
  | 'review'
  | 'refactor'

export type ContextPermissionV1 = 'allowed' | 'redacted' | 'local-only' | 'blocked'

export type ContextSourceKindV1 =
  | 'active-file'
  | 'selection'
  | 'open-file'
  | 'git-diff'
  | 'terminal-error'
  | 'symbol'
  | 'diagnostic'
  | 'memory'
  | 'user-pin'
  | 'other'

export interface TextSelectionV1 {
  startLine: number
  endLine: number
}

export interface LiveContextV1 {
  activeFile?: string
  selection?: TextSelectionV1
  openFiles: string[]
  gitDiffs: string[]
  terminalErrors: string[]
}

export interface ContextItemV1 {
  id: string
  kind: ContextSourceKindV1
  uri: string
  score: number
  tokenCount: number
  selectedBecause: string[]
  retrievalChannels: string[]
  scope: string
  confidence: number
  revision?: string
  contentHash?: string
  permission: ContextPermissionV1
}

export interface ExcludedContextItemV1 {
  id: string
  kind: ContextSourceKindV1
  uri: string
  reason: string
  permission: ContextPermissionV1
}

export interface ContextBudgetV1 {
  maximumTokens: number
  usedTokens: number
  remainingTokens: number
  compactedTokens: number
}

export interface ContextWarningsV1 {
  stale: string[]
  contradictions: string[]
  weakEvidence: string[]
  policyBlocks: string[]
}

export interface SourceReferenceV1 {
  kind: ContextSourceKindV1
  uri: string
  revision?: string
  contentHash?: string
}

export interface ContextManifestV1 {
  schemaVersion: typeof CONTEXT_MANIFEST_SCHEMA_VERSION
  id: string
  requestId: string
  createdAt: string
  intent: ContextIntentV1
  live: LiveContextV1
  recalled: ContextItemV1[]
  code: ContextItemV1[]
  pinned: ContextItemV1[]
  excluded: ExcludedContextItemV1[]
  budget: ContextBudgetV1
  warnings: ContextWarningsV1
  provenance: SourceReferenceV1[]
}

export function createContextBudgetV1(
  maximumTokens: number,
  usedTokens: number,
  compactedTokens = 0,
): ContextBudgetV1 | null {
  if (!isWholeNonNegative(maximumTokens) || !isWholeNonNegative(usedTokens)) return null
  if (!isWholeNonNegative(compactedTokens) || usedTokens > maximumTokens) return null
  return { maximumTokens, usedTokens, remainingTokens: maximumTokens - usedTokens, compactedTokens }
}

export function validateContextManifestV1(manifest: ContextManifestV1): string[] {
  const errors: string[] = []
  if (manifest.schemaVersion !== CONTEXT_MANIFEST_SCHEMA_VERSION) {
    errors.push('unsupported context manifest schema version')
  }
  if (!manifest.id.trim() || !manifest.requestId.trim()) {
    errors.push('manifest and request IDs must be non-empty')
  }
  if (
    manifest.budget.usedTokens > manifest.budget.maximumTokens
    || manifest.budget.remainingTokens !== manifest.budget.maximumTokens - manifest.budget.usedTokens
  ) {
    errors.push('context budget is inconsistent')
  }

  const seen = new Set<string>()
  for (const item of [...manifest.recalled, ...manifest.code, ...manifest.pinned]) {
    if (!item.id.trim() || seen.has(item.id)) {
      errors.push(`context item ID is empty or duplicated: ${item.id}`)
    }
    seen.add(item.id)
    if (!isUnitInterval(item.score) || !isUnitInterval(item.confidence)) {
      errors.push(`context item score is outside 0...1: ${item.id}`)
    }
  }
  for (const item of manifest.excluded) {
    if (seen.has(item.id)) errors.push(`context item is both included and excluded: ${item.id}`)
  }
  return errors
}

function isWholeNonNegative(value: number): boolean {
  return Number.isInteger(value) && value >= 0
}

function isUnitInterval(value: number): boolean {
  return Number.isFinite(value) && value >= 0 && value <= 1
}
