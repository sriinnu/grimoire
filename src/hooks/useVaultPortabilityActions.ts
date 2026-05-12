import { useCallback, useState } from 'react'
import {
  formatMarkdownImportToast,
  importJournalExportIntoVault,
  importMarkdownFolderIntoVault,
  importMarkdownZipIntoVault,
  pickBearImportFolder,
  pickJournalImportSource,
  pickMarkdownImportFolder,
  pickMarkdownZipImportFile,
  type JournalImportSource,
} from '../utils/markdownFolderImport'
import {
  exportMarkdownZip,
  formatMarkdownZipExportToast,
  pickMarkdownZipExportTarget,
} from '../utils/vaultExport'

interface VaultPortabilityActionsOptions {
  resolvedPath: string
  reloadVault: () => Promise<unknown>
  reloadFolders: () => Promise<unknown>
  loadModifiedFiles: () => Promise<unknown>
  setToastMessage: (message: string) => void
}

interface VaultPortabilityActions {
  markdownImportBusy: boolean
  handleImportMarkdownFolder: () => void
  handleImportMarkdownZip: () => void
  handleImportBear: () => void
  handleImportDayOne: () => void
  handleImportJourney: () => void
  handleExportMarkdownZip: () => void
}

type MarkdownFolderSource = 'markdown-folder' | 'bear'

/** Owns vault import/export actions so App only wires the surface. */
export function useVaultPortabilityActions({
  resolvedPath,
  reloadVault,
  reloadFolders,
  loadModifiedFiles,
  setToastMessage,
}: VaultPortabilityActionsOptions): VaultPortabilityActions {
  const [activeAction, setActiveAction] = useState<string | null>(null)
  const markdownImportBusy = activeAction !== null

  const reloadAfterImport = useCallback(async () => {
    await reloadVault()
    await reloadFolders()
    await loadModifiedFiles()
  }, [loadModifiedFiles, reloadFolders, reloadVault])

  const handleImportFolder = useCallback(async (source: MarkdownFolderSource) => {
    if (!resolvedPath.trim()) {
      setToastMessage('Open a vault before importing Markdown')
      return
    }

    const label = source === 'bear' ? 'Bear export' : 'Markdown folder'
    try {
      const sourcePath = source === 'bear' ? await pickBearImportFolder() : await pickMarkdownImportFolder()
      if (!sourcePath) return

      setActiveAction(source)
      setToastMessage(`Importing ${label}...`)
      const result = await importMarkdownFolderIntoVault(resolvedPath, sourcePath)
      await reloadAfterImport()
      setToastMessage(formatMarkdownImportToast(result))
    } catch (error) {
      setToastMessage(`Import failed: ${errorMessage(error, 'Import failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [reloadAfterImport, resolvedPath, setToastMessage])

  const handleImportMarkdownZip = useCallback(async () => {
    if (!resolvedPath.trim()) {
      setToastMessage('Open a vault before importing Markdown')
      return
    }

    try {
      const sourcePath = await pickMarkdownZipImportFile()
      if (!sourcePath) return

      setActiveAction('markdown-zip')
      setToastMessage('Importing Markdown ZIP...')
      const result = await importMarkdownZipIntoVault(resolvedPath, sourcePath)
      await reloadAfterImport()
      setToastMessage(formatMarkdownImportToast(result))
    } catch (error) {
      setToastMessage(`Import failed: ${errorMessage(error, 'Import failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [reloadAfterImport, resolvedPath, setToastMessage])

  const handleImportJournalExport = useCallback(async (source: JournalImportSource) => {
    if (!resolvedPath.trim()) {
      setToastMessage('Open a vault before importing journals')
      return
    }

    try {
      const sourcePath = await pickJournalImportSource(source)
      if (!sourcePath) return

      setActiveAction(source)
      setToastMessage(`Importing ${source === 'day-one' ? 'Day One' : 'Journey'} export...`)
      const result = await importJournalExportIntoVault(resolvedPath, sourcePath, source)
      await reloadAfterImport()
      setToastMessage(formatMarkdownImportToast(result))
    } catch (error) {
      setToastMessage(`Import failed: ${errorMessage(error, 'Import failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [reloadAfterImport, resolvedPath, setToastMessage])

  const handleExportMarkdownZip = useCallback(async () => {
    if (!resolvedPath.trim()) {
      setToastMessage('Open a vault before exporting Markdown')
      return
    }

    try {
      const targetPath = await pickMarkdownZipExportTarget()
      if (!targetPath) return

      setActiveAction('export-markdown-zip')
      setToastMessage('Exporting Markdown ZIP...')
      const result = await exportMarkdownZip(resolvedPath, targetPath)
      setToastMessage(formatMarkdownZipExportToast(result))
    } catch (error) {
      setToastMessage(`Export failed: ${errorMessage(error, 'Export failed')}`)
    } finally {
      setActiveAction(null)
    }
  }, [resolvedPath, setToastMessage])

  return {
    markdownImportBusy,
    handleImportMarkdownFolder: () => { void handleImportFolder('markdown-folder') },
    handleImportMarkdownZip: () => { void handleImportMarkdownZip() },
    handleImportBear: () => { void handleImportFolder('bear') },
    handleImportDayOne: () => { void handleImportJournalExport('day-one') },
    handleImportJourney: () => { void handleImportJournalExport('journey') },
    handleExportMarkdownZip: () => { void handleExportMarkdownZip() },
  }
}

function errorMessage(error: unknown, fallback: string): string {
  if (typeof error === 'string') return error
  if (error instanceof Error) return error.message
  return fallback
}
