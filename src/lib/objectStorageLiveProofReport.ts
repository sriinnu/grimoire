import type { PortabilityLiveProof } from './portabilityProof'

export type ObjectStorageLiveProofProviderId = 'azure' | 's3'
export type ObjectStorageLiveProofFailureKind =
  | 'auth'
  | 'cleanup'
  | 'config'
  | 'conflict'
  | 'network'
  | 'none'
  | 'permission'
  | 'unknown'
export type ObjectStorageLiveProofFailureStage =
  | 'apply'
  | 'cleanup'
  | 'config'
  | 'gate'
  | 'none'
  | 'preview'
  | 'pull'
  | 'unknown'

export interface ObjectStorageLiveProofProviderReport {
  id: ObjectStorageLiveProofProviderId
  enabled: boolean
  failure_kind: ObjectStorageLiveProofFailureKind
  failure_stage: ObjectStorageLiveProofFailureStage
  gate: { name: string; state: 'missing' | 'set' }
  optional: Record<string, 'missing' | 'set'>
  required: Record<string, 'missing' | 'set'>
  status: 'failed' | 'gate_missing' | 'missing_config' | 'passed' | 'planned' | 'ready' | 'running'
}

/** Redacted report emitted by the opt-in S3/Azure provider proof runner. */
export interface ObjectStorageLiveProofReport {
  schema: 'grimoire-object-storage-live-proof-v1'
  finished_at: string | null
  generated_at: string
  provider_filter: 'all' | ObjectStorageLiveProofProviderId
  providers: readonly ObjectStorageLiveProofProviderReport[]
  summary: { status: 'dry_run' | 'failed' | 'passed' | 'planned' | 'skipped'; message: string }
}

export interface ObjectStorageLiveProofReportHistory {
  schema: 'grimoire-object-storage-live-proof-history-v1'
  reports: readonly ObjectStorageLiveProofReport[]
}

const MAX_PROOF_REPORT_HISTORY = 24

/** Parses the proof-runner JSON report while discarding arbitrary text and provider targets. */
export function parseObjectStorageLiveProofReport(input: string | unknown): ObjectStorageLiveProofReport | null {
  const raw = typeof input === 'string' ? parseJsonObject(input) : input
  if (!isRecord(raw) || raw.schema !== 'grimoire-object-storage-live-proof-v1') return null

  const providers = Array.isArray(raw.providers)
    ? raw.providers.map(parseObjectStorageProviderReport).filter(isObjectStorageProviderReport)
    : []
  const providerFilter = raw.provider_filter === 's3' || raw.provider_filter === 'azure'
    ? raw.provider_filter
    : 'all'

  return {
    schema: 'grimoire-object-storage-live-proof-v1',
    finished_at: timestampOrNull(raw.finished_at),
    generated_at: timestampValue(raw.generated_at),
    provider_filter: providerFilter,
    providers,
    summary: {
      status: summaryStatus(isRecord(raw.summary) ? raw.summary.status : null),
      message: 'Redacted provider proof report loaded.',
    },
  }
}

/** Parses a redacted proof-report history, accepting older single-report storage too. */
export function parseObjectStorageLiveProofReports(input: string | unknown): readonly ObjectStorageLiveProofReport[] {
  const raw = typeof input === 'string' ? parseJsonObject(input) : input
  if (Array.isArray(raw)) return raw.map(parseObjectStorageLiveProofReport).filter(isObjectStorageLiveProofReport)

  const singleReport = parseObjectStorageLiveProofReport(raw)
  if (singleReport) return [singleReport]

  if (!isRecord(raw) || raw.schema !== 'grimoire-object-storage-live-proof-history-v1' || !Array.isArray(raw.reports)) {
    return []
  }
  return raw.reports.map(parseObjectStorageLiveProofReport).filter(isObjectStorageLiveProofReport)
}

