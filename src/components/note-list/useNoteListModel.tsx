import { useCallback, useEffect, useMemo, useState, type KeyboardEvent, type MutableRefObject, type ReactNode } from 'react'
import type {
  InboxPeriod,
  ModifiedFile,
  NoteStatus,
  SidebarSelection,
  VaultEntry,
  ViewDefinition,
  ViewFile,
} from '../../types'
import type { AppLocale } from '../../lib/i18nCore'
import {
  DEFAULT_NOTE_FILE_SCOPE,
  countAllNotesByFilter,
  countByFilter,
  countFolderByFilter,
  countFolderFileScopes,
  type NoteFileScope,
  type NoteListFilter,
} from '../../utils/noteListHelpers'
import { addNoteListSearchToggleListener, dispatchNoteListSearchAvailability } from '../../utils/noteListSearchEvents'
import { useModifiedFilesState } from './noteListDataHooks'
import {
  resolveCreateNoteActionLabel,
  resolveHeaderTitle,
  resolveSearchActionLabel,
  resolveSearchPlaceholder,
  type DeletedNoteEntry,
} from './noteListUtils'
import { useNoteListContent } from './useNoteListContent'
import { useNoteListInteractionState, useRenderItem } from './useNoteListInteractionState'

type EntitySelection = Extract<SidebarSelection, { kind: 'entity' }>

function useViewFlags(selection: SidebarSelection) {
  return {
    isInboxView: selection.kind === 'filter' && selection.filter === 'inbox',
  }
}

function useFilterCounts(entries: VaultEntry[], selection: SidebarSelection, fileScope: NoteFileScope) {
  return useMemo(() => {
    if (selection.kind === 'sectionGroup') return countByFilter(entries, selection.type)
    if (selection.kind === 'folder') return countFolderByFilter(entries, selection.path, fileScope)
    if (selection.kind === 'filter' && selection.filter === 'all') return countAllNotesByFilter(entries)
    return { open: 0, archived: 0 }
  }, [entries, fileScope, selection])
}

function useFileScopeCounts(entries: VaultEntry[], selection: SidebarSelection, noteListFilter: NoteListFilter) {
  return useMemo(() => {
    if (selection.kind !== 'folder') return { markdown: 0, other: 0, all: 0 }
    return countFolderFileScopes(entries, selection.path, noteListFilter)
  }, [entries, noteListFilter, selection])
}

export interface NoteListProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  selectedNote: VaultEntry | null
  noteListFilter: NoteListFilter
  onNoteListFilterChange: (filter: NoteListFilter) => void
  inboxPeriod?: InboxPeriod
  onInboxPeriodChange?: (period: InboxPeriod) => void
  modifiedFiles?: ModifiedFile[]
  modifiedFilesError?: string | null
  getNoteStatus?: (path: string) => NoteStatus
  sidebarCollapsed?: boolean
  onSelectNote: (entry: VaultEntry) => void
  onReplaceActiveTab: (entry: VaultEntry) => void
  onEnterNeighborhood?: (entry: VaultEntry) => void
  onCreateNote: (type?: string) => void
  onBulkArchive?: (paths: string[]) => void
  onBulkDeletePermanently?: (paths: string[]) => void
  onUpdateTypeSort?: (path: string, key: string, value: string | number | boolean | string[] | null) => void
  updateEntry?: (path: string, patch: Partial<VaultEntry>) => void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  onDiscardFile?: (relativePath: string) => Promise<void>
  onUpdateFrontmatter?: (path: string, key: string, value: string | number | boolean | string[] | null) => Promise<void> | void
  onAutoTriggerDiff?: () => void
  onOpenDeletedNote?: (entry: DeletedNoteEntry) => void
  allNotesNoteListProperties?: string[] | null
  onUpdateAllNotesNoteListProperties?: (value: string[] | null) => void
  inboxNoteListProperties?: string[] | null
  onUpdateInboxNoteListProperties?: (value: string[] | null) => void
  onUpdateViewDefinition?: (filename: string, patch: Partial<ViewDefinition>) => void
  views?: ViewFile[]
  visibleNotesRef?: MutableRefObject<VaultEntry[]>
  locale?: AppLocale
}

