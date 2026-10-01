import { useEffect, useRef, type ReactNode } from 'react'
import { CaretRight } from '@phosphor-icons/react'
import { useInspectorSectionOpen, type InspectorSectionId } from './inspectorSectionState'
import { INSPECTOR_JUMP_EVENT, type InspectorJumpDetail } from './inspectorKeyboard'
import './InspectorSection.css'

interface InspectorSectionProps {
  id: InspectorSectionId
  title: string
  /** Shown after the title when there is something to count. */
  count?: number
  children: ReactNode
}

/**
 * One question the Second Brain answers: a quiet caps heading with a
 * disclosure. Closed sections keep their children mounted so every panel
 * stays reachable by tests and by find-in-page; only the region is hidden.
 */
export function InspectorSection({ id, title, count, children }: InspectorSectionProps) {
  const [open, toggle, setOpen] = useInspectorSectionOpen(id)
  const toggleRef = useRef<HTMLButtonElement>(null)
  const headingId = `inspector-section-${id}-heading`
  const regionId = `inspector-section-${id}`

  useEffect(() => {
    const handleJump = (event: Event) => {
      if ((event as CustomEvent<InspectorJumpDetail>).detail?.section !== id) return
      setOpen(true)
      toggleRef.current?.focus()
      toggleRef.current?.scrollIntoView?.({ block: 'nearest' })
    }
    window.addEventListener(INSPECTOR_JUMP_EVENT, handleJump)
    return () => window.removeEventListener(INSPECTOR_JUMP_EVENT, handleJump)
  }, [id, setOpen])

  return (
    <section
      className="inspector-section"
      data-testid={`inspector-section-${id}`}
      data-section={id}
      data-open={open ? 'true' : 'false'}
      aria-labelledby={headingId}
    >
      <h3 id={headingId} className="inspector-section__heading">
        <button
          ref={toggleRef}
          type="button"
          className="inspector-section__toggle"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={toggle}
        >
          <CaretRight size={12} weight="bold" aria-hidden="true" className="inspector-section__caret" />
          <span className="inspector-section__title">{title}</span>
          {typeof count === 'number' && count > 0 ? (
            <span className="inspector-section__count" data-testid={`inspector-section-${id}-count`}>{count}</span>
          ) : null}
        </button>
      </h3>
      <div id={regionId} role="region" aria-labelledby={headingId} className="inspector-section__body" hidden={!open}>
        {children}
      </div>
    </section>
  )
}
