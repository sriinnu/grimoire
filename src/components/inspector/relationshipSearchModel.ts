import {
  useCallback,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from 'react'
import type { VaultEntry } from '../../types'
import {
  canonicalWikilinkTargetForEntry,
  canonicalWikilinkTargetForTitle,
  formatWikilinkRef,
  resolveEntry,
} from '../../utils/wikilink'
import { useNoteSearch } from '../../hooks/useNoteSearch'

export interface RelationshipLookupContext {
  entries: VaultEntry[]
  vaultPath: string
}

interface CreateOptionArgs {
  entries: VaultEntry[]
  trimmedQuery: string
  resultCount: number
  hasCreator: boolean
}

interface SearchDropdownArgs {
  focused: boolean
  trimmed: string
  resultCount: number
  showCreate: boolean
}

interface TitleSelectionState {
  showCreate: boolean
  selectedIndex: number
  createIndex: number
  trimmed: string
}

/** Checks whether any entry resolves for the given title through wikilink resolution. */
export function hasExactTitleMatch({
  entries,
  title,
}: {
  entries: VaultEntry[]
  title: string
}): boolean {
  return resolveEntry(entries, title) !== undefined
}

/** Formats a VaultEntry as the canonical frontmatter wikilink reference. */
export function canonicalRefForEntry({
  entry,
  vaultPath,
}: {
  entry: VaultEntry
  vaultPath: string
}): string {
  return formatWikilinkRef(canonicalWikilinkTargetForEntry(entry, vaultPath))
}

/** Formats a note title as the canonical frontmatter wikilink reference. */
export function canonicalRefForTitle({
  title,
  entries,
  vaultPath,
}: {
  title: string
} & RelationshipLookupContext): string {
  return formatWikilinkRef(canonicalWikilinkTargetForTitle(title, entries, vaultPath))
}

/** Returns whether a relationship search dropdown should be visible. */
export function shouldShowSearchDropdown({
  focused,
  trimmed,
  resultCount,
  showCreate,
}: SearchDropdownArgs): boolean {
  return focused && trimmed.length > 0 && (resultCount > 0 || showCreate)
}

function titleSelectionState(state: TitleSelectionState): TitleSelectionState {
  return state
}

function shouldCreateRelationship({
  showCreate,
  selectedIndex,
  createIndex,
  trimmed,
}: TitleSelectionState): boolean {
  return showCreate && selectedIndex === createIndex && trimmed.length > 0
}

function hasSelectedRelationshipEntry(
  selectedEntry?: VaultEntry,
): selectedEntry is VaultEntry {
  return selectedEntry !== undefined
}

/** Routes Enter confirmation through create, selected-entry, or fallback paths. */
export function confirmRelationshipSelection({
  showCreate,
  selectedIndex,
  createIndex,
  trimmed,
  selectedEntry,
  onCreate,
  onSelectEntry,
  onFallback,
}: {
  showCreate: boolean
  selectedIndex: number
  createIndex: number
  trimmed: string
  selectedEntry?: VaultEntry
  onCreate?: (title: string) => void
  onSelectEntry?: (entry: VaultEntry) => void
  onFallback?: () => void
}): void {
  if (shouldCreateRelationship(titleSelectionState({
    showCreate,
    selectedIndex,
    createIndex,
    trimmed,
  }))) {
    onCreate?.(trimmed)
    return
  }
  if (hasSelectedRelationshipEntry(selectedEntry)) {
    onSelectEntry?.(selectedEntry)
    return
  }
  onFallback?.()
}

/** Shared keyboard navigation for search dropdowns with an optional create item. */
export function useSearchKeyboard(
  search: ReturnType<typeof useNoteSearch>,
  totalItems: number,
  onConfirm: () => void,
  onEscape: () => void,
) {
  return useCallback((event: KeyboardEvent) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      search.setSelectedIndex((index: number) => Math.min(index + 1, totalItems - 1))
    } else if (event.key === 'ArrowUp') {
      event.preventDefault()
      search.setSelectedIndex((index: number) => Math.max(index - 1, 0))
    } else if (event.key === 'Enter') {
      event.preventDefault()
      onConfirm()
    } else if (event.key === 'Escape') {
      onEscape()
    }
  }, [search, totalItems, onConfirm, onEscape])
}

