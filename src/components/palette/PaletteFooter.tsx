import { cn } from '@/lib/utils'
import { formatShortcutDisplay } from '../../hooks/appCommandCatalog'

export interface PaletteFooterHint {
  /** Key-glyph group authored with Mac glyphs (e.g. "↑↓", "↵", "esc"); rendered OS-aware. */
  keys?: string
  label: string
}

interface PaletteFooterProps {
  hints: PaletteFooterHint[]
  className?: string
}

/** Shared shortcut legend for the command surfaces: kbd chips + dot separators. */
export function PaletteFooter({ hints, className }: PaletteFooterProps) {
  return (
    <div
      className={cn(
        'flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground',
        className,
      )}
      aria-hidden="true"
    >
      {hints.map((hint, index) => (
        <span key={index} className="flex items-center gap-1.5">
          {hint.keys ? (
            <kbd className="font-medium text-foreground/70">
              {formatShortcutDisplay({ display: hint.keys })}
            </kbd>
          ) : null}
          <span>{hint.label}</span>
          {index < hints.length - 1 ? (
            <span className="pl-1.5 text-muted-foreground/40">·</span>
          ) : null}
        </span>
      ))}
    </div>
  )
}
