import type { Dispatch, SetStateAction } from 'react'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import type { AzureLivePreflightArgs } from '../utils/objectStorageLivePreflight'
import {
  applyAzureProviderSync,
  previewAzureProviderPull,
  previewAzureProviderPush,
} from '../utils/objectStorageProviderSync'
import type { ObjectStorageSyncDirection, ObjectStorageSyncReport } from '../utils/objectStorageSync'
import { errorMessage } from './vaultPortabilityActionHelpers'

export type AzureProviderPreviewKey = `azure-provider:${ObjectStorageSyncDirection}`

export interface AzureProviderPreviewState {
  args: AzureLivePreflightArgs
  report: ObjectStorageSyncReport
}

type AzureProviderPreviewReports = Partial<Record<AzureProviderPreviewKey, AzureProviderPreviewState>>

interface AzureProviderSyncActionOptions {
  resolvedPath: string
  azureProviderPreviewReports: AzureProviderPreviewReports
  setAzureProviderPreviewReports: Dispatch<SetStateAction<AzureProviderPreviewReports>>
  setActiveAction: Dispatch<SetStateAction<VaultPortabilityActionId | null>>
  setToastMessage: (message: string) => void
  reloadVault: () => Promise<unknown>
  reloadFolders: () => Promise<unknown>
  loadModifiedFiles: () => Promise<unknown>
}

/** Runs explicit Azure Blob provider preview/apply actions with exact-preview gating. */
export async function runAzureProviderSyncAction(
  direction: ObjectStorageSyncDirection,
  mode: 'preview' | 'apply',
  args: AzureLivePreflightArgs | undefined,
  options: AzureProviderSyncActionOptions,
): Promise<void> {
  if (!options.resolvedPath.trim()) {
    options.setToastMessage('Open a vault before syncing Azure provider storage')
    return
  }

  const reportKey = azureProviderPreviewKey(direction)
  const previewState = options.azureProviderPreviewReports[reportKey]
  const cleanArgs = normalizedAzureArgs(args)
  if (mode === 'apply' && !previewState) {
    options.setToastMessage(`Run Azure provider ${direction} preview before applying sync.`)
    return
  }
  if (mode === 'apply' && previewState?.report.conflicts) {
    options.setToastMessage(`Resolve Azure provider ${direction} conflicts before applying sync.`)
    return
  }
  if (mode === 'apply' && previewState && !sameAzureArgs(cleanArgs, previewState.args)) {
    options.setToastMessage(`Azure provider target changed; run ${direction} preview again before applying sync.`)
    return
  }

  options.setActiveAction(azureProviderActionId(direction, mode))
  try {
    const result = mode === 'preview'
      ? await runProviderPreview(direction, options.resolvedPath, cleanArgs)
      : await applyAzureProviderSync(
        options.resolvedPath,
        direction,
        previewState?.report.preview_signature ?? '',
        previewState?.args ?? {},
      )
    if (mode === 'apply') await reloadAfterAzureProviderApply(direction, options)
    options.setAzureProviderPreviewReports((previous) => nextAzureProviderPreviewReports(
      previous,
      reportKey,
      mode,
      result,
      cleanArgs,
    ))
    options.setToastMessage(mode === 'preview'
      ? formatAzureProviderPreviewToast(result)
      : formatAzureProviderApplyToast(result))
  } catch (error) {
    options.setToastMessage(`Azure provider sync failed: ${errorMessage(error, 'Azure provider sync failed')}`)
  } finally {
    options.setActiveAction(null)
  }
}

export function azureProviderPreviewKey(direction: ObjectStorageSyncDirection): AzureProviderPreviewKey {
  return `azure-provider:${direction}`
}

function runProviderPreview(
  direction: ObjectStorageSyncDirection,
  vaultPath: string,
  args: AzureLivePreflightArgs,
): Promise<ObjectStorageSyncReport> {
  return direction === 'push'
    ? previewAzureProviderPush(vaultPath, args)
    : previewAzureProviderPull(vaultPath, args)
}

async function reloadAfterAzureProviderApply(
  direction: ObjectStorageSyncDirection,
  options: Pick<AzureProviderSyncActionOptions, 'reloadVault' | 'reloadFolders' | 'loadModifiedFiles'>,
): Promise<void> {
  if (direction === 'pull') {
    await options.reloadVault()
    await options.reloadFolders()
  }
  await options.loadModifiedFiles()
}

function nextAzureProviderPreviewReports(
  previous: AzureProviderPreviewReports,
  key: AzureProviderPreviewKey,
  mode: 'preview' | 'apply',
  result: ObjectStorageSyncReport,
  args: AzureLivePreflightArgs,
): AzureProviderPreviewReports {
  const next = { ...previous }
  if (mode === 'preview') next[key] = { args, report: result }
  else delete next[key]
  return next
}

function azureProviderActionId(
  direction: ObjectStorageSyncDirection,
  mode: 'preview' | 'apply',
): VaultPortabilityActionId {
  if (direction === 'push') {
    return mode === 'preview' ? 'storage-azure-provider-push-preview' : 'storage-azure-provider-push-apply'
  }
  return mode === 'preview' ? 'storage-azure-provider-pull-preview' : 'storage-azure-provider-pull-apply'
}

function normalizedAzureArgs(args: AzureLivePreflightArgs = {}): AzureLivePreflightArgs {
  const next: AzureLivePreflightArgs = {}
  const account = cleanedValue(args.account)
  const container = cleanedValue(args.container)
  const prefix = cleanedValue(args.prefix)
  if (account) next.account = account
  if (container) next.container = container
  if (prefix) next.prefix = prefix
  return next
}

function cleanedValue(value?: string): string | undefined {
  const clean = value?.trim()
  return clean ? clean : undefined
}

function sameAzureArgs(left: AzureLivePreflightArgs, right: AzureLivePreflightArgs): boolean {
  return left.account === right.account
    && left.container === right.container
    && left.prefix === right.prefix
}

function formatAzureProviderPreviewToast(report: ObjectStorageSyncReport): string {
  return `Azure provider ${report.direction} preview: ${syncCountSummary(report)}${previewPlanSummary(report)}`
}

function formatAzureProviderApplyToast(report: ObjectStorageSyncReport): string {
  const reportPart = report.sync_report_path ? '; local report written' : ''
  return `Azure provider ${report.direction} applied: ${syncCountSummary(report)}${reportPart}`
}

function syncCountSummary(report: ObjectStorageSyncReport): string {
  return `${report.files_to_upload} upload, ${report.files_to_download} download, ${report.files_to_delete} remote delete, ${report.conflicts} conflicts, ${report.excluded_files} local-only withheld`
}

function previewPlanSummary(report: ObjectStorageSyncReport): string {
  return report.conflicts > 0 ? '; resolve conflicts before apply' : ''
}
