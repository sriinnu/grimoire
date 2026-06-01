import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type SetStateAction } from 'react'
import type { InboxPeriod, ModifiedFile, SidebarSelection, VaultEntry, ViewDefinition, ViewFile } from '../../types'
import {
  type NoteFileScope,
  type NoteListFilter,
} from '../../utils/noteListHelpers'
import {
  type SortConfig,
  type SortDirection,
  type SortOption,
  clearListSortFromLocalStorage,
  extractSortableProperties,
  loadSortPreferences,
  parseSortConfig,
  saveSortPreferences,
  serializeSortConfig,
} from '../../utils/noteListSorting'
import { useFilteredEntries } from './noteListDataHooks'

const DEFAULT_LIST_CONFIG: SortConfig = { option: 'modified', direction: 'desc' }

function findSelectedViewFile(selection: SidebarSelection, views?: ViewFile[]): ViewFile | null {
  if (selection.kind !== 'view') return null
  return views?.find((candidate) => candidate.filename === selection.filename) ?? null
}

function findSelectedTypeDocument(entries: VaultEntry[], selection: SidebarSelection): VaultEntry | null {
  if (selection.kind !== 'sectionGroup') return null
  return entries.find((entry) => entry.isA === 'Type' && entry.title === selection.type) ?? null
}

function resolveListSortConfig(
  typeDocument: VaultEntry | null,
  selectedView: ViewFile | null,
  sortPrefs: Record<string, SortConfig>,
): SortConfig {
  if (typeDocument?.sort) {
    const parsed = parseSortConfig(typeDocument.sort)
    if (parsed) return parsed
  }

  if (selectedView?.definition.sort) {
    const parsed = parseSortConfig(selectedView.definition.sort)
    if (parsed) return parsed
  }

  return selectedView ? DEFAULT_LIST_CONFIG : (sortPrefs.__list__ ?? DEFAULT_LIST_CONFIG)
}

interface SortPersistence {
  onUpdateTypeSort?: (path: string, key: string, value: string) => void
  updateEntry?: (path: string, patch: Partial<VaultEntry>) => void
  onUpdateViewDefinition?: (filename: string, patch: Partial<ViewDefinition>) => void
}

function createSortPersistence(
  onUpdateTypeSort?: SortPersistence['onUpdateTypeSort'],
  updateEntry?: SortPersistence['updateEntry'],
  onUpdateViewDefinition?: SortPersistence['onUpdateViewDefinition'],
): SortPersistence | null {
  if (!onUpdateViewDefinition && !(onUpdateTypeSort && updateEntry)) return null
  return { onUpdateTypeSort, updateEntry, onUpdateViewDefinition }
}

function persistSortToType(path: string, config: SortConfig, persistence: SortPersistence) {
  const serialized = serializeSortConfig(config)
  persistence.onUpdateTypeSort?.(path, 'sort', serialized)
  persistence.updateEntry?.(path, { sort: serialized })
  clearListSortFromLocalStorage()
}

function persistSortToView(
  filename: string,
  config: SortConfig,
  onUpdateViewDefinition: NonNullable<SortPersistence['onUpdateViewDefinition']>,
) {
  onUpdateViewDefinition(filename, { sort: serializeSortConfig(config) })
}

type SortPersistenceTarget =
  | { kind: 'type'; path: string }
  | { kind: 'view'; filename: string }

function canPersistTypeSort(
  persistence: SortPersistence,
): persistence is SortPersistence & Required<Pick<SortPersistence, 'onUpdateTypeSort' | 'updateEntry'>> {
  return Boolean(persistence.onUpdateTypeSort && persistence.updateEntry)
}

function resolveSortPersistenceTarget(
  groupLabel: string,
  typeDocument: VaultEntry | null,
  selectedView: ViewFile | null,
  persistence: SortPersistence | null,
): SortPersistenceTarget | null {
  if (groupLabel !== '__list__' || !persistence) return null
  if (typeDocument && canPersistTypeSort(persistence)) return { kind: 'type', path: typeDocument.path }
  if (selectedView && persistence.onUpdateViewDefinition) return { kind: 'view', filename: selectedView.filename }
  return null
}

