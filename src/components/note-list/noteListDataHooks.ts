import { useCallback, useEffect, useMemo, useState, type MutableRefObject } from 'react'
import type { InboxPeriod, ModifiedFile, NoteStatus, SidebarSelection, VaultEntry, ViewFile } from '../../types'
import {
  type NoteFileScope,
  type NoteListFilter,
  type RelationshipGroup,
  filterEntries,
  filterInboxEntries,
} from '../../utils/noteListHelpers'
import {
  type SortDirection,
  type SortOption,
  getSortComparator,
} from '../../utils/noteListSorting'
import { buildTypeEntryMap } from '../../utils/typeColors'
import {
  buildChangesEntries,
  createNoteStatusResolver,
  filterByQuery,
  filterGroupsByQuery,
  isDeletedNoteEntry,
  isModifiedEntry,
} from './noteListUtils'

export function useTypeEntryMap(entries: VaultEntry[]) {
  return useMemo(() => buildTypeEntryMap(entries), [entries])
}

export interface FilteredEntriesParams {
  entries: VaultEntry[]
  selection: SidebarSelection
  modifiedPathSet: Set<string>
  modifiedSuffixes: string[]
  modifiedFiles?: ModifiedFile[]
  prefilteredEntries?: VaultEntry[]
  subFilter?: NoteListFilter
  fileScope?: NoteFileScope
  inboxPeriod?: InboxPeriod
  views?: ViewFile[]
}

function buildFilteredEntries({
  entries,
  selection,
  isEntityView,
  isChangesView,
  isInboxView,
  modifiedPathSet,
  modifiedSuffixes,
  modifiedFiles,
  subFilter,
  fileScope,
  inboxPeriod,
  views,
}: FilteredEntriesParams & {
  isEntityView: boolean
  isChangesView: boolean
  isInboxView: boolean
}) {
  if (isEntityView) return []
  if (isChangesView) {
    if (modifiedFiles) return buildChangesEntries(entries, modifiedFiles)
    return entries.filter((entry) => isModifiedEntry(entry.path, modifiedPathSet, modifiedSuffixes))
  }
  if (isInboxView) return filterInboxEntries(entries, inboxPeriod ?? 'month')
  return filterEntries(entries, selection, subFilter, views, fileScope)
}

function useSearchedRelationshipGroups(
  entityEntry: VaultEntry | null,
  entries: VaultEntry[],
  query: string,
): RelationshipGroup[] {
  const [groups, setGroups] = useState<RelationshipGroup[]>([])

  useEffect(() => {
    let cancelled = false

    if (!entityEntry) {
      setGroups((currentGroups) => currentGroups.length > 0 ? [] : currentGroups)
      return undefined
    }

    import('../../utils/noteRelationships').then(({ buildRelationshipGroups }) => {
      if (cancelled) return
      setGroups(filterGroupsByQuery(buildRelationshipGroups(entityEntry, entries), query))
    })

    return () => {
      cancelled = true
    }
  }, [entityEntry, entries, query])

  return groups
}

export function useFilteredEntries({
  entries,
  selection,
  modifiedPathSet,
  modifiedSuffixes,
  modifiedFiles,
  prefilteredEntries,
  subFilter,
  fileScope,
  inboxPeriod,
  views,
}: FilteredEntriesParams) {
  const isEntityView = selection.kind === 'entity'
  const isChangesView = selection.kind === 'filter' && selection.filter === 'changes'
  const isInboxView = selection.kind === 'filter' && selection.filter === 'inbox'
  return useMemo(() => {
    if (prefilteredEntries) return prefilteredEntries
    return buildFilteredEntries({
      entries,
      selection,
      isEntityView,
      isChangesView,
      isInboxView,
      modifiedPathSet,
      modifiedSuffixes,
      modifiedFiles,
      subFilter,
      fileScope,
      inboxPeriod,
      views,
    })
  }, [
    entries,
    fileScope,
    inboxPeriod,
    isChangesView,
    isEntityView,
    isInboxView,
    modifiedFiles,
    modifiedPathSet,
    modifiedSuffixes,
    prefilteredEntries,
    selection,
    subFilter,
    views,
  ])
}

interface NoteListDataParams extends FilteredEntriesParams {
  query: string
  listSort: SortOption
  listDirection: SortDirection
}

