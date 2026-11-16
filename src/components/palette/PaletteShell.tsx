import type { CSSProperties, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PaletteShellProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  /** Width CSS value. Defaults to var(--palette-width); SearchPanel passes var(--palette-width-search). */
  width?: string
}

/**
 * Shared geometry for the command surfaces (CommandPalette, QuickOpenPalette,
 * SearchPanel): width/max-height/radius tokens, popover material, and the
 * scale-from-origin arrival used by context menus. Radix-agnostic — callers
 * own their own overlay/backdrop and any portal.
 */
export function PaletteShell({
  children,
  className,
  style,
  width = 'var(--palette-width)',
  ...rest
}: PaletteShellProps) {
  return (
    <div
      className={cn(
        'grimoire-command-stage grimoire-command-surface grimoire-context-menu-surface',
        'flex max-w-[calc(100vw-32px)] flex-col self-start overflow-hidden rounded-[var(--palette-radius)] border border-border/70 bg-popover/95 shadow-2xl',
        className,
      )}
      style={{
        width,
        // The context-menu arrival reads the radix origin var; palettes are
        // top-center sheets, so fall back to a centered origin without radix.
        '--radix-context-menu-content-transform-origin': 'top center',
        ...style,
      } as CSSProperties}
      {...rest}
    >
      {children}
    </div>
  )
}
