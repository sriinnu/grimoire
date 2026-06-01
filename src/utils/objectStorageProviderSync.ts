import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { AzureLivePreflightArgs } from './objectStorageLivePreflight'
import type {
  ObjectStorageSyncDirection,
  ObjectStorageSyncReport,
  S3LivePreflightArgs,
} from './objectStorageSync'

/** Builds a real S3 provider push preview without using the local-mirror fixture. */
export function previewS3ProviderPush(
  vaultPath: string,
  args: S3LivePreflightArgs = {},
): Promise<ObjectStorageSyncReport> {
  return invokeS3ProviderPreview('storage_s3_provider_push_preview', vaultPath, args)
}

/** Builds a real S3 provider pull preview without using the local-mirror fixture. */
export function previewS3ProviderPull(
  vaultPath: string,
  args: S3LivePreflightArgs = {},
): Promise<ObjectStorageSyncReport> {
  return invokeS3ProviderPreview('storage_s3_provider_pull_preview', vaultPath, args)
}

/** Applies a real S3 provider sync after the exact preview signature is reviewed. */
export function applyS3ProviderSync(
  vaultPath: string,
  direction: ObjectStorageSyncDirection,
  previewSignature: string,
  args: S3LivePreflightArgs = {},
): Promise<ObjectStorageSyncReport> {
  const payload = {
    vaultPath,
    bucket: args.bucket ?? null,
    region: args.region ?? null,
    prefix: args.prefix ?? null,
    direction,
    previewSignature,
  }
  return isTauri()
    ? invoke<ObjectStorageSyncReport>('storage_s3_provider_sync_apply', payload)
    : mockInvoke<ObjectStorageSyncReport>('storage_s3_provider_sync_apply', payload)
}

/** Builds a real Azure Blob provider push preview without using the local-mirror fixture. */
export function previewAzureProviderPush(
  vaultPath: string,
  args: AzureLivePreflightArgs = {},
): Promise<ObjectStorageSyncReport> {
  return invokeAzureProviderPreview('storage_azure_provider_push_preview', vaultPath, args)
}

/** Builds a real Azure Blob provider pull preview without using the local-mirror fixture. */
export function previewAzureProviderPull(
  vaultPath: string,
  args: AzureLivePreflightArgs = {},
): Promise<ObjectStorageSyncReport> {
  return invokeAzureProviderPreview('storage_azure_provider_pull_preview', vaultPath, args)
}

/** Applies a real Azure Blob provider sync after the exact preview signature is reviewed. */
export function applyAzureProviderSync(
  vaultPath: string,
  direction: ObjectStorageSyncDirection,
  previewSignature: string,
  args: AzureLivePreflightArgs = {},
): Promise<ObjectStorageSyncReport> {
  const payload = {
    vaultPath,
    account: args.account ?? null,
    container: args.container ?? null,
    prefix: args.prefix ?? null,
    direction,
    previewSignature,
  }
  return isTauri()
    ? invoke<ObjectStorageSyncReport>('storage_azure_provider_sync_apply', payload)
    : mockInvoke<ObjectStorageSyncReport>('storage_azure_provider_sync_apply', payload)
}

function invokeS3ProviderPreview(
  command: 'storage_s3_provider_push_preview' | 'storage_s3_provider_pull_preview',
  vaultPath: string,
  args: S3LivePreflightArgs,
): Promise<ObjectStorageSyncReport> {
  const payload = {
    vaultPath,
    bucket: args.bucket ?? null,
    region: args.region ?? null,
    prefix: args.prefix ?? null,
  }
  return isTauri()
    ? invoke<ObjectStorageSyncReport>(command, payload)
    : mockInvoke<ObjectStorageSyncReport>(command, payload)
}

function invokeAzureProviderPreview(
  command: 'storage_azure_provider_push_preview' | 'storage_azure_provider_pull_preview',
  vaultPath: string,
  args: AzureLivePreflightArgs,
): Promise<ObjectStorageSyncReport> {
  const payload = {
    vaultPath,
    account: args.account ?? null,
    container: args.container ?? null,
    prefix: args.prefix ?? null,
  }
  return isTauri()
    ? invoke<ObjectStorageSyncReport>(command, payload)
    : mockInvoke<ObjectStorageSyncReport>(command, payload)
}
