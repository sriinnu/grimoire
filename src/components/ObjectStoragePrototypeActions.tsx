import { Cloud, DownloadSimple, UploadSimple } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { createTranslator } from '../lib/i18n'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import type { ObjectStorageSyncOperationKind, ObjectStorageSyncReport } from '../utils/objectStorageSync'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

type Translate = ReturnType<typeof createTranslator>

interface ObjectStoragePrototypeActionsProps {
  t: Translate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  s3MirrorPreviewReady?: boolean
  s3MirrorPullPreviewReady?: boolean
  azureMirrorPreviewReady?: boolean
  azureMirrorPullPreviewReady?: boolean
  s3MirrorPreviewReport?: ObjectStorageSyncReport
  s3MirrorPullPreviewReport?: ObjectStorageSyncReport
  azureMirrorPreviewReport?: ObjectStorageSyncReport
  azureMirrorPullPreviewReport?: ObjectStorageSyncReport
  onPreviewS3MirrorPush?: () => void
  onApplyS3MirrorPush?: () => void
  onPreviewS3MirrorPull?: () => void
  onApplyS3MirrorPull?: () => void
  onPreviewAzureMirrorPush?: () => void
  onApplyAzureMirrorPush?: () => void
  onPreviewAzureMirrorPull?: () => void
  onApplyAzureMirrorPull?: () => void
}

interface PrototypeButton {
  label: string
  busyLabel: string
  actionId: VaultPortabilityActionId
  icon: ReactNode
  onClick?: () => void
  enabled?: boolean
}

/** Renders the local-mirror object-storage prototype actions without claiming cloud sync readiness. */
export function ObjectStoragePrototypeActions({
  t,
  vaultReady,
  busyAction,
  s3MirrorPreviewReady = false,
  s3MirrorPullPreviewReady = false,
  azureMirrorPreviewReady = false,
  azureMirrorPullPreviewReady = false,
  s3MirrorPreviewReport,
  s3MirrorPullPreviewReport,
  azureMirrorPreviewReport,
  azureMirrorPullPreviewReport,
  onPreviewS3MirrorPush,
  onApplyS3MirrorPush,
  onPreviewS3MirrorPull,
  onApplyS3MirrorPull,
  onPreviewAzureMirrorPush,
  onApplyAzureMirrorPush,
  onPreviewAzureMirrorPull,
  onApplyAzureMirrorPull,
}: ObjectStoragePrototypeActionsProps) {
  const buttons: PrototypeButton[] = [
    {
      label: t('settings.portability.previewS3Mirror'),
      busyLabel: t('settings.portability.previewingStorage'),
      actionId: 'storage-s3-preview',
      icon: <Cloud size={14} />,
      onClick: onPreviewS3MirrorPush,
    },
    {
      label: t('settings.portability.applyS3Mirror'),
      busyLabel: t('settings.portability.applyingStorage'),
      actionId: 'storage-s3-apply',
      icon: <UploadSimple size={14} />,
      onClick: onApplyS3MirrorPush,
      enabled: s3MirrorPreviewReady,
    },
    {
      label: t('settings.portability.previewS3MirrorPull'),
      busyLabel: t('settings.portability.previewingStorage'),
      actionId: 'storage-s3-pull-preview',
      icon: <Cloud size={14} />,
      onClick: onPreviewS3MirrorPull,
    },
    {
      label: t('settings.portability.applyS3MirrorPull'),
      busyLabel: t('settings.portability.applyingStorage'),
      actionId: 'storage-s3-pull-apply',
      icon: <DownloadSimple size={14} />,
      onClick: onApplyS3MirrorPull,
      enabled: s3MirrorPullPreviewReady,
    },
    {
      label: t('settings.portability.previewAzureMirror'),
      busyLabel: t('settings.portability.previewingStorage'),
      actionId: 'storage-azure-preview',
      icon: <Cloud size={14} />,
      onClick: onPreviewAzureMirrorPush,
    },
    {
      label: t('settings.portability.applyAzureMirror'),
      busyLabel: t('settings.portability.applyingStorage'),
      actionId: 'storage-azure-apply',
      icon: <UploadSimple size={14} />,
      onClick: onApplyAzureMirrorPush,
      enabled: azureMirrorPreviewReady,
    },
    {
      label: t('settings.portability.previewAzureMirrorPull'),
      busyLabel: t('settings.portability.previewingStorage'),
      actionId: 'storage-azure-pull-preview',
      icon: <Cloud size={14} />,
      onClick: onPreviewAzureMirrorPull,
    },
    {
      label: t('settings.portability.applyAzureMirrorPull'),
      busyLabel: t('settings.portability.applyingStorage'),
      actionId: 'storage-azure-pull-apply',
      icon: <DownloadSimple size={14} />,
      onClick: onApplyAzureMirrorPull,
      enabled: azureMirrorPullPreviewReady,
    },
  ]

  return (
    <div className="rounded-md border border-dashed border-border bg-muted/20 p-3" data-testid="object-storage-prototype-actions">
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-0.5 text-muted-foreground"><Cloud size={15} /></span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">
            {t('settings.portability.objectStoragePrototype')}
          </span>
          <span className="block text-[11px] leading-snug text-muted-foreground">
            {t('settings.portability.objectStoragePrototypeDescription')}
          </span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2">
        {buttons.map((button) => (
          <Button
            key={button.actionId}
            type="button"
            variant="outline"
            size="sm"
            data-testid={`settings-${button.actionId}`}
            disabled={Boolean(busyAction) || !vaultReady || !button.onClick || button.enabled === false}
            onClick={button.onClick}
          >
            {button.icon}
            {busyAction === button.actionId ? button.busyLabel : button.label}
          </Button>
        ))}
      </div>
      <div className="mt-3 grid gap-2">
        <ObjectStoragePreviewCard report={s3MirrorPreviewReport} />
        <ObjectStoragePreviewCard report={s3MirrorPullPreviewReport} />
        <ObjectStoragePreviewCard report={azureMirrorPreviewReport} />
        <ObjectStoragePreviewCard report={azureMirrorPullPreviewReport} />
      </div>
    </div>
  )
}

