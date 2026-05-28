import { useState, useCallback, useEffect, useRef } from 'react'
import type { VirtuosoHandle } from 'react-virtuoso'
import type { VaultEntry } from '../types'
import {
  useDirectKeyDownHandler,
  useGlobalKeyboardHandling,
  useMoveHighlight,
  useProcessKeyDown,
  useSearchToggleShortcut,
} from './noteListKeyboardEvents'
import {
  isListActive,
  isPanelActive,
  resolveHighlightedPath,
  resolveStableHighlightedPath,
} from './noteListKeyboardModel'

interface NoteListKeyboardOptions {
  items: VaultEntry[]
  selectedNotePath: string | null
  onOpen: (entry: VaultEntry) => void
  onEnterNeighborhood?: (entry: VaultEntry) => void | Promise<void>
  onPrefetch?: (entry: VaultEntry) => void
  searchVisible?: boolean
  toggleSearch?: () => void
  enabled: boolean
}

function useKeyboardItemRefs(items: VaultEntry[], selectedNotePath: string | null) {
  const itemsRef = useRef(items)
  const selectedNotePathRef = useRef(selectedNotePath)

  useEffect(() => {
    itemsRef.current = items
    selectedNotePathRef.current = selectedNotePath
  }, [items, selectedNotePath])

  return { itemsRef, selectedNotePathRef }
}

function useHighlightedPath() {
  const [highlightedPathState, setHighlightedPath] = useState<string | null>(null)
  const highlightedPathRef = useRef<string | null>(null)

  const syncHighlightedPath = useCallback((nextPath: string | null) => {
    highlightedPathRef.current = nextPath
    setHighlightedPath(nextPath)
  }, [])

  return { highlightedPathRef, highlightedPathState, syncHighlightedPath }
}

function useSelectionSync(
  itemsRef: React.RefObject<VaultEntry[]>,
  selectedNotePathRef: React.RefObject<string | null>,
  syncHighlightedPath: (nextPath: string | null) => void,
) {
  return useCallback(() => {
    syncHighlightedPath(resolveHighlightedPath(itemsRef.current, selectedNotePathRef.current))
  }, [itemsRef, selectedNotePathRef, syncHighlightedPath])
}

interface ScheduledOpenState {
  entry: VaultEntry | null
  frameId: number | null
}

function cancelScheduledOpen(stateRef: React.RefObject<ScheduledOpenState>): void {
  const frameId = stateRef.current.frameId
  if (frameId !== null) cancelAnimationFrame(frameId)
  stateRef.current.entry = null
  stateRef.current.frameId = null
}

function flushScheduledOpen(
  stateRef: React.RefObject<ScheduledOpenState>,
  onOpen: (entry: VaultEntry) => void,
  entry?: VaultEntry,
): void {
  if (entry) stateRef.current.entry = entry
  const nextEntry = stateRef.current.entry
  if (!nextEntry) return

  if (stateRef.current.frameId !== null) cancelAnimationFrame(stateRef.current.frameId)
  stateRef.current.entry = null
  stateRef.current.frameId = null
  onOpen(nextEntry)
}

function scheduleOpenForNextFrame(
  stateRef: React.RefObject<ScheduledOpenState>,
  onOpen: (entry: VaultEntry) => void,
  entry: VaultEntry,
): void {
  stateRef.current.entry = entry
  if (stateRef.current.frameId !== null) return

  stateRef.current.frameId = requestAnimationFrame(() => {
    flushScheduledOpen(stateRef, onOpen)
  })
}

function useScheduledOpen(onOpen: (entry: VaultEntry) => void, enabled: boolean) {
  const stateRef = useRef<ScheduledOpenState>({ entry: null, frameId: null })

  const scheduleOpen = useCallback((entry: VaultEntry) => {
    scheduleOpenForNextFrame(stateRef, onOpen, entry)
  }, [onOpen])

  const flushOpen = useCallback((entry?: VaultEntry) => {
    flushScheduledOpen(stateRef, onOpen, entry)
  }, [onOpen])

  const cancelOpen = useCallback(() => {
    cancelScheduledOpen(stateRef)
  }, [])

  useEffect(() => {
    if (enabled) return
    cancelOpen()
  }, [cancelOpen, enabled])

  useEffect(() => cancelOpen, [cancelOpen])

  return { cancelOpen, flushOpen, scheduleOpen }
}

