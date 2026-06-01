import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type MouseEvent } from 'react'
import type { SidebarSelection, VaultEntry } from '../../types'
import type { NoteListFilter } from '../../utils/noteListHelpers'
import { useMultiSelect, type MultiSelectState } from '../../hooks/useMultiSelect'
import { useNoteListKeyboard } from '../../hooks/useNoteListKeyboard'
import { prefetchNoteContent } from '../../hooks/useTabManagement'
import { flattenNeighborhoodEntries } from './noteListDataHooks'
import {
  isDeletedNoteEntry,
  routeNoteClick,
  toggleSetMember,
  type DeletedNoteEntry,
} from './noteListUtils'

function isInputFocused(): boolean {
  const el = document.activeElement
  return el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement || !!(el as HTMLElement)?.isContentEditable
}

function handleEscapeKey(event: globalThis.KeyboardEvent, multiSelect: MultiSelectState) {
  if (event.key !== 'Escape' || !multiSelect.isMultiSelecting) return
  event.preventDefault()
  multiSelect.clear()
}

function handleSelectAllKey(event: globalThis.KeyboardEvent, multiSelect: MultiSelectState, isEntityView: boolean) {
  if (event.key !== 'a' || !(event.metaKey || event.ctrlKey) || isEntityView || isInputFocused()) return
  event.preventDefault()
  multiSelect.selectAll()
}

function handleBulkActionKey(
  event: globalThis.KeyboardEvent,
  multiSelect: MultiSelectState,
  onArchive: () => void,
  onDelete: () => void,
) {
  if (!multiSelect.isMultiSelecting || !(event.metaKey || event.ctrlKey)) return
  if (event.key === 'e') {
    event.preventDefault()
    event.stopPropagation()
    onArchive()
  }
  if (event.key === 'Backspace' || event.key === 'Delete') {
    event.preventDefault()
    event.stopPropagation()
    onDelete()
  }
}

export function useMultiSelectKeyboard(
  multiSelect: MultiSelectState,
  isEntityView: boolean,
  onBulkArchive: () => void,
  onBulkDelete: () => void,
) {
  useEffect(() => {
    function handleKeyDown(event: globalThis.KeyboardEvent) {
      handleEscapeKey(event, multiSelect)
      handleSelectAllKey(event, multiSelect, isEntityView)
      handleBulkActionKey(event, multiSelect, onBulkArchive, onBulkDelete)
    }
    window.addEventListener('keydown', handleKeyDown, true)
    return () => window.removeEventListener('keydown', handleKeyDown, true)
  }, [multiSelect, isEntityView, onBulkArchive, onBulkDelete])
}

interface UseNoteListInteractionsParams {
  searched: VaultEntry[]
  searchedGroups: Array<{ entries: VaultEntry[] }>
  selectedNotePath: string | null
  selection: SidebarSelection
  noteListFilter: NoteListFilter
  isChangesView: boolean
  entityEntry: VaultEntry | null
  searchVisible: boolean
  toggleSearch: () => void
  onReplaceActiveTab: (entry: VaultEntry) => void
  onEnterNeighborhood?: (entry: VaultEntry) => void
  onOpenDeletedNote?: (entry: DeletedNoteEntry) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  onAutoTriggerDiff?: () => void
  onDiscardFile?: (relativePath: string) => Promise<void>
  openContextMenuForEntry: (entry: VaultEntry, point: { x: number; y: number }) => void
  onCreateNote: (type?: string) => void
}

function resolveChangesContextMenuEntry(
  event: KeyboardEvent<HTMLDivElement>,
  isChangesView: boolean,
  onDiscardFile: ((relativePath: string) => Promise<void>) | undefined,
  highlightedPath: string | null,
  searched: VaultEntry[],
) {
  if (!isChangesView || !onDiscardFile || !event.shiftKey || event.key !== 'F10' || !highlightedPath) return null
  return searched.find((candidate) => candidate.path === highlightedPath) ?? null
}

function openHighlightedChangesContextMenu(
  entry: VaultEntry,
  openContextMenuForEntry: (entry: VaultEntry, point: { x: number; y: number }) => void,
) {
  const row = document.querySelector<HTMLElement>(`[data-note-path="${entry.path}"]`)
  const rect = row?.getBoundingClientRect()
  openContextMenuForEntry(entry, {
    x: rect ? rect.left + 24 : 160,
    y: rect ? rect.bottom - 8 : 160,
  })
}

function resolveKeyboardEntries(
  searched: VaultEntry[],
  searchedGroups: Array<{ entries: VaultEntry[] }>,
  entityEntry: VaultEntry | null,
): VaultEntry[] {
  return entityEntry
    ? flattenNeighborhoodEntries(entityEntry, searchedGroups)
    : searched
}

