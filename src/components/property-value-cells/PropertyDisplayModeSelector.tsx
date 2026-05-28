import { useCallback, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { ArrowUpRight } from '@phosphor-icons/react'
import {
  DISPLAY_MODE_ICONS,
  DISPLAY_MODE_OPTIONS,
  type PropertyDisplayMode,
} from '../../utils/propertyTypes'
import { showsRelationshipPropertyIcon } from './propertyValueCellModel'

export function DisplayModeSelector({ propKey, currentMode, autoMode, onSelect }: {
  propKey: string; currentMode: PropertyDisplayMode; autoMode: PropertyDisplayMode
  onSelect: (key: string, mode: PropertyDisplayMode | null) => void
}) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const CurrentIcon = DISPLAY_MODE_ICONS[currentMode]
  const showRelationshipIcon = showsRelationshipPropertyIcon(propKey)

  const positionMenu = useCallback((node: HTMLDivElement | null) => {
    if (!node) return
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const menuW = 140
    let left = rect.right - menuW
    if (left < 8) left = 8
    node.style.top = `${rect.bottom + 4}px`
    node.style.left = `${left}px`
  }, [])

  const handleSelect = (mode: PropertyDisplayMode) => {
    if (mode === autoMode) {
      onSelect(propKey, null)
    } else {
      onSelect(propKey, mode)
    }
    setOpen(false)
  }

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        type="button"
        className="inline-flex size-5 shrink-0 items-center justify-center rounded border-none bg-transparent p-0 text-muted-foreground transition-colors hover:bg-background hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-primary"
        onClick={() => setOpen(!open)}
        title={`Change ${propKey} type`}
        aria-label={`Change ${propKey} type`}
        data-testid="display-mode-trigger"
      >
        {showRelationshipIcon ? (
          <ArrowUpRight className="size-3.5" data-testid="display-mode-icon-relationship" />
        ) : (
          <CurrentIcon className="size-3.5" data-testid={`display-mode-icon-${currentMode}`} />
        )}
      </button>
      {open && createPortal(
        <>
          <div className="fixed inset-0 z-[12000]" onClick={() => setOpen(false)} />
          <div
            ref={positionMenu}
            className="fixed z-[12001] min-w-[130px] rounded-md border border-border bg-background py-1 shadow-md"
            data-testid="display-mode-menu"
          >
            {DISPLAY_MODE_OPTIONS.map(opt => {
              const OptIcon = DISPLAY_MODE_ICONS[opt.value]
              return (
                <button
                  key={opt.value}
                  className="flex w-full items-center gap-2 border-none bg-transparent px-3 py-1.5 text-left text-[12px] text-foreground transition-colors hover:bg-muted"
                  onClick={() => handleSelect(opt.value)}
                  data-testid={`display-mode-option-${opt.value}`}
                >
                  <span className="w-3 text-center text-[10px]">
                    {currentMode === opt.value ? '\u2713' : ''}
                  </span>
                  <OptIcon className="size-3.5 text-muted-foreground" />
                  {opt.label}
                  {opt.value === autoMode && (
                    <span className="ml-auto text-[10px] text-muted-foreground">auto</span>
                  )}
                </button>
              )
            })}
          </div>
        </>,
        document.body
      )}
    </div>
  )
}