/** Calls async note creation, then defers the frontmatter side-effect to the next tick. */
export function useCreateAndOpen(
  onCreateAndOpenNote: ((title: string) => Promise<boolean>) | undefined,
  afterCreate: (title: string) => void,
  onDone: () => void,
) {
  return useCallback(async (title: string) => {
    if (!onCreateAndOpenNote || !title) return
    const ok = await onCreateAndOpenNote(title)
    if (!ok) return
    setTimeout(() => afterCreate(title), 0)
    onDone()
  }, [onCreateAndOpenNote, afterCreate, onDone])
}

/** Derives create-option state from search results and existing entries. */
export function useCreateOption({
  entries,
  trimmedQuery,
  resultCount,
  hasCreator,
}: CreateOptionArgs) {
  const showCreate = hasCreator &&
    trimmedQuery.length > 0 &&
    !hasExactTitleMatch({ entries, title: trimmedQuery })
  return {
    showCreate,
    createIndex: resultCount,
    totalItems: resultCount + (showCreate ? 1 : 0),
  }
}

/** Owns state and handlers for the inline add-reference search field. */
export function useInlineAddNoteState(
  entries: VaultEntry[],
  vaultPath: string,
  onAdd: (ref: string) => void,
  onCreateAndOpenNote?: (title: string) => Promise<boolean>,
) {
  const [active, setActive] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const search = useNoteSearch(entries, query, 8)
  const lookupContext = useMemo(() => ({ entries, vaultPath }), [entries, vaultPath])

  const trimmed = query.trim()
  const { showCreate, createIndex, totalItems } = useCreateOption({
    entries,
    trimmedQuery: trimmed,
    resultCount: search.results.length,
    hasCreator: !!onCreateAndOpenNote,
  })

  const dismiss = useCallback(() => {
    setQuery('')
    setActive(false)
  }, [])

  const selectAndClose = useCallback((ref: string) => {
    onAdd(ref)
    dismiss()
  }, [onAdd, dismiss])

  const selectEntryAndClose = useCallback((entry: VaultEntry) => {
    selectAndClose(canonicalRefForEntry({ entry, vaultPath }))
  }, [selectAndClose, vaultPath])

  const handleCreateAndOpen = useCreateAndOpen(
    onCreateAndOpenNote,
    (title) => onAdd(canonicalRefForTitle({ title, ...lookupContext })),
    dismiss,
  )

  const handleFallback = useCallback(() => {
    if (!trimmed) return
    selectAndClose(canonicalRefForTitle({ title: trimmed, ...lookupContext }))
  }, [trimmed, selectAndClose, lookupContext])

  const handleConfirm = useCallback(() => {
    confirmRelationshipSelection({
      showCreate,
      selectedIndex: search.selectedIndex,
      createIndex,
      trimmed,
      selectedEntry: search.selectedEntry,
      onCreate: handleCreateAndOpen,
      onSelectEntry: selectEntryAndClose,
      onFallback: handleFallback,
    })
  }, [
    showCreate,
    search.selectedIndex,
    search.selectedEntry,
    createIndex,
    trimmed,
    handleCreateAndOpen,
    selectEntryAndClose,
    handleFallback,
  ])

  const handleKeyDown = useSearchKeyboard(search, totalItems, handleConfirm, dismiss)
  const showDropdown = shouldShowSearchDropdown({
    focused: active,
    trimmed,
    resultCount: search.results.length,
    showCreate,
  })

  return {
    active,
    setActive,
    query,
    setQuery,
    inputRef,
    search,
    dismiss,
    handleKeyDown,
    showDropdown,
    selectEntryAndClose,
    handleCreateAndOpen,
  }
}
