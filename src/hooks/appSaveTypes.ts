import type { Dispatch, SetStateAction } from 'react'
import type { VaultEntry } from '../types'

/** Active editor tab data used by save and rename flows. */
export interface AppSaveTabState {
  entry: VaultEntry
  content: string
}

/** Debounced auto-rename work for a freshly created untitled note. */
export interface PendingUntitledRename {
  path: string
  timer: ReturnType<typeof setTimeout>
}

/** Map of stale paths to their latest known path after a rename. */
export type RenamedPathMap = Map<string, string>

/** In-flight rename operations keyed by the source path they settle. */
export type InFlightRenameMap = Map<string, Promise<string>>

/** Content fallback used when the active tab has not flushed to editor state yet. */
export interface UnsavedFallback {
  path: string
  content: string
}

/** Dependencies required by the public app save coordinator hook. */
export interface AppSaveDeps {
  updateEntry: (path: string, patch: Partial<VaultEntry>) => void
  setTabs: Dispatch<SetStateAction<AppSaveTabState[]>>
  handleSwitchTab: (path: string) => void
  setToastMessage: (msg: string | null) => void
  loadModifiedFiles: () => void
  reloadViews?: () => Promise<void>
  trackUnsaved?: (path: string) => void
  clearUnsaved: (path: string) => void
  unsavedPaths: Set<string>
  tabs: AppSaveTabState[]
  activeTabPath: string | null
  handleRenameNote: (
    path: string,
    newTitle: string,
    vaultPath: string,
    onEntryRenamed: (
      oldPath: string,
      newEntry: Partial<VaultEntry> & { path: string },
      newContent: string
    ) => void,
  ) => Promise<void>
  handleRenameFilename: (
    path: string,
    newFilenameStem: string,
    vaultPath: string,
    onEntryRenamed: (
      oldPath: string,
      newEntry: Partial<VaultEntry> & { path: string },
      newContent: string
    ) => void,
  ) => Promise<void>
  replaceEntry: (
    oldPath: string,
    newEntry: Partial<VaultEntry> & { path: string },
    newContent: string
  ) => void
  resolvedPath: string
  initialH1AutoRenameEnabled: boolean
}
