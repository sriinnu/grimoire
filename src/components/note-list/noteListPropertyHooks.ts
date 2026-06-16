import { useMemo } from 'react'
import type { InboxPeriod, SidebarSelection, VaultEntry, ViewDefinition, ViewFile } from '../../types'
import { filterEntries, filterInboxEntries } from '../../utils/noteListHelpers'
import type { NoteListPropertiesScope } from './noteListPropertiesEvents'

function hasScalarListPropertyValue(value: string | null): boolean {
  return value !== null && value.trim() !== ''
}

function collectAvailableProperties(entries: VaultEntry[]): string[] {
  const keys = new Set<string>()
  for (const entry of entries) {
    if (hasScalarListPropertyValue(entry.status)) keys.add('status')
    for (const key of Object.keys(entry.properties ?? {})) keys.add(key)
    for (const key of Object.keys(entry.relationships ?? {})) keys.add(key)
  }
  return [...keys].sort((a, b) => a.localeCompare(b))
}

function collectTypeAvailableProperties(entries: VaultEntry[], typeName: string): string[] {
  return collectAvailableProperties(entries.filter((entry) => entry.isA === typeName))
}

function deriveDefaultDisplay(entries: VaultEntry[], typeEntryMap: Record<string, VaultEntry>): string[] {
  const ordered: string[] = []
  const seen = new Set<string>()

  for (const entry of entries) {
    for (const key of typeEntryMap[entry.isA ?? '']?.listPropertiesDisplay ?? []) {
      if (seen.has(key)) continue
      seen.add(key)
      ordered.push(key)
    }
  }

  return ordered
}

interface ScopedPropertyPickerState {
  availableProperties: string[]
  defaultDisplay: string[]
}

function useAllNotesPropertyPickerState(
  entries: VaultEntry[],
  selection: SidebarSelection,
  isAllNotesView: boolean,
  typeEntryMap: Record<string, VaultEntry>,
): ScopedPropertyPickerState {
  const allNotesEntries = useMemo(
    () => isAllNotesView
      ? [
          ...filterEntries(entries, selection, 'open'),
          ...filterEntries(entries, selection, 'archived'),
        ]
      : [],
    [entries, isAllNotesView, selection],
  )

  return {
    availableProperties: useMemo(() => collectAvailableProperties(allNotesEntries), [allNotesEntries]),
    defaultDisplay: useMemo(() => deriveDefaultDisplay(allNotesEntries, typeEntryMap), [allNotesEntries, typeEntryMap]),
  }
}

function useInboxPropertyPickerState(
  entries: VaultEntry[],
  inboxPeriod: InboxPeriod,
  isInboxView: boolean,
  typeEntryMap: Record<string, VaultEntry>,
): ScopedPropertyPickerState {
  const inboxEntries = useMemo(
    () => isInboxView ? filterInboxEntries(entries, inboxPeriod) : [],
    [entries, inboxPeriod, isInboxView],
  )

  return {
    availableProperties: useMemo(() => collectAvailableProperties(inboxEntries), [inboxEntries]),
    defaultDisplay: useMemo(() => deriveDefaultDisplay(inboxEntries, typeEntryMap), [inboxEntries, typeEntryMap]),
  }
}

interface ViewPropertyPickerState extends ScopedPropertyPickerState {
  selectedView: ViewFile | null
  hasCustomProperties: boolean
}

function findSelectedViewFile(selection: SidebarSelection, views?: ViewFile[]): ViewFile | null {
  if (selection.kind !== 'view') return null
  return views?.find((candidate) => candidate.filename === selection.filename) ?? null
}

function useViewPropertyPickerState(
  entries: VaultEntry[],
  selection: SidebarSelection,
  views: ViewFile[] | undefined,
  typeEntryMap: Record<string, VaultEntry>,
): ViewPropertyPickerState {
  const selectedView = useMemo(() => findSelectedViewFile(selection, views), [selection, views])
  const viewEntries = useMemo(
    () => selectedView ? filterEntries(entries, selection, undefined, views) : [],
    [entries, selection, selectedView, views],
  )

  return {
    selectedView,
    availableProperties: useMemo(() => collectAvailableProperties(viewEntries), [viewEntries]),
    defaultDisplay: useMemo(() => deriveDefaultDisplay(viewEntries, typeEntryMap), [viewEntries, typeEntryMap]),
    hasCustomProperties: Boolean(selectedView?.definition.listPropertiesDisplay?.length),
  }
}

