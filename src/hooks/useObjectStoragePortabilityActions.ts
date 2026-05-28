import { useCallback, useEffect, useState } from 'react'
import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type { PortabilityProgressState, VaultPortabilityActionId } from '../lib/vaultPortability'
import type { ObjectStorageProviderId } from '../lib/objectStorageAdapterDesign'
import {
  formatAzureLivePreflightToast,
  runAzureLivePreflight,
  type AzureLivePreflightArgs,
  type AzureLivePreflightReport,
} from '../utils/objectStorageLivePreflight'
import {
  formatS3LivePreflightToast,
  runS3LivePreflight,
  type ObjectStorageSyncProgressEvent,
  type ObjectStorageSyncReport,
  type S3LivePreflightArgs,
  type S3LivePreflightReport,
} from '../utils/objectStorageSync'
import {
  previewKey,
  runObjectStorageSyncAction,
  type ObjectStoragePreviewKey,
} from './vaultStorageSyncActionRunners'
import {
  runS3ProviderSyncAction,
  s3ProviderPreviewKey,
  type S3ProviderPreviewKey,
  type S3ProviderPreviewState,
} from './vaultS3ProviderSyncActionRunners'
import {
  azureProviderPreviewKey,
  runAzureProviderSyncAction,
  type AzureProviderPreviewKey,
  type AzureProviderPreviewState,
} from './vaultAzureProviderSyncActionRunners'
import {
  type ActivePortabilityOperation,
  errorMessage,
} from './vaultPortabilityActionHelpers'

type ObjectStoragePreviewReports = Partial<Record<ObjectStoragePreviewKey, ObjectStorageSyncReport>>
type S3ProviderPreviewReports = Partial<Record<S3ProviderPreviewKey, S3ProviderPreviewState>>
type AzureProviderPreviewReports = Partial<Record<AzureProviderPreviewKey, AzureProviderPreviewState>>

interface ObjectStoragePortabilityActionOptions {
  resolvedPath: string
  reloadVault: () => Promise<unknown>
  reloadFolders: () => Promise<unknown>
  loadModifiedFiles: () => Promise<unknown>
  setToastMessage: (message: string) => void
  activeOperationRef: MutableRefObject<ActivePortabilityOperation | null>
  setActiveAction: Dispatch<SetStateAction<VaultPortabilityActionId | null>>
  setPortabilityProgress: Dispatch<SetStateAction<PortabilityProgressState | null>>
  updateProgress: (
    operation: ActivePortabilityOperation,
    label: string,
    event: ObjectStorageSyncProgressEvent,
  ) => void
}

