import { SlidersHorizontal, X, PencilSimple } from '@phosphor-icons/react'
import { useDragRegion } from '../../hooks/useDragRegion'
import { Glyph } from '@/components/glyphs/Glyph'

export function InspectorHeader({ collapsed, onToggle, subtitle }: { collapsed: boolean; onToggle: () => void; subtitle?: string | null }) {
  const { onMouseDown } = useDragRegion()

  return (
    <div
      className="inspector-header flex shrink-0 items-center border-b border-border"
      style={{ height: 52, padding: '6px 12px', gap: 8, cursor: 'default' }}
      onMouseDown={onMouseDown}
    >
      {collapsed ? (
        <button
          className="shrink-0 border-none bg-transparent p-1 text-muted-foreground cursor-pointer hover:text-foreground"
          onClick={onToggle}
          title="Properties (⌘⇧I)"
          aria-label="Open Second Brain properties"
          data-icon-intent="ai"
        >
          <SlidersHorizontal size={16} />
        </button>
      ) : (
        <>
          <span className="inspector-header__brand-icon" data-icon-intent="ai">
            <Glyph name="brain" size={14} />
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="inspector-header__title truncate" data-testid="inspector-header-title">Second Brain</span>
            {subtitle ? <span className="inspector-header__subtitle truncate" data-testid="inspector-header-subtitle">{subtitle}</span> : null}
          </span>
          <button
            className="shrink-0 border-none bg-transparent p-1 text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={onToggle}
            title="Close Second Brain (⌘⇧I)"
            aria-label="Close Second Brain"
            data-icon-intent="neutral"
          >
            <X size={16} />
          </button>
        </>
      )}
    </div>
  )
}

export function EmptyInspector() {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <Glyph name="compass" size={48} className="text-muted-foreground/40" />
      <p className="m-0 text-[13px] text-muted-foreground">No note selected</p>
    </div>
  )
}

export function InitializePropertiesPrompt({ onClick }: { onClick: () => void }) {
  return (
    <p className="inspector-section__empty" data-testid="initialize-properties-prompt">
      No properties yet ·{' '}
      <button type="button" className="inspector-text-action" onClick={onClick}>Add properties</button>
    </p>
  )
}

export function InvalidFrontmatterNotice({ onFix }: { onFix: () => void }) {
  return (
    <p className="inspector-section__empty inspector-section__empty--warn" data-testid="invalid-frontmatter-notice">
      Invalid properties ·{' '}
      <button type="button" className="inspector-text-action" onClick={onFix}>
        <PencilSimple size={12} aria-hidden="true" />
        Fix in editor
      </button>
    </p>
  )
}
