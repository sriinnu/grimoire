import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  ImportAutopsyPreviewState,
  PortabilityProgressState,
  VaultPortabilityActionId,
} from '../lib/vaultPortability'
import type { PortabilityExportPreviewState } from '../lib/exportReviewGate'
import type { ObjectStorageProviderId } from '../lib/objectStorageAdapterDesign'
import type {
  AppImportSource,
  JournalImportSource,
} from '../utils/markdownFolderImport'
import type { PortabilityCapsuleFormat } from '../lib/portabilityCapsule'
import type { AzureLivePreflightArgs, AzureLivePreflightReport } from '../utils/objectStorageLivePreflight'
import type { ObjectStorageSyncReport, S3LivePreflightArgs, S3LivePreflightReport } from '../utils/objectStorageSync'

export type PortabilityOperationProgressEvent =
  | { event: 'Started'; data: { totalFiles: number } }
  | { event: 'Progress'; data: { processedFiles: number; totalFiles: number; currentPath: string } }
  | { event: 'Cancelled' }
  | { event: 'Finished'; data: unknown }

export interface VaultPortabilityActionsOptions {
  resolvedPath: string
  reloadVault: () => Promise<unknown>
  reloadFolders: () => Promise<unknown>
  loadModifiedFiles: () => Promise<unknown>
  setToastMessage: (message: string) => void
}

export interface VaultPortabilityActions {
  markdownImportBusy: boolean
  portabilityBusyAction: VaultPortabilityActionId | null
  portabilityProgress: PortabilityProgressState | null
  lastImportPreview: ImportAutopsyPreviewState | null
  lastExportPreview: PortabilityExportPreviewState | null
  handleCancelPortabilityAction: () => void
  handlePreviewMarkdownFolder: () => void; handleImportMarkdownFolder: () => void
  handlePreviewMarkdownZip: () => void; handleImportMarkdownZip: () => void
  handlePreviewBear: () => void; handleImportBear: () => void
  handlePreviewObsidian: () => void; handleImportObsidian: () => void
  handlePreviewNotion: () => void; handleImportNotion: () => void
  handlePreviewNotionFolder: () => void; handleImportNotionFolder: () => void
  handlePreviewSpanda: () => void; handleImportSpanda: () => void
  handlePreviewAppleJournal: () => void; handleImportAppleJournal: () => void
  handlePreviewDayOne: () => void; handleImportDayOne: () => void
  handlePreviewJourney: () => void; handleImportJourney: () => void
  handlePreviewJsonCapsule: () => void; handleImportJsonCapsule: () => void
  handlePreviewSqliteCapsule: () => void; handleImportSqliteCapsule: () => void
  handleExportMarkdownZip: () => void
  handleExportStaticHtmlArchive: () => void
  handlePreviewJsonSnapshot: () => void
  handleExportJsonSnapshot: () => void
  handlePreviewSqliteSnapshot: () => void
  handleExportSqliteSnapshot: () => void
  s3MirrorPreviewReady: boolean
  s3MirrorPullPreviewReady: boolean
  s3ProviderPushPreviewReady: boolean
  s3ProviderPullPreviewReady: boolean
  azureProviderPushPreviewReady: boolean
  azureProviderPullPreviewReady: boolean
  azureMirrorPreviewReady: boolean
  azureMirrorPullPreviewReady: boolean
  s3MirrorPreviewReport?: ObjectStorageSyncReport
  s3MirrorPullPreviewReport?: ObjectStorageSyncReport
  s3ProviderPushPreviewReport?: ObjectStorageSyncReport
  s3ProviderPullPreviewReport?: ObjectStorageSyncReport
  azureProviderPushPreviewReport?: ObjectStorageSyncReport
  azureProviderPullPreviewReport?: ObjectStorageSyncReport
  azureMirrorPreviewReport?: ObjectStorageSyncReport
  azureMirrorPullPreviewReport?: ObjectStorageSyncReport
  s3LivePreflightReport?: S3LivePreflightReport
  azureLivePreflightReport?: AzureLivePreflightReport
  handleS3LivePreflight: (args?: S3LivePreflightArgs) => void
  handleAzureLivePreflight: (args?: AzureLivePreflightArgs) => void
  handlePreviewS3MirrorPush: () => void; handleApplyS3MirrorPush: () => void
  handlePreviewS3MirrorPull: () => void; handleApplyS3MirrorPull: () => void
  handlePreviewS3ProviderPush: (args?: S3LivePreflightArgs) => void
  handleApplyS3ProviderPush: (args?: S3LivePreflightArgs) => void
  handlePreviewS3ProviderPull: (args?: S3LivePreflightArgs) => void
  handleApplyS3ProviderPull: (args?: S3LivePreflightArgs) => void
  handlePreviewAzureProviderPush: (args?: AzureLivePreflightArgs) => void
  handleApplyAzureProviderPush: (args?: AzureLivePreflightArgs) => void
  handlePreviewAzureProviderPull: (args?: AzureLivePreflightArgs) => void
  handleApplyAzureProviderPull: (args?: AzureLivePreflightArgs) => void
  handlePreviewAzureMirrorPush: () => void; handleApplyAzureMirrorPush: () => void
  handlePreviewAzureMirrorPull: () => void; handleApplyAzureMirrorPull: () => void
}

let nextOperationSequence = 0

export interface ActivePortabilityOperation {
  actionId: VaultPortabilityActionId
  cancelled: boolean
  operationId: string
}

/** Creates a locally unique operation id for cancellable import jobs. */
export function createPortabilityOperation(actionId: VaultPortabilityActionId): ActivePortabilityOperation {
  nextOperationSequence += 1
  return {
    actionId,
    cancelled: false,
    operationId: `${actionId}-${Date.now()}-${nextOperationSequence}`,
  }
}

