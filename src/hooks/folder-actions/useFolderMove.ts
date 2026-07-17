import { useCallback, useState } from 'react'
import type { SidebarSelection, VaultEntry } from '../../types'
import {
  folderLabel,
  invokeMoveFolder,
  type FolderMoveResult,
  type FolderTab,
  updateSelectionAfterFolderRename,
  updateTabsAfterFolderRename,
} from './folderActionUtils'

interface UseFolderMoveInput {
  activeTabPathRef: React.MutableRefObject<string | null>
  handleSwitchTab: (path: string) => void
  reloadFolders: () => Promise<unknown>
  reloadVault: () => Promise<VaultEntry[]>
  selection: SidebarSelection
  setSelection: (selection: SidebarSelection) => void
  setTabs: React.Dispatch<React.SetStateAction<FolderTab[]>>
  setToastMessage: (message: string | null) => void
  vaultPath: string
}

function moveFolderToastMessage(result: FolderMoveResult, destinationPath: string): string {
  const destinationLabel = destinationPath.trim().replace(/^\/+|\/+$/g, '')
    ? `"${folderLabel({ folderPath: destinationPath })}"`
    : 'the vault root'
  const action = `Moved "${folderLabel({ folderPath: result.old_path })}" to ${destinationLabel}`
  if (result.updated_files === 0) return action
  const updated = result.updated_files === 1 ? 'updated 1 note' : `updated ${result.updated_files} notes`
  return `${action} and ${updated}`
}

export function useFolderMove({
  activeTabPathRef,
  handleSwitchTab,
  reloadFolders,
  reloadVault,
  selection,
  setSelection,
  setTabs,
  setToastMessage,
  vaultPath,
}: UseFolderMoveInput) {
  const [movingFolderPath, setMovingFolderPath] = useState<string | null>(null)

  const startFolderMove = useCallback((folderPath: string) => setMovingFolderPath(folderPath), [])
  const cancelFolderMove = useCallback(() => setMovingFolderPath(null), [])

  const moveFolder = useCallback(async (folderPath: string, destinationPath: string) => {
    try {
      const moveResult = await invokeMoveFolder({ vaultPath, folderPath, destinationPath })
      setMovingFolderPath(null)
      if (moveResult.new_path === moveResult.old_path) return true
      await reloadFolders()
      const refreshedEntries = await reloadVault()
      updateTabsAfterFolderRename({
        activeTabPathRef,
        handleSwitchTab,
        refreshedEntries,
        renameResult: moveResult,
        setTabs,
        vaultPath,
      })
      updateSelectionAfterFolderRename({
        refreshedEntries,
        renameResult: moveResult,
        selection,
        setSelection,
        vaultPath,
      })
      setToastMessage(moveFolderToastMessage(moveResult, destinationPath))
      return true
    } catch (error) {
      setToastMessage(`Failed to move folder: ${error}`)
      return false
    }
  }, [activeTabPathRef, handleSwitchTab, reloadFolders, reloadVault, selection, setSelection, setTabs, setToastMessage, vaultPath])

  return {
    cancelFolderMove,
    moveFolder,
    movingFolderPath,
    startFolderMove,
  }
}
