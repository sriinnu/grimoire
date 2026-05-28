import { useCallback } from 'react'
import type { MouseEvent } from 'react'
import type { ModifiedFile, NoteStatus, SidebarSelection, VaultEntry } from '../../types'
import type { NoteListFilter } from '../../utils/noteListHelpers'
import type { MultiSelectState } from '../../hooks/useMultiSelect'
import { NoteItem } from '../NoteItem'
import { DraggableNoteItem } from '../note-retargeting/DraggableNoteItem'
import { useChangesContextMenu } from './NoteListChangesMenu'
import { useNoteListContextMenu } from './NoteListContextMenu'
import { useChangeStatusResolver } from './noteListDataHooks'
import { useNoteListInteractions } from './noteListInteractionHooks'
import { isDeletedNoteEntry, type DeletedNoteEntry } from './noteListUtils'

function useBulkActions(
  multiSelect: MultiSelectState,
  onBulkArchive: ((paths: string[]) => void) | undefined,
  onBulkDeletePermanently: ((paths: string[]) => void) | undefined,
  isArchivedView: boolean,
) {
  const handleBulkArchive = useCallback(() => {
    const paths = [...multiSelect.selectedPaths]
    multiSelect.clear()
    onBulkArchive?.(paths)
  }, [multiSelect, onBulkArchive])

  const handleBulkDeletePermanently = useCallback(() => {
    const paths = [...multiSelect.selectedPaths]
    multiSelect.clear()
    onBulkDeletePermanently?.(paths)
  }, [multiSelect, onBulkDeletePermanently])

  const handleBulkUnarchive = useCallback(() => {
    const paths = [...multiSelect.selectedPaths]
    multiSelect.clear()
    onBulkArchive?.(paths)
  }, [multiSelect, onBulkArchive])

  return {
    handleBulkArchive,
    handleBulkDeletePermanently,
    handleBulkUnarchive,
    bulkArchiveOrUnarchive: isArchivedView ? handleBulkUnarchive : handleBulkArchive,
  }
}

interface UseNoteListInteractionStateParams {
  searched: VaultEntry[]
  searchedGroups: Array<{ entries: VaultEntry[] }>
  selectedNotePath: string | null
  selection: SidebarSelection
  noteListFilter: NoteListFilter
  isArchivedView: boolean
  isChangesView: boolean
  entityEntry: VaultEntry | null
  searchVisible: boolean
  toggleSearch: () => void
  modifiedFiles?: ModifiedFile[]
  onReplaceActiveTab: (entry: VaultEntry) => void
  onEnterNeighborhood?: (entry: VaultEntry) => void
  onOpenDeletedNote?: (entry: DeletedNoteEntry) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  onAutoTriggerDiff?: () => void
  onDiscardFile?: (relativePath: string) => Promise<void>
  onUpdateFrontmatter?: (path: string, key: string, value: string | number | boolean | string[] | null) => Promise<void> | void
  onCreateNote: (type?: string) => void
  onBulkArchive?: (paths: string[]) => void
  onBulkDeletePermanently?: (paths: string[]) => void
}