function persistListSort(target: SortPersistenceTarget, config: SortConfig, persistence: SortPersistence) {
  if (target.kind === 'type') {
    persistSortToType(target.path, config, persistence)
    return
  }

  if (persistence.onUpdateViewDefinition) {
    persistSortToView(target.filename, config, persistence.onUpdateViewDefinition)
  }
}

function migrateListSortToType(
  typeDoc: VaultEntry,
  sortPrefs: Record<string, SortConfig>,
  migrationDone: Set<string>,
  persistence: SortPersistence & Required<Pick<SortPersistence, 'onUpdateTypeSort' | 'updateEntry'>>,
) {
  if (typeDoc.sort || migrationDone.has(typeDoc.path)) return
  const lsConfig = sortPrefs.__list__
  if (!lsConfig) return
  migrationDone.add(typeDoc.path)
  persistSortToType(typeDoc.path, lsConfig, persistence)
}

function saveGroupSort(
  groupLabel: string,
  option: SortOption,
  direction: SortDirection,
  setSortPrefs: Dispatch<SetStateAction<Record<string, SortConfig>>>,
) {
  setSortPrefs((prev) => {
    const next = { ...prev, [groupLabel]: { option, direction } }
    saveSortPreferences(next)
    return next
  })
}

function persistOrSaveGroupSort(params: {
  groupLabel: string
  option: SortOption
  direction: SortDirection
  setSortPrefs: Dispatch<SetStateAction<Record<string, SortConfig>>>
  typeDocument: VaultEntry | null
  selectedView: ViewFile | null
  persistence: SortPersistence | null
}) {
  const persistenceTarget = resolveSortPersistenceTarget(
    params.groupLabel,
    params.typeDocument,
    params.selectedView,
    params.persistence,
  )
  if (!persistenceTarget || !params.persistence) {
    saveGroupSort(params.groupLabel, params.option, params.direction, params.setSortPrefs)
    return
  }

  persistListSort(persistenceTarget, { option: params.option, direction: params.direction }, params.persistence)
}

function deriveEffectiveSort(configOption: SortOption, customProperties: string[]): SortOption {
  if (!configOption.startsWith('property:')) return configOption
  return customProperties.includes(configOption.slice('property:'.length)) ? configOption : 'modified'
}

export interface UseNoteListSortParams {
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
  onUpdateTypeSort?: (path: string, key: string, value: string | number | boolean | string[] | null) => void
  onUpdateViewDefinition?: (filename: string, patch: Partial<ViewDefinition>) => void
  updateEntry?: (path: string, patch: Partial<VaultEntry>) => void
}

export function useNoteListSort({
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
  onUpdateTypeSort,
  onUpdateViewDefinition,
  updateEntry,
}: UseNoteListSortParams) {
  const [sortPrefs, setSortPrefs] = useState<Record<string, SortConfig>>(loadSortPreferences)
  const typeDocument = useMemo(() => findSelectedTypeDocument(entries, selection), [entries, selection])
  const selectedView = useMemo(() => findSelectedViewFile(selection, views), [selection, views])
  const listConfig = resolveListSortConfig(typeDocument, selectedView, sortPrefs)
  const persistence = useMemo<SortPersistence | null>(
    () => createSortPersistence(onUpdateTypeSort, updateEntry, onUpdateViewDefinition),
    [onUpdateTypeSort, onUpdateViewDefinition, updateEntry],
  )

  const migrationDoneRef = useRef<Set<string>>(new Set())
  useEffect(() => {
    if (!typeDocument || !persistence || !canPersistTypeSort(persistence)) return
    migrateListSortToType(typeDocument, sortPrefs, migrationDoneRef.current, persistence)
  }, [typeDocument, sortPrefs, persistence])

  const handleSortChange = useCallback((groupLabel: string, option: SortOption, direction: SortDirection) => {
    persistOrSaveGroupSort({
      groupLabel,
      option,
      direction,
      setSortPrefs,
      typeDocument,
      selectedView,
      persistence,
    })
  }, [typeDocument, selectedView, persistence])

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
  const customProperties = useMemo(() => extractSortableProperties(filteredEntries), [filteredEntries])
  const listSort = useMemo<SortOption>(() => deriveEffectiveSort(listConfig.option, customProperties), [listConfig.option, customProperties])
  const listDirection = listSort === listConfig.option ? listConfig.direction : 'desc'

  return { listSort, listDirection, customProperties, handleSortChange, sortPrefs, typeDocument }
}
