import type { createTranslator } from '../lib/i18n'
import {
  objectStorageFailureStateCoverage,
  objectStorageFailureStateSummary,
  type ObjectStorageFailureStateKind,
} from '../lib/objectStorageFailureStateMatrix'
import type { ObjectStorageLiveProofReport, ObjectStorageLiveProofProviderId } from '../lib/objectStorageLiveProofReport'

type Translate = ReturnType<typeof createTranslator>

interface PortabilityProviderFailureMatrixProps {
  report?: ObjectStorageLiveProofReport | null
  reports?: readonly ObjectStorageLiveProofReport[]
  t: Translate
}

/** Shows which real provider pass/failure states have actually been recorded. */
export function PortabilityProviderFailureMatrix({ report, reports, t }: PortabilityProviderFailureMatrixProps) {
  const coverage = objectStorageFailureStateCoverage(reports?.length ? reports : report)
  const summary = objectStorageFailureStateSummary(coverage)

  return (
    <div
      aria-label={t('settings.portability.providerFailureMatrixAria')}
      className="grimoire-preview-stat grid gap-1 rounded-md border border-border/70 px-2 py-1.5"
      data-testid="portability-provider-failure-matrix"
    >
      <div className="flex min-w-0 flex-wrap items-center gap-1.5">
        <span className="text-[11px] font-semibold text-foreground">
          {t('settings.portability.providerFailureMatrixTitle')}
        </span>
        <span className="settings-proof-chip rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {t('settings.portability.providerFailureMatrixSummary', {
            recorded: summary.recorded,
            total: summary.total,
          })}
        </span>
      </div>
      <p className="m-0 text-[10px] leading-snug text-muted-foreground">
        {t('settings.portability.providerFailureMatrixDetail')}
      </p>
      <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
        {coverage.map(item => (
          <span
            className="settings-proof-chip flex min-w-0 items-center justify-between gap-1 rounded border border-border px-1.5 py-0.5 text-[10px]"
            data-provider={item.providerId}
            data-state={item.recorded ? 'recorded' : 'needed'}
            data-testid={`portability-provider-failure-${item.id}`}
            key={item.id}
          >
            <span className="min-w-0 truncate text-foreground">
              {providerLabel(item.providerId)} · {failureKindLabel(item.kind, t)}
            </span>
            <span className="shrink-0 text-muted-foreground">
              {item.recorded
                ? t('settings.portability.providerFailureMatrixRecorded')
                : t('settings.portability.providerFailureMatrixNeeded')}
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}

function providerLabel(providerId: ObjectStorageLiveProofProviderId): string {
  return providerId === 's3' ? 'S3' : 'Azure'
}

function failureKindLabel(kind: ObjectStorageFailureStateKind, t: Translate): string {
  if (kind === 'passed') return t('settings.portability.providerFailureMatrixPassed')
  if (kind === 'config') return t('settings.portability.providerFailureMatrixConfig')
  if (kind === 'auth') return t('settings.portability.providerFailureMatrixAuth')
  if (kind === 'permission') return t('settings.portability.providerFailureMatrixPermission')
  if (kind === 'conflict') return t('settings.portability.providerFailureMatrixConflict')
  if (kind === 'network') return t('settings.portability.providerFailureMatrixNetwork')
  return t('settings.portability.providerFailureMatrixCleanup')
}