/** Returns the first visible state for a cancellable import job. */
export function startingPortabilityProgress(
  operation: ActivePortabilityOperation,
  label: string,
): PortabilityProgressState {
  return {
    actionId: operation.actionId,
    operationId: operation.operationId,
    label,
    processedFiles: 0,
    totalFiles: null,
    currentPath: null,
    phase: 'starting',
  }
}

/** Starts a cancellable operation and exposes its first Settings progress state. */
export function beginPortabilityOperation(
  actionId: VaultPortabilityActionId,
  label: string,
  activeOperationRef: MutableRefObject<ActivePortabilityOperation | null>,
  setPortabilityProgress: Dispatch<SetStateAction<PortabilityProgressState | null>>,
): ActivePortabilityOperation {
  const operation = createPortabilityOperation(actionId)
  activeOperationRef.current = operation
  setPortabilityProgress(startingPortabilityProgress(operation, label))
  return operation
}

/** Clears a cancellable operation when its completion path still owns the token. */
export function clearPortabilityOperation(
  operation: ActivePortabilityOperation | null,
  activeOperationRef: MutableRefObject<ActivePortabilityOperation | null>,
  setPortabilityProgress: Dispatch<SetStateAction<PortabilityProgressState | null>>,
): void {
  if (operation && activeOperationRef.current?.operationId === operation.operationId) {
    activeOperationRef.current = null
  }
  setPortabilityProgress(null)
}

/** Guards late progress events from an older import operation. */
export function isCurrentPortabilityOperation(
  operation: ActivePortabilityOperation | null,
  operationId: string,
): boolean {
  return operation?.operationId === operationId
}

/** Maps native import channel events into the Settings progress model. */
export function nextPortabilityImportProgress(
  current: PortabilityProgressState | null,
  operation: ActivePortabilityOperation,
  label: string,
  event: PortabilityOperationProgressEvent,
): PortabilityProgressState | null {
  if (event.event === 'Cancelled') return current ? { ...current, phase: 'cancelling' } : current
  if (event.event === 'Finished') return current

  return {
    actionId: operation.actionId,
    operationId: operation.operationId,
    label,
    processedFiles: event.event === 'Progress' ? event.data.processedFiles : current?.processedFiles ?? 0,
    totalFiles: event.data.totalFiles,
    currentPath: event.event === 'Progress' ? event.data.currentPath : current?.currentPath ?? null,
    phase: event.event === 'Progress' ? 'copying' : 'starting',
  }
}

/** Resolves the storage preview/apply action id for a provider. */
export function objectStorageActionId(
  providerId: ObjectStorageProviderId,
  direction: 'push' | 'pull',
  mode: 'preview' | 'apply',
): VaultPortabilityActionId {
  if (providerId === 's3' && direction === 'pull') {
    return mode === 'preview' ? 'storage-s3-pull-preview' : 'storage-s3-pull-apply'
  }
  if (providerId === 's3') return mode === 'preview' ? 'storage-s3-preview' : 'storage-s3-apply'
  if (direction === 'pull') return mode === 'preview' ? 'storage-azure-pull-preview' : 'storage-azure-pull-apply'
  return mode === 'preview' ? 'storage-azure-preview' : 'storage-azure-apply'
}

/** Resolves the import preview/apply action id for app exports. */
export function appImportActionId(source: AppImportSource, mode: 'preview' | 'import'): VaultPortabilityActionId {
  if (mode === 'import') return source
  if (source === 'obsidian') return 'obsidian-preview'
  if (source === 'notion-markdown') return 'notion-markdown-preview'
  if (source === 'notion-folder') return 'notion-folder-preview'
  return 'spanda-preview'
}

/** Resolves the import preview/apply action id for journal exports. */
export function journalActionId(
  source: JournalImportSource,
  mode: 'preview' | 'import',
): VaultPortabilityActionId {
  if (mode === 'import') return source
  if (source === 'apple-journal') return 'apple-journal-preview'
  if (source === 'day-one') return 'day-one-preview'
  return 'journey-preview'
}

/** Resolves the import preview/apply action id for Grimoire capsules. */
export function capsuleImportActionId(
  format: PortabilityCapsuleFormat,
  mode: 'preview' | 'import',
): VaultPortabilityActionId {
  if (format === 'json') return mode === 'preview' ? 'json-capsule-preview' : 'json-capsule'
  return mode === 'preview' ? 'sqlite-capsule-preview' : 'sqlite-capsule'
}

/** Returns the short provider label used in storage sync feedback. */
export function objectStorageLabel(providerId: ObjectStorageProviderId): string {
  return providerId === 's3' ? 'S3' : 'Azure Blob'
}

/** Returns the source label used in app import feedback and preview state. */
export function appImportLabel(source: AppImportSource): string {
  if (source === 'obsidian') return 'Obsidian vault'
  if (source === 'notion-markdown') return 'Notion Markdown ZIP'
  if (source === 'notion-folder') return 'Notion Markdown folder'
  return 'Spanda export'
}

/** Returns the source label used in journal import feedback and preview state. */
export function journalImportLabel(source: JournalImportSource): string {
  if (source === 'day-one') return 'Day One'
  if (source === 'apple-journal') return 'Apple Journal'
  return 'Journey'
}

/** Returns the cancellation toast for the active portability lane. */
export function cancelToastForAction(actionId: VaultPortabilityActionId): string {
  if (actionId.startsWith('export')) return 'Export cancelled'
  if (actionId.startsWith('storage')) return 'Storage sync cancelled'
  return 'Import cancelled'
}

/** Converts an unknown error into copy-safe toast text. */
export function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return fallback
}
