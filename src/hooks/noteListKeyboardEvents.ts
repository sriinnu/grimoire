import { useCallback, useEffect, type RefObject } from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'
import type { VaultEntry } from '../types'
import { logKeyboardNavigationTrace } from '../utils/noteOpenPerformance'
import {
  createGlobalKeyDownHandler,
  isEditableElement,
  isInteractiveElement,
  isNeighborhoodKey,
  isNestedInteractiveTarget,
  isToggleSearchShortcut,
  moveHighlightIndex,
  resolveCurrentIndex,
  resolveHighlightedEntry,
  shouldIgnoreListKeyboardEvent,
  type KeyboardDirection,
  type ToggleSearchShortcutEvent,
} from './noteListKeyboardModel'

type ProcessableKeyEvent = Pick<
  KeyboardEvent,
  'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey' | 'preventDefault'
>

function resolveEntryForActivation(
  items: VaultEntry[],
  highlightedPathRef: RefObject<string | null>,
): VaultEntry | undefined {
  return resolveHighlightedEntry(items, highlightedPathRef.current)
}

function handleNeighborhoodActivation(options: {
  event: Pick<KeyboardEvent, 'preventDefault'>
  items: VaultEntry[]
  highlightedPathRef: RefObject<string | null>
  cancelOpen: () => void
  onEnterNeighborhood?: (entry: VaultEntry) => void | Promise<void>
}): boolean {
  const {
    event,
    items,
    highlightedPathRef,
    cancelOpen,
    onEnterNeighborhood,
  } = options

  const highlightedItem = resolveEntryForActivation(items, highlightedPathRef)
  if (!highlightedItem) return false

  event.preventDefault()
  cancelOpen()
  void onEnterNeighborhood?.(highlightedItem)
  return true
}

function handleArrowNavigation(
  event: Pick<KeyboardEvent, 'key' | 'preventDefault'>,
  moveHighlight: (direction: KeyboardDirection) => void,
): boolean {
  if (event.key === 'ArrowDown') {
    event.preventDefault()
    moveHighlight(1)
    return true
  }

  if (event.key === 'ArrowUp') {
    event.preventDefault()
    moveHighlight(-1)
    return true
  }

  return false
}

function handleHighlightedOpen(options: {
  event: Pick<KeyboardEvent, 'preventDefault'>
  items: VaultEntry[]
  highlightedPathRef: RefObject<string | null>
  flushOpen: (entry?: VaultEntry) => void
}): boolean {
  const {
    event,
    items,
    highlightedPathRef,
    flushOpen,
  } = options

  const highlightedItem = resolveEntryForActivation(items, highlightedPathRef)
  if (!highlightedItem) return false

  event.preventDefault()
  flushOpen(highlightedItem)
  return true
}

function handleSearchShortcutEvent(
  event: ProcessableKeyEvent,
  onToggleSearchShortcut?: () => void,
): boolean {
  if (!isToggleSearchShortcut(event) || !onToggleSearchShortcut) return false
  event.preventDefault()
  onToggleSearchShortcut()
  return true
}

function handleNeighborhoodShortcutEvent(options: {
  event: Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey' | 'preventDefault'>
  items: VaultEntry[]
  highlightedPathRef: RefObject<string | null>
  cancelOpen: () => void
  onEnterNeighborhood?: (entry: VaultEntry) => void | Promise<void>
}): boolean {
  const {
    event,
    items,
    highlightedPathRef,
    cancelOpen,
    onEnterNeighborhood,
  } = options

  if (!isNeighborhoodKey(event)) return false
  handleNeighborhoodActivation({
    event,
    items,
    highlightedPathRef,
    cancelOpen,
    onEnterNeighborhood,
  })
  return true
}

function handleEnterShortcutEvent(
  event: Pick<KeyboardEvent, 'key' | 'preventDefault'>,
  items: VaultEntry[],
  highlightedPathRef: RefObject<string | null>,
  flushOpen: (entry?: VaultEntry) => void,
) {
  if (event.key !== 'Enter') return
  handleHighlightedOpen({
    event,
    items,
    highlightedPathRef,
    flushOpen,
  })
}

