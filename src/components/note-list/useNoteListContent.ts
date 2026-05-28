import { useMemo, type MutableRefObject } from 'react'
import type {
  InboxPeriod,
  ModifiedFile,
  SidebarSelection,
  VaultEntry,
  ViewDefinition,
  ViewFile,
} from '../../types'
import type { NoteFileScope, NoteListFilter } from '../../utils/noteListHelpers'
import { filterEntriesByNoteListQuery, filterGroupsByNoteListQuery } from './noteListSearch'
import { useNoteListSearchState } from './useNoteListSearchState'
import {
  useFilteredEntries,
  useNoteListData,
  useTypeEntryMap,
  useVisibleNotesSync,
} from './noteListDataHooks'
import { useListPropertyPicker } from './noteListPropertyHooks'
import { useNoteListSort } from './noteListSortHooks'

interface UseNoteListContentParams {
  entries: VaultEntry[]
  selection: SidebarSelection
  noteListFilter: NoteListFilter
  fileScope: NoteFileScope
  inboxPeriod: InboxPeriod
  modifiedFiles?: ModifiedFile[]
  modifiedSuffixes: string[]
  modifiedPathSet: Set<string>
  isInboxView: boolean
  allNotesNoteListProperties?: string[] | null
  onUpdateAllNotesNoteListProperties?: (value: string[] | null) => void
  inboxNoteListProperties?: string[] | null
  onUpdateInboxNoteListProperties?: (value: string[] | null) => void
  onUpdateViewDefinition?: (filename: string, patch: Partial<ViewDefinition>) => void
  onUpdateTypeSort?: (path: string, key: string, value: string | number | boolean | string[] | null) => void
  updateEntry?: (path: string, patch: Partial<VaultEntry>) => void
  views?: ViewFile[]
  visibleNotesRef?: MutableRefObject<VaultEntry[]>
}

export function useNoteListContent({
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
}: UseNoteListContentParams) {
  const subFilter = (selection.kind === 'sectionGroup' || selection.kind === 'folder')
    ? noteListFilter
    : undefined
  const effectiveInboxPeriod = isInboxView ? inboxPeriod : undefined
  const filteredEntries = useFilteredEntries({
    entries,
    selection,
    modifiedPathSet,
    modifiedSuffixes,
    modifiedFiles,
    subFilter,
    fileScope,
    inboxPeriod: effectiveInboxPeriod,
    views,
  })
  const { listSort, listDirection, customProperties, handleSortChange, sortPrefs, typeDocument } = useNoteListSort({
    entries,
    selection,
    modifiedPathSet,
    modifiedSuffixes,
    modifiedFiles,
    prefilteredEntries: filteredEntries,
    subFilter,
    fileScope,
    inboxPeriod: effectiveInboxPeriod,
    views,
    onUpdateTypeSort,
    onUpdateViewDefinition,
    updateEntry,
  })
  const {
    closeSearch,
    isSearching,
    query,
    search,
    searchInputRef,
    searchVisible,
    setSearch,
    toggleSearch,
  } = useNoteListSearchState()
  const typeEntryMap = useTypeEntryMap(entries)
  const { displayPropsOverride, propertyPicker } = useListPropertyPicker({
    entries,
    selection,
    inboxPeriod,
    typeDocument,
    typeEntryMap,
    allNotesNoteListProperties,
    onUpdateAllNotesNoteListProperties,
    inboxNoteListProperties,
    onUpdateInboxNoteListProperties,
    onUpdateViewDefinition,
    onUpdateTypeSort,
    views,
  })
  const {
    entityEntry,
    isEntityView,
    isArchivedView,
    searched: sortedEntries,
    searchedGroups: sortedGroups,
  } = useNoteListData({
    entries,
    selection,
    query: '',
    listSort,
    listDirection,
    modifiedPathSet,
    modifiedSuffixes,
    modifiedFiles,
    prefilteredEntries: filteredEntries,
    subFilter,
    fileScope,
    inboxPeriod: effectiveInboxPeriod,
    views,
  })
  const searched = useMemo(() => filterEntriesByNoteListQuery(sortedEntries, query, {
    allEntries: entries,
    typeEntryMap,
    displayPropsOverride,
  }), [displayPropsOverride, entries, query, sortedEntries, typeEntryMap])
  const searchedGroups = useMemo(() => filterGroupsByNoteListQuery(sortedGroups, query, {
    allEntries: entries,
    typeEntryMap,
    displayPropsOverride,
  }), [displayPropsOverride, entries, query, sortedGroups, typeEntryMap])
  useVisibleNotesSync({ visibleNotesRef, isEntityView, entityEntry, searched, searchedGroups })

  return {
    customProperties,
    displayPropsOverride,
    entityEntry,
    handleSortChange,
    isArchivedView,
    isSearching,
    isEntityView,
    listDirection,
    listSort,
    propertyPicker,
    query,
    search,
    searchInputRef,
    searchVisible,
    searched,
    searchedGroups,
    closeSearch,
    setSearch,
    sortPrefs,
    toggleSearch,
    typeDocument,
    typeEntryMap,
  }
}
