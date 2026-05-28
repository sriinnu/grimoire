import { useCallback, useEffect, useRef, useState } from 'react'
import {
  cancelPortabilityOperation,
  formatMarkdownImportToast,
  formatMarkdownImportPreviewToast,
  importAppExportIntoVaultWithProgress,
  importJournalExportIntoVaultWithProgress,
  importMarkdownFolderIntoVaultWithProgress,
  importMarkdownZipIntoVaultWithProgress,
  pickAppImportSource,
  pickBearImportFolder,
  pickJournalImportSource,
  pickMarkdownImportFolder,
  pickMarkdownZipImportFile,
  previewAppExportIntoVault,
  previewJournalExportIntoVault,
  previewMarkdownFolderImport,
  previewMarkdownZipImport,
  type AppImportSource,
  type JournalImportSource,
} from '../utils/markdownFolderImport'
import {
  formatPortabilityCapsuleImportPreviewToast,
  formatPortabilityCapsuleImportToast,
  importPortabilityCapsuleIntoVault,
  pickJsonCapsuleImportFile,
  pickSqliteCapsuleImportFile,
  previewPortabilityCapsuleImport,
} from '../utils/portabilityCapsuleImport'
import { reviewedImportSourcePath } from '../lib/importReviewGate'
import {
  runMarkdownZipExportAction,
  runPortabilityCapsuleExportAction,
  runPortabilityCapsulePreviewAction,
  runStaticHtmlExportAction,
} from './vaultExportActionRunners'
import type { ImportAutopsyPreviewState, PortabilityProgressState, VaultPortabilityActionId } from '../lib/vaultPortability'
import type { PortabilityCapsuleFormat } from '../lib/portabilityCapsule'
import {
  type ActivePortabilityOperation,
  appImportActionId,
  appImportLabel,
  beginPortabilityOperation,
  capsuleImportActionId,
  clearPortabilityOperation,
  errorMessage,
  isCurrentPortabilityOperation,
  journalActionId,
  journalImportLabel,
  nextPortabilityImportProgress,
  type PortabilityOperationProgressEvent,
  type VaultPortabilityActions,
  type VaultPortabilityActionsOptions,
} from './vaultPortabilityActionHelpers'
import { useObjectStoragePortabilityActions } from './useObjectStoragePortabilityActions'