export interface NoteListPropertyPicker {
  scope: NoteListPropertiesScope
  availableProperties: string[]
  currentDisplay: string[]
  onSave: (value: string[] | null) => void
  triggerTitle: string
}

interface BuildFilterPropertyPickerParams {
  scope: Exclude<NoteListPropertiesScope, 'type'>
  isActive: boolean
  availableProperties: string[]
  hasCustomProperties: boolean
  noteListProperties?: string[] | null
  defaultDisplay: string[]
  onSave?: (value: string[] | null) => void
  triggerTitle: string
}

function buildFilterPropertyPicker({
  scope,
  isActive,
  availableProperties,
  hasCustomProperties,
  noteListProperties,
  defaultDisplay,
  onSave,
  triggerTitle,
}: BuildFilterPropertyPickerParams): NoteListPropertyPicker | null {
  if (!isActive || !onSave) return null

  return {
    scope,
    availableProperties,
    currentDisplay: hasCustomProperties ? noteListProperties ?? [] : defaultDisplay,
    onSave,
    triggerTitle,
  }
}

function buildTypePropertyPicker({
  isSectionGroup,
  typeDocument,
  onUpdateTypeSort,
  typeAvailableProperties,
}: {
  isSectionGroup: boolean
  typeDocument: VaultEntry | null
  onUpdateTypeSort?: (path: string, key: string, value: string | number | boolean | string[] | null) => void
  typeAvailableProperties: string[]
}): NoteListPropertyPicker | null {
  if (!isSectionGroup || !typeDocument || !onUpdateTypeSort) return null

  return {
    scope: 'type',
    availableProperties: typeAvailableProperties,
    currentDisplay: typeDocument.listPropertiesDisplay ?? [],
    onSave: (value: string[] | null) => onUpdateTypeSort(typeDocument.path, '_list_properties_display', value),
    triggerTitle: 'Customize columns',
  }
}

function buildViewPropertyPicker({
  selectedView,
  availableProperties,
  defaultDisplay,
  onUpdateViewDefinition,
}: {
  selectedView: ViewFile | null
  availableProperties: string[]
  defaultDisplay: string[]
  onUpdateViewDefinition?: (filename: string, patch: Partial<ViewDefinition>) => void
}): NoteListPropertyPicker | null {
  if (!selectedView || !onUpdateViewDefinition) return null

  const currentDisplay = (selectedView.definition.listPropertiesDisplay?.length ?? 0) > 0
    ? selectedView.definition.listPropertiesDisplay ?? []
    : defaultDisplay

  return {
    scope: 'view',
    availableProperties,
    currentDisplay,
    onSave: (value: string[] | null) => onUpdateViewDefinition(selectedView.filename, { listPropertiesDisplay: value ?? [] }),
    triggerTitle: `Customize ${selectedView.definition.name} columns`,
  }
}

function resolveDisplayPropsOverride({
  isAllNotesView,
  hasCustomAllNotesProperties,
  allNotesNoteListProperties,
  isInboxView,
  hasCustomInboxProperties,
  inboxNoteListProperties,
  selectedView,
  hasCustomViewProperties,
}: {
  isAllNotesView: boolean
  hasCustomAllNotesProperties: boolean
  allNotesNoteListProperties?: string[] | null
  isInboxView: boolean
  hasCustomInboxProperties: boolean
  inboxNoteListProperties?: string[] | null
  selectedView: ViewFile | null
  hasCustomViewProperties: boolean
}) {
  if (selectedView && hasCustomViewProperties) return selectedView.definition.listPropertiesDisplay ?? null
  if (isAllNotesView && hasCustomAllNotesProperties) return allNotesNoteListProperties ?? null
  if (isInboxView && hasCustomInboxProperties) return inboxNoteListProperties ?? null
  return null
}