function buildNoteListLayoutModel(params: {
  selection: SidebarSelection
  views?: ViewFile[]
  sidebarCollapsed?: boolean
  modifiedFilesError?: string | null
  noteListFilter: NoteListFilter
  filterCounts: ReturnType<typeof useFilterCounts>
  fileScope: NoteFileScope
  fileScopeCounts: Record<NoteFileScope, number>
  onNoteListFilterChange: (filter: NoteListFilter) => void
  onFileScopeChange: (scope: NoteFileScope) => void
  onOpenType: (entry: VaultEntry) => void
  locale: AppLocale
  content: ReturnType<typeof useNoteListContent> & {
    handleSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  }
  interaction: ReturnType<typeof useNoteListInteractionState> & {
    renderItem: (entry: VaultEntry, options?: { forceSelected?: boolean }) => ReactNode
    entitySelection: EntitySelection | null
  }
}) {
  return {
    title: resolveHeaderTitle(params.selection, params.content.typeDocument, params.views, params.locale),
    createNoteLabel: resolveCreateNoteActionLabel(params.selection, params.locale),
    searchActionLabel: resolveSearchActionLabel(params.selection, params.locale),
    searchPlaceholder: resolveSearchPlaceholder(params.selection, params.locale),
    locale: params.locale,
    typeDocument: params.content.typeDocument,
    isEntityView: params.content.isEntityView,
    listSort: params.content.listSort,
    listDirection: params.content.listDirection,
    customProperties: params.content.customProperties,
    sidebarCollapsed: params.sidebarCollapsed,
    searchVisible: params.content.searchVisible,
    search: params.content.search,
    isSearching: params.content.isSearching,
    searchInputRef: params.content.searchInputRef,
    propertyPicker: params.content.propertyPicker,
    handleSortChange: params.content.handleSortChange,
    handleCreateNote: params.interaction.handleCreateNote,
    onOpenType: params.onOpenType,
    toggleSearch: params.content.toggleSearch,
    setSearch: params.content.setSearch,
    handleSearchKeyDown: params.content.handleSearchKeyDown,
    handleListKeyDown: params.interaction.handleListKeyDown,
    noteListPanelRef: params.interaction.noteListKeyboard.panelRef,
    handleNoteListPanelBlurCapture: params.interaction.noteListKeyboard.handlePanelBlurCapture,
    handleNoteListPanelFocusCapture: params.interaction.noteListKeyboard.handlePanelFocusCapture,
    noteListContainerRef: params.interaction.noteListKeyboard.containerRef,
    handleNoteListBlur: params.interaction.noteListKeyboard.handleBlur,
    handleNoteListFocus: params.interaction.noteListKeyboard.handleFocus,
    focusNoteList: params.interaction.noteListKeyboard.focusList,
    noteListVirtuosoRef: params.interaction.noteListKeyboard.virtuosoRef,
    entitySelection: params.interaction.entitySelection,
    searchedGroups: params.content.searchedGroups,
    collapsedGroups: params.interaction.collapsedGroups,
    sortPrefs: params.content.sortPrefs,
    toggleGroup: params.interaction.toggleGroup,
    renderItem: params.interaction.renderItem,
    typeEntryMap: params.content.typeEntryMap,
    handleClickNote: params.interaction.handleClickNote,
    isArchivedView: params.content.isArchivedView,
    isChangesView: params.selection.kind === 'filter' && params.selection.filter === 'changes',
    isInboxView: params.selection.kind === 'filter' && params.selection.filter === 'inbox',
    modifiedFilesError: params.modifiedFilesError,
    searched: params.content.searched,
    query: params.content.query,
    showFilterPills: params.selection.kind === 'sectionGroup' || params.selection.kind === 'folder',
    showFileScopePills: params.selection.kind === 'folder',
    noteListFilter: params.noteListFilter,
    filterCounts: params.filterCounts,
    fileScope: params.fileScope,
    fileScopeCounts: params.fileScopeCounts,
    onNoteListFilterChange: params.onNoteListFilterChange,
    onFileScopeChange: params.onFileScopeChange,
    multiSelect: params.interaction.multiSelect,
    handleBulkArchive: params.interaction.handleBulkArchive,
    handleBulkDeletePermanently: params.interaction.handleBulkDeletePermanently,
    handleBulkUnarchive: params.interaction.handleBulkUnarchive,
    contextMenuNode: (
      <>
        {params.interaction.changesContextMenu.contextMenuNode}
        {params.interaction.noteContextMenu.contextMenuNode}
      </>
    ),
    dialogNode: params.interaction.changesContextMenu.dialogNode,
  }
}

