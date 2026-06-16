import { SlidersHorizontal, X, Sparkle, WarningCircle, PencilSimple } from '@phosphor-icons/react'
import { Brain } from 'lucide-react'
import { useDragRegion } from '../../hooks/useDragRegion'

export function InspectorHeader({ collapsed, onToggle }: { collapsed: boolean; onToggle: () => void }) {
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
        >
          <SlidersHorizontal size={16} />
        </button>
      ) : (
        <>
          <span className="inspector-header__brand-icon">
            <Brain className="size-3.5" aria-hidden="true" />
          </span>
          <span className="flex min-w-0 flex-1 flex-col leading-tight">
            <span className="inspector-header__title truncate" data-testid="inspector-header-title">Second Brain</span>
            <span className="inspector-header__subtitle truncate">Properties</span>
          </span>
          <button
            className="shrink-0 border-none bg-transparent p-1 text-muted-foreground cursor-pointer hover:text-foreground"
            onClick={onToggle}
            title="Close Second Brain (⌘⇧I)"
          >
            <X size={16} />
          </button>
        </>
      )}
    </div>
  )
}

export function EmptyInspector() {
  return <div><p className="m-0 text-[13px] text-muted-foreground">No note selected</p></div>
}

export function InitializePropertiesPrompt({ onClick }: { onClick: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-border px-4 py-6">
      <Sparkle size={24} className="text-muted-foreground" />
      <p className="m-0 text-center text-[13px] text-muted-foreground">This note has no properties yet</p>
      <button
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        onClick={onClick}
      >
        Initialize properties
      </button>
    </div>
  )
}

export function InvalidFrontmatterNotice({ onFix }: { onFix: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-4 py-6">
      <WarningCircle size={24} className="text-destructive" />
      <p className="m-0 text-center text-[13px] text-muted-foreground">Invalid properties</p>
      <button
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-border bg-background px-3 py-1.5 text-[13px] font-medium text-foreground transition-colors hover:bg-muted"
        onClick={onFix}
      >
        <PencilSimple size={14} />
        Fix in editor
      </button>
    </div>
  )
}
