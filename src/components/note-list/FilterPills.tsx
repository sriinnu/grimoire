import { memo } from 'react'
import type { NoteListFilter } from '../../utils/noteListHelpers'
import { NoteListSegmentedPills } from './NoteListSegmentedPills'

interface FilterPillsProps {
  active: NoteListFilter
  counts: Record<NoteListFilter, number>
  onChange: (filter: NoteListFilter) => void
}

const PILLS: { value: NoteListFilter; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'archived', label: 'Archived' },
]

function FilterPillsInner({ active, counts, onChange }: FilterPillsProps) {
  return (
    <NoteListSegmentedPills
      active={active}
      ariaLabel="Archive state"
      counts={counts}
      itemTestId={(value) => `filter-pill-${value}`}
      onChange={onChange}
      options={PILLS}
      testId="filter-pills"
    />
  )
}

export const FilterPills = memo(FilterPillsInner)
