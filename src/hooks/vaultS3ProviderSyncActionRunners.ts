import type { Dispatch, SetStateAction } from 'react'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import {
  applyS3ProviderSync,
  previewS3ProviderPull,
  previewS3ProviderPush,
} from '../utils/objectStorageProviderSync'
import type {
  ObjectStorageSyncDirection,
  ObjectStorageSyncReport,
  S3LivePreflightArgs,
} from '../utils/objectStorageSync'
import { errorMessage } from './vaultPortabilityActionHelpers'

export type S3ProviderPreviewKey = `s3-provider:${ObjectStorageSyncDirection}`

export interface S3ProviderPreviewState {
  args: S3LivePreflightArgs
  report: ObjectStorageSyncReport
}

type S3ProviderPreviewReports = Partial<Record<S3ProviderPreviewKey, S3ProviderPreviewState>>

interface S3ProviderSyncActionOptions {
  resolvedPath: string
  s3ProviderPreviewReports: S3ProviderPreviewReports
  setS3ProviderPreviewReports: Dispatch<SetStateAction<S3ProviderPreviewReports>>
  setActiveAction: Dispatch<SetStateAction<VaultPortabilityActionId | null>>
  setToastMessage: (message: string) => void
  reloadVault: () => Promise<unknown>
  reloadFolders: () => Promise<unknown>
  loadModifiedFiles: () => Promise<unknown>
}

/** Runs explicit S3 provider SDK preview/apply actions with exact-preview gating. */
export async function runS3ProviderSyncAction(
  direction: ObjectStorageSyncDirection,
  mode: 'preview' | 'apply',
  args: S3LivePreflightArgs | undefined,
  options: S3ProviderSyncActionOptions,
): Promise<void> {
  if (!options.resolvedPath.trim()) {
    options.setToastMessage('Open a vault before syncing S3 provider storage')
    return
  }

  const cleanArgs = normalizedS3Args(args)
  const reportKey = s3ProviderPreviewKey(direction)
  const previewState = options.s3ProviderPreviewReports[reportKey]
  if (mode === 'apply' && !previewState) {
    options.setToastMessage(`Run S3 provider ${direction} preview before applying sync.`)
    return
  }
  if (mode === 'apply' && previewState?.report.conflicts) {
    options.setToastMessage(`Resolve S3 provider ${direction} conflicts before applying sync.`)
    return
  }
  if (mode === 'apply' && previewState && !sameS3Args(cleanArgs, previewState.args)) {
    options.setToastMessage(`S3 provider target changed; run ${direction} preview again before applying sync.`)
    return
  }

  options.setActiveAction(s3ProviderActionId(direction, mode))
  try {
    const result = mode === 'preview'
      ? await runProviderPreview(direction, options.resolvedPath, cleanArgs)
      : await applyS3ProviderSync(
        options.resolvedPath,
        direction,
        previewState?.report.preview_signature ?? '',
        previewState?.args ?? {},
      )
    if (mode === 'apply') await reloadAfterS3ProviderApply(direction, options)
    options.setS3ProviderPreviewReports((previous) => nextS3ProviderPreviewReports(
      previous,
      reportKey,
      mode,
      result,
      cleanArgs,
    ))
    options.setToastMessage(mode === 'preview'
      ? formatS3ProviderPreviewToast(result)
      : formatS3ProviderApplyToast(result))
  } catch (error) {
    options.setToastMessage(`S3 provider sync failed: ${errorMessage(error, 'S3 provider sync failed')}`)
  } finally {
    options.setActiveAction(null)
  }
}

export function s3ProviderPreviewKey(direction: ObjectStorageSyncDirection): S3ProviderPreviewKey {
  return `s3-provider:${direction}`
}

function runProviderPreview(
  direction: ObjectStorageSyncDirection,
  vaultPath: string,
  args: S3LivePreflightArgs,
): Promise<ObjectStorageSyncReport> {
  return direction === 'push'
    ? previewS3ProviderPush(vaultPath, args)
    : previewS3ProviderPull(vaultPath, args)
}

async function reloadAfterS3ProviderApply(
  direction: ObjectStorageSyncDirection,
  options: Pick<S3ProviderSyncActionOptions, 'reloadVault' | 'reloadFolders' | 'loadModifiedFiles'>,
): Promise<void> {
  if (direction === 'pull') {
    await options.reloadVault()
    await options.reloadFolders()
  }
  await options.loadModifiedFiles()
}

function nextS3ProviderPreviewReports(
  previous: S3ProviderPreviewReports,
  key: S3ProviderPreviewKey,
  mode: 'preview' | 'apply',
  result: ObjectStorageSyncReport,
  args: S3LivePreflightArgs,
): S3ProviderPreviewReports {
  const next = { ...previous }
  if (mode === 'preview') next[key] = { args, report: result }
  else delete next[key]
  return next
}

function s3ProviderActionId(
  direction: ObjectStorageSyncDirection,
  mode: 'preview' | 'apply',
): VaultPortabilityActionId {
  if (direction === 'push') {
    return mode === 'preview' ? 'storage-s3-provider-push-preview' : 'storage-s3-provider-push-apply'
  }
  return mode === 'preview' ? 'storage-s3-provider-pull-preview' : 'storage-s3-provider-pull-apply'
}

function normalizedS3Args(args: S3LivePreflightArgs = {}): S3LivePreflightArgs {
  const next: S3LivePreflightArgs = {}
  const bucket = cleanedValue(args.bucket)
  const region = cleanedValue(args.region)
  const prefix = cleanedValue(args.prefix)
  if (bucket) next.bucket = bucket
  if (region) next.region = region
  if (prefix) next.prefix = prefix
  return next
}

function cleanedValue(value?: string): string | undefined {
  const clean = value?.trim()
  return clean ? clean : undefined
}

function sameS3Args(left: S3LivePreflightArgs, right: S3LivePreflightArgs): boolean {
  return left.bucket === right.bucket
    && left.region === right.region
    && left.prefix === right.prefix
}

function formatS3ProviderPreviewToast(report: ObjectStorageSyncReport): string {
  return `S3 provider SDK ${report.direction} preview: ${syncCountSummary(report)}${previewPlanSummary(report)}`
}

function formatS3ProviderApplyToast(report: ObjectStorageSyncReport): string {
  const reportPart = report.sync_report_path ? '; local report written' : ''
  return `S3 provider SDK ${report.direction} applied: ${syncCountSummary(report)}${reportPart}`
}

function syncCountSummary(report: ObjectStorageSyncReport): string {
  return `${report.files_to_upload} upload, ${report.files_to_download} download, ${report.files_to_delete} remote delete, ${report.conflicts} conflicts, ${report.excluded_files} local-only withheld`
}

function previewPlanSummary(report: ObjectStorageSyncReport): string {
  return report.conflicts > 0 ? '; resolve conflicts before apply' : ''
}