/** Appends one sanitized report to the local proof history without retaining raw provider output. */
export function appendObjectStorageLiveProofReport(
  currentHistory: string | ObjectStorageLiveProofReportHistory | readonly ObjectStorageLiveProofReport[] | null,
  nextReport: ObjectStorageLiveProofReport,
): ObjectStorageLiveProofReportHistory {
  const sanitized = parseObjectStorageLiveProofReport(nextReport)
  const reports = sanitized ? [...parseObjectStorageLiveProofReports(currentHistory), sanitized] : parseObjectStorageLiveProofReports(currentHistory)
  return {
    schema: 'grimoire-object-storage-live-proof-history-v1',
    reports: dedupeProofReports(reports).slice(-MAX_PROOF_REPORT_HISTORY),
  }
}

/** Builds Settings-safe proof cards from a sanitized object-storage report. */
export function objectStorageReportProofs(
  report?: ObjectStorageLiveProofReport | null,
): readonly PortabilityLiveProof[] {
  const parsed = parseObjectStorageLiveProofReport(report)
  if (!parsed) return []

  return [
    {
      id: 'provider-report-summary',
      label: 'Latest proof report',
      status: proofStatusLabel(parsed.summary.status),
      detail: [
        `scope ${parsed.provider_filter}`,
        proofStatusCounts(parsed.providers),
        `generated ${proofTimestamp(parsed.generated_at)}`,
        `finished ${parsed.finished_at ? proofTimestamp(parsed.finished_at) : 'not-finished'}`,
      ].join('; '),
    },
    ...parsed.providers.map(providerReportProof),
  ]
}

function providerReportProof(provider: ObjectStorageLiveProofProviderReport): PortabilityLiveProof {
  const label = provider.id === 's3' ? 'S3 provider proof' : 'Azure provider proof'
  return {
    id: provider.id === 's3' ? 's3-provider-proof' : 'azure-provider-proof',
    label,
    status: proofStatusLabel(provider.status),
    detail: [
      `gate ${provider.gate.state}`,
      `${setCount(provider.required)}/${Object.keys(provider.required).length} required set`,
      `${setCount(provider.optional)}/${Object.keys(provider.optional).length} optional set`,
      providerStatusDetail(provider.status),
      ...providerFailureDetails(provider),
    ].join('; '),
  }
}

function parseJsonObject(input: string): unknown {
  try {
    return JSON.parse(input)
  } catch {
    return null
  }
}

function parseObjectStorageProviderReport(input: unknown): ObjectStorageLiveProofProviderReport | null {
  if (!isRecord(input) || (input.id !== 's3' && input.id !== 'azure')) return null
  const gate = isRecord(input.gate) ? input.gate : {}
  const status = providerStatus(input.status)
  const failure = providerFailure(input, status)
  return {
    id: input.id,
    enabled: input.enabled === true,
    gate: {
      name: envName(gate.name),
      state: envState(gate.state),
    },
    optional: envStateRecord(input.optional),
    required: envStateRecord(input.required),
    status,
    failure_kind: failure.kind,
    failure_stage: failure.stage,
  }
}

function isObjectStorageProviderReport(
  report: ObjectStorageLiveProofProviderReport | null,
): report is ObjectStorageLiveProofProviderReport {
  return report !== null
}

function isObjectStorageLiveProofReport(
  report: ObjectStorageLiveProofReport | null,
): report is ObjectStorageLiveProofReport {
  return report !== null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function dedupeProofReports(
  reports: readonly ObjectStorageLiveProofReport[],
): readonly ObjectStorageLiveProofReport[] {
  const seen = new Set<string>()
  return reports.filter((report) => {
    const fingerprint = JSON.stringify(report)
    if (seen.has(fingerprint)) return false
    seen.add(fingerprint)
    return true
  })
}

function stringValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function timestampValue(value: unknown): string {
  return proofTimestamp(stringValue(value))
}

function timestampOrNull(value: unknown): string | null {
  return typeof value === 'string' ? proofTimestamp(value) : null
}

function envStateRecord(value: unknown): Record<string, 'missing' | 'set'> {
  if (!isRecord(value)) return {}
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => /^GRIMOIRE_[A-Z0-9_]+$/.test(key))
      .map(([key, state]) => [key, envState(state)]),
  )
}