function useFocusHandlers({
  containerRef,
  syncToCurrentSelection,
  syncHighlightedPath,
}: {
  containerRef: React.RefObject<HTMLDivElement | null>
  syncToCurrentSelection: () => void
  syncHighlightedPath: (nextPath: string | null) => void
}) {
  const handleFocus = useCallback(() => {
    syncToCurrentSelection()
  }, [syncToCurrentSelection])

  const handleBlur = useCallback(() => {
    syncHighlightedPath(null)
  }, [syncHighlightedPath])

  const focusList = useCallback(() => {
    const container = containerRef.current
    if (!container) return

    container.focus()
    requestAnimationFrame(() => {
      if (isListActive(containerRef.current)) syncToCurrentSelection()
    })
  }, [containerRef, syncToCurrentSelection])

  return { focusList, handleBlur, handleFocus }
}

function usePanelFocusState(panelRef: React.RefObject<HTMLDivElement | null>) {
  const [isPanelActiveState, setIsPanelActiveState] = useState(false)

  const syncPanelState = useCallback(() => {
    setIsPanelActiveState(isPanelActive(panelRef.current))
  }, [panelRef])

  const handlePanelFocusCapture = useCallback(() => {
    setIsPanelActiveState(true)
  }, [])

  const handlePanelBlurCapture = useCallback(() => {
    requestAnimationFrame(syncPanelState)
  }, [syncPanelState])

  return {
    handlePanelBlurCapture,
    handlePanelFocusCapture,
    isPanelActive: isPanelActiveState,
  }
}

export function useNoteListKeyboard({
  items,
  selectedNotePath,
  onOpen,
  onEnterNeighborhood,
  onPrefetch,
  searchVisible = false,
  toggleSearch,
  enabled,
}: NoteListKeyboardOptions) {
  const virtuosoRef = useRef<VirtuosoHandle>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const { itemsRef, selectedNotePathRef } = useKeyboardItemRefs(items, selectedNotePath)
  const { highlightedPathRef, highlightedPathState, syncHighlightedPath } = useHighlightedPath()
  const syncToCurrentSelection = useSelectionSync(itemsRef, selectedNotePathRef, syncHighlightedPath)
  const { cancelOpen, flushOpen, scheduleOpen } = useScheduledOpen(onOpen, enabled)
  const { focusList, handleBlur, handleFocus } = useFocusHandlers({
    containerRef,
    syncToCurrentSelection,
    syncHighlightedPath,
  })
  const { handlePanelBlurCapture, handlePanelFocusCapture, isPanelActive: isPanelActiveState } = usePanelFocusState(panelRef)
  const handleToggleSearchShortcut = useSearchToggleShortcut({
    focusList,
    searchVisible,
    toggleSearch,
  })
  const moveHighlight = useMoveHighlight({
    items,
    selectedNotePath,
    highlightedPathRef,
    syncHighlightedPath,
    virtuosoRef,
    onPrefetch,
    scheduleOpen,
  })
  const processKeyDown = useProcessKeyDown({
    enabled,
    items,
    highlightedPathRef,
    moveHighlight,
    flushOpen,
    cancelOpen,
    onEnterNeighborhood,
    onToggleSearchShortcut: handleToggleSearchShortcut,
  })
  const handleKeyDown = useDirectKeyDownHandler(processKeyDown)
  useGlobalKeyboardHandling({ enabled, panelRef, containerRef, processKeyDown })
  useEffect(() => {
    cancelOpen()
  }, [cancelOpen, selectedNotePath])

  const highlightedPath = resolveStableHighlightedPath(items, highlightedPathState)

  return {
    containerRef,
    focusList,
    handlePanelBlurCapture,
    handlePanelFocusCapture,
    highlightedPath,
    handleBlur,
    handleKeyDown,
    handleFocus,
    isPanelActive: isPanelActiveState,
    panelRef,
    toggleSearchShortcut: handleToggleSearchShortcut,
    virtuosoRef,
  }
}