export function useNoteListData({
  entries,
  selection,
  query,
  listSort,
  listDirection,
  modifiedPathSet,
  modifiedSuffixes,
  modifiedFiles,
  prefilteredEntries,
  subFilter,
  fileScope,
  inboxPeriod,
  views,
}: NoteListDataParams) {
  const isEntityView = selection.kind === 'entity'
  const isArchivedView = (selection.kind === 'filter' && selection.filter === 'archived') || subFilter === 'archived'
  const entityEntry = useMemo(() => {
    if (!isEntityView || selection.kind !== 'entity') return null
    return entries.find((entry) => entry.path === selection.entry.path) ?? selection.entry
  }, [entries, isEntityView, selection])

  const filteredEntries = useFilteredEntries({
    entries,
    selection,
    modifiedPathSet,
    modifiedSuffixes,
    modifiedFiles,
    prefilteredEntries,
    subFilter,
    fileScope,
    inboxPeriod,
    views,
  })

  const searched = useMemo(() => {
    const sorted = [...filteredEntries].sort(getSortComparator(listSort, listDirection))
    return filterByQuery(sorted, query)
  }, [filteredEntries, listSort, listDirection, query])

  const searchedGroups = useSearchedRelationshipGroups(entityEntry, entries, query)

  return { entityEntry, isEntityView, isArchivedView, searched, searchedGroups }
}

export function useModifiedFilesState(
  modifiedFiles: ModifiedFile[] | undefined,
  getNoteStatus: ((path: string) => NoteStatus) | undefined,
) {
  const modifiedPathSet = useMemo(() => new Set((modifiedFiles ?? []).map((f) => f.path)), [modifiedFiles])
  const modifiedSuffixes = useMemo(() => (modifiedFiles ?? []).map((f) => '/' + f.relativePath), [modifiedFiles])
  const resolvedGetNoteStatus = useMemo<(path: string) => NoteStatus>(
    () => createNoteStatusResolver(getNoteStatus, modifiedFiles, modifiedPathSet),
    [getNoteStatus, modifiedFiles, modifiedPathSet],
  )
  return { modifiedPathSet, modifiedSuffixes, resolvedGetNoteStatus }
}

interface ChangeStatusIndex {
  byPath: Map<string, ModifiedFile['status']>
  byFilename: Map<string, ModifiedFile['status'] | null>
}

function rememberFilenameStatus(
  byFilename: Map<string, ModifiedFile['status'] | null>,
  filename: string,
  status: ModifiedFile['status'],
) {
  if (!byFilename.has(filename)) {
    byFilename.set(filename, status)
    return
  }
  byFilename.set(filename, null)
}

function buildChangeStatusMap(isChangesView: boolean, modifiedFiles?: ModifiedFile[]): ChangeStatusIndex | undefined {
  if (!isChangesView || !modifiedFiles) return undefined

  const byPath = new Map<string, ModifiedFile['status']>()
  const byFilename = new Map<string, ModifiedFile['status'] | null>()
  for (const file of modifiedFiles) {
    byPath.set(file.path, file.status)
    byPath.set('/' + file.relativePath, file.status)
    rememberFilenameStatus(byFilename, file.relativePath.split('/').slice(-1)[0], file.status)
  }

  return { byPath, byFilename }
}

function resolveChangeStatus(path: string, changeStatusMap?: ChangeStatusIndex) {
  if (!changeStatusMap) return undefined

  const direct = changeStatusMap.byPath.get(path)
  if (direct) return direct

  const filename = path.split('/').slice(-1)[0]
  for (const [key, status] of changeStatusMap.byPath) {
    if (path.endsWith(key)) return status
  }

  const basenameStatus = changeStatusMap.byFilename.get(filename)
  if (basenameStatus) return basenameStatus

  return undefined
}

export function useChangeStatusResolver(isChangesView: boolean, modifiedFiles?: ModifiedFile[]) {
  const changeStatusMap = useMemo(
    () => buildChangeStatusMap(isChangesView, modifiedFiles),
    [isChangesView, modifiedFiles],
  )

  return useCallback(
    (path: string) => resolveChangeStatus(path, changeStatusMap),
    [changeStatusMap],
  )
}

interface VisibleNotesSyncParams {
  visibleNotesRef?: MutableRefObject<VaultEntry[]>
  isEntityView: boolean
  entityEntry?: VaultEntry | null
  searched: VaultEntry[]
  searchedGroups: Array<{ entries: VaultEntry[] }>
}

export function flattenNeighborhoodEntries(
  entityEntry: VaultEntry | null | undefined,
  searchedGroups: Array<{ entries: VaultEntry[] }>,
): VaultEntry[] {
  if (!entityEntry) return []
  return [entityEntry, ...searchedGroups.flatMap((group) => group.entries)]
}

export function useVisibleNotesSync({
  visibleNotesRef,
  isEntityView,
  entityEntry,
  searched,
  searchedGroups,
}: VisibleNotesSyncParams) {
  useEffect(() => {
    if (!visibleNotesRef) return

    visibleNotesRef.current = isEntityView
      ? flattenNeighborhoodEntries(entityEntry, searchedGroups).filter((entry) => !isDeletedNoteEntry(entry))
      : searched.filter((entry) => !isDeletedNoteEntry(entry))
  }, [visibleNotesRef, entityEntry, isEntityView, searched, searchedGroups])
}
