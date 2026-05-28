import { createTauriChannel, invoke } from '../lib/tauriRuntime'
import type { ObjectStorageProviderId } from '../lib/objectStorageAdapterDesign'
import { isTauri, mockInvoke } from '../mock-tauri'
import { pickFolder } from './vault-dialog'

export type ObjectStorageSyncOperationKind =
  | 'upload'
  | 'download'
  | 'delete_remote'
  | 'conflict'
  | 'exclude'
export type ObjectStorageSyncDirection = 'push' | 'pull'
export type S3LivePreflightStatus =
  | 'missing_config'
  | 'missing_credentials'
  | 'auth_denied'
  | 'bucket_missing'
  | 'network'
  | 'throttled'
  | 'reachable'
  | 'failed'

export interface ObjectStorageSyncOperation {
  kind: ObjectStorageSyncOperationKind
  path: string
  reason: string
}

export interface ObjectStorageSyncReport {
  provider_id: ObjectStorageProviderId
  adapter_phase: 'local-mirror-prototype' | 'provider-sdk-adapter'
  prototype_mode: 'local-mirror-fixture' | 's3-live-provider' | 'azure-live-provider'
  direction: ObjectStorageSyncDirection
  mirror_path: string
  preview_signature: string
  applied: boolean
  files_to_upload: number
  files_to_download: number
  files_to_delete: number
  conflicts: number
  excluded_files: number
  operations: ObjectStorageSyncOperation[]
  sync_report_path: string | null
  conflict_artifacts: string[]
}

export interface S3LivePreflightReport {
  provider_id: 's3'
  proof_level: 'live-read-only-preflight'
  configured: boolean
  status: S3LivePreflightStatus
  bucket_configured: boolean
  region_configured: boolean
  prefix_configured: boolean
  head_bucket_checked: boolean
  list_prefix_checked: boolean
  message: string
  checked_at: string
}

export interface S3LivePreflightArgs {
  bucket?: string
  region?: string
  prefix?: string
}

export type ObjectStorageSyncProgressEvent =
  | { event: 'Started'; data: { totalFiles: number } }
  | { event: 'Progress'; data: { processedFiles: number; totalFiles: number; currentPath: string } }
  | { event: 'Cancelled' }
  | { event: 'Finished'; data: { result: ObjectStorageSyncReport } }

/** Opens a folder picker for the local object-storage mirror prototype. */
export function pickObjectStorageMirrorFolder(providerId: ObjectStorageProviderId): Promise<string | null> {
  return pickFolder(`Choose ${providerLabel(providerId)} local mirror folder`)
}

/** Builds a push preview from the local vault into the mirror target. */
export function previewObjectStoragePush(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
): Promise<ObjectStorageSyncReport> {
  return invokeStorageCommand('storage_push_preview', vaultPath, mirrorPath, providerId)
}

/** Builds a pull preview from the mirror target into the local vault. */
export function previewObjectStoragePull(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
): Promise<ObjectStorageSyncReport> {
  return invokeStorageCommand('storage_pull_preview', vaultPath, mirrorPath, providerId)
}

/** Builds a cancellable push preview from the local vault into the mirror target. */
export function previewObjectStoragePushWithProgress(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
  operationId: string,
  onEvent: (event: ObjectStorageSyncProgressEvent) => void,
): Promise<ObjectStorageSyncReport> {
  return invokeStorageCommandWithProgress('storage_push_preview_with_progress', {
    vaultPath,
    mirrorPath,
    providerId,
    operationId,
  }, onEvent)
}

/** Builds a cancellable pull preview from the mirror target into the local vault. */
export function previewObjectStoragePullWithProgress(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
  operationId: string,
  onEvent: (event: ObjectStorageSyncProgressEvent) => void,
): Promise<ObjectStorageSyncReport> {
  return invokeStorageCommandWithProgress('storage_pull_preview_with_progress', {
    vaultPath,
    mirrorPath,
    providerId,
    operationId,
  }, onEvent)
}

/** Applies a push from the local vault into the mirror target. */
export function applyObjectStoragePush(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
  previewSignature: string,
): Promise<ObjectStorageSyncReport> {
  return applyObjectStorageSync(vaultPath, mirrorPath, providerId, 'push', previewSignature)
}

