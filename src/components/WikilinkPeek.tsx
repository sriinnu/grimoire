import type { RefObject } from 'react'
import { createPortal } from 'react-dom'
import type { VaultEntry } from '../types'
import { useWikilinkPeek } from './useWikilinkPeek'
import { peekCardPosition } from './wikilinkPeekModel'
import './WikilinkPeek.css'

export function WikilinkPeek({
  containerRef,
  entries,
}: {
  containerRef: RefObject<HTMLElement | null>
  entries: VaultEntry[]
}) {
  const { peek, scheduleHide, cancelHide } = useWikilinkPeek(containerRef, entries)
  if (!peek) return null
  const { model, anchor } = peek

  return createPortal(
    <div
      className="wikilink-peek"
      role="tooltip"
      data-testid="wikilink-peek"
      data-kind={model.kind}
      style={peekCardPosition(anchor)}
      onPointerEnter={cancelHide}
      onPointerLeave={scheduleHide}
    >
      <div className="wikilink-peek__title">{model.title}</div>
      {model.kind === 'note' ? (
        <>
          {model.meta ? <div className="wikilink-peek__meta">{model.meta}</div> : null}
          {model.excerpt ? <p className="wikilink-peek__excerpt">{model.excerpt}</p> : null}
        </>
      ) : (
        <div className="wikilink-peek__meta">No page yet</div>
      )}
    </div>,
    document.body,
  )
}