/** Owns storage portability state so the main import/export hook stays small. */
export function useObjectStoragePortabilityActions({
  resolvedPath,
  reloadVault,
  reloadFolders,
  loadModifiedFiles,
  setToastMessage,
  activeOperationRef,
  setActiveAction,
  setPortabilityProgress,
  updateProgress,
}: ObjectStoragePortabilityActionOptions) {
  const [objectStoragePreviewReports, setObjectStoragePreviewReports] = useState<ObjectStoragePreviewReports>({})
  const [s3ProviderPreviewReports, setS3ProviderPreviewReports] = useState<S3ProviderPreviewReports>({})
  const [azureProviderPreviewReports, setAzureProviderPreviewReports] = useState<AzureProviderPreviewReports>({})
  const [s3LivePreflightReport, setS3LivePreflightReport] = useState<S3LivePreflightReport | null>(null)
  const [azureLivePreflightReport, setAzureLivePreflightReport] = useState<AzureLivePreflightReport | null>(null)

  useEffect(() => {
    setObjectStoragePreviewReports({})
    setS3ProviderPreviewReports({})
    setAzureProviderPreviewReports({})
    setS3LivePreflightReport(null)
    setAzureLivePreflightReport(null)
  }, [resolvedPath])

  const handleObjectStorageSync = useCallback(async (
    providerId: ObjectStorageProviderId,
    direction: 'push' | 'pull',
    mode: 'preview' | 'apply',
  ) => {
    await runObjectStorageSyncAction(providerId, direction, mode, {
      resolvedPath,
      objectStoragePreviewReports,
      setObjectStoragePreviewReports,
      activeOperationRef,
      setActiveAction,
      setPortabilityProgress,
      setToastMessage,
      reloadVault,
      reloadFolders,
      loadModifiedFiles,
      updateProgress,
    })
  }, [activeOperationRef, loadModifiedFiles, objectStoragePreviewReports, reloadFolders, reloadVault, resolvedPath, setActiveAction, setPortabilityProgress, setToastMessage, updateProgress])

  const handleS3ProviderSync = useCallback(async (
    direction: 'push' | 'pull',
    mode: 'preview' | 'apply',
    args?: S3LivePreflightArgs,
  ) => {
    await runS3ProviderSyncAction(direction, mode, args, {
      resolvedPath,
      s3ProviderPreviewReports,
      setS3ProviderPreviewReports,
      setActiveAction,
      setToastMessage,
      reloadVault,
      reloadFolders,
      loadModifiedFiles,
    })
  }, [loadModifiedFiles, reloadFolders, reloadVault, resolvedPath, s3ProviderPreviewReports, setActiveAction, setToastMessage])

  const handleAzureProviderSync = useCallback(async (
    direction: 'push' | 'pull',
    mode: 'preview' | 'apply',
    args?: AzureLivePreflightArgs,
  ) => {
    await runAzureProviderSyncAction(direction, mode, args, {
      resolvedPath,
      azureProviderPreviewReports,
      setAzureProviderPreviewReports,
      setActiveAction,
      setToastMessage,
      reloadVault,
      reloadFolders,
      loadModifiedFiles,
    })
  }, [azureProviderPreviewReports, loadModifiedFiles, reloadFolders, reloadVault, resolvedPath, setActiveAction, setToastMessage])

  const handleS3LivePreflight = useCallback(async (args?: S3LivePreflightArgs) => {
    const actionId = 'storage-s3-live-preflight'
    setActiveAction(actionId)
    try {
      setToastMessage('Checking S3 live read-only preflight...')
      const result = await runS3LivePreflight(args)
      setS3LivePreflightReport(result)
      setToastMessage(formatS3LivePreflightToast(result))
    } catch (error) {
      setS3LivePreflightReport(null)
      setToastMessage(`S3 preflight failed: ${errorMessage(error, 'S3 preflight failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [setActiveAction, setToastMessage])

  const handleAzureLivePreflight = useCallback(async (args?: AzureLivePreflightArgs) => {
    const actionId = 'storage-azure-live-preflight'
    setActiveAction(actionId)
    try {
      setToastMessage('Checking Azure live read-only preflight...')
      const result = await runAzureLivePreflight(args)
      setAzureLivePreflightReport(result)
      setToastMessage(formatAzureLivePreflightToast(result))
    } catch (error) {
      setAzureLivePreflightReport(null)
      setToastMessage(`Azure preflight failed: ${errorMessage(error, 'Azure preflight failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [setActiveAction, setToastMessage])

  return {
    s3MirrorPreviewReady: previewCanApply(objectStoragePreviewReports[previewKey('s3', 'push')]),
    s3MirrorPullPreviewReady: previewCanApply(objectStoragePreviewReports[previewKey('s3', 'pull')]),
    s3ProviderPushPreviewReady: previewCanApply(s3ProviderPreviewReports[s3ProviderPreviewKey('push')]?.report),
    s3ProviderPullPreviewReady: previewCanApply(s3ProviderPreviewReports[s3ProviderPreviewKey('pull')]?.report),
    azureProviderPushPreviewReady: previewCanApply(azureProviderPreviewReports[azureProviderPreviewKey('push')]?.report),
    azureProviderPullPreviewReady: previewCanApply(azureProviderPreviewReports[azureProviderPreviewKey('pull')]?.report),
    azureMirrorPreviewReady: previewCanApply(objectStoragePreviewReports[previewKey('azure-blob', 'push')]),
    azureMirrorPullPreviewReady: previewCanApply(objectStoragePreviewReports[previewKey('azure-blob', 'pull')]),
    s3MirrorPreviewReport: objectStoragePreviewReports[previewKey('s3', 'push')],
    s3MirrorPullPreviewReport: objectStoragePreviewReports[previewKey('s3', 'pull')],
    s3ProviderPushPreviewReport: s3ProviderPreviewReports[s3ProviderPreviewKey('push')]?.report,
    s3ProviderPullPreviewReport: s3ProviderPreviewReports[s3ProviderPreviewKey('pull')]?.report,
    azureProviderPushPreviewReport: azureProviderPreviewReports[azureProviderPreviewKey('push')]?.report,
    azureProviderPullPreviewReport: azureProviderPreviewReports[azureProviderPreviewKey('pull')]?.report,
    azureMirrorPreviewReport: objectStoragePreviewReports[previewKey('azure-blob', 'push')],
    azureMirrorPullPreviewReport: objectStoragePreviewReports[previewKey('azure-blob', 'pull')],
    s3LivePreflightReport: s3LivePreflightReport ?? undefined,
    azureLivePreflightReport: azureLivePreflightReport ?? undefined,
    handleS3LivePreflight: (args?: S3LivePreflightArgs) => { void handleS3LivePreflight(args) },
    handleAzureLivePreflight: (args?: AzureLivePreflightArgs) => { void handleAzureLivePreflight(args) },
    handlePreviewS3MirrorPush: () => { void handleObjectStorageSync('s3', 'push', 'preview') },
    handleApplyS3MirrorPush: () => { void handleObjectStorageSync('s3', 'push', 'apply') },
    handlePreviewS3MirrorPull: () => { void handleObjectStorageSync('s3', 'pull', 'preview') },
    handleApplyS3MirrorPull: () => { void handleObjectStorageSync('s3', 'pull', 'apply') },
    handlePreviewS3ProviderPush: (args?: S3LivePreflightArgs) => { void handleS3ProviderSync('push', 'preview', args) },
    handleApplyS3ProviderPush: (args?: S3LivePreflightArgs) => { void handleS3ProviderSync('push', 'apply', args) },
    handlePreviewS3ProviderPull: (args?: S3LivePreflightArgs) => { void handleS3ProviderSync('pull', 'preview', args) },
    handleApplyS3ProviderPull: (args?: S3LivePreflightArgs) => { void handleS3ProviderSync('pull', 'apply', args) },
    handlePreviewAzureProviderPush: (args?: AzureLivePreflightArgs) => { void handleAzureProviderSync('push', 'preview', args) },
    handleApplyAzureProviderPush: (args?: AzureLivePreflightArgs) => { void handleAzureProviderSync('push', 'apply', args) },
    handlePreviewAzureProviderPull: (args?: AzureLivePreflightArgs) => { void handleAzureProviderSync('pull', 'preview', args) },
    handleApplyAzureProviderPull: (args?: AzureLivePreflightArgs) => { void handleAzureProviderSync('pull', 'apply', args) },
    handlePreviewAzureMirrorPush: () => { void handleObjectStorageSync('azure-blob', 'push', 'preview') },
    handleApplyAzureMirrorPush: () => { void handleObjectStorageSync('azure-blob', 'push', 'apply') },
    handlePreviewAzureMirrorPull: () => { void handleObjectStorageSync('azure-blob', 'pull', 'preview') },
    handleApplyAzureMirrorPull: () => { void handleObjectStorageSync('azure-blob', 'pull', 'apply') },
  }
}

function previewCanApply(report?: ObjectStorageSyncReport): boolean {
  return Boolean(report && report.conflicts === 0)
}
