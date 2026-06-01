import {
  parseObjectStorageLiveProofReport,
  parseObjectStorageLiveProofReports,
  type ObjectStorageLiveProofFailureKind,
  type ObjectStorageLiveProofProviderId,
  type ObjectStorageLiveProofProviderReport,
  type ObjectStorageLiveProofReport,
} from './objectStorageLiveProofReport'

export type ObjectStorageFailureStateKind =
  | 'auth'
  | 'cleanup'
  | 'config'
  | 'conflict'
  | 'network'
  | 'passed'
  | 'permission'

export interface ObjectStorageFailureStateCoverage {
  id: string
  kind: ObjectStorageFailureStateKind
  providerId: ObjectStorageLiveProofProviderId
  recorded: boolean
}

const FAILURE_STATE_KINDS: readonly ObjectStorageFailureStateKind[] = [
  'passed',
  'config',
  'auth',
  'permission',
  'conflict',
  'network',
  'cleanup',
]

const PROVIDERS: readonly ObjectStorageLiveProofProviderId[] = ['s3', 'azure']

/** Builds a redacted provider pass/failure-state coverage matrix for Settings. */
export function objectStorageFailureStateCoverage(
  report?: ObjectStorageLiveProofReport | readonly ObjectStorageLiveProofReport[] | null,
): readonly ObjectStorageFailureStateCoverage[] {
  const reports = Array.isArray(report)
    ? parseObjectStorageLiveProofReports(report)
    : compactReport(parseObjectStorageLiveProofReport(report))
  const providers = reports.flatMap(item => item.providers)

  return PROVIDERS.flatMap(providerId => FAILURE_STATE_KINDS.map(kind => ({
    id: `${providerId}-${kind}`,
    kind,
    providerId,
    recorded: hasRecordedState(providers, providerId, kind),
  })))
}

function compactReport(
  report: ObjectStorageLiveProofReport | null,
): readonly ObjectStorageLiveProofReport[] {
  return report ? [report] : []
}

/** Counts recorded and total provider failure-state requirements. */
export function objectStorageFailureStateSummary(
  coverage: readonly ObjectStorageFailureStateCoverage[],
): { recorded: number; total: number } {
  return {
    recorded: coverage.filter(item => item.recorded).length,
    total: coverage.length,
  }
}

function hasRecordedState(
  reports: readonly ObjectStorageLiveProofProviderReport[],
  providerId: ObjectStorageLiveProofProviderId,
  kind: ObjectStorageFailureStateKind,
): boolean {
  return reports
    .filter(report => report.id === providerId)
    .some(report => providerMatchesKind(report, kind))
}

function providerMatchesKind(
  report: ObjectStorageLiveProofProviderReport,
  kind: ObjectStorageFailureStateKind,
): boolean {
  if (kind === 'passed') return report.status === 'passed'
  return report.failure_kind === kind || inferredFailureKind(report) === kind
}

function inferredFailureKind(
  report: ObjectStorageLiveProofProviderReport,
): ObjectStorageLiveProofFailureKind {
  if (report.status === 'gate_missing' || report.status === 'missing_config') return 'config'
  return 'none'
}
