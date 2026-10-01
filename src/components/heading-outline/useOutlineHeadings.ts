import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from 'react'
import {
  isHeadingOutlineEnabled,
  subscribeHeadingOutline,
} from '../../lib/headingOutlinePreference'
import { extractNoteHeadings } from '../../utils/noteNavigation'
import {
  buildOutlineRailItems,
  MIN_OUTLINE_CANVAS_WIDTH,
  shouldShowOutlineRail,
} from './headingOutlineModel'

export const OUTLINE_DEBOUNCE_MS = 150

export function useHeadingOutlineEnabled(): boolean {
  return useSyncExternalStore(subscribeHeadingOutline, isHeadingOutlineEnabled, isHeadingOutlineEnabled)
}

/** Trailing debounce so a burst of keystrokes costs one heading parse once typing pauses. */
function useDebouncedContent(content: string, active: boolean): string {
  const [settled, setSettled] = useState(content)

  useEffect(() => {
    if (!active || settled === content) return
    const timer = setTimeout(() => setSettled(content), OUTLINE_DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [active, content, settled])

  return active ? settled : ''
}

function useWideElement(elementRef: React.RefObject<HTMLElement | null>, active: boolean): boolean {
  const [wide, setWide] = useState(false)

  useEffect(() => {
    const element = elementRef.current
    if (!active || !element) return
    const update = (width: number) => setWide(width >= MIN_OUTLINE_CANVAS_WIDTH)
    if (typeof ResizeObserver === 'undefined') {
      update(element.getBoundingClientRect().width)
      return
    }
    const observer = new ResizeObserver((records) => {
      const record = records[records.length - 1]
      if (record) update(record.contentRect.width)
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [elementRef, active])

  return active && wide
}

/**
 * Right-edge "On this page" state. Uses the same Markdown heading source as the
 * navigator popover TOC so both surfaces always agree.
 */
export function useHeadingOutline(content: string, active: boolean) {
  const rootRef = useRef<HTMLDivElement | null>(null)
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const enabled = useHeadingOutlineEnabled()
  const tracking = active && enabled
  const wide = useWideElement(rootRef, tracking)
  const settledContent = useDebouncedContent(content, tracking && wide)
  const headings = useMemo(() => (settledContent ? extractNoteHeadings(settledContent) : []), [settledContent])
  const items = useMemo(() => buildOutlineRailItems(headings), [headings])
  const visible = shouldShowOutlineRail({ enabled: tracking, wide, itemCount: items.length })

  return { rootRef, scrollRef, headings, items, visible }
}

export type HeadingOutlineState = ReturnType<typeof useHeadingOutline>