function envName(value: unknown): string {
  const candidate = stringValue(value)
  return /^GRIMOIRE_[A-Z0-9_]+$/.test(candidate) ? candidate : 'GRIMOIRE_PROVIDER_GATE'
}

function envState(value: unknown): 'missing' | 'set' {
  return value === 'set' ? 'set' : 'missing'
}

function providerStatus(value: unknown): ObjectStorageLiveProofProviderReport['status'] {
  if (
    value === 'failed'
    || value === 'gate_missing'
    || value === 'missing_config'
    || value === 'passed'
    || value === 'ready'
    || value === 'running'
  ) {
    return value
  }
  return 'planned'
}

function failureKind(value: unknown): ObjectStorageLiveProofFailureKind {
  if (
    value === 'auth'
    || value === 'cleanup'
    || value === 'config'
    || value === 'conflict'
    || value === 'network'
    || value === 'none'
    || value === 'permission'
    || value === 'unknown'
  ) {
    return value
  }
  return 'none'
}

function failureStage(value: unknown): ObjectStorageLiveProofFailureStage {
  if (
    value === 'apply'
    || value === 'cleanup'
    || value === 'config'
    || value === 'gate'
    || value === 'none'
    || value === 'preview'
    || value === 'pull'
    || value === 'unknown'
  ) {
    return value
  }
  return 'none'
}

function providerFailure(
  input: Record<string, unknown>,
  status: ObjectStorageLiveProofProviderReport['status'],
): { kind: ObjectStorageLiveProofFailureKind; stage: ObjectStorageLiveProofFailureStage } {
  const explicitKind = failureKind(input.failure_kind)
  const explicitStage = failureStage(input.failure_stage)
  if (explicitKind !== 'none' || explicitStage !== 'none') {
    return {
      kind: explicitKind === 'none' ? 'unknown' : explicitKind,
      stage: explicitStage === 'none' ? 'unknown' : explicitStage,
    }
  }
  if (status === 'gate_missing') return { kind: 'config', stage: 'gate' }
  if (status === 'missing_config') return { kind: 'config', stage: 'config' }
  if (status === 'failed') return { kind: 'unknown', stage: 'unknown' }
  return { kind: 'none', stage: 'none' }
}

function summaryStatus(value: unknown): ObjectStorageLiveProofReport['summary']['status'] {
  if (value === 'dry_run' || value === 'failed' || value === 'passed' || value === 'skipped') return value
  return 'planned'
}

function proofStatusLabel(status: string): string {
  return status.replace(/[^a-z0-9_-]/gi, '').replaceAll('_', ' ')
}

function proofTimestamp(value: string): string {
  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(trimmed) ? trimmed : 'redacted-time'
}

function proofStatusCounts(providers: readonly ObjectStorageLiveProofProviderReport[]): string {
  if (providers.length === 0) return 'no providers recorded'
  const counts = providers.reduce<Record<string, number>>((accumulator, provider) => {
    accumulator[provider.status] = (accumulator[provider.status] ?? 0) + 1
    return accumulator
  }, {})
  return Object.entries(counts)
    .map(([status, count]) => `${count} ${proofStatusLabel(status)}`)
    .join(', ')
}

function setCount(states: Record<string, 'missing' | 'set'>): number {
  return Object.values(states).filter(state => state === 'set').length
}

function providerStatusDetail(status: ObjectStorageLiveProofProviderReport['status']): string {
  if (status === 'passed') return 'preview/apply/pull proof passed'
  if (status === 'failed') return 'provider proof failed'
  if (status === 'missing_config') return 'missing config recorded'
  if (status === 'gate_missing') return 'proof gate missing'
  if (status === 'ready') return 'ready to run'
  if (status === 'running') return 'proof was running'
  return 'not run yet'
}

function providerFailureDetails(provider: ObjectStorageLiveProofProviderReport): string[] {
  if (provider.failure_kind === 'none' && provider.failure_stage === 'none') return []
  return [`failure ${provider.failure_kind} at ${provider.failure_stage}`]
}
