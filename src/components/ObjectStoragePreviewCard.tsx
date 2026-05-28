import { Badge } from './ui/badge'
import type {
  ObjectStorageSyncOperationKind,
  ObjectStorageSyncReport,
} from '../utils/objectStorageSync'

type ObjectStoragePreviewTarget = 'mirror' | 'provider'

/** Renders a redacted object-storage preview without leaking local absolute paths. */
export function ObjectStoragePreviewCard({
  report,
  target,
}: {
  report?: ObjectStorageSyncReport
  target: ObjectStoragePreviewTarget
}) {
  if (!report) return null

  const providerTarget = target === 'provider' || report.adapter_phase === 'provider-sdk-adapter'
  const providerName = providerLabel(report.provider_id)
  const targetLabel = providerTarget ? providerTargetLabel(report.provider_id) : 'Local mirror fixture'
  const testId = `object-storage-${report.provider_id}-${providerTarget ? 'provider' : 'mirror'}-${report.direction}-preview`

  return (
    <div
      className="grimoire-object-storage-preview grid gap-2 rounded-md border border-border bg-background/70 p-2"
      data-testid={testId}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="rounded-md">Preview ready</Badge>
        <Badge variant="outline" className="rounded-md">{targetLabel}</Badge>
        <span className="text-xs font-semibold text-foreground">
          {providerName} {report.direction}: {compactPath(report.mirror_path)}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-1 text-[11px] sm:grid-cols-5">
        <PreviewStat label="Upload" value={report.files_to_upload} />
        <PreviewStat label="Download" value={report.files_to_download} />
        <PreviewStat label="Remote delete" value={report.files_to_delete} />
        <PreviewStat label="Conflicts" value={report.conflicts} tone={report.conflicts > 0 ? 'warn' : 'default'} />
        <PreviewStat label="Local-only" value={report.excluded_files} tone="safe" />
      </div>
      <OperationSummary report={report} kind="conflict" label="Conflicts" />
      <OperationSummary report={report} kind="exclude" label="Local-only withheld" />
      <div className="text-[11px] leading-snug text-muted-foreground">
        {providerTarget
          ? `Apply is locked to this exact ${report.direction} provider preview; changed target fields require another dry run. Local-only files stay withheld.`
          : `Apply is locked to this exact ${report.direction} preview; changed files require another dry run. This is not live cloud sync yet.`}
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
    <span className="grimoire-preview-stat rounded border border-border bg-muted/30 px-2 py-1" data-tone={tone}>
      <span className="block text-muted-foreground">{label}</span>
      <span className="grimoire-preview-stat__value font-semibold">{value}</span>
    </span>
  )
}

function OperationSummary({
  report,
  kind,
  label,
}: { report: ObjectStorageSyncReport; kind: ObjectStorageSyncOperationKind; label: string }) {
  const operations = report.operations.filter(operation => operation.kind === kind)
  if (operations.length === 0) return null

  return (
    <div className="text-[11px] leading-snug text-muted-foreground">
      <span className="font-semibold text-foreground">{label}: </span>
      {operations.slice(0, 3).map(operation => operationSummaryLabel(operation)).join(', ')}
      {operations.length > 3 ? ` +${operations.length - 3} more` : ''}
    </div>
  )
}

function operationSummaryLabel(operation: ObjectStorageSyncReport['operations'][number]): string {
  return `${compactPath(operation.path)} (${operation.reason})`
}

function compactPath(path: string): string {
  if (path.startsWith('s3://') || path.startsWith('azblob://')) return path
  const parts = path.split(/[\\/]/u).filter(Boolean)
  if (path.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(path)) return parts.at(-1) ?? 'selected folder'
  return parts.join('/') || 'selected folder'
}

function providerLabel(providerId: ObjectStorageSyncReport['provider_id']): string {
  return providerId === 's3' ? 'S3' : 'Azure Blob'
}

function providerTargetLabel(providerId: ObjectStorageSyncReport['provider_id']): string {
  return providerId === 's3' ? 'S3 provider SDK' : 'Azure provider sync'
}