interface UseListPropertyPickerParams {
  entries: VaultEntry[]
  selection: SidebarSelection
  inboxPeriod: InboxPeriod
  typeDocument: VaultEntry | null
  typeEntryMap: Record<string, VaultEntry>
  allNotesNoteListProperties?: string[] | null
  onUpdateAllNotesNoteListProperties?: (value: string[] | null) => void
  inboxNoteListProperties?: string[] | null
  onUpdateInboxNoteListProperties?: (value: string[] | null) => void
  onUpdateViewDefinition?: (filename: string, patch: Partial<ViewDefinition>) => void
  onUpdateTypeSort?: (path: string, key: string, value: string | number | boolean | string[] | null) => void
  views?: ViewFile[]
}

export function useListPropertyPicker({
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
}: UseListPropertyPickerParams) {
  const isAllNotesView = selection.kind === 'filter' && selection.filter === 'all'
  const isInboxView = selection.kind === 'filter' && selection.filter === 'inbox'
  const isSectionGroup = selection.kind === 'sectionGroup'
  const allNotesState = useAllNotesPropertyPickerState(entries, selection, isAllNotesView, typeEntryMap)
  const inboxState = useInboxPropertyPickerState(entries, inboxPeriod, isInboxView, typeEntryMap)
  const viewState = useViewPropertyPickerState(entries, selection, views, typeEntryMap)
  const typeAvailableProperties = useMemo(
    () => typeDocument ? collectTypeAvailableProperties(entries, typeDocument.title) : [],
    [entries, typeDocument],
  )
  const hasCustomAllNotesProperties = !!(allNotesNoteListProperties && allNotesNoteListProperties.length > 0)
  const hasCustomInboxProperties = !!(inboxNoteListProperties && inboxNoteListProperties.length > 0)
  const displayPropsOverride = resolveDisplayPropsOverride({
    isAllNotesView,
    hasCustomAllNotesProperties,
    allNotesNoteListProperties,
    isInboxView,
    hasCustomInboxProperties,
    inboxNoteListProperties,
    selectedView: viewState.selectedView,
    hasCustomViewProperties: viewState.hasCustomProperties,
  })

  const propertyPicker = useMemo<NoteListPropertyPicker | null>(() => {
    return buildViewPropertyPicker({
      selectedView: viewState.selectedView,
      availableProperties: viewState.availableProperties,
      defaultDisplay: viewState.defaultDisplay,
      onUpdateViewDefinition,
    }) ?? buildFilterPropertyPicker({
      scope: 'all',
      isActive: isAllNotesView,
      availableProperties: allNotesState.availableProperties,
      hasCustomProperties: hasCustomAllNotesProperties,
      noteListProperties: allNotesNoteListProperties,
      defaultDisplay: allNotesState.defaultDisplay,
      onSave: onUpdateAllNotesNoteListProperties,
      triggerTitle: 'Customize Pages columns',
    }) ?? buildFilterPropertyPicker({
      scope: 'inbox',
      isActive: isInboxView,
      availableProperties: inboxState.availableProperties,
      hasCustomProperties: hasCustomInboxProperties,
      noteListProperties: inboxNoteListProperties,
      defaultDisplay: inboxState.defaultDisplay,
      onSave: onUpdateInboxNoteListProperties,
      triggerTitle: 'Customize Inbox columns',
    }) ?? buildTypePropertyPicker({
      isSectionGroup,
      typeDocument,
      onUpdateTypeSort,
      typeAvailableProperties,
    })
  }, [
    allNotesState.availableProperties,
    allNotesState.defaultDisplay,
    allNotesNoteListProperties,
    hasCustomAllNotesProperties,
    hasCustomInboxProperties,
    inboxNoteListProperties,
    inboxState.availableProperties,
    inboxState.defaultDisplay,
    isAllNotesView,
    isInboxView,
    isSectionGroup,
    onUpdateAllNotesNoteListProperties,
    onUpdateInboxNoteListProperties,
    onUpdateTypeSort,
    onUpdateViewDefinition,
    typeAvailableProperties,
    typeDocument,
    viewState.availableProperties,
    viewState.defaultDisplay,
    viewState.selectedView,
  ])

  return { displayPropsOverride, propertyPicker }
}
