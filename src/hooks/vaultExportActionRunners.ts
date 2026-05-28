import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  MarkdownZipExportResult,
  PortabilityProgressState,
  VaultPortabilityActionId,
} from '../lib/vaultPortability'
import type { PortabilityCapsuleFormat } from '../lib/portabilityCapsule'
import { reviewedExportFormat, type PortabilityExportPreviewState } from '../lib/exportReviewGate'
import {
  exportPortabilityCapsule,
  exportMarkdownZipWithProgress,
  exportStaticHtmlArchiveWithProgress,
  formatPortabilityCapsuleExportToast,
  formatPortabilityCapsulePreviewToast,
  formatMarkdownZipExportToast,
  formatStaticHtmlExportToast,
  pickJsonSnapshotExportTarget,
  pickMarkdownZipExportTarget,
  pickSqliteSnapshotExportTarget,
  pickStaticHtmlArchiveTarget,
  previewPortabilityCapsule,
  type VaultExportProgressEvent,
} from '../utils/vaultExport'
import {
  type ActivePortabilityOperation,
  beginPortabilityOperation,
  clearPortabilityOperation,
  errorMessage,
  isCurrentPortabilityOperation,
} from './vaultPortabilityActionHelpers'

interface VaultExportActionRunnerOptions {
  resolvedPath: string
  activeOperationRef: MutableRefObject<ActivePortabilityOperation | null>
  lastExportPreview?: PortabilityExportPreviewState | null
  setActiveAction: Dispatch<SetStateAction<VaultPortabilityActionId | null>>
  setLastExportPreview: Dispatch<SetStateAction<PortabilityExportPreviewState | null>>
  setPortabilityProgress: Dispatch<SetStateAction<PortabilityProgressState | null>>
  setToastMessage: (message: string) => void
  updateProgress: (
    operation: ActivePortabilityOperation,
    label: string,
    event: VaultExportProgressEvent,
  ) => void
}

interface ProgressExportDefinition {
  actionId: VaultPortabilityActionId
  emptyVaultMessage: string
  label: string
  startMessage: string
  pickTarget: () => Promise<string | null>
  exportWithProgress: (
    vaultPath: string,
    targetPath: string,
    operationId: string,
    onEvent: (event: VaultExportProgressEvent) => void,
  ) => Promise<MarkdownZipExportResult>
  formatToast: (result: MarkdownZipExportResult) => string
}

interface CapsuleExportDefinition {
  exportActionId: VaultPortabilityActionId
  previewActionId: VaultPortabilityActionId
  emptyVaultMessage: string
  exportLabel: string
  previewLabel: string
  format: PortabilityCapsuleFormat
  pickTarget: () => Promise<string | null>
}

/** Runs the Markdown ZIP export action with shared cancellation/progress guards. */
export function runMarkdownZipExportAction(options: VaultExportActionRunnerOptions): Promise<void> {
  return runProgressExportAction(options, {
    actionId: 'export-markdown-zip',
    emptyVaultMessage: 'Open a vault before exporting Markdown',
    label: 'Markdown ZIP export',
    startMessage: 'Exporting Markdown ZIP...',
    pickTarget: pickMarkdownZipExportTarget,
    exportWithProgress: exportMarkdownZipWithProgress,
    formatToast: formatMarkdownZipExportToast,
  })
}

/** Runs the static HTML export action with shared cancellation/progress guards. */
export function runStaticHtmlExportAction(options: VaultExportActionRunnerOptions): Promise<void> {
  return runProgressExportAction(options, {
    actionId: 'export-static-html',
    emptyVaultMessage: 'Open a vault before exporting HTML',
    label: 'Static HTML export',
    startMessage: 'Exporting static HTML...',
    pickTarget: pickStaticHtmlArchiveTarget,
    exportWithProgress: exportStaticHtmlArchiveWithProgress,
    formatToast: formatStaticHtmlExportToast,
  })
}

