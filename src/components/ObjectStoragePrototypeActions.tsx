import { Cloud, CloudCheck, DownloadSimple, UploadSimple } from '@phosphor-icons/react'
import { useMemo, useState } from 'react'
import type { createTranslator } from '../lib/i18n'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import {
  type ObjectStorageSyncReport,
  type S3LivePreflightArgs,
  type S3LivePreflightReport,
} from '../utils/objectStorageSync'
import type { AzureLivePreflightArgs, AzureLivePreflightReport } from '../utils/objectStorageLivePreflight'
import {
  cleanAzurePreflightArgs,
  cleanS3PreflightArgs,
  EMPTY_AZURE_PREFLIGHT_DRAFT,
  EMPTY_S3_PREFLIGHT_DRAFT,
  type AzurePreflightDraft,
  type S3PreflightDraft,
} from './ObjectStorageLivePreflightDrafts'
import {
  AzureLivePreflightCard,
  AzureLivePreflightControls,
  S3LivePreflightCard,
  S3LivePreflightControls,
} from './ObjectStorageLivePreflightPanels'
import {
  ProviderPanel,
  PrototypeButtons,
  ProviderToggle,
  StorageActionGroup,
  type ObjectStoragePrototypeButton,
  type ObjectStorageProvider,
} from './ObjectStorageProviderPanel'
import { ObjectStoragePreviewCard } from './ObjectStoragePreviewCard'
import { inferActiveObjectStorageProvider } from './objectStorageProviderState'

type Translate = ReturnType<typeof createTranslator>

interface ObjectStoragePrototypeActionsProps {
  t: Translate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  s3MirrorPreviewReady?: boolean
  s3MirrorPullPreviewReady?: boolean
  s3ProviderPushPreviewReady?: boolean
  s3ProviderPullPreviewReady?: boolean
  azureProviderPushPreviewReady?: boolean
  azureProviderPullPreviewReady?: boolean
  azureMirrorPreviewReady?: boolean
  azureMirrorPullPreviewReady?: boolean
  s3MirrorPreviewReport?: ObjectStorageSyncReport
  s3MirrorPullPreviewReport?: ObjectStorageSyncReport
  s3ProviderPushPreviewReport?: ObjectStorageSyncReport
  s3ProviderPullPreviewReport?: ObjectStorageSyncReport
  s3ProviderPushPreviewArgs?: S3LivePreflightArgs
  s3ProviderPullPreviewArgs?: S3LivePreflightArgs
  azureProviderPushPreviewReport?: ObjectStorageSyncReport
  azureProviderPullPreviewReport?: ObjectStorageSyncReport
  azureProviderPushPreviewArgs?: AzureLivePreflightArgs
  azureProviderPullPreviewArgs?: AzureLivePreflightArgs
  azureMirrorPreviewReport?: ObjectStorageSyncReport
  azureMirrorPullPreviewReport?: ObjectStorageSyncReport
  s3LivePreflightReport?: S3LivePreflightReport
  azureLivePreflightReport?: AzureLivePreflightReport
  onRunS3LivePreflight?: (args: S3LivePreflightArgs) => void
  onRunAzureLivePreflight?: (args: AzureLivePreflightArgs) => void
  onPreviewS3MirrorPush?: () => void
  onApplyS3MirrorPush?: () => void
  onPreviewS3MirrorPull?: () => void
  onApplyS3MirrorPull?: () => void
  onPreviewS3ProviderPush?: (args: S3LivePreflightArgs) => void
  onApplyS3ProviderPush?: (args: S3LivePreflightArgs) => void
  onPreviewS3ProviderPull?: (args: S3LivePreflightArgs) => void
  onApplyS3ProviderPull?: (args: S3LivePreflightArgs) => void
  onPreviewAzureProviderPush?: (args: AzureLivePreflightArgs) => void
  onApplyAzureProviderPush?: (args: AzureLivePreflightArgs) => void
  onPreviewAzureProviderPull?: (args: AzureLivePreflightArgs) => void
  onApplyAzureProviderPull?: (args: AzureLivePreflightArgs) => void
  onPreviewAzureMirrorPush?: () => void
  onApplyAzureMirrorPush?: () => void
  onPreviewAzureMirrorPull?: () => void
  onApplyAzureMirrorPull?: () => void
}