/** Moves the list highlight, scrolls it into view, schedules open, and prefetches content. */
export function useMoveHighlight({
  items,
  selectedNotePath,
  highlightedPathRef,
  syncHighlightedPath,
  virtuosoRef,
  onPrefetch,
  scheduleOpen,
}: {
  items: VaultEntry[]
  selectedNotePath: string | null
  highlightedPathRef: RefObject<string | null>
  syncHighlightedPath: (nextPath: string | null) => void
  virtuosoRef: RefObject<VirtuosoHandle | null>
  onPrefetch?: (entry: VaultEntry) => void
  scheduleOpen: (entry: VaultEntry) => void
}) {
  return useCallback((direction: KeyboardDirection) => {
    const startedAt = performance.now()
    const currentIndex = resolveCurrentIndex(items, highlightedPathRef.current, selectedNotePath)
    const nextIndex = moveHighlightIndex(currentIndex, direction, items.length)
    const currentPath = highlightedPathRef.current ?? selectedNotePath
    const nextItem = items[nextIndex]
    if (!nextItem || nextItem.path === currentPath) return

    syncHighlightedPath(nextItem.path)
    virtuosoRef.current?.scrollIntoView({ index: nextIndex, behavior: 'auto' })
    scheduleOpen(nextItem)
    onPrefetch?.(nextItem)
    logKeyboardNavigationTrace(direction === 1 ? 'down' : 'up', items.length, performance.now() - startedAt)
  }, [highlightedPathRef, items, onPrefetch, scheduleOpen, selectedNotePath, syncHighlightedPath, virtuosoRef])
}

/** Builds the note-list keyboard dispatcher used by row and global handlers. */
export function useProcessKeyDown({
  enabled,
  items,
  highlightedPathRef,
  moveHighlight,
  flushOpen,
  cancelOpen,
  onEnterNeighborhood,
  onToggleSearchShortcut,
}: {
  enabled: boolean
  items: VaultEntry[]
  highlightedPathRef: RefObject<string | null>
  moveHighlight: (direction: KeyboardDirection) => void
  flushOpen: (entry?: VaultEntry) => void
  cancelOpen: () => void
  onEnterNeighborhood?: (entry: VaultEntry) => void | Promise<void>
  onToggleSearchShortcut?: () => void
}) {
  return useCallback((event: ProcessableKeyEvent) => {
    if (!enabled) return

    if (handleSearchShortcutEvent(event, onToggleSearchShortcut)) return
    if (items.length === 0) return
    if (handleNeighborhoodShortcutEvent({
      event,
      items,
      highlightedPathRef,
      cancelOpen,
      onEnterNeighborhood,
    })) return
    if (shouldIgnoreListKeyboardEvent(event)) return
    if (handleArrowNavigation(event, moveHighlight)) return

    handleEnterShortcutEvent(event, items, highlightedPathRef, flushOpen)
  }, [cancelOpen, enabled, flushOpen, highlightedPathRef, items, moveHighlight, onEnterNeighborhood, onToggleSearchShortcut])
}

/** Owns global keyboard routing while preserving nested controls and editable fields. */
export function useGlobalKeyboardHandling({
  enabled,
  panelRef,
  containerRef,
  processKeyDown,
}: {
  enabled: boolean
  panelRef: RefObject<HTMLDivElement | null>
  containerRef: RefObject<HTMLDivElement | null>
  processKeyDown: (event: KeyboardEvent) => void
}) {
  const shouldSkipGlobalKeyDown = useCallback((activeElement: Element | null) => {
    if (isEditableElement(activeElement)) return true
    return Boolean(
      activeElement !== containerRef.current
      && containerRef.current?.contains(activeElement)
      && isInteractiveElement(activeElement)
    )
  }, [containerRef])

  useEffect(() => {
    if (!enabled) return
    const handleWindowKeyDown = createGlobalKeyDownHandler(panelRef, shouldSkipGlobalKeyDown, processKeyDown)

    window.addEventListener('keydown', handleWindowKeyDown)
    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [enabled, panelRef, processKeyDown, shouldSkipGlobalKeyDown])
}

/** Toggles search from the keyboard and restores note-list focus when closing search. */
export function useSearchToggleShortcut({
  toggleSearch,
  searchVisible,
  focusList,
}: {
  toggleSearch?: () => void
  searchVisible: boolean
  focusList: () => void
}) {
  return useCallback(() => {
    if (!toggleSearch) return

    toggleSearch()
    if (!searchVisible) return

    requestAnimationFrame(() => {
      focusList()
    })
  }, [focusList, searchVisible, toggleSearch])
}

/** Handles row-level keydown while letting nested row controls keep ownership. */
export function useDirectKeyDownHandler(
  processKeyDown: (event: React.KeyboardEvent) => void,
) {
  return useCallback((event: React.KeyboardEvent) => {
    if (isNestedInteractiveTarget(event.target, event.currentTarget)) return
    processKeyDown(event)
  }, [processKeyDown])
}

export type { ToggleSearchShortcutEvent }
