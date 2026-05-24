import type { Dispatch, MutableRefObject, SetStateAction } from 'react'
import type {
  MarkdownZipExportResult,
  PortabilityProgressState,
  VaultPortabilityActionId,
} from '../lib/vaultPortability'
import {
  exportMarkdownZipWithProgress,
  exportStaticHtmlArchiveWithProgress,
  formatMarkdownZipExportToast,
  formatStaticHtmlExportToast,
  pickMarkdownZipExportTarget,
  pickStaticHtmlArchiveTarget,
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
  setActiveAction: Dispatch<SetStateAction<VaultPortabilityActionId | null>>
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
