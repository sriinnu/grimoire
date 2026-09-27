import { APP_STORAGE_KEYS } from '../constants/appStorage'

// Kept dependency-free: the command palette imports this on the boot path,
// while the editor canvas that applies it lives in the lazy editor chunk.

export const READING_WIDTHS = ['narrow', 'comfortable', 'wide', 'full'] as const
export type ReadingWidth = (typeof READING_WIDTHS)[number]

export const READING_WIDTH_LABELS: Record<ReadingWidth, string> = {
  narrow: 'Narrow',
  comfortable: 'Comfortable',
  wide: 'Wide',
  full: 'Full',
}

export const DEFAULT_READING_WIDTH: ReadingWidth = 'comfortable'

/**
 * The value the editor canvas sets for `--editor-max-width`. Comfortable
 * returns null: it keeps the theme preset's own measure (820px in Vellum)
 * rather than overriding it with a second opinion. Full is the pane width
 * minus gutters; the wrapper already caps that at 1320px.
 */
export function readingWidthCssValue(width: ReadingWidth): string | null {
  switch (width) {
    case 'narrow': return '620px'
    case 'wide': return '920px'
    case 'full': return '100%'
    default: return null
  }
}

type Listener = () => void
const listeners = new Set<Listener>()

function isReadingWidth(value: unknown): value is ReadingWidth {
  return typeof value === 'string' && (READING_WIDTHS as readonly string[]).includes(value)
}

function readStoredWidth(): ReadingWidth {
  try {
    const stored = localStorage.getItem(APP_STORAGE_KEYS.readingWidth)
    return isReadingWidth(stored) ? stored : DEFAULT_READING_WIDTH
  } catch {
    return DEFAULT_READING_WIDTH
  }
}

let current = readStoredWidth()

export function getReadingWidth(): ReadingWidth {
  return current
}

export function setReadingWidth(next: ReadingWidth): void {
  if (next === current) return
  current = next
  try {
    if (next === DEFAULT_READING_WIDTH) localStorage.removeItem(APP_STORAGE_KEYS.readingWidth)
    else localStorage.setItem(APP_STORAGE_KEYS.readingWidth, next)
  } catch {
    // Storage may be unavailable; the in-memory value still applies.
  }
  listeners.forEach((listener) => listener())
}

/** Narrow → Comfortable → Wide → Full → Narrow. */
export function cycleReadingWidth(): ReadingWidth {
  const index = READING_WIDTHS.indexOf(current)
  const next = READING_WIDTHS[(index + 1) % READING_WIDTHS.length]
  setReadingWidth(next)
  return next
}

export function subscribeReadingWidth(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Cmd+Alt+W on macOS, Ctrl+Alt+W elsewhere. Alt+W types "∑" on a Mac keyboard, so match the code first. */
export function isReadingWidthShortcut(
  event: Pick<KeyboardEvent, 'altKey' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'code' | 'key'>,
): boolean {
  if (!event.altKey || event.shiftKey || !(event.metaKey || event.ctrlKey)) return false
  return event.code === 'KeyW' || event.key.toLowerCase() === 'w' || event.key === '∑'
}

export function resetReadingWidthForTests(): void {
  current = readStoredWidth()
}
