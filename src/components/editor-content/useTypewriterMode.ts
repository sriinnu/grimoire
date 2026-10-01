import { useEffect, useSyncExternalStore, type RefObject } from 'react'
import { typewriterPreference } from '../../lib/editorTogglePreference'

export function useTypewriterEnabled(): boolean {
  return useSyncExternalStore(typewriterPreference.subscribe, typewriterPreference.isEnabled, typewriterPreference.isEnabled)
}

/** Where the caret line should sit: a little above the middle reads better than dead centre. */
const TARGET_RATIO = 0.45

function caretRect(container: HTMLElement): DOMRect | null {
  const selection = document.getSelection()
  if (!selection || selection.rangeCount === 0 || !selection.isCollapsed) return null
  const range = selection.getRangeAt(0)
  if (!container.contains(range.startContainer)) return null
  const rects = range.getClientRects()
  const rect = rects.length > 0 ? rects[0] : range.getBoundingClientRect()
  return rect.height > 0 || rect.top > 0 ? rect : null
}

/**
 * Typewriter mode: after every selection change inside the scroll container,
 * scroll so the caret line sits near the vertical middle. One adjustment per
 * animation frame, instant (never smooth) so it does not fight typing.
 */
export function useTypewriterMode(scrollRef: RefObject<HTMLElement | null>, active: boolean): void {
  const enabled = useTypewriterEnabled()

  useEffect(() => {
    if (!enabled || !active) return
    let frame = 0
    const handleSelectionChange = () => {
      if (frame) return
      frame = window.requestAnimationFrame(() => {
        frame = 0
        const container = scrollRef.current
        if (!container) return
        const rect = caretRect(container)
        if (!rect) return
        const bounds = container.getBoundingClientRect()
        const caretCenter = rect.top + rect.height / 2 - bounds.top
        const delta = caretCenter - bounds.height * TARGET_RATIO
        if (Math.abs(delta) < 2) return
        container.scrollTo({ top: container.scrollTop + delta, behavior: 'auto' })
      })
    }
    document.addEventListener('selectionchange', handleSelectionChange)
    return () => {
      document.removeEventListener('selectionchange', handleSelectionChange)
      if (frame) window.cancelAnimationFrame(frame)
    }
  }, [enabled, active, scrollRef])
}
