import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import type { VaultEntry } from '../types'
import { buildWikilinkPeekModel, type WikilinkPeekAnchor, type WikilinkPeekModel } from './wikilinkPeekModel'

export const PEEK_OPEN_DELAY_MS = 350
export const PEEK_CLOSE_GRACE_MS = 150
// A pointer that lands on a link right after a keystroke is incidental, not a hover.
export const PEEK_TYPING_QUIET_MS = 700

const WIKILINK_SELECTOR = '.wikilink[data-target]'

export interface WikilinkPeekState {
  model: WikilinkPeekModel
  anchor: WikilinkPeekAnchor
}

function linkFromEvent(event: Event): HTMLElement | null {
  const target = event.target
  if (!(target instanceof Element)) return null
  return target.closest<HTMLElement>(WIKILINK_SELECTOR)
}

function isWritingActive() {
  return document.documentElement.hasAttribute('data-writing')
}

export function useWikilinkPeek(
  containerRef: RefObject<HTMLElement | null>,
  entries: VaultEntry[],
) {
  const [peek, setPeek] = useState<WikilinkPeekState | null>(null)
  const entriesRef = useRef(entries)
  const openTimer = useRef<number | undefined>(undefined)
  const closeTimer = useRef<number | undefined>(undefined)
  const hoveredLink = useRef<HTMLElement | null>(null)
  const lastKeyAt = useRef(0)

  useEffect(() => {
    entriesRef.current = entries
  }, [entries])

  const clearTimers = useCallback(() => {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
  }, [])

  const hide = useCallback(() => {
    clearTimers()
    hoveredLink.current = null
    setPeek(null)
  }, [clearTimers])

  const scheduleHide = useCallback(() => {
    window.clearTimeout(openTimer.current)
    window.clearTimeout(closeTimer.current)
    closeTimer.current = window.setTimeout(() => {
      hoveredLink.current = null
      setPeek(null)
    }, PEEK_CLOSE_GRACE_MS)
  }, [])

  const cancelHide = useCallback(() => {
    window.clearTimeout(closeTimer.current)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const show = (link: HTMLElement) => {
      if (hoveredLink.current !== link || !link.isConnected || isWritingActive()) return
      const model = buildWikilinkPeekModel(entriesRef.current, link.dataset.target ?? '')
      if (!model) return
      const rect = link.getBoundingClientRect()
      setPeek({ model, anchor: { top: rect.top, bottom: rect.bottom, left: rect.left } })
    }

    const handleOver = (event: PointerEvent) => {
      if (event.pointerType === 'touch' || event.buttons > 0) return
      const link = linkFromEvent(event)
      if (!link) return
      window.clearTimeout(closeTimer.current)
      if (hoveredLink.current === link) return
      hoveredLink.current = link
      window.clearTimeout(openTimer.current)
      if (isWritingActive() || Date.now() - lastKeyAt.current < PEEK_TYPING_QUIET_MS) return
      openTimer.current = window.setTimeout(() => show(link), PEEK_OPEN_DELAY_MS)
    }

    const handleOut = (event: PointerEvent) => {
      const link = linkFromEvent(event)
      if (!link) return
      const next = event.relatedTarget
      if (next instanceof Node && link.contains(next)) return
      scheduleHide()
    }

    const handleKeyDown = () => {
      lastKeyAt.current = Date.now()
      hide()
    }

    container.addEventListener('pointerover', handleOver)
    container.addEventListener('pointerout', handleOut)
    container.addEventListener('pointerdown', hide)
    window.addEventListener('keydown', handleKeyDown, true)
    window.addEventListener('scroll', hide, true)
    window.addEventListener('blur', hide)

    return () => {
      container.removeEventListener('pointerover', handleOver)
      container.removeEventListener('pointerout', handleOut)
      container.removeEventListener('pointerdown', hide)
      window.removeEventListener('keydown', handleKeyDown, true)
      window.removeEventListener('scroll', hide, true)
      window.removeEventListener('blur', hide)
      clearTimers()
    }
  }, [containerRef, hide, scheduleHide, clearTimers])

  return { peek, hide, scheduleHide, cancelHide }
}