/** Reviews a JSON or SQLite capsule manifest without writing an export. */
export async function runPortabilityCapsulePreviewAction(
  options: VaultExportActionRunnerOptions,
  format: PortabilityCapsuleFormat,
): Promise<void> {
  const definition = capsuleDefinition(format)
  if (!options.resolvedPath.trim()) {
    options.setToastMessage(definition.emptyVaultMessage)
    return
  }

  options.setActiveAction(definition.previewActionId)
  try {
    options.setToastMessage(`Previewing ${definition.previewLabel}...`)
    const result = await previewPortabilityCapsule(options.resolvedPath, format)
    options.setLastExportPreview({ format, result })
    options.setToastMessage(formatPortabilityCapsulePreviewToast(result))
  } catch (error) {
    options.setLastExportPreview(null)
    options.setToastMessage(`Preview failed: ${errorMessage(error, 'Preview failed')}`)
  } finally {
    options.setActiveAction(null)
  }
}

/** Exports a JSON or SQLite capsule after the user chooses a local target. */
export async function runPortabilityCapsuleExportAction(
  options: VaultExportActionRunnerOptions,
  format: PortabilityCapsuleFormat,
): Promise<void> {
  const definition = capsuleDefinition(format)
  if (!options.resolvedPath.trim()) {
    options.setToastMessage(definition.emptyVaultMessage)
    return
  }

  options.setActiveAction(definition.exportActionId)
  try {
    if (!reviewedExportFormat(definition.exportActionId, options.lastExportPreview ?? null)) {
      options.setToastMessage(`Preview ${definition.exportLabel} before exporting`)
      return
    }
    const targetPath = await definition.pickTarget()
    if (!targetPath) return
    options.setLastExportPreview(null)
    options.setToastMessage(`Exporting ${definition.exportLabel}...`)
    const result = await exportPortabilityCapsule(options.resolvedPath, targetPath, format)
    options.setToastMessage(formatPortabilityCapsuleExportToast(result, format))
  } catch (error) {
    options.setToastMessage(`Export failed: ${errorMessage(error, 'Export failed')}`)
  } finally {
    options.setActiveAction(null)
  }
}

function capsuleDefinition(format: PortabilityCapsuleFormat): CapsuleExportDefinition {
  if (format === 'json') {
    return {
      exportActionId: 'export-json',
      previewActionId: 'export-json-preview',
      emptyVaultMessage: 'Open a vault before exporting JSON',
      exportLabel: 'JSON snapshot',
      previewLabel: 'JSON snapshot',
      format,
      pickTarget: pickJsonSnapshotExportTarget,
    }
  }
  return {
    exportActionId: 'export-sqlite',
    previewActionId: 'export-sqlite-preview',
    emptyVaultMessage: 'Open a vault before exporting SQLite',
    exportLabel: 'SQLite snapshot',
    previewLabel: 'SQLite snapshot',
    format,
    pickTarget: pickSqliteSnapshotExportTarget,
  }
}

async function runProgressExportAction(
  {
    resolvedPath,
    activeOperationRef,
    setActiveAction,
    setPortabilityProgress,
    setToastMessage,
    updateProgress,
  }: VaultExportActionRunnerOptions,
  definition: ProgressExportDefinition,
): Promise<void> {
  if (!resolvedPath.trim()) {
    setToastMessage(definition.emptyVaultMessage)
    return
  }

  setActiveAction(definition.actionId)
  let operation: ActivePortabilityOperation | null = null
  try {
    const targetPath = await definition.pickTarget()
    if (!targetPath) return

    const activeOperation = beginPortabilityOperation(
      definition.actionId,
      definition.label,
      activeOperationRef,
      setPortabilityProgress,
    )
    operation = activeOperation
    setToastMessage(definition.startMessage)
    const result = await definition.exportWithProgress(
      resolvedPath,
      targetPath,
      activeOperation.operationId,
      (event) => updateProgress(activeOperation, definition.label, event),
    )
    if (!isCurrentPortabilityOperation(activeOperationRef.current, activeOperation.operationId) || activeOperation.cancelled) return
    setToastMessage(definition.formatToast(result))
  } catch (error) {
    if (!operation?.cancelled) setToastMessage(`Export failed: ${errorMessage(error, 'Export failed')}`)
  } finally {
    clearPortabilityOperation(operation, activeOperationRef, setPortabilityProgress)
    setActiveAction(null)
  }
}
