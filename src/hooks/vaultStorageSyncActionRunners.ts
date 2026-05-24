import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { PortabilityProgressState, VaultPortabilityActionId } from '../lib/vaultPortability'
import type { ObjectStorageProviderId } from '../lib/objectStorageAdapterDesign'
import {
  applyObjectStoragePullWithProgress,
  applyObjectStoragePushWithProgress,
  formatObjectStorageApplyToast,
  formatObjectStoragePreviewToast,
  pickObjectStorageMirrorFolder,
  previewObjectStoragePullWithProgress,
  previewObjectStoragePushWithProgress,
  type ObjectStorageSyncDirection,
  type ObjectStorageSyncProgressEvent,
  type ObjectStorageSyncReport,
} from '../utils/objectStorageSync'
import {
  type ActivePortabilityOperation,
  beginPortabilityOperation,
  clearPortabilityOperation,
  errorMessage,
  isCurrentPortabilityOperation,
  objectStorageActionId,
  objectStorageLabel,
} from './vaultPortabilityActionHelpers'

export type ObjectStoragePreviewKey = `${ObjectStorageProviderId}:${ObjectStorageSyncDirection}`
type ObjectStoragePreviewReports = Partial<Record<ObjectStoragePreviewKey, ObjectStorageSyncReport>>

interface StorageSyncActionOptions {
  resolvedPath: string
  objectStoragePreviewReports: ObjectStoragePreviewReports
  setObjectStoragePreviewReports: Dispatch<SetStateAction<ObjectStoragePreviewReports>>
  activeOperationRef: MutableRefObject<ActivePortabilityOperation | null>
  setActiveAction: Dispatch<SetStateAction<VaultPortabilityActionId | null>>
  setPortabilityProgress: Dispatch<SetStateAction<PortabilityProgressState | null>>
  setToastMessage: (message: string) => void
  loadModifiedFiles: () => Promise<unknown>
  updateProgress: (
    operation: ActivePortabilityOperation,
    label: string,
    event: ObjectStorageSyncProgressEvent,
  ) => void
}

/** Runs object-storage preview/apply through the shared cancellable progress contract. */
export async function runObjectStorageSyncAction(
  providerId: ObjectStorageProviderId,
  direction: ObjectStorageSyncDirection,
  mode: 'preview' | 'apply',
  options: StorageSyncActionOptions,
): Promise<void> {
  if (!options.resolvedPath.trim()) {
    options.setToastMessage('Open a vault before syncing object storage')
    return
  }
  const reportKey = previewKey(providerId, direction)
  const previewReport = options.objectStoragePreviewReports[reportKey]
  if (mode === 'apply' && !previewReport) {
    options.setToastMessage(`Run ${objectStorageLabel(providerId)} ${direction} preview before applying sync.`)
    return
  }

  const actionId = objectStorageActionId(providerId, direction, mode)
  options.setActiveAction(actionId)
  let operation: ActivePortabilityOperation | null = null
  try {
    const mirrorPath = mode === 'preview'
      ? await pickObjectStorageMirrorFolder(providerId)
      : previewReport?.mirror_path
    if (!mirrorPath) return

    const label = `${objectStorageLabel(providerId)} ${direction} ${mode === 'preview' ? 'preview' : 'sync'}`
    const activeOperation = beginPortabilityOperation(
      actionId,
      label,
      options.activeOperationRef,
      options.setPortabilityProgress,
    )
    operation = activeOperation
    options.setToastMessage(`${mode === 'preview' ? 'Previewing' : 'Applying'} ${objectStorageLabel(providerId)} mirror sync...`)
    const result = await runStorageCommand(providerId, direction, mode, mirrorPath, previewReport, activeOperation, label, options)
    if (!isCurrentPortabilityOperation(options.activeOperationRef.current, activeOperation.operationId) || activeOperation.cancelled) return
    if (mode === 'apply') await options.loadModifiedFiles()
    options.setObjectStoragePreviewReports((previous) => nextPreviewReports(previous, reportKey, mode, result))
    options.setToastMessage(mode === 'preview'
      ? formatObjectStoragePreviewToast(result)
      : formatObjectStorageApplyToast(result))
  } catch (error) {
    if (!operation?.cancelled) {
      options.setToastMessage(`Storage sync failed: ${errorMessage(error, 'Storage sync failed')}`)
    }
  } finally {
    clearPortabilityOperation(operation, options.activeOperationRef, options.setPortabilityProgress)
    options.setActiveAction(null)
  }
}

function runStorageCommand(
  providerId: ObjectStorageProviderId,
  direction: ObjectStorageSyncDirection,
  mode: 'preview' | 'apply',
  mirrorPath: string,
  previewReport: ObjectStorageSyncReport | undefined,
  operation: ActivePortabilityOperation,
  label: string,
  options: StorageSyncActionOptions,
): Promise<ObjectStorageSyncReport> {
  const onEvent = (event: ObjectStorageSyncProgressEvent) =>
    options.updateProgress(operation, label, event)
  if (mode === 'preview') {
    const preview = direction === 'pull' ? previewObjectStoragePullWithProgress : previewObjectStoragePushWithProgress
    return preview(
      options.resolvedPath,
      mirrorPath,
      providerId,
      operation.operationId,
      onEvent,
    )
  }
  const apply = direction === 'pull' ? applyObjectStoragePullWithProgress : applyObjectStoragePushWithProgress
  return apply(
    options.resolvedPath,
    mirrorPath,
    providerId,
    previewReport?.preview_signature ?? '',
    operation.operationId,
    onEvent,
  )
}

function nextPreviewReports(
  previous: ObjectStoragePreviewReports,
  key: ObjectStoragePreviewKey,
  mode: 'preview' | 'apply',
  result: ObjectStorageSyncReport,
): ObjectStoragePreviewReports {
  const next = { ...previous }
  if (mode === 'preview') next[key] = result
  else delete next[key]
  return next
}

export function previewKey(
  providerId: ObjectStorageProviderId,
  direction: ObjectStorageSyncDirection,
): ObjectStoragePreviewKey {
  return `${providerId}:${direction}`
}
