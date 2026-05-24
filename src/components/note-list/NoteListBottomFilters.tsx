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
    <div className="note-list-filter-footer shrink-0" data-testid="note-list-bottom-filters">
      <div className="note-list-filter-shelf">
        {showFileScopePills && (
          <div className="note-list-filter-group" data-testid="note-list-file-scope-group">
            <span className="note-list-filter-group__label">Scope</span>
            <FileScopePills
              active={fileScope}
              counts={fileScopeCounts}
              onChange={onFileScopeChange}
            />
          </div>
        )}
        {showFilterPills && (
          <div className="note-list-filter-group" data-testid="note-list-state-filter-group">
            <span className="note-list-filter-group__label">State</span>
            <FilterPills
              active={noteListFilter}
              counts={filterCounts}
              onChange={onNoteListFilterChange}
              position="inline"
            />
          </div>
        )}
      </div>
    </div>
  )
}
