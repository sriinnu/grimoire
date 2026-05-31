import { Badge } from './ui/badge'
import type { createTranslator } from '../lib/i18n'
import type {
  ObjectStorageSyncOperationKind,
  ObjectStorageSyncReport,
} from '../utils/objectStorageSync'

type ObjectStoragePreviewTarget = 'mirror' | 'provider'
type Translate = ReturnType<typeof createTranslator>

/** Renders a redacted object-storage preview without leaking local absolute paths. */
export function ObjectStoragePreviewCard({
  report,
  t,
  target,
}: {
  report?: ObjectStorageSyncReport
  t: Translate
  target: ObjectStoragePreviewTarget
}) {
  if (!report) return null

  const providerTarget = target === 'provider' || report.adapter_phase === 'provider-sdk-adapter'
  const providerName = providerLabel(report.provider_id)
  const targetLabel = providerTarget ? providerTargetLabel(report.provider_id, t) : t('settings.portability.objectStorageLocalMirrorFixture')
  const testId = `object-storage-${report.provider_id}-${providerTarget ? 'provider' : 'mirror'}-${report.direction}-preview`

  return (
    <div
      className="grimoire-object-storage-preview grid gap-2 rounded-md border border-border p-2"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="rounded-md">{t('settings.portability.objectStoragePreviewReady')}</Badge>
        <Badge variant="outline" className="rounded-md">{targetLabel}</Badge>
        <span className="text-xs font-semibold text-foreground">
          {providerName} {directionLabel(report.direction, t)}: {compactPath(report.mirror_path, t)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] sm:grid-cols-5">
        <PreviewStat label={t('settings.portability.objectStorageUpload')} value={report.files_to_upload} />
        <PreviewStat label={t('settings.portability.objectStorageDownload')} value={report.files_to_download} />
        <PreviewStat label={t('settings.portability.objectStorageRemoteDelete')} value={report.files_to_delete} />
        <PreviewStat label={t('settings.portability.objectStorageConflicts')} value={report.conflicts} tone={report.conflicts > 0 ? 'warn' : 'default'} />
        <PreviewStat label={t('settings.portability.objectStorageLocalOnly')} value={report.excluded_files} tone="safe" />
      </div>
      <OperationSummary report={report} kind="conflict" label={t('settings.portability.objectStorageConflicts')} t={t} />
      <OperationSummary report={report} kind="exclude" label={t('settings.portability.objectStorageLocalOnlyWithheld')} t={t} />
      <div className="text-[11px] leading-snug text-muted-foreground">
        {providerTarget
          ? t('settings.portability.objectStorageApplyProviderLock', { direction: directionLabel(report.direction, t) })
          : t('settings.portability.objectStorageApplyMirrorLock', { direction: directionLabel(report.direction, t) })}
      </div>
    </div>
  )
}

function PreviewStat({
  label,
  value,
  tone = 'default',
}: { label: string; value: number; tone?: 'default' | 'safe' | 'warn' }) {
  return (
    <span className="grimoire-preview-stat rounded border border-border px-2 py-1" data-tone={tone}>
      <span className="block text-muted-foreground">{label}</span>
      <span className="grimoire-preview-stat__value font-semibold">{value}</span>
    </span>
  )
}

function OperationSummary({
  report,
  kind,
  label,
  t,
}: { report: ObjectStorageSyncReport; kind: ObjectStorageSyncOperationKind; label: string; t: Translate }) {
  const operations = report.operations.filter(operation => operation.kind === kind)
  if (operations.length === 0) return null

  return (
    <div className="text-[11px] leading-snug text-muted-foreground">
      <span className="font-semibold text-foreground">{label}: </span>
      {operations.slice(0, 3).map(operation => operationSummaryLabel(operation, t)).join(', ')}
      {operations.length > 3 ? ` ${t('settings.portability.objectStorageMoreOperations', { count: operations.length - 3 })}` : ''}
    </div>
  )
}

function operationSummaryLabel(operation: ObjectStorageSyncReport['operations'][number], t: Translate): string {
  return `${compactPath(operation.path, t)} (${operation.reason})`
}

function compactPath(path: string, t: Translate): string {
  if (/^(s3|azblob):\/\//iu.test(path)) return t('settings.portability.objectStorageRedactedProviderTarget')
  const parts = path.split(/[\\/]/u).filter(Boolean)
  if (path.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(path)) {
    return parts.at(-1) ?? t('settings.portability.objectStorageSelectedFolder')
  }
  return parts.join('/') || t('settings.portability.objectStorageSelectedFolder')
}

function providerLabel(providerId: ObjectStorageSyncReport['provider_id']): string {
  return providerId === 's3' ? 'S3' : 'Azure Blob'
}

function providerTargetLabel(providerId: ObjectStorageSyncReport['provider_id'], t: Translate): string {
  return providerId === 's3'
    ? t('settings.portability.objectStorageS3ProviderPreview')
    : t('settings.portability.objectStorageAzureProviderPreview')
}

function directionLabel(direction: ObjectStorageSyncReport['direction'], t: Translate): string {
  return t(direction === 'push'
    ? 'settings.portability.objectStorageDirectionPush'
    : 'settings.portability.objectStorageDirectionPull')
}
