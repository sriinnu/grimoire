import { memo } from 'react'
import { Button } from '@/components/ui/button'
import type { InboxPeriod } from '../../types'

interface InboxFilterPillsProps {
  active: InboxPeriod
  counts: Record<InboxPeriod, number>
  onChange: (period: InboxPeriod) => void
  position?: 'top' | 'bottom'
}

const PILLS: { value: InboxPeriod; label: string }[] = [
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'all', label: 'All' },
]

const BOTTOM_GRADIENT = 'linear-gradient(to bottom, transparent 0%, var(--card) 30%, var(--card) 100%)'
const BASE_BUTTON_CLASSNAME = 'h-7 rounded-full px-2.5 text-[12px] font-medium'

function buttonClassName(active: boolean): string {
  return active
    ? `${BASE_BUTTON_CLASSNAME} border border-foreground/20 bg-foreground/10 text-foreground hover:bg-foreground/10`
    : `${BASE_BUTTON_CLASSNAME} border border-transparent text-muted-foreground hover:bg-muted hover:text-foreground`
}

function InboxFilterPillsInner({ active, counts, onChange, position = 'top' }: InboxFilterPillsProps) {
  const isBottom = position === 'bottom'
  return (
    <div
      className={isBottom
        ? 'absolute bottom-0 left-0 right-0 z-10 flex flex-wrap items-center justify-center gap-2 px-4 py-3'
        : 'flex h-auto min-h-[45px] shrink-0 flex-wrap items-center gap-1 border-b border-border px-4 py-1.5'}
      style={isBottom ? { background: BOTTOM_GRADIENT } : undefined}
      data-testid="inbox-filter-pills"
    >
      {PILLS.map(({ value, label }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="xs"
          role="tab"
          aria-selected={active === value}
          className={buttonClassName(active === value)}
          onClick={() => onChange(value)}
          data-testid={`inbox-pill-${value}`}
        >
          {label}
          <span className={`text-[10px] tabular-nums ${active === value ? 'text-foreground/70' : 'text-muted-foreground/70'}`}>
            {counts[value]}
          </span>
        </Button>
      ))}
    </div>
  )
}

export const InboxFilterPills = memo(InboxFilterPillsInner)
