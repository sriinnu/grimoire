import type { FolderNode, SidebarSelection, VaultEntry } from '../types'
import type { FolderTab } from './folder-actions/folderActionUtils'
import { useFolderDelete } from './folder-actions/useFolderDelete'
import { useFolderMove } from './folder-actions/useFolderMove'
import { useFolderRename } from './folder-actions/useFolderRename'

interface UseFolderActionsInput {
  vaultPath: string
  selection: SidebarSelection
  setSelection: (selection: SidebarSelection) => void
  setTabs: React.Dispatch<React.SetStateAction<FolderTab[]>>
  activeTabPathRef: React.MutableRefObject<string | null>
  handleSwitchTab: (path: string) => void
  closeAllTabs: () => void
  reloadVault: () => Promise<VaultEntry[]>
  reloadVaultSoft?: (extraPaths?: string[]) => Promise<VaultEntry[] | null>
  reloadFolders: () => Promise<FolderNode[]>
  removeEntriesByPrefix?: (absolutePrefix: string) => void
  setToastMessage: (message: string | null) => void
}

export function useFolderActions({
  vaultPath,
  selection,
  setSelection,
  setTabs,
  activeTabPathRef,
  handleSwitchTab,
  closeAllTabs,
  reloadVault,
  reloadVaultSoft,
  reloadFolders,
  removeEntriesByPrefix,
  setToastMessage,
}: UseFolderActionsInput) {
  const renameActions = useFolderRename({
    activeTabPathRef,
    handleSwitchTab,
    reloadFolders,
    reloadVault,
    selection,
    setSelection,
    setTabs,
    setToastMessage,
    vaultPath,
  })
  const moveActions = useFolderMove({
    activeTabPathRef,
    handleSwitchTab,
    reloadFolders,
    reloadVault,
    selection,
    setSelection,
    setTabs,
    setToastMessage,
    vaultPath,
  })
  const deleteActions = useFolderDelete({
    activeTabPathRef,
    clearFolderRename: renameActions.cancelFolderRename,
    closeAllTabs,
    reloadFolders,
    reloadVault,
    reloadVaultSoft,
    removeEntriesByPrefix,
    selection,
    setSelection,
    setTabs,
    setToastMessage,
    vaultPath,
  })

  return {
    ...renameActions,
    ...moveActions,
    ...deleteActions,
  }
}
