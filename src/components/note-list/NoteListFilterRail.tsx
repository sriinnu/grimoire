import { FilterPills } from './FilterPills'
import { FileScopePills } from './FileScopePills'
import type { NoteFileScope, NoteListFilter } from '../../utils/noteListHelpers'

interface NoteListFilterRailProps {
  embedded?: boolean
  showFilterPills: boolean
  showFileScopePills: boolean
  noteListFilter: NoteListFilter
  filterCounts: Record<NoteListFilter, number>
  fileScope: NoteFileScope
  fileScopeCounts: Record<NoteFileScope, number>
  onNoteListFilterChange: (filter: NoteListFilter) => void
  onFileScopeChange: (scope: NoteFileScope) => void
}

/** Upper note-list filter rail for archive state and file-scope controls. */
export function NoteListFilterRail({
  embedded = false,
  showFilterPills,
  showFileScopePills,
  noteListFilter,
  filterCounts,
  fileScope,
  fileScopeCounts,
  onNoteListFilterChange,
  onFileScopeChange,
}: NoteListFilterRailProps) {
  if (!showFilterPills && !showFileScopePills) return null

  return (
    <div
      className={`note-list-filter-rail shrink-0${embedded ? ' note-list-filter-rail--embedded' : ''}`}
      data-testid="note-list-filter-rail"
    >
      <div className="note-list-filter-shelf">
        {showFileScopePills && (
          <div className="note-list-filter-group" data-testid="note-list-file-scope-group">
            <span className="note-list-filter-group__label">Files</span>
            <FileScopePills
              active={fileScope}
              counts={fileScopeCounts}
              onChange={onFileScopeChange}
            />
          </div>
        )}
        {showFilterPills && (
          <div className="note-list-filter-group" data-testid="note-list-state-filter-group">
            <span className="note-list-filter-group__label">Archive</span>
            <FilterPills
              active={noteListFilter}
              counts={filterCounts}
              onChange={onNoteListFilterChange}
            />
          </div>
        )}
      </div>
    </div>
  )
}