/** Applies a pull from the mirror target into the local vault. */
export function applyObjectStoragePull(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
  previewSignature: string,
): Promise<ObjectStorageSyncReport> {
  return applyObjectStorageSync(vaultPath, mirrorPath, providerId, 'pull', previewSignature)
}

/** Runs a read-only S3 provider proof using local AWS config and no vault file writes. */
export function runS3LivePreflight(args: S3LivePreflightArgs = {}): Promise<S3LivePreflightReport> {
  const payload = {
    bucket: preflightValue(args.bucket),
    region: preflightValue(args.region),
    prefix: preflightValue(args.prefix),
  }
  return isTauri()
    ? invoke<S3LivePreflightReport>('storage_s3_live_preflight', payload)
    : mockInvoke<S3LivePreflightReport>('storage_s3_live_preflight', payload)
}

/** Applies a cancellable push from the local vault into the mirror target. */
export function applyObjectStoragePushWithProgress(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
  previewSignature: string,
  operationId: string,
  onEvent: (event: ObjectStorageSyncProgressEvent) => void,
): Promise<ObjectStorageSyncReport> {
  return invokeStorageCommandWithProgress('storage_sync_apply_with_progress', {
    vaultPath,
    mirrorPath,
    providerId,
    direction: 'push',
    previewSignature,
    operationId,
  }, onEvent)
}

/** Applies a cancellable pull from the mirror target into the local vault. */
export function applyObjectStoragePullWithProgress(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
  previewSignature: string,
  operationId: string,
  onEvent: (event: ObjectStorageSyncProgressEvent) => void,
): Promise<ObjectStorageSyncReport> {
  return invokeStorageCommandWithProgress('storage_sync_apply_with_progress', {
    vaultPath,
    mirrorPath,
    providerId,
    direction: 'pull',
    previewSignature,
    operationId,
  }, onEvent)
}

/** Summarizes a dry-run object-storage sync preview without hiding exclusions. */
export function formatObjectStoragePreviewToast(report: ObjectStorageSyncReport): string {
  return `${providerLabel(report.provider_id)} local-mirror fixture preview (not live cloud sync): ${syncCountSummary(report)}${previewPlanSummary(report)}`
}

/** Summarizes an applied object-storage sync and points to the local report when present. */
export function formatObjectStorageApplyToast(report: ObjectStorageSyncReport): string {
  const reportPart = report.sync_report_path ? '; local report written' : ''
  return `${providerLabel(report.provider_id)} local-mirror fixture applied (not live cloud sync): ${syncCountSummary(report)}${reportPart}`
}

/** Summarizes a redacted S3 preflight without exposing provider internals. */
export function formatS3LivePreflightToast(report: S3LivePreflightReport): string {
  return `S3 live read-only preflight: ${s3LivePreflightStatusLabel(report.status)}`
}

export function s3LivePreflightStatusLabel(status: S3LivePreflightStatus): string {
  switch (status) {
    case 'missing_config':
      return 'not configured'
    case 'missing_credentials':
      return 'credentials missing'
    case 'auth_denied':
      return 'access denied'
    case 'bucket_missing':
      return 'bucket missing'
    case 'network':
      return 'network failed'
    case 'throttled':
      return 'throttled'
    case 'reachable':
      return 'reachable'
    case 'failed':
      return 'failed'
  }
}

function invokeStorageCommand(
  command: string,
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
): Promise<ObjectStorageSyncReport> {
  const args = { vaultPath, mirrorPath, providerId }
  return isTauri()
    ? invoke<ObjectStorageSyncReport>(command, args)
    : mockInvoke<ObjectStorageSyncReport>(command, args)
}

function applyObjectStorageSync(
  vaultPath: string,
  mirrorPath: string,
  providerId: ObjectStorageProviderId,
  direction: ObjectStorageSyncDirection,
  previewSignature: string,
): Promise<ObjectStorageSyncReport> {
  const args = { vaultPath, mirrorPath, providerId, direction, previewSignature }
  return isTauri()
    ? invoke<ObjectStorageSyncReport>('storage_sync_apply', args)
    : mockInvoke<ObjectStorageSyncReport>('storage_sync_apply', args)
}

