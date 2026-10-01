import { useEffect, useState } from 'react'
import type { MarkdownHeading } from '@grimoire/markdown-editor'
import { findNoteHeadingElement } from '../../utils/noteNavigation'
import { pickActiveOutlineIndex, type OutlineRailItem } from './headingOutlineModel'

/** Distance below the scroll viewport top that counts as "currently reading". */
const READING_LINE_OFFSET = 96
const BOTTOM_SLACK = 4
const RESOLVE_RETRY_MS = 400

/**
 * Tracks which rail item is in view. Scroll events are coalesced into one
 * measurement per animation frame, and heading elements are resolved once per
 * heading list rather than per frame.
 */
export function useActiveOutlineHeading(
  scrollRef: React.RefObject<HTMLElement | null>,
  items: OutlineRailItem[],
  headings: MarkdownHeading[],
): [string | null, (key: string) => void] {
  const [activeKey, setActiveKey] = useState<string | null>(null)

  useEffect(() => {
    const container = scrollRef.current
    if (!container || items.length === 0) return
    let elements: Array<HTMLElement | null> = []
    let frame = 0
    let resolvedAt = 0

    const resolve = () => {
      resolvedAt = performance.now()
      elements = items.map((item) => findNoteHeadingElement(item.heading, item.index, headings, container))
    }
    const measure = () => {
      frame = 0
      const stale = elements.some((element) => element === null || !element.isConnected)
      if (stale && performance.now() - resolvedAt > RESOLVE_RETRY_MS) resolve()
      const viewportTop = container.getBoundingClientRect().top
      const tops = elements.map((element) => (element ? element.getBoundingClientRect().top : null))
      const atBottom = container.scrollTop > 0
        && container.scrollTop + container.clientHeight >= container.scrollHeight - BOTTOM_SLACK
      const index = pickActiveOutlineIndex(tops, viewportTop + READING_LINE_OFFSET, atBottom)
      setActiveKey(index >= 0 ? items[index].key : null)
    }
    const schedule = () => {
      if (frame === 0) frame = requestAnimationFrame(measure)
    }

    resolve()
    schedule()
    container.addEventListener('scroll', schedule, { passive: true })
    return () => {
      container.removeEventListener('scroll', schedule)
      if (frame !== 0) cancelAnimationFrame(frame)
    }
  }, [scrollRef, items, headings])

  return [activeKey, setActiveKey]
}
