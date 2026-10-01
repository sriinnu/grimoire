import { useCallback, useState, type SetStateAction } from 'react'
import { APP_STORAGE_KEYS } from '../constants/appStorage'

export const COLUMN_MIN_WIDTHS = {
  sidebar: 180,
  noteList: 220,
  editor: 560,
  inspector: 240,
} as const

const COLUMN_MAX_WIDTHS = {
  sidebar: 400,
  noteList: 500,
  inspector: 500,
} as const

// Sriinnu: Bear-like proportions — the list is for scanning titles, the editor
// is for writing. 450px of list left the page cramped on a 13" screen.
const COLUMN_DEFAULT_WIDTHS = {
  sidebar: 256,
  noteList: 340,
  inspector: 280,
} as const
const FULL_LAYOUT_RESIZE_HANDLES_WIDTH = 12

interface LayoutPanelOptions {
  initialInspectorCollapsed?: boolean
  viewportWidth?: number
}

interface InitialLayout {
  sidebarWidth: number
  noteListWidth: number
  inspectorWidth: number
  inspectorCollapsed: boolean
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value))
}

function getViewportWidth(options?: LayoutPanelOptions): number | null {
  if (options?.viewportWidth !== undefined) return options.viewportWidth
  if (typeof window === 'undefined') return null
  return window.innerWidth
}

function fitCollapsedNavigationColumns(viewportWidth: number): Pick<InitialLayout, 'sidebarWidth' | 'noteListWidth'> {
  const navigationBudget = viewportWidth - COLUMN_MIN_WIDTHS.editor - FULL_LAYOUT_RESIZE_HANDLES_WIDTH
  return fitNavigationColumns(navigationBudget)
}

function fitVisibleNavigationColumns(viewportWidth: number): Pick<InitialLayout, 'sidebarWidth' | 'noteListWidth'> {
  const navigationBudget = viewportWidth
    - COLUMN_MIN_WIDTHS.editor
    - COLUMN_DEFAULT_WIDTHS.inspector
    - FULL_LAYOUT_RESIZE_HANDLES_WIDTH
  return fitNavigationColumns(navigationBudget)
}

function fitNavigationColumns(navigationBudget: number): Pick<InitialLayout, 'sidebarWidth' | 'noteListWidth'> {
  const defaultNavigationWidth = COLUMN_DEFAULT_WIDTHS.sidebar + COLUMN_DEFAULT_WIDTHS.noteList
  const minimumNavigationWidth = COLUMN_MIN_WIDTHS.sidebar + COLUMN_MIN_WIDTHS.noteList

  if (navigationBudget >= defaultNavigationWidth) {
    return { sidebarWidth: COLUMN_DEFAULT_WIDTHS.sidebar, noteListWidth: COLUMN_DEFAULT_WIDTHS.noteList }
  }
  if (navigationBudget <= minimumNavigationWidth) {
    return { sidebarWidth: COLUMN_MIN_WIDTHS.sidebar, noteListWidth: COLUMN_MIN_WIDTHS.noteList }
  }

  const preferredSidebarWidth = clamp(Math.round(navigationBudget * 0.38), 220, COLUMN_DEFAULT_WIDTHS.sidebar)
  const sidebarWidth = clamp(
    Math.min(preferredSidebarWidth, navigationBudget - COLUMN_MIN_WIDTHS.noteList),
    COLUMN_MIN_WIDTHS.sidebar,
    COLUMN_DEFAULT_WIDTHS.sidebar,
  )
  const noteListWidth = clamp(navigationBudget - sidebarWidth, COLUMN_MIN_WIDTHS.noteList, COLUMN_DEFAULT_WIDTHS.noteList)

  return { sidebarWidth, noteListWidth }
}

/**
 * The Second Brain inspector is something you open, not something you get on
 * launch — it starts closed and remembers your last choice.
 */
function readStoredInspectorOpen(): boolean | null {
  try {
    if (typeof window === 'undefined') return null
    const stored = window.localStorage.getItem(APP_STORAGE_KEYS.inspectorOpen)
    return stored === '1' ? true : stored === '0' ? false : null
  } catch {
    return null
  }
}

function writeStoredInspectorOpen(open: boolean): void {
  try {
    window.localStorage.setItem(APP_STORAGE_KEYS.inspectorOpen, open ? '1' : '0')
  } catch {
    // Storage unavailable: the choice just won't survive a relaunch.
  }
}

function resolveInitialLayout(options?: LayoutPanelOptions): InitialLayout {
  const viewportWidth = getViewportWidth(options)
  const compactInspectorWidth = COLUMN_MIN_WIDTHS.sidebar
    + COLUMN_MIN_WIDTHS.noteList
    + COLUMN_DEFAULT_WIDTHS.inspector
    + COLUMN_MIN_WIDTHS.editor
    + FULL_LAYOUT_RESIZE_HANDLES_WIDTH
  const inspectorFits = viewportWidth === null || viewportWidth >= compactInspectorWidth
  const inspectorCollapsed = options?.initialInspectorCollapsed
    ?? !(inspectorFits && readStoredInspectorOpen() === true)
  const navigationWidths = viewportWidth === null
    ? { sidebarWidth: COLUMN_DEFAULT_WIDTHS.sidebar, noteListWidth: COLUMN_DEFAULT_WIDTHS.noteList }
    : inspectorCollapsed
      ? fitCollapsedNavigationColumns(viewportWidth)
      : fitVisibleNavigationColumns(viewportWidth)

  return {
    ...navigationWidths,
    inspectorWidth: COLUMN_DEFAULT_WIDTHS.inspector,
    inspectorCollapsed,
  }
}

/** Manages default app column widths and resize clamps without owning editor layout rendering. */
export function useLayoutPanels(options?: LayoutPanelOptions) {
  const [initialLayout] = useState(() => resolveInitialLayout(options))
  const [sidebarWidth, setSidebarWidth] = useState(initialLayout.sidebarWidth)
  const [noteListWidth, setNoteListWidth] = useState(initialLayout.noteListWidth)
  const [inspectorWidth, setInspectorWidth] = useState(initialLayout.inspectorWidth)
  const [inspectorCollapsed, setInspectorCollapsedState] = useState(initialLayout.inspectorCollapsed)
  const persistInspectorChoice = options?.initialInspectorCollapsed === undefined
  const setInspectorCollapsed = useCallback((next: SetStateAction<boolean>) => {
    setInspectorCollapsedState((previous) => {
      const collapsed = typeof next === 'function' ? next(previous) : next
      if (persistInspectorChoice) writeStoredInspectorOpen(!collapsed)
      return collapsed
    })
  }, [persistInspectorChoice])
  const handleSidebarResize = useCallback((delta: number) => setSidebarWidth((w) => clamp(w + delta, COLUMN_MIN_WIDTHS.sidebar, COLUMN_MAX_WIDTHS.sidebar)), [])
  const handleNoteListResize = useCallback((delta: number) => setNoteListWidth((w) => clamp(w + delta, COLUMN_MIN_WIDTHS.noteList, COLUMN_MAX_WIDTHS.noteList)), [])
  const handleInspectorResize = useCallback((delta: number) => setInspectorWidth((w) => clamp(w - delta, COLUMN_MIN_WIDTHS.inspector, COLUMN_MAX_WIDTHS.inspector)), [])
  return { sidebarWidth, noteListWidth, inspectorWidth, inspectorCollapsed, setInspectorCollapsed, handleSidebarResize, handleNoteListResize, handleInspectorResize }
}
