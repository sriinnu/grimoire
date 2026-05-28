import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../types'
import type { AiAgentAvailability } from './aiAgents'
import { resolveEntryLocalityPolicy, type EntryLocalityPolicy } from './localityPolicy'

export type ChitraguptaCapability =
  | 'memory.append'
  | 'memory.search'
  | 'recall.unified'
  | 'wiki.list'
  | 'wiki.read'
  | 'graph.neighborhood'
  | 'diagnostics.memory'
  | 'ingest.markdown'

export interface ChitraguptaMemoryContext {
  /** Active note path Grimoire can pass to Chitragupta recall. */
  activeNotePath: string
  /** Active note title. */
  title: string
  /** Heading count from shared Markdown semantics. */
  headingCount: number
  /** Frontmatter field count from shared Markdown semantics. */
  frontmatterFieldCount: number
  /** Outgoing wikilink targets indexed by Grimoire. */
  outgoingLinks: string[]
  /** Nearby notes derived from existing vault metadata. */
  relatedTitles: string[]
  /** Contract capabilities Grimoire expects before enabling live memory UX. */
  requiredCapabilities: ChitraguptaCapability[]
  /** Locality policy for the active note before any agent receives context. */
  locality: EntryLocalityPolicy
}

export const REQUIRED_CHITRAGUPTA_CAPABILITIES: ChitraguptaCapability[] = [
  'memory.append',
  'memory.search',
  'recall.unified',
  'wiki.list',
  'wiki.read',
  'graph.neighborhood',
  'diagnostics.memory',
  'ingest.markdown',
]

export type ChitraguptaDaemonState = 'running' | 'stopped' | 'degraded'
export type ChitraguptaContractState = 'ready' | 'blocked'

export interface ChitraguptaStatusPayload {
  ok?: boolean
  daemon?: ChitraguptaDaemonState | string
  capabilities?: string[] | null
  warnings?: string[] | null
}

export interface ChitraguptaCapabilityStatus {
  name: ChitraguptaCapability
  available: boolean
}

export interface ChitraguptaContractStatus {
  state: ChitraguptaContractState
  daemon: ChitraguptaDaemonState | 'unknown'
  capabilities: ChitraguptaCapabilityStatus[]
  missingCapabilities: ChitraguptaCapability[]
  warnings: string[]
}

export type ChitraguptaRuntimeReadinessState =
  | 'protected'
  | 'checking'
  | 'cli_missing'
  | 'mcp_unverified'
  | 'mcp_blocked'
  | 'ready'

export interface ChitraguptaRuntimeDiagnostic {
  state: ChitraguptaRuntimeReadinessState
  cliLabel: string
  contractLabel: string
  capabilityLabel: string
  warnings: string[]
}

/** Evaluates the public Chitragupta MCP contract without exposing private runtime details. */
export function evaluateChitraguptaContractStatus(
  payload: ChitraguptaStatusPayload | null | undefined,
): ChitraguptaContractStatus {
  const availableCapabilities = new Set(payload?.capabilities ?? [])
  const missingCapabilities = REQUIRED_CHITRAGUPTA_CAPABILITIES.filter(
    capability => !availableCapabilities.has(capability),
  )
  const daemon = normalizeDaemonState(payload?.daemon)
  const warnings = [
    ...(payload?.warnings ?? []).map(sanitizeChitraguptaWarning),
    ...contractWarnings(payload, daemon, missingCapabilities),
  ].filter(warning => warning.trim().length > 0)

  return {
    state: payload?.ok === true && daemon === 'running' && missingCapabilities.length === 0
      ? 'ready'
      : 'blocked',
    daemon,
    capabilities: REQUIRED_CHITRAGUPTA_CAPABILITIES.map(capability => ({
      name: capability,
      available: availableCapabilities.has(capability),
    })),
    missingCapabilities,
    warnings: [...new Set(warnings)],
  }
}

/** Summarizes the app-visible Chitragupta runtime truth for memory UI. */
export function summarizeChitraguptaRuntimeReadiness({
  availability,
  contractStatus,
  protectedNote,
}: {
  availability?: AiAgentAvailability | null
  contractStatus: ChitraguptaContractStatus
  protectedNote: boolean
}): ChitraguptaRuntimeDiagnostic {
  const availableCapabilities = contractStatus.capabilities.filter(capability => capability.available).length
  const capabilityLabel = `${availableCapabilities}/${contractStatus.capabilities.length} MCP capabilities`

  if (protectedNote) {
    return {
      state: 'protected',
      cliLabel: 'Context withheld',
      contractLabel: 'Protected local',
      capabilityLabel,
      warnings: [],
    }
  }

  if (!availability || availability.status === 'checking') {
    return {
      state: 'checking',
      cliLabel: 'CLI checking',
      contractLabel: 'MCP contract pending',
      capabilityLabel,
      warnings: contractStatus.warnings.slice(0, 2),
    }
  }

  if (availability.status === 'missing') {
    return {
      state: 'cli_missing',
      cliLabel: 'CLI missing',
      contractLabel: 'MCP contract blocked',
      capabilityLabel,
      warnings: [
        'Install Chitragupta CLI before live memory recall.',
        ...contractStatus.warnings,
      ].slice(0, 2),
    }
  }

  if (contractStatus.state === 'ready') {
    return {
      state: 'ready',
      cliLabel: 'CLI installed',
      contractLabel: 'MCP contract ready',
      capabilityLabel,
      warnings: [],
    }
  }

  const statusUnavailable = contractStatus.warnings.includes('Chitragupta status is unavailable.')
  return {
    state: statusUnavailable ? 'mcp_unverified' : 'mcp_blocked',
    cliLabel: 'CLI installed',
    contractLabel: statusUnavailable ? 'MCP contract unverified' : 'MCP contract blocked',
    capabilityLabel,
    warnings: [
      'CLI chat can run separately; memory recall stays local-ledger until MCP diagnostics pass.',
      ...contractStatus.warnings,
    ].slice(0, 2),
  }
}