type MarkdownFolderSource = 'markdown-folder' | 'bear' | 'markdown-zip'
/** Owns vault import/export actions so App only wires the surface. */
export function useVaultPortabilityActions({
  resolvedPath,
  reloadVault,
  reloadFolders,
  loadModifiedFiles,
  setToastMessage,
}: VaultPortabilityActionsOptions): VaultPortabilityActions {
  const [activeAction, setActiveAction] = useState<VaultPortabilityActionId | null>(null)
  const [portabilityProgress, setPortabilityProgress] = useState<PortabilityProgressState | null>(null)
  const [lastImportPreview, setLastImportPreview] = useState<ImportAutopsyPreviewState | null>(null)
  const activeOperationRef = useRef<ActivePortabilityOperation | null>(null)
  const markdownImportBusy = activeAction !== null

  useEffect(() => {
    setLastImportPreview(null)
    setPortabilityProgress(null)
    activeOperationRef.current = null
  }, [resolvedPath])

  const reloadAfterImport = useCallback(async () => {
    await reloadVault()
    await reloadFolders()
    await loadModifiedFiles()
  }, [loadModifiedFiles, reloadFolders, reloadVault])
  const rememberImportPreview = useCallback((
    sourceId: VaultPortabilityActionId,
    result: ImportAutopsyPreviewState['result'],
  ) => setLastImportPreview({ sourceId, result }), [])
  const updateImportProgress = useCallback((
    operation: ActivePortabilityOperation,
    label: string,
    event: PortabilityOperationProgressEvent,
  ) => {
    if (!isCurrentPortabilityOperation(activeOperationRef.current, operation.operationId)) return
    setPortabilityProgress((current) => nextPortabilityImportProgress(current, operation, label, event))
  }, [])
  const objectStorageActions = useObjectStoragePortabilityActions({
    resolvedPath,
    reloadVault,
    reloadFolders,
    loadModifiedFiles,
    setToastMessage,
    activeOperationRef,
    setActiveAction,
    setPortabilityProgress,
    updateProgress: updateImportProgress,
  })
  const handleCancelPortabilityAction = useCallback(() => {
    const operation = activeOperationRef.current
    if (!operation) return
    operation.cancelled = true
    setPortabilityProgress((current) => current ? { ...current, phase: 'cancelling' } : current)
    void cancelPortabilityOperation(operation.operationId)
    activeOperationRef.current = null
    setActiveAction(null)
    setPortabilityProgress(null)
    setToastMessage(cancelToastForAction(operation.actionId))
  }, [setToastMessage])
  const handlePreviewFolder = useCallback(async (source: MarkdownFolderSource) => {
    if (!resolvedPath.trim()) {
      setToastMessage('Open a vault before previewing an import')
      return
    }
    const label = source === 'bear' ? 'Bear export' : 'Markdown folder'
    const actionId = source === 'bear' ? 'bear-preview' : 'markdown-folder-preview'
    setActiveAction(actionId)
    try {
      const sourcePath = source === 'bear' ? await pickBearImportFolder() : await pickMarkdownImportFolder()
      if (!sourcePath) return

      setToastMessage(`Previewing ${label} import...`)
      const result = await previewMarkdownFolderImport(resolvedPath, sourcePath)
      rememberImportPreview(actionId, result)
      setToastMessage(formatMarkdownImportPreviewToast(result))
    } catch (error) {
      setLastImportPreview(null)
      setToastMessage(`Preview failed: ${errorMessage(error, 'Preview failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [rememberImportPreview, resolvedPath, setToastMessage])
  const handleImportFolder = useCallback(async (source: MarkdownFolderSource) => {
    if (!resolvedPath.trim()) {
      setToastMessage('Open a vault before importing Markdown')
      return
    }
    const label = source === 'bear' ? 'Bear export' : source === 'markdown-zip' ? 'Markdown ZIP' : 'Markdown folder'
    setActiveAction(source)
    let operation: ActivePortabilityOperation | null = null
    try {
      const sourcePath = reviewedImportSourcePath(source, lastImportPreview)
      if (!sourcePath) {
        setToastMessage(`Preview ${label} before importing to the vault`)
        return
      }
      const activeOperation = beginPortabilityOperation(source, label, activeOperationRef, setPortabilityProgress)
      operation = activeOperation
      setLastImportPreview(null)
      setToastMessage(`Importing ${label}...`)
      const importWithProgress = source === 'markdown-zip'
        ? importMarkdownZipIntoVaultWithProgress
        : importMarkdownFolderIntoVaultWithProgress
      const result = await importWithProgress(resolvedPath, sourcePath, activeOperation.operationId, (event) => {
        updateImportProgress(activeOperation, label, event)
      })
      if (!isCurrentPortabilityOperation(activeOperationRef.current, activeOperation.operationId) || activeOperation.cancelled) return
      await reloadAfterImport()
      setToastMessage(formatMarkdownImportToast(result))
    } catch (error) {
      if (!operation?.cancelled) {
        setToastMessage(`Import failed: ${errorMessage(error, 'Import failed')}`)
      }
    } finally {
      clearPortabilityOperation(operation, activeOperationRef, setPortabilityProgress)
      setActiveAction(null)
    }
  }, [lastImportPreview, reloadAfterImport, resolvedPath, setToastMessage, updateImportProgress])
  const handlePreviewMarkdownZip = useCallback(async () => {
    if (!resolvedPath.trim()) {
      setToastMessage('Open a vault before previewing an import')
      return
    }
    const actionId = 'markdown-zip-preview'
    setActiveAction(actionId)
    try {
      const sourcePath = await pickMarkdownZipImportFile()
      if (!sourcePath) return
      setToastMessage('Previewing Markdown ZIP import...')
      const result = await previewMarkdownZipImport(resolvedPath, sourcePath)
      rememberImportPreview(actionId, result)
      setToastMessage(formatMarkdownImportPreviewToast(result))
    } catch (error) {
      setLastImportPreview(null)
      setToastMessage(`Preview failed: ${errorMessage(error, 'Preview failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [rememberImportPreview, resolvedPath, setToastMessage])
  const handleJournalExport = useCallback(async (source: JournalImportSource, mode: 'preview' | 'import') => {
    if (!resolvedPath.trim()) {
      setToastMessage(`Open a vault before ${mode === 'preview' ? 'previewing' : 'importing'} journals`)
      return
    }
    const actionId = journalActionId(source, mode)
    const label = journalImportLabel(source)
    setActiveAction(actionId)
    let operation: ActivePortabilityOperation | null = null
    try {
      const sourcePath = mode === 'preview'
        ? await pickJournalImportSource(source)
        : reviewedImportSourcePath(actionId, lastImportPreview)
      if (!sourcePath) {
        if (mode === 'import') setToastMessage(`Preview ${label} before importing to the vault`)
        return
      }
      setToastMessage(`${mode === 'preview' ? 'Previewing' : 'Importing'} ${label} export...`)
      if (mode === 'preview') {
        const result = await previewJournalExportIntoVault(resolvedPath, sourcePath, source)
        rememberImportPreview(actionId, result)
        setToastMessage(formatMarkdownImportPreviewToast(result))
      } else {
        const activeOperation = beginPortabilityOperation(source, label, activeOperationRef, setPortabilityProgress)
        operation = activeOperation
        setLastImportPreview(null)
        const result = await importJournalExportIntoVaultWithProgress(
          resolvedPath, sourcePath, source, activeOperation.operationId,
          (event) => updateImportProgress(activeOperation, label, event),
        )
        if (!isCurrentPortabilityOperation(activeOperationRef.current, activeOperation.operationId) || activeOperation.cancelled) return
        await reloadAfterImport()
        setToastMessage(formatMarkdownImportToast(result))
      }
    } catch (error) {
      if (mode === 'preview') setLastImportPreview(null)
      if (mode === 'preview' || !operation?.cancelled) {
        setToastMessage(`${mode === 'preview' ? 'Preview' : 'Import'} failed: ${errorMessage(error, 'Import failed')}`)
      }
    } finally {
      clearPortabilityOperation(operation, activeOperationRef, setPortabilityProgress)
      setActiveAction(null)
    }
  }, [lastImportPreview, reloadAfterImport, rememberImportPreview, resolvedPath, setToastMessage, updateImportProgress])
  const handleAppExport = useCallback(async (source: AppImportSource, mode: 'preview' | 'import') => {
    if (!resolvedPath.trim()) {
      setToastMessage(`Open a vault before ${mode === 'preview' ? 'previewing' : 'importing'} app exports`)
      return
    }
    const label = appImportLabel(source)
    setActiveAction(appImportActionId(source, mode))
    let operation: ActivePortabilityOperation | null = null
    try {
      const sourcePath = mode === 'preview'
        ? await pickAppImportSource(source)
        : reviewedImportSourcePath(appImportActionId(source, 'import'), lastImportPreview)
      if (!sourcePath) {
        if (mode === 'import') setToastMessage(`Preview ${label} before importing to the vault`)
        return
      }

      setToastMessage(`${mode === 'preview' ? 'Previewing' : 'Importing'} ${label}...`)
      if (mode === 'preview') {
        const result = await previewAppExportIntoVault(resolvedPath, sourcePath, source)
        rememberImportPreview(appImportActionId(source, mode), result)
        setToastMessage(formatMarkdownImportPreviewToast(result))
      } else {
        const activeOperation = beginPortabilityOperation(source, label, activeOperationRef, setPortabilityProgress)
        operation = activeOperation
        setLastImportPreview(null)
        const result = await importAppExportIntoVaultWithProgress(
          resolvedPath, sourcePath, source, activeOperation.operationId,
          (event) => updateImportProgress(activeOperation, label, event),
        )
        if (!isCurrentPortabilityOperation(activeOperationRef.current, activeOperation.operationId) || activeOperation.cancelled) return
        await reloadAfterImport()
        setToastMessage(formatMarkdownImportToast(result))
      }
    } catch (error) {
      if (mode === 'preview') setLastImportPreview(null)
      if (mode === 'preview' || !operation?.cancelled) {
        setToastMessage(`${mode === 'preview' ? 'Preview' : 'Import'} failed: ${errorMessage(error, 'Import failed')}`)
      }
    } finally {
      clearPortabilityOperation(operation, activeOperationRef, setPortabilityProgress)
      setActiveAction(null)
    }
  }, [lastImportPreview, reloadAfterImport, rememberImportPreview, resolvedPath, setToastMessage, updateImportProgress])
  const handleCapsuleImport = useCallback(async (format: PortabilityCapsuleFormat, mode: 'preview' | 'import') => {
    if (!resolvedPath.trim()) {
      setToastMessage(`Open a vault before ${mode === 'preview' ? 'previewing' : 'importing'} capsules`)
      return
    }
    const actionId = capsuleImportActionId(format, mode)
    const label = format === 'json' ? 'JSON capsule' : 'SQLite capsule'
    setActiveAction(actionId)
    try {
      const sourcePath = mode === 'preview'
        ? format === 'json' ? await pickJsonCapsuleImportFile() : await pickSqliteCapsuleImportFile()
        : reviewedImportSourcePath(actionId, lastImportPreview)
      if (!sourcePath) {
        if (mode === 'import') setToastMessage(`Preview ${label} before importing to the vault`)
        return
      }

      setToastMessage(`${mode === 'preview' ? 'Previewing' : 'Importing'} ${label}...`)
      if (mode === 'preview') {
        const result = await previewPortabilityCapsuleImport(resolvedPath, sourcePath, format)
        rememberImportPreview(actionId, result)
        setToastMessage(formatPortabilityCapsuleImportPreviewToast(result, format))
      } else {
        setLastImportPreview(null)
        const result = await importPortabilityCapsuleIntoVault(resolvedPath, sourcePath, format)
        await reloadAfterImport()
        setToastMessage(formatPortabilityCapsuleImportToast(result, format))
      }
    } catch (error) {
      if (mode === 'preview') setLastImportPreview(null)
      setToastMessage(`${mode === 'preview' ? 'Preview' : 'Import'} failed: ${errorMessage(error, 'Import failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [lastImportPreview, reloadAfterImport, rememberImportPreview, resolvedPath, setToastMessage])
  const handleExportMarkdownZip = useCallback(async () => {
    await runMarkdownZipExportAction({
      resolvedPath,
      activeOperationRef,
      setActiveAction,
      setPortabilityProgress,
      setToastMessage,
      updateProgress: updateImportProgress,
    })
  }, [resolvedPath, setToastMessage, updateImportProgress])
  const handleExportStaticHtmlArchive = useCallback(async () => {
    await runStaticHtmlExportAction({
      resolvedPath,
      activeOperationRef,
      setActiveAction,
      setPortabilityProgress,
      setToastMessage,
      updateProgress: updateImportProgress,
    })
  }, [resolvedPath, setToastMessage, updateImportProgress])

  const exportRunnerOptions = useCallback(() => ({
    resolvedPath,
    activeOperationRef,
    setActiveAction,
    setPortabilityProgress,
    setToastMessage,
    updateProgress: updateImportProgress,
  }), [resolvedPath, setToastMessage, updateImportProgress])

  const handlePreviewJsonSnapshot = useCallback(async () => {
    await runPortabilityCapsulePreviewAction(exportRunnerOptions(), 'json')
  }, [exportRunnerOptions])

  const handleExportJsonSnapshot = useCallback(async () => {
    await runPortabilityCapsuleExportAction(exportRunnerOptions(), 'json')
  }, [exportRunnerOptions])

  const handlePreviewSqliteSnapshot = useCallback(async () => {
    await runPortabilityCapsulePreviewAction(exportRunnerOptions(), 'sqlite')
  }, [exportRunnerOptions])

  const handleExportSqliteSnapshot = useCallback(async () => {
    await runPortabilityCapsuleExportAction(exportRunnerOptions(), 'sqlite')
  }, [exportRunnerOptions])

  return {
    markdownImportBusy,
    portabilityBusyAction: activeAction,
    portabilityProgress,
    lastImportPreview,
    handleCancelPortabilityAction,
    handlePreviewMarkdownFolder: () => { void handlePreviewFolder('markdown-folder') }, handleImportMarkdownFolder: () => { void handleImportFolder('markdown-folder') },
    handlePreviewMarkdownZip: () => { void handlePreviewMarkdownZip() }, handleImportMarkdownZip: () => { void handleImportFolder('markdown-zip') },
    handlePreviewBear: () => { void handlePreviewFolder('bear') }, handleImportBear: () => { void handleImportFolder('bear') },
    handlePreviewObsidian: () => { void handleAppExport('obsidian', 'preview') }, handleImportObsidian: () => { void handleAppExport('obsidian', 'import') },
    handlePreviewNotion: () => { void handleAppExport('notion-markdown', 'preview') }, handleImportNotion: () => { void handleAppExport('notion-markdown', 'import') },
    handlePreviewNotionFolder: () => { void handleAppExport('notion-folder', 'preview') }, handleImportNotionFolder: () => { void handleAppExport('notion-folder', 'import') },
    handlePreviewSpanda: () => { void handleAppExport('spanda', 'preview') }, handleImportSpanda: () => { void handleAppExport('spanda', 'import') },
    handlePreviewAppleJournal: () => { void handleJournalExport('apple-journal', 'preview') }, handleImportAppleJournal: () => { void handleJournalExport('apple-journal', 'import') },
    handlePreviewDayOne: () => { void handleJournalExport('day-one', 'preview') }, handleImportDayOne: () => { void handleJournalExport('day-one', 'import') },
    handlePreviewJourney: () => { void handleJournalExport('journey', 'preview') }, handleImportJourney: () => { void handleJournalExport('journey', 'import') },
    handlePreviewJsonCapsule: () => { void handleCapsuleImport('json', 'preview') },
    handleImportJsonCapsule: () => { void handleCapsuleImport('json', 'import') },
    handlePreviewSqliteCapsule: () => { void handleCapsuleImport('sqlite', 'preview') },
    handleImportSqliteCapsule: () => { void handleCapsuleImport('sqlite', 'import') },
    handleExportMarkdownZip: () => { void handleExportMarkdownZip() },
    handleExportStaticHtmlArchive: () => { void handleExportStaticHtmlArchive() },
    handlePreviewJsonSnapshot: () => { void handlePreviewJsonSnapshot() },
    handleExportJsonSnapshot: () => { void handleExportJsonSnapshot() },
    handlePreviewSqliteSnapshot: () => { void handlePreviewSqliteSnapshot() },
    handleExportSqliteSnapshot: () => { void handleExportSqliteSnapshot() },
    ...objectStorageActions,
  }
}

function cancelToastForAction(actionId: VaultPortabilityActionId): string {
  if (actionId.startsWith('export')) return 'Export cancelled'
  if (actionId.startsWith('storage')) return 'Storage sync cancelled'
  return 'Import cancelled'
}
