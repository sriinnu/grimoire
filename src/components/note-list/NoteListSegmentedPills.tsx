import type { ComponentType } from 'react'
import { Button } from '@/components/ui/button'

interface NoteListSegmentOption<T extends string> {
  value: T
  label: string
  Icon?: ComponentType<{ className?: string }>
  title?: string
}

interface NoteListSegmentedPillsProps<T extends string> {
  active: T
  ariaLabel: string
  counts: Record<T, number>
  itemTestId: (value: T) => string
  onChange: (value: T) => void
  options: Array<NoteListSegmentOption<T>>
  testId: string
}

/** Shared segmented-control primitive for compact note-list filters. */
export function NoteListSegmentedPills<T extends string>({
  active,
  ariaLabel,
  counts,
  itemTestId,
  onChange,
  options,
  testId,
}: NoteListSegmentedPillsProps<T>) {
  return (
    <div className="note-list-pill-group" role="tablist" aria-label={ariaLabel} data-testid={testId}>
      {options.map(({ value, label, Icon, title }) => (
        <Button
          key={value}
          type="button"
          variant="ghost"
          size="xs"
          role="tab"
          aria-selected={active === value}
          className="note-list-segment-pill"
          onClick={() => onChange(value)}
          data-testid={itemTestId(value)}
          title={title ?? label}
        >
          {Icon ? <Icon className="size-3.5" /> : null}
          <span>{label}</span>
          <span className="note-list-segment-pill__count">{counts[value]}</span>
        </Button>
      ))}
    </div>
  )
}
