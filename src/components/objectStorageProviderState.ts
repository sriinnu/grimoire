import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import type { AzureLivePreflightReport } from '../utils/objectStorageLivePreflight'
import type { ObjectStorageSyncReport, S3LivePreflightReport } from '../utils/objectStorageSync'
import type { ObjectStorageProvider } from './ObjectStorageProviderPanel'

interface ObjectStorageProviderSignals {
  busyAction: VaultPortabilityActionId | null
  s3LivePreflightReport?: S3LivePreflightReport
  azureLivePreflightReport?: AzureLivePreflightReport
  s3MirrorPreviewReport?: ObjectStorageSyncReport
  s3MirrorPullPreviewReport?: ObjectStorageSyncReport
  s3ProviderPushPreviewReport?: ObjectStorageSyncReport
  s3ProviderPullPreviewReport?: ObjectStorageSyncReport
  azureProviderPushPreviewReport?: ObjectStorageSyncReport
  azureProviderPullPreviewReport?: ObjectStorageSyncReport
  azureMirrorPreviewReport?: ObjectStorageSyncReport
  azureMirrorPullPreviewReport?: ObjectStorageSyncReport
}

/** Infers which object-storage provider should stay open from active work or visible evidence. */
export function inferActiveObjectStorageProvider({
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
}: ObjectStorageProviderSignals): ObjectStorageProvider | null {
  if (
    busyAction?.startsWith('storage-s3')
    || s3LivePreflightReport
    || s3MirrorPreviewReport
    || s3MirrorPullPreviewReport
    || s3ProviderPushPreviewReport
    || s3ProviderPullPreviewReport
  ) return 's3'
  if (
    busyAction?.startsWith('storage-azure')
    || azureLivePreflightReport
    || azureProviderPushPreviewReport
    || azureProviderPullPreviewReport
    || azureMirrorPreviewReport
    || azureMirrorPullPreviewReport
  ) return 'azure'
  return null
}