async function invokeStorageCommandWithProgress(
  command: 'storage_push_preview_with_progress' | 'storage_pull_preview_with_progress' | 'storage_sync_apply_with_progress',
  args: Record<string, string>,
  onEvent: (event: ObjectStorageSyncProgressEvent) => void,
): Promise<ObjectStorageSyncReport> {
  if (!isTauri()) return runMockStorageSyncWithProgress(command, args, onEvent)

  const channel = await createTauriChannel<ObjectStorageSyncProgressEvent>()
  let finishedResult: ObjectStorageSyncReport | null = null
  channel.onmessage = (event) => {
    if (event.event === 'Finished') finishedResult = event.data.result
    onEvent(event)
  }

  await invoke<void>(command, { ...args, onEvent: channel })
  if (!finishedResult) throw new Error('Object-storage sync finished without a report')
  return finishedResult
}

async function runMockStorageSyncWithProgress(
  command: 'storage_push_preview_with_progress' | 'storage_pull_preview_with_progress' | 'storage_sync_apply_with_progress',
  args: Record<string, string>,
  onEvent: (event: ObjectStorageSyncProgressEvent) => void,
): Promise<ObjectStorageSyncReport> {
  onEvent({ event: 'Started', data: { totalFiles: 1 } })
  const mockCommand = resolveMockStorageCommand(command)
  const result = await mockInvoke<ObjectStorageSyncReport>(mockCommand, args)
  const totalFiles = Math.max(1, result.operations.length)
  onEvent({
    event: 'Progress',
    data: { processedFiles: totalFiles, totalFiles, currentPath: result.operations[0]?.path ?? 'object-storage mirror' },
  })
  onEvent({ event: 'Finished', data: { result } })
  return result
}

function resolveMockStorageCommand(command: 'storage_push_preview_with_progress' | 'storage_pull_preview_with_progress' | 'storage_sync_apply_with_progress') {
  if (command === 'storage_sync_apply_with_progress') return 'storage_sync_apply'
  if (command === 'storage_pull_preview_with_progress') return 'storage_pull_preview'
  return 'storage_push_preview'
}

function syncCountSummary(report: ObjectStorageSyncReport): string {
  return [
    countPart(report.files_to_upload, 'upload'),
    countPart(report.files_to_download, 'download'),
    countPart(report.files_to_delete, 'remote delete'),
    countPart(report.conflicts, 'conflict'),
    countPart(report.excluded_files, 'local-only exclusion'),
  ].join(', ')
}

function previewPlanSummary(report: ObjectStorageSyncReport): string {
  const conflicts = operationPaths(report, 'conflict')
  const exclusions = operationPaths(report, 'exclude')
  const parts = [
    conflicts.length > 0 ? `conflicts: ${compactPathList(conflicts)}` : '',
    exclusions.length > 0 ? `local-only: ${compactPathList(exclusions)}` : '',
  ].filter(Boolean)
  return parts.length > 0 ? `; ${parts.join('; ')}` : ''
}

function operationPaths(
  report: ObjectStorageSyncReport,
  kind: ObjectStorageSyncOperationKind,
): string[] {
  return report.operations
    .filter(operation => operation.kind === kind)
    .map(operation => operation.path)
}

function compactPathList(paths: string[]): string {
  const shown = paths.slice(0, 3).map(compactOperationPath)
  const remainder = paths.length - shown.length
  return remainder > 0 ? `${shown.join(', ')} +${remainder} more` : shown.join(', ')
}

function compactOperationPath(path: string): string {
  if (/^(s3|azblob):\/\//i.test(path)) return 'redacted provider target'
  if (path.startsWith('/Users/') || /^[A-Za-z]:[\\/]/.test(path)) return lastPathPart(path) ?? 'local file'
  return path
}

function lastPathPart(path: string): string | undefined {
  return path.split(/[\\/]/).filter(Boolean).at(-1)
}

function countPart(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}

function providerLabel(providerId: ObjectStorageProviderId): string {
  return providerId === 's3' ? 'S3' : 'Azure Blob'
}

function preflightValue(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}