/** Builds the active-note context packet Grimoire will send to Chitragupta. */
export function buildChitraguptaMemoryContext(
  entry: VaultEntry,
  entries: VaultEntry[],
  semantics: MarkdownDocumentSemantics,
): ChitraguptaMemoryContext {
  const locality = resolveEntryLocalityPolicy(entry)
  if (locality.localOnly) {
    return {
      activeNotePath: '[local-only path withheld]',
      title: '[local-only title withheld]',
      headingCount: 0,
      frontmatterFieldCount: 0,
      outgoingLinks: [],
      relatedTitles: [],
      requiredCapabilities: REQUIRED_CHITRAGUPTA_CAPABILITIES,
      locality: protectedLocality(locality),
    }
  }

  return {
    activeNotePath: entry.path,
    title: entry.title,
    headingCount: semantics.headings.length,
    frontmatterFieldCount: semantics.frontmatterFields.length,
    outgoingLinks: visibleOutgoingLinks(entry, entries),
    relatedTitles: relatedNoteTitles(entry, entries),
    requiredCapabilities: REQUIRED_CHITRAGUPTA_CAPABILITIES,
    locality,
  }
}

function contractWarnings(
  payload: ChitraguptaStatusPayload | null | undefined,
  daemon: ChitraguptaContractStatus['daemon'],
  missingCapabilities: ChitraguptaCapability[],
): string[] {
  const warnings: string[] = []
  if (!payload) {
    warnings.push('Chitragupta status is unavailable.')
  } else if (payload.ok !== true) {
    warnings.push('Chitragupta status is not healthy.')
  }
  if (daemon !== 'running') {
    warnings.push('Chitragupta daemon is not running.')
  }
  if (missingCapabilities.length > 0) {
    warnings.push(`Missing Chitragupta capabilities: ${missingCapabilities.join(', ')}`)
  }
  return warnings
}

function normalizeDaemonState(value: ChitraguptaStatusPayload['daemon']): ChitraguptaContractStatus['daemon'] {
  if (value === 'running' || value === 'stopped' || value === 'degraded') return value
  return 'unknown'
}

function sanitizeChitraguptaWarning(value: string): string {
  return value
    .trim()
    .replace(/\/Users\/[^\s,;:)]+/g, '[local path withheld]')
    .replace(/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, '[email withheld]')
    .replace(/\b(token|secret|password|api[_-]?key|key)=([^\s,;]+)/gi, '$1=[redacted]')
    .slice(0, 180)
}

function relatedNoteTitles(entry: VaultEntry, entries: VaultEntry[]): string[] {
  const targets = new Set([
    ...entry.outgoingLinks.map(normalizeTarget),
    ...entry.belongsTo.map(normalizeTarget),
    ...entry.relatedTo.map(normalizeTarget),
  ])

  return entries
    .filter((candidate) => candidate.path !== entry.path)
    .filter((candidate) => !resolveEntryLocalityPolicy(candidate).localOnly)
    .filter((candidate) => targets.has(normalizeTarget(candidate.title)) || targets.has(normalizeTarget(candidate.path)))
    .map((candidate) => candidate.title)
    .slice(0, 6)
}

function visibleOutgoingLinks(entry: VaultEntry, entries: VaultEntry[]): string[] {
  return entry.outgoingLinks.filter((target) => {
    const normalizedTarget = normalizeTarget(target)
    const candidate = entries.find((entryCandidate) =>
      normalizeTarget(entryCandidate.title) === normalizedTarget
        || normalizeTarget(entryCandidate.path) === normalizedTarget
    )
    return !!candidate && !resolveEntryLocalityPolicy(candidate).localOnly
  })
}

function protectedLocality(locality: EntryLocalityPolicy): EntryLocalityPolicy {
  return {
    localOnly: true,
    source: 'none',
    reason: 'Local-only marker present',
    badgeLabel: locality.badgeLabel,
  }
}

function normalizeTarget(value: string): string {
  return value
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .replace(/\.md$/i, '')
    .split('|')[0]
    .trim()
    .toLowerCase()
}
