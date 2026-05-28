import type { ReactNode } from 'react'
import type { useNoteListModel } from './useNoteListModel'
import { NoteListFilterRail } from './NoteListFilterRail'
import { NoteListHeader } from './NoteListHeader'

type NoteListTopChromeModelProps = Pick<
  ReturnType<typeof useNoteListModel>,
  | 'title'
  | 'typeDocument'
  | 'isEntityView'
  | 'listSort'
  | 'listDirection'
  | 'customProperties'
  | 'locale'
  | 'sidebarCollapsed'
  | 'searchVisible'
  | 'search'
  | 'isSearching'
  | 'searchInputRef'
  | 'propertyPicker'
  | 'handleSortChange'
  | 'handleCreateNote'
  | 'onOpenType'
  | 'toggleSearch'
  | 'setSearch'
  | 'handleSearchKeyDown'
  | 'showFilterPills'
  | 'showFileScopePills'
  | 'noteListFilter'
  | 'filterCounts'
  | 'fileScope'
  | 'fileScopeCounts'
  | 'onNoteListFilterChange'
  | 'onFileScopeChange'
>

type NoteListTopChromeProps = NoteListTopChromeModelProps & {
  renderProjectIntelligence?: (filterNode: ReactNode) => ReactNode
}

/** Owns the stacked controls above the virtualized note list. */
export function NoteListTopChrome({
  title,
  typeDocument,
  isEntityView,
  listSort,
  listDirection,
  customProperties,
  locale,
  sidebarCollapsed,
  searchVisible,
  search,
  isSearching,
  searchInputRef,
  propertyPicker,
  handleSortChange,
  handleCreateNote,
  onOpenType,
  toggleSearch,
  setSearch,
  handleSearchKeyDown,
  renderProjectIntelligence,
  showFilterPills,
  showFileScopePills,
  noteListFilter,
  filterCounts,
  fileScope,
  fileScopeCounts,
  onNoteListFilterChange,
  onFileScopeChange,
}: NoteListTopChromeProps) {
  const filterNode = (
    <NoteListFilterRail
      embedded={Boolean(renderProjectIntelligence)}
      showFilterPills={showFilterPills}
      showFileScopePills={showFileScopePills}
      noteListFilter={noteListFilter}
      filterCounts={filterCounts}
      fileScope={fileScope}
      fileScopeCounts={fileScopeCounts}
      onNoteListFilterChange={onNoteListFilterChange}
      onFileScopeChange={onFileScopeChange}
    />
  )

  return (
    <div className="note-list-top-chrome" data-testid="note-list-top-chrome">
      <NoteListHeader
        title={title}
        typeDocument={typeDocument}
        isEntityView={isEntityView}
        listSort={listSort}
        listDirection={listDirection}
        customProperties={customProperties}
        locale={locale}
        sidebarCollapsed={sidebarCollapsed}
        searchVisible={searchVisible}
        search={search}
        isSearching={isSearching}
        searchInputRef={searchInputRef}
        propertyPicker={propertyPicker}
        onSortChange={handleSortChange}
        onCreateNote={handleCreateNote}
        onOpenType={onOpenType}
        onToggleSearch={toggleSearch}
        onSearchChange={setSearch}
        onSearchKeyDown={handleSearchKeyDown}
      />
      {renderProjectIntelligence ? renderProjectIntelligence(filterNode) : filterNode}
    </div>
  )
}