function useKeyboardInteractionState({
  searched,
  searchedGroups,
  entityEntry,
  selectedNotePath,
  searchVisible,
  toggleSearch,
  onReplaceActiveTab,
  onEnterNeighborhood,
  onOpenDeletedNote,
}: Pick<
  UseNoteListInteractionsParams,
  | 'searched'
  | 'searchedGroups'
  | 'entityEntry'
  | 'selectedNotePath'
  | 'searchVisible'
  | 'toggleSearch'
  | 'onReplaceActiveTab'
  | 'onEnterNeighborhood'
  | 'onOpenDeletedNote'
>) {
  const keyboardEntries = useMemo(
    () => resolveKeyboardEntries(searched, searchedGroups, entityEntry),
    [entityEntry, searched, searchedGroups],
  )

  const handleKeyboardOpen = useCallback((entry: VaultEntry) => {
    if (isDeletedNoteEntry(entry)) {
      onOpenDeletedNote?.(entry)
      return
    }
    onReplaceActiveTab(entry)
  }, [onOpenDeletedNote, onReplaceActiveTab])

  const handleKeyboardPrefetch = useCallback((entry: VaultEntry) => {
    if (!isDeletedNoteEntry(entry)) prefetchNoteContent(entry.path)
  }, [])

  const handleNeighborhoodOpen = useCallback(async (entry: VaultEntry) => {
    if (isDeletedNoteEntry(entry)) return
    await onReplaceActiveTab(entry)
    onEnterNeighborhood?.(entry)
  }, [onEnterNeighborhood, onReplaceActiveTab])

  const noteListKeyboard = useNoteListKeyboard({
    items: keyboardEntries,
    selectedNotePath,
    onOpen: handleKeyboardOpen,
    onEnterNeighborhood: handleNeighborhoodOpen,
    onPrefetch: handleKeyboardPrefetch,
    searchVisible,
    toggleSearch,
    enabled: true,
  })
  const multiSelect = useMultiSelect(keyboardEntries, selectedNotePath)
  const { pruneToVisible } = multiSelect
  const visiblePathSignature = useMemo(
    () => keyboardEntries.map((entry) => entry.path).join('\u0000'),
    [keyboardEntries],
  )

  useEffect(() => {
    pruneToVisible()
  }, [pruneToVisible, visiblePathSignature])

  return { handleNeighborhoodOpen, multiSelect, noteListKeyboard }
}

function useNoteClickHandler({
  isChangesView,
  onReplaceActiveTab,
  handleNeighborhoodOpen,
  onOpenDeletedNote,
  onOpenInNewWindow,
  onAutoTriggerDiff,
  multiSelect,
}: {
  isChangesView: boolean
  onReplaceActiveTab: (entry: VaultEntry) => void
  handleNeighborhoodOpen: (entry: VaultEntry) => Promise<void>
  onOpenDeletedNote?: (entry: DeletedNoteEntry) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  onAutoTriggerDiff?: () => void
  multiSelect: MultiSelectState
}) {
  return useCallback((entry: VaultEntry, event: MouseEvent) => {
    if (isDeletedNoteEntry(entry)) {
      routeNoteClick(entry, event, {
        onReplace: () => onOpenDeletedNote?.(entry),
        onEnterNeighborhood: () => onOpenDeletedNote?.(entry),
        multiSelect,
      })
      return
    }

    routeNoteClick(entry, event, {
      onReplace: onReplaceActiveTab,
      onEnterNeighborhood: handleNeighborhoodOpen,
      onOpenInNewWindow,
      multiSelect,
    })

    if (isChangesView && onAutoTriggerDiff) {
      setTimeout(onAutoTriggerDiff, 50)
    }
  }, [
    isChangesView,
    multiSelect,
    onAutoTriggerDiff,
    onOpenDeletedNote,
    onOpenInNewWindow,
    onReplaceActiveTab,
    handleNeighborhoodOpen,
  ])
}

function useListKeyDownHandler({
  isChangesView,
  onDiscardFile,
  highlightedPath,
  searched,
  openContextMenuForEntry,
  handleKeyDown,
}: {
  isChangesView: boolean
  onDiscardFile?: (relativePath: string) => Promise<void>
  highlightedPath: string | null
  searched: VaultEntry[]
  openContextMenuForEntry: (entry: VaultEntry, point: { x: number; y: number }) => void
  handleKeyDown: (event: KeyboardEvent) => void
}) {
  return useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    const entry = resolveChangesContextMenuEntry(
      event,
      isChangesView,
      onDiscardFile,
      highlightedPath,
      searched,
    )
    if (entry) {
      event.preventDefault()
      event.stopPropagation()
      openHighlightedChangesContextMenu(entry, openContextMenuForEntry)
      return
    }

    handleKeyDown(event)
  }, [handleKeyDown, highlightedPath, isChangesView, onDiscardFile, openContextMenuForEntry, searched])
}

export function useNoteListInteractions({
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
  openContextMenuForEntry,
  onCreateNote,
}: UseNoteListInteractionsParams) {
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())
  const { handleNeighborhoodOpen, multiSelect, noteListKeyboard } = useKeyboardInteractionState({
    searched,
    searchedGroups,
    entityEntry,
    selectedNotePath,
    searchVisible,
    toggleSearch,
    onReplaceActiveTab,
    onEnterNeighborhood,
    onOpenDeletedNote,
  })

  useEffect(() => {
    multiSelect.clear()
  }, [noteListFilter, selection]) // eslint-disable-line react-hooks/exhaustive-deps -- clear only when selection/filter changes

  const handleClickNote = useNoteClickHandler({
    isChangesView,
    onReplaceActiveTab,
    handleNeighborhoodOpen,
    onOpenDeletedNote,
    onOpenInNewWindow,
    onAutoTriggerDiff,
    multiSelect,
  })

  const handleListKeyDown = useListKeyDownHandler({
    isChangesView,
    onDiscardFile,
    highlightedPath: noteListKeyboard.highlightedPath,
    searched,
    openContextMenuForEntry,
    handleKeyDown: noteListKeyboard.handleKeyDown,
  })

  const handleCreateNote = useCallback(() => {
    onCreateNote(selection.kind === 'sectionGroup' ? selection.type : undefined)
  }, [onCreateNote, selection])

  const toggleGroup = useCallback((label: string) => {
    setCollapsedGroups((prev) => toggleSetMember(prev, label))
  }, [])

  return {
    collapsedGroups,
    handleClickNote,
    handleCreateNote,
    handleListKeyDown,
    multiSelect,
    noteListKeyboard,
    toggleGroup,
  }
}
