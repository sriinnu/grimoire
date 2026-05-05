import { FilterPills } from './FilterPills'
import { FileScopePills } from './FileScopePills'
import type { NoteFileScope, NoteListFilter } from '../../utils/noteListHelpers'

interface NoteListBottomFiltersProps {
  showFilterPills: boolean
  showFileScopePills: boolean
  noteListFilter: NoteListFilter
  filterCounts: Record<NoteListFilter, number>
  fileScope: NoteFileScope
  fileScopeCounts: Record<NoteFileScope, number>
  onNoteListFilterChange: (filter: NoteListFilter) => void
  onFileScopeChange: (scope: NoteFileScope) => void
}

const BOTTOM_GRADIENT = 'linear-gradient(to bottom, transparent 0%, var(--card) 25%, var(--card) 100%)'

/** Bottom filter stack for archive and file-scope controls in the note list. */
export function NoteListBottomFilters({
  showFilterPills,
  showFileScopePills,
  noteListFilter,
  filterCounts,
  fileScope,
  fileScopeCounts,
  onNoteListFilterChange,
  onFileScopeChange,
}: NoteListBottomFiltersProps) {
  if (!showFilterPills && !showFileScopePills) return null

  return (
    <div
      className="absolute bottom-0 left-0 right-0 z-10 flex flex-col items-center gap-1.5 px-4 pb-3 pt-6"
      style={{ background: BOTTOM_GRADIENT }}
      data-testid="note-list-bottom-filters"
    >
      {showFileScopePills && (
        <FileScopePills
          active={fileScope}
          counts={fileScopeCounts}
          onChange={onFileScopeChange}
        />
      )}
      {showFilterPills && (
        <FilterPills
          active={noteListFilter}
          counts={filterCounts}
          onChange={onNoteListFilterChange}
          position="inline"
        />
      )}
    </div>
  )
}