export function useNoteListModel({
  entries,
  selection,
  selectedNote,
  noteListFilter,
  onNoteListFilterChange,
  inboxPeriod = 'all',
  modifiedFiles,
  modifiedFilesError,
  getNoteStatus,
  sidebarCollapsed,
  onReplaceActiveTab,
  onEnterNeighborhood,
  onCreateNote,
  onBulkArchive,
  onBulkDeletePermanently,
  onUpdateTypeSort,
  updateEntry,
  onOpenInNewWindow,
  onDiscardFile,
  onUpdateFrontmatter,
  onAutoTriggerDiff,
  onOpenDeletedNote,
  allNotesNoteListProperties,
  onUpdateAllNotesNoteListProperties,
  inboxNoteListProperties,
  onUpdateInboxNoteListProperties,
  onUpdateViewDefinition,
  views,
  visibleNotesRef,
  locale = 'en',
}: NoteListProps) {
  const selectedNotePath = selectedNote?.path ?? null
  const [fileScopeState, setFileScopeState] = useState<{ folderPath: string | null; scope: NoteFileScope }>({
    folderPath: null,
    scope: DEFAULT_NOTE_FILE_SCOPE,
  })
  const { modifiedPathSet, modifiedSuffixes, resolvedGetNoteStatus } = useModifiedFilesState(modifiedFiles, getNoteStatus)
  const { isInboxView } = useViewFlags(selection)
  const selectedFolderPath = selection.kind === 'folder' ? selection.path : null
  const fileScope = fileScopeState.folderPath === selectedFolderPath
    ? fileScopeState.scope
    : DEFAULT_NOTE_FILE_SCOPE
  const handleFileScopeChange = useCallback((scope: NoteFileScope) => {
    setFileScopeState({ folderPath: selectedFolderPath, scope })
  }, [selectedFolderPath])
  const filterCounts = useFilterCounts(entries, selection, fileScope)
  const fileScopeCounts = useFileScopeCounts(entries, selection, noteListFilter)
  const content = useNoteListContent({
    entries,
    selection,
    noteListFilter,
    fileScope,
    inboxPeriod,
    modifiedFiles,
    modifiedSuffixes,
    modifiedPathSet,
    isInboxView,
    allNotesNoteListProperties,
    onUpdateAllNotesNoteListProperties,
    inboxNoteListProperties,
    onUpdateInboxNoteListProperties,
    onUpdateViewDefinition,
    onUpdateTypeSort,
    updateEntry,
    views,
    visibleNotesRef,
  })
  const interaction = useNoteListInteractionState({
    searched: content.searched,
    searchedGroups: content.searchedGroups,
    selectedNotePath,
    selection,
    noteListFilter,
    isArchivedView: content.isArchivedView,
    isChangesView: selection.kind === 'filter' && selection.filter === 'changes',
    entityEntry: content.entityEntry,
    searchVisible: content.searchVisible,
    toggleSearch: content.toggleSearch,
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
  })
  const renderItem = useRenderItem({
    entries,
    selectedNotePath,
    typeEntryMap: content.typeEntryMap,
    displayPropsOverride: content.displayPropsOverride,
    resolvedGetNoteStatus,
    getChangeStatus: interaction.getChangeStatus,
    handleClickNote: interaction.handleClickNote,
    noteContextMenu: selection.kind === 'filter' && selection.filter === 'changes'
      ? interaction.changesContextMenu.handleNoteContextMenu
      : interaction.noteContextMenu.handleNoteContextMenu,
    multiSelect: interaction.multiSelect,
    noteListKeyboard: interaction.noteListKeyboard,
  })
  const handleSearchKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Escape') return

    event.preventDefault()
    content.closeSearch()
    requestAnimationFrame(() => interaction.noteListKeyboard.focusList())
  }
  const { isPanelActive: isNoteListSearchActive, toggleSearchShortcut } = interaction.noteListKeyboard

  useEffect(() => {
    dispatchNoteListSearchAvailability(isNoteListSearchActive)
    return () => dispatchNoteListSearchAvailability(false)
  }, [isNoteListSearchActive])

  useEffect(() => {
    return addNoteListSearchToggleListener(() => {
      if (!isNoteListSearchActive) return
      toggleSearchShortcut()
    })
  }, [isNoteListSearchActive, toggleSearchShortcut])

  return buildNoteListLayoutModel({
    selection,
    views,
    sidebarCollapsed,
    onOpenType: onReplaceActiveTab,
    modifiedFilesError,
    noteListFilter,
    filterCounts,
    fileScope,
    fileScopeCounts,
    onNoteListFilterChange,
    onFileScopeChange: handleFileScopeChange,
    locale,
    content: {
      ...content,
      handleSearchKeyDown,
    },
    interaction: {
      ...interaction,
      renderItem,
      entitySelection: content.isEntityView && selection.kind === 'entity'
        ? { ...selection, entry: content.entityEntry ?? selection.entry }
        : null,
    },
  })
}