export function useNoteListInteractionState({
  searched,
  searchedGroups,
  selectedNotePath,
  selection,
  noteListFilter,
  isArchivedView,
  isChangesView,
  entityEntry,
  searchVisible,
  toggleSearch,
  modifiedFiles,
  onReplaceActiveTab,
  onEnterNeighborhood,
  onOpenDeletedNote,
  onOpenInNewWindow,
  onAutoTriggerDiff,
  onDiscardFile,
  onUpdateFrontmatter,
  onCreateNote,
  onBulkArchive,
  onBulkDeletePermanently,
}: UseNoteListInteractionStateParams) {
  const changesContextMenu = useChangesContextMenu({ isChangesView, onDiscardFile, modifiedFiles })
  const noteContextMenu = useNoteListContextMenu({
    enabled: !isChangesView,
    onUpdateFrontmatter,
    onOpenInNewWindow,
  })
  const {
    collapsedGroups,
    handleClickNote,
    handleCreateNote,
    handleListKeyDown,
    multiSelect,
    noteListKeyboard,
    toggleGroup,
  } = useNoteListInteractions({
    searched,
    searchedGroups,
    selectedNotePath,
    selection,
    noteListFilter,
    isChangesView,
    entityEntry,
    searchVisible,
    toggleSearch,
    onReplaceActiveTab,
    onEnterNeighborhood,
    onOpenDeletedNote,
    onOpenInNewWindow,
    onAutoTriggerDiff,
    onDiscardFile,
    openContextMenuForEntry: changesContextMenu.openContextMenuForEntry,
    onCreateNote,
  })
  const getChangeStatus = useChangeStatusResolver(isChangesView, modifiedFiles)
  const {
    handleBulkArchive,
    handleBulkDeletePermanently,
    handleBulkUnarchive,
  } = useBulkActions(multiSelect, onBulkArchive, onBulkDeletePermanently, isArchivedView)

  return {
    changesContextMenu,
    noteContextMenu,
    collapsedGroups,
    getChangeStatus,
    handleBulkArchive,
    handleBulkDeletePermanently,
    handleBulkUnarchive,
    handleClickNote,
    handleCreateNote,
    handleListKeyDown,
    multiSelect,
    noteListKeyboard,
    toggleGroup,
  }
}

interface UseRenderItemParams {
  entries: VaultEntry[]
  selectedNotePath: string | null
  typeEntryMap: Record<string, VaultEntry>
  displayPropsOverride?: string[] | null
  resolvedGetNoteStatus: (path: string) => NoteStatus
  getChangeStatus: (path: string) => ModifiedFile['status'] | undefined
  handleClickNote: (entry: VaultEntry, event: MouseEvent) => void
  noteContextMenu?: ((entry: VaultEntry, event: MouseEvent) => void) | undefined
  multiSelect: MultiSelectState
  noteListKeyboard: { highlightedPath: string | null }
}

export function useRenderItem({
  entries,
  selectedNotePath,
  typeEntryMap,
  displayPropsOverride,
  resolvedGetNoteStatus,
  getChangeStatus,
  handleClickNote,
  noteContextMenu,
  multiSelect,
  noteListKeyboard,
}: UseRenderItemParams) {
  const contextMenuHandler = noteContextMenu

  return useCallback((entry: VaultEntry, options?: { forceSelected?: boolean }) => (
    isDeletedNoteEntry(entry) ? (
      <NoteItem
        key={entry.path}
        entry={entry}
        isSelected={options?.forceSelected || selectedNotePath === entry.path}
        isMultiSelected={multiSelect.selectedPaths.has(entry.path)}
        isHighlighted={entry.path === noteListKeyboard.highlightedPath}
        noteStatus={resolvedGetNoteStatus(entry.path)}
        changeStatus={getChangeStatus(entry.path)}
        typeEntryMap={typeEntryMap}
        allEntries={entries}
        displayPropsOverride={displayPropsOverride}
        onClickNote={handleClickNote}
        onContextMenu={contextMenuHandler}
      />
    ) : (
      <DraggableNoteItem key={entry.path} notePath={entry.path}>
        <NoteItem
          entry={entry}
          isSelected={options?.forceSelected || selectedNotePath === entry.path}
          isMultiSelected={multiSelect.selectedPaths.has(entry.path)}
          isHighlighted={entry.path === noteListKeyboard.highlightedPath}
          noteStatus={resolvedGetNoteStatus(entry.path)}
          changeStatus={getChangeStatus(entry.path)}
          typeEntryMap={typeEntryMap}
          allEntries={entries}
          displayPropsOverride={displayPropsOverride}
          onClickNote={handleClickNote}
          onContextMenu={contextMenuHandler}
        />
      </DraggableNoteItem>
    )
  ), [
    contextMenuHandler,
    displayPropsOverride,
    entries,
    getChangeStatus,
    handleClickNote,
    multiSelect.selectedPaths,
    noteListKeyboard.highlightedPath,
    resolvedGetNoteStatus,
    selectedNotePath,
    typeEntryMap,
  ])
}