function ObjectStoragePreviewCard({ report }: { report?: ObjectStorageSyncReport }) {
  if (!report) return null

  return (
    <div
      className="grid gap-2 rounded-md border border-border bg-background/70 p-2"
      data-testid={`object-storage-${report.provider_id}-${report.direction}-preview`}
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="rounded-md">Preview ready</Badge>
        <span className="text-xs font-semibold text-foreground">
          {providerLabel(report.provider_id)} {report.direction}: {compactPath(report.mirror_path)}
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
        Apply is locked to this exact {report.direction} preview; changed files require another dry run.
      </div>
    </div>
  )
}

function PreviewStat({
  label,
  value,
  tone = 'default',
}: { label: string; value: number; tone?: 'default' | 'safe' | 'warn' }) {
  const toneClass = tone === 'warn' ? 'text-amber-600' : tone === 'safe' ? 'text-emerald-600' : 'text-foreground'
  return (
    <span className="rounded border border-border bg-muted/30 px-2 py-1">
      <span className="block text-muted-foreground">{label}</span>
      <span className={`font-semibold ${toneClass}`}>{value}</span>
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
      {operations.slice(0, 3).map(operation => compactPath(operation.path)).join(', ')}
      {operations.length > 3 ? ` +${operations.length - 3} more` : ''}
    </div>
  )
}

function compactPath(path: string): string {
  const parts = path.split(/[\\/]/u).filter(Boolean)
  if (path.startsWith('/') || /^[A-Za-z]:[\\/]/u.test(path)) return parts.at(-1) ?? 'selected folder'
  return parts.join('/') || 'selected folder'
}

function providerLabel(providerId: ObjectStorageSyncReport['provider_id']): string {
  return providerId === 's3' ? 'S3' : 'Azure Blob'
}
