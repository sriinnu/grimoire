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

export interface ObjectStorageSyncOperation {
  kind: ObjectStorageSyncOperationKind
  path: string
  reason: string
}

export interface ObjectStorageSyncReport {
  provider_id: ObjectStorageProviderId
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
  return `${providerLabel(report.provider_id)} preview: ${syncCountSummary(report)}${previewPlanSummary(report)}`
}

/** Summarizes an applied object-storage sync and points to the local report when present. */
export function formatObjectStorageApplyToast(report: ObjectStorageSyncReport): string {
  const reportPart = report.sync_report_path ? '; local report written' : ''
  return `${providerLabel(report.provider_id)} sync applied: ${syncCountSummary(report)}${reportPart}`
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
  const shown = paths.slice(0, 3)
  const remainder = paths.length - shown.length
  return remainder > 0 ? `${shown.join(', ')} +${remainder} more` : shown.join(', ')
}

function countPart(count: number, label: string): string {
  return `${count} ${label}${count === 1 ? '' : 's'}`
}

function providerLabel(providerId: ObjectStorageProviderId): string {
  return providerId === 's3' ? 'S3' : 'Azure Blob'
}
