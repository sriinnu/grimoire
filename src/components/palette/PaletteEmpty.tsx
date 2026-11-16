import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface PaletteEmptyProps {
  icon: LucideIcon
  title: string
  className?: string
  /** Optional primary action (e.g. a "Create note" button). */
  children?: ReactNode
}

/** Shared dead-end state for the command surfaces: glyph + title + optional action. */
export function PaletteEmpty({ icon: Icon, title, className, children }: PaletteEmptyProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center px-4 py-8 text-center', className)}>
      <Icon size={20} strokeWidth={2} className="mb-3 text-muted-foreground/60" aria-hidden="true" />
      <p className="text-[13px] text-muted-foreground">{title}</p>
      {children ? <div className="mt-3">{children}</div> : null}
    </div>
  )
}
