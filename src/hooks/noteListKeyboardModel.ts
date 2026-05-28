import type { RefObject } from 'react'
import type { VaultEntry } from '../types'

export type KeyboardDirection = 1 | -1

export type ToggleSearchShortcutEvent = Pick<
  KeyboardEvent,
  'key' | 'code' | 'metaKey' | 'ctrlKey' | 'altKey' | 'shiftKey'
>

export type NavigationKeyEvent = Pick<KeyboardEvent, 'key' | 'metaKey' | 'ctrlKey' | 'altKey'>

interface ItemIndex {
  entryByPath: Map<string, VaultEntry>
  indexByPath: Map<string, number>
}

const itemIndexCache = new WeakMap<VaultEntry[], ItemIndex>()

function buildItemIndex(items: VaultEntry[]): ItemIndex {
  const entryByPath = new Map<string, VaultEntry>()
  const indexByPath = new Map<string, number>()

  for (const [index, entry] of items.entries()) {
    entryByPath.set(entry.path, entry)
    indexByPath.set(entry.path, index)
  }

  return { entryByPath, indexByPath }
}

function getItemIndex(items: VaultEntry[]): ItemIndex {
  const cached = itemIndexCache.get(items)
  if (cached) return cached

  const nextIndex = buildItemIndex(items)
  itemIndexCache.set(items, nextIndex)
  return nextIndex
}

/** Resolves the path that should be highlighted when the list receives focus. */
export function resolveHighlightedPath(items: VaultEntry[], selectedNotePath: string | null): string | null {
  if (items.length === 0) return null
  if (!selectedNotePath) return items[0].path

  return getItemIndex(items).entryByPath.has(selectedNotePath)
    ? selectedNotePath
    : items[0].path
}

/** Returns true when the current highlight still exists in the visible item list. */
export function resolveStableHighlightedPath(items: VaultEntry[], highlightedPathState: string | null): string | null {
  return getItemIndex(items).entryByPath.has(highlightedPathState ?? '')
    ? highlightedPathState
    : null
}

/** Checks whether focus is somewhere inside the virtual note-list container. */
export function isListActive(container: HTMLDivElement | null): boolean {
  if (!container) return false
  const activeElement = document.activeElement
  return activeElement instanceof Node && container.contains(activeElement)
}

/** Checks whether focus is somewhere inside the whole note-list panel. */
export function isPanelActive(panel: HTMLDivElement | null): boolean {
  if (!panel) return false
  const activeElement = document.activeElement
  return activeElement instanceof Node && panel.contains(activeElement)
}

/** Identifies fields and contenteditable regions that should own key presses. */
export function isEditableElement(element: Element | null): boolean {
  if (!element) return false
  if (
    element instanceof HTMLInputElement
    || element instanceof HTMLTextAreaElement
    || element instanceof HTMLSelectElement
  ) return true
  if (!(element instanceof HTMLElement)) return false
  return element.isContentEditable || !!element.closest('[contenteditable="true"]')
}

/** Identifies nested controls inside the row/list that should keep their keyboard behavior. */
export function isInteractiveElement(element: Element | null): boolean {
  if (!element) return false
  if (isEditableElement(element)) return true
  if (!(element instanceof HTMLElement)) return false
  return element instanceof HTMLButtonElement
    || element instanceof HTMLAnchorElement
    || element.getAttribute('role') === 'button'
}

/** Returns true when a row key event started inside a nested button/link/input. */
export function isNestedInteractiveTarget(
  target: EventTarget | null,
  currentTarget: EventTarget | null,
): boolean {
  return target instanceof Element
    && currentTarget instanceof Element
    && target !== currentTarget
    && currentTarget.contains(target)
    && isInteractiveElement(target)
}

/** Resolves the active item index from highlighted path first, selected path second. */
export function resolveCurrentIndex(
  items: VaultEntry[],
  highlightedPath: string | null,
  selectedNotePath: string | null,
): number {
  const activePath = highlightedPath ?? selectedNotePath
  if (!activePath) return -1
  return getItemIndex(items).indexByPath.get(activePath) ?? -1
}

/** Computes the next keyboard-highlight index without wrapping past list edges. */
export function moveHighlightIndex(
  previousIndex: number,
  direction: KeyboardDirection,
  itemCount: number,
): number {
  if (itemCount === 0) return -1
  if (previousIndex < 0) return direction === 1 ? 0 : itemCount - 1

  const currentIndex = Math.min(previousIndex, itemCount - 1)
  const nextIndex = currentIndex + direction
  if (nextIndex < 0 || nextIndex >= itemCount) return previousIndex
  return nextIndex
}

/** Resolves the entry backing the currently highlighted path. */
export function resolveHighlightedEntry(
  items: VaultEntry[],
  highlightedPath: string | null,
): VaultEntry | undefined {
  if (!highlightedPath) return undefined
  return getItemIndex(items).entryByPath.get(highlightedPath)
}

/** Returns true for Cmd/Ctrl-style shortcuts on macOS, Windows, and Linux. */
export function usesCommandModifier(event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey'>): boolean {
  return event.metaKey || event.ctrlKey
}

/** Detects the app-owned note-list search shortcut. */
export function isToggleSearchShortcut(event: ToggleSearchShortcutEvent): boolean {
  if (!usesCommandModifier(event) || event.altKey || event.shiftKey) return false
  return event.code === 'KeyF' || event.key.toLowerCase() === 'f'
}

/** Detects the command that enters Neighborhood mode from the highlighted note. */
export function isNeighborhoodKey(event: NavigationKeyEvent): boolean {
  return event.key === 'Enter' && usesCommandModifier(event) && !event.altKey
}

/** Returns true when a keyboard event belongs to a higher-level shortcut. */
export function shouldIgnoreListKeyboardEvent(
  event: Pick<KeyboardEvent, 'metaKey' | 'ctrlKey' | 'altKey'>,
): boolean {
  return usesCommandModifier(event) || event.altKey
}

/** Builds the window keydown listener while keeping search active inside the note-list panel. */
export function createGlobalKeyDownHandler(
  panelRef: RefObject<HTMLDivElement | null>,
  shouldSkipGlobalKeyDown: (activeElement: Element | null) => boolean,
  processKeyDown: (event: KeyboardEvent) => void,
) {
  return (event: KeyboardEvent) => {
    if (event.defaultPrevented) return
    if (isToggleSearchShortcut(event) && isPanelActive(panelRef.current)) {
      processKeyDown(event)
      return
    }
    if (shouldSkipGlobalKeyDown(document.activeElement)) return
    processKeyDown(event)
  }
}
