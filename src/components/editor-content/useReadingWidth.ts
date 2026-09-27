import { useEffect, useMemo, useSyncExternalStore, type CSSProperties } from 'react'
import {
  cycleReadingWidth,
  getReadingWidth,
  isReadingWidthShortcut,
  readingWidthCssValue,
  subscribeReadingWidth,
  type ReadingWidth,
} from '../../lib/readingWidthPreference'

export interface ReadingWidthState {
  width: ReadingWidth
  /** Inline vars for the editor canvas root; undefined when the theme measure applies. */
  style: CSSProperties | undefined
}

/**
 * The persisted reading width, applied as `--editor-max-width` on the canvas
 * root so every layer that reads the variable (text measure, meta strip,
 * outline rail) follows it. Also owns the Cmd/Ctrl+Alt+W cycle chord.
 */
export function useReadingWidth(enabled = true): ReadingWidthState {
  const width = useSyncExternalStore(subscribeReadingWidth, getReadingWidth, getReadingWidth)

  useEffect(() => {
    if (!enabled) return
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!isReadingWidthShortcut(event)) return
      event.preventDefault()
      cycleReadingWidth()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [enabled])

  const style = useMemo(() => {
    const value = readingWidthCssValue(width)
    return value ? ({ '--editor-max-width': value } as CSSProperties) : undefined
  }, [width])

  return { width, style }
}