/** Renders the local-mirror object-storage prototype actions without claiming cloud sync readiness. */
export function ObjectStoragePrototypeActions({
  t,
  vaultReady,
  busyAction,
  s3MirrorPreviewReady = false,
  s3MirrorPullPreviewReady = false,
  s3ProviderPushPreviewReady = false,
  s3ProviderPullPreviewReady = false,
  azureProviderPushPreviewReady = false,
  azureProviderPullPreviewReady = false,
  azureMirrorPreviewReady = false,
  azureMirrorPullPreviewReady = false,
  s3MirrorPreviewReport,
  s3MirrorPullPreviewReport,
  s3ProviderPushPreviewReport,
  s3ProviderPullPreviewReport,
  s3ProviderPushPreviewArgs,
  s3ProviderPullPreviewArgs,
  azureProviderPushPreviewReport,
  azureProviderPullPreviewReport,
  azureProviderPushPreviewArgs,
  azureProviderPullPreviewArgs,
  azureMirrorPreviewReport,
  azureMirrorPullPreviewReport,
  s3LivePreflightReport,
  azureLivePreflightReport,
  onRunS3LivePreflight,
  onRunAzureLivePreflight,
  onPreviewS3MirrorPush,
  onApplyS3MirrorPush,
  onPreviewS3MirrorPull,
  onApplyS3MirrorPull,
  onPreviewS3ProviderPush,
  onApplyS3ProviderPush,
  onPreviewS3ProviderPull,
  onApplyS3ProviderPull,
  onPreviewAzureProviderPush,
  onApplyAzureProviderPush,
  onPreviewAzureProviderPull,
  onApplyAzureProviderPull,
  onPreviewAzureMirrorPush,
  onApplyAzureMirrorPush,
  onPreviewAzureMirrorPull,
  onApplyAzureMirrorPull,
}: ObjectStoragePrototypeActionsProps) {
  const [s3PreflightDraft, setS3PreflightDraft] = useState<S3PreflightDraft>(EMPTY_S3_PREFLIGHT_DRAFT)
  const [azurePreflightDraft, setAzurePreflightDraft] = useState<AzurePreflightDraft>(EMPTY_AZURE_PREFLIGHT_DRAFT)
  const [expandedProvider, setExpandedProvider] = useState<ObjectStorageProvider | null>(null)
  const s3PreflightArgs = useMemo(() => cleanS3PreflightArgs(s3PreflightDraft), [s3PreflightDraft])
  const azurePreflightArgs = useMemo(() => cleanAzurePreflightArgs(azurePreflightDraft), [azurePreflightDraft])
  const activeProvider = expandedProvider ?? inferActiveObjectStorageProvider({
    busyAction,
    s3LivePreflightReport,
    azureLivePreflightReport,
    s3MirrorPreviewReport,
    s3MirrorPullPreviewReport,
    s3ProviderPushPreviewReport,
    s3ProviderPullPreviewReport,
    azureProviderPushPreviewReport,
    azureProviderPullPreviewReport,
    azureMirrorPreviewReport,
    azureMirrorPullPreviewReport,
  })
  const s3ProviderPushCanApply = s3ProviderPushPreviewReady && sameS3ProviderArgs(s3PreflightArgs, s3ProviderPushPreviewArgs)
  const s3ProviderPullCanApply = s3ProviderPullPreviewReady && sameS3ProviderArgs(s3PreflightArgs, s3ProviderPullPreviewArgs)
  const azureProviderPushCanApply = azureProviderPushPreviewReady && sameAzureProviderArgs(azurePreflightArgs, azureProviderPushPreviewArgs)
  const azureProviderPullCanApply = azureProviderPullPreviewReady && sameAzureProviderArgs(azurePreflightArgs, azureProviderPullPreviewArgs)
  const s3ProviderButtons: ObjectStoragePrototypeButton[] = [
    {
      label: t('settings.portability.s3LivePreflight'),
      busyLabel: t('settings.portability.checkingStorage'),
      actionId: 'storage-s3-live-preflight',
      icon: <CloudCheck size={14} />,
      onClick: onRunS3LivePreflight ? () => onRunS3LivePreflight(s3PreflightArgs) : undefined,
      requiresVault: false,
    },
    {
      label: t('settings.portability.previewS3ProviderPush'),
      busyLabel: t('settings.portability.previewingStorage'),
      actionId: 'storage-s3-provider-push-preview',
      icon: <Cloud size={14} />,
      onClick: onPreviewS3ProviderPush ? () => onPreviewS3ProviderPush(s3PreflightArgs) : undefined,
    },
    {
      label: t('settings.portability.applyS3ProviderPush'),
      busyLabel: t('settings.portability.applyingStorage'),
      actionId: 'storage-s3-provider-push-apply',
      icon: <UploadSimple size={14} />,
      onClick: onApplyS3ProviderPush ? () => onApplyS3ProviderPush(s3PreflightArgs) : undefined,
      enabled: s3ProviderPushCanApply,
    },
    {
      label: t('settings.portability.previewS3ProviderPull'),
      busyLabel: t('settings.portability.previewingStorage'),
      actionId: 'storage-s3-provider-pull-preview',
      icon: <Cloud size={14} />,
      onClick: onPreviewS3ProviderPull ? () => onPreviewS3ProviderPull(s3PreflightArgs) : undefined,
    },
    {
      label: t('settings.portability.applyS3ProviderPull'),
      busyLabel: t('settings.portability.applyingStorage'),
      actionId: 'storage-s3-provider-pull-apply',
      icon: <DownloadSimple size={14} />,
      onClick: onApplyS3ProviderPull ? () => onApplyS3ProviderPull(s3PreflightArgs) : undefined,
      enabled: s3ProviderPullCanApply,
    },
  ]
  const s3MirrorButtons: ObjectStoragePrototypeButton[] = [
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
  ]
  const azureButtons: ObjectStoragePrototypeButton[] = [
    {
      label: t('settings.portability.azureLivePreflight'),
      busyLabel: t('settings.portability.checkingStorage'),
      actionId: 'storage-azure-live-preflight',
      icon: <CloudCheck size={14} />,
      onClick: onRunAzureLivePreflight ? () => onRunAzureLivePreflight(azurePreflightArgs) : undefined,
      requiresVault: false,
    },
    {
      label: t('settings.portability.previewAzureProviderPush'),
      busyLabel: t('settings.portability.previewingStorage'),
      actionId: 'storage-azure-provider-push-preview',
      icon: <Cloud size={14} />,
      onClick: onPreviewAzureProviderPush ? () => onPreviewAzureProviderPush(azurePreflightArgs) : undefined,
    },
    {
      label: t('settings.portability.applyAzureProviderPush'),
      busyLabel: t('settings.portability.applyingStorage'),
      actionId: 'storage-azure-provider-push-apply',
      icon: <UploadSimple size={14} />,
      onClick: onApplyAzureProviderPush ? () => onApplyAzureProviderPush(azurePreflightArgs) : undefined,
      enabled: azureProviderPushCanApply,
    },
    {
      label: t('settings.portability.previewAzureProviderPull'),
      busyLabel: t('settings.portability.previewingStorage'),
      actionId: 'storage-azure-provider-pull-preview',
      icon: <Cloud size={14} />,
      onClick: onPreviewAzureProviderPull ? () => onPreviewAzureProviderPull(azurePreflightArgs) : undefined,
    },
    {
      label: t('settings.portability.applyAzureProviderPull'),
      busyLabel: t('settings.portability.applyingStorage'),
      actionId: 'storage-azure-provider-pull-apply',
      icon: <DownloadSimple size={14} />,
      onClick: onApplyAzureProviderPull ? () => onApplyAzureProviderPull(azurePreflightArgs) : undefined,
      enabled: azureProviderPullCanApply,
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
    <div className="grimoire-object-storage-prototype grimoire-portability-inline-panel rounded-md border border-dashed border-border p-3" data-testid="object-storage-prototype-actions">
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
      <div className="mb-2 grid gap-2 sm:grid-cols-2" role="tablist" aria-label="Object storage providers">
        <ProviderToggle
          provider="s3"
          active={activeProvider === 's3'}
          label="Amazon S3"
          detail="Read-only preflight, proof preview/apply, local mirror."
          onSelect={setExpandedProvider}
        />
        <ProviderToggle
          provider="azure"
          active={activeProvider === 'azure'}
          label="Azure Blob"
          detail="CLI-auth proof preview/apply and local mirror."
          onSelect={setExpandedProvider}
        />
      </div>
      {activeProvider === 's3' ? (
        <ProviderPanel provider="s3">
          <S3LivePreflightControls t={t} draft={s3PreflightDraft} onChange={setS3PreflightDraft} />
          <StorageActionGroup
            title={t('settings.portability.s3ProviderSync')}
            description={t('settings.portability.s3ProviderSyncDescription')}
          >
            <PrototypeButtons buttons={s3ProviderButtons} busyAction={busyAction} vaultReady={vaultReady} />
          </StorageActionGroup>
          <StorageActionGroup
            title={t('settings.portability.objectStorageMirror')}
            description={t('settings.portability.objectStorageMirrorDescription')}
          >
            <PrototypeButtons buttons={s3MirrorButtons} busyAction={busyAction} vaultReady={vaultReady} />
          </StorageActionGroup>
          <S3LivePreflightCard report={s3LivePreflightReport} />
          <ObjectStoragePreviewCard report={s3ProviderPushPreviewReport} target="provider" />
          <ObjectStoragePreviewCard report={s3ProviderPullPreviewReport} target="provider" />
          <ObjectStoragePreviewCard report={s3MirrorPreviewReport} target="mirror" />
          <ObjectStoragePreviewCard report={s3MirrorPullPreviewReport} target="mirror" />
        </ProviderPanel>
      ) : null}
      {activeProvider === 'azure' ? (
        <ProviderPanel provider="azure">
          <AzureLivePreflightControls t={t} draft={azurePreflightDraft} onChange={setAzurePreflightDraft} />
          <StorageActionGroup
            title={t('settings.portability.azureProviderSync')}
            description={t('settings.portability.azureProviderSyncDescription')}
          >
            <PrototypeButtons buttons={azureButtons.slice(0, 5)} busyAction={busyAction} vaultReady={vaultReady} />
          </StorageActionGroup>
          <StorageActionGroup
            title={t('settings.portability.objectStorageMirror')}
            description={t('settings.portability.objectStorageMirrorDescription')}
          >
            <PrototypeButtons buttons={azureButtons.slice(5)} busyAction={busyAction} vaultReady={vaultReady} />
          </StorageActionGroup>
          <AzureLivePreflightCard report={azureLivePreflightReport} />
          <ObjectStoragePreviewCard report={azureProviderPushPreviewReport} target="provider" />
          <ObjectStoragePreviewCard report={azureProviderPullPreviewReport} target="provider" />
          <ObjectStoragePreviewCard report={azureMirrorPreviewReport} target="mirror" />
          <ObjectStoragePreviewCard report={azureMirrorPullPreviewReport} target="mirror" />
        </ProviderPanel>
      ) : null}
      {activeProvider === null ? (
        <div className="grimoire-object-storage-preview rounded-md border border-border p-2 text-[11px] leading-snug text-muted-foreground" data-testid="object-storage-provider-empty">
          Pick a provider to reveal local-only preflight fields and sync actions.
        </div>
      ) : null}
    </div>
  )
}

function sameS3ProviderArgs(current: S3LivePreflightArgs, preview?: S3LivePreflightArgs): boolean {
  if (!preview) return true
  return current.bucket === preview.bucket
    && current.region === preview.region
    && current.prefix === preview.prefix
}

function sameAzureProviderArgs(current: AzureLivePreflightArgs, preview?: AzureLivePreflightArgs): boolean {
  if (!preview) return true
  return current.account === preview.account
    && current.container === preview.container
    && current.prefix === preview.prefix
}
