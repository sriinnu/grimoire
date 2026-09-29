import { BulkActionBar } from '../BulkActionBar'
import { NoteListTopChrome } from './NoteListTopChrome'
import { ListView } from './NoteListViews'
import { NoteTableView } from './NoteTableView'
import type { MouseEvent } from 'react'

/** A table row has no modifier keys to honour; open like a plain click. */
const PLAIN_CLICK = { metaKey: false, ctrlKey: false, shiftKey: false, altKey: false, button: 0, preventDefault() {}, stopPropagation() {} } as unknown as MouseEvent
import { useNoteListLayout, type NoteListLayout as NoteListLayoutMode } from './noteListLayoutPreference'
import type { useNoteListModel } from './useNoteListModel'
import { lazy, Suspense, type ReactNode } from 'react'

const EntityView = lazy(async () => ({
  default: (await import('./EntityView')).EntityView,
}))

type NoteListLayoutProps = ReturnType<typeof useNoteListModel> & {
  handleBulkOrganize?: () => void
  renderProjectIntelligence?: (filterNode: ReactNode) => ReactNode
}

function MultiSelectBar({
  multiSelect,
  isArchivedView,
  handleBulkOrganize,
  handleBulkArchive,
  handleBulkDeletePermanently,
  handleBulkUnarchive,
}: Pick<NoteListLayoutProps, 'multiSelect' | 'isArchivedView' | 'handleBulkOrganize' | 'handleBulkArchive' | 'handleBulkDeletePermanently' | 'handleBulkUnarchive'>) {
  if (!multiSelect.isMultiSelecting) return null

  return (
    <BulkActionBar
      count={multiSelect.selectedPaths.size}
      isArchivedView={isArchivedView}
      onOrganize={handleBulkOrganize}
      onArchive={handleBulkArchive}
      onDelete={handleBulkDeletePermanently}
      onUnarchive={handleBulkUnarchive}
      onClear={multiSelect.clear}
    />
  )
}

function NoteListContent({
  entitySelection,
  searchedGroups,
  query,
  collapsedGroups,
  sortPrefs,
  toggleGroup,
  handleSortChange,
  renderItem,
  isArchivedView,
  isChangesView,
  isInboxView,
  modifiedFilesError,
  searched,
  noteListVirtuosoRef,
  locale,
  layout,
  entries,
  typeEntryMap,
  customProperties,
  selectedNotePath,
  handleClickNote,
}: { layout: NoteListLayoutMode } & Pick<
  NoteListLayoutProps,
  | 'entries'
  | 'typeEntryMap'
  | 'customProperties'
  | 'selectedNotePath'
  | 'handleClickNote'
  | 'entitySelection'
  | 'searchedGroups'
  | 'query'
  | 'collapsedGroups'
  | 'sortPrefs'
  | 'toggleGroup'
  | 'handleSortChange'
  | 'renderItem'
  | 'isArchivedView'
  | 'isChangesView'
  | 'isInboxView'
  | 'modifiedFilesError'
  | 'searched'
  | 'noteListVirtuosoRef'
  | 'locale'
>) {
  return (
    <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
      {entitySelection ? (
        <Suspense fallback={<div className="h-full overflow-y-auto" data-testid="entity-view-loading" />}>
          <EntityView
            entity={entitySelection.entry}
            groups={searchedGroups}
            query={query}
            collapsedGroups={collapsedGroups}
            sortPrefs={sortPrefs}
            onToggleGroup={toggleGroup}
            onSortChange={handleSortChange}
            renderItem={renderItem}
            locale={locale}
          />
        </Suspense>
      ) : layout === 'table' ? (
        <NoteTableView
          entries={searched}
          allEntries={entries}
          typeEntryMap={typeEntryMap}
          customProperties={customProperties}
          selectedPath={selectedNotePath}
          onSelect={(entry) => handleClickNote(entry, PLAIN_CLICK)}
        />
      ) : (
        <ListView
          isArchivedView={isArchivedView}
          isChangesView={isChangesView}
          isInboxView={isInboxView}
          changesError={modifiedFilesError}
          searched={searched}
          query={query}
          renderItem={renderItem}
          virtuosoRef={noteListVirtuosoRef}
          locale={locale}
        />
      )}
    </div>
  )
}

function NoteListBody({
  handleListKeyDown,
  noteListContainerRef,
  handleNoteListBlur,
  handleNoteListFocus,
  focusNoteList,
  noteListVirtuosoRef,
  entitySelection,
  searchedGroups,
  query,
  collapsedGroups,
  sortPrefs,
  toggleGroup,
  handleSortChange,
  renderItem,
  isArchivedView,
  isChangesView,
  isInboxView,
  modifiedFilesError,
  searched,
  locale,
  layout,
  entries,
  typeEntryMap,
  customProperties,
  selectedNotePath,
  handleClickNote,
}: { layout: NoteListLayoutMode } & Pick<
  NoteListLayoutProps,
  | 'handleListKeyDown'
  | 'noteListContainerRef'
  | 'handleNoteListBlur'
  | 'handleNoteListFocus'
  | 'focusNoteList'
  | 'noteListVirtuosoRef'
  | 'entitySelection'
  | 'searchedGroups'
  | 'query'
  | 'collapsedGroups'
  | 'sortPrefs'
  | 'toggleGroup'
  | 'handleSortChange'
  | 'renderItem'
  | 'isArchivedView'
  | 'isChangesView'
  | 'isInboxView'
  | 'modifiedFilesError'
  | 'searched'
  | 'locale'
  | 'entries'
  | 'typeEntryMap'
  | 'customProperties'
  | 'selectedNotePath'
  | 'handleClickNote'
>) {
  return (
    <div
      ref={noteListContainerRef}
      className="relative flex flex-1 flex-col overflow-hidden outline-none grimoire-cascade"
      style={{ minHeight: 0 }}
      tabIndex={0}
      onBlur={handleNoteListBlur}
      onKeyDown={handleListKeyDown}
      onFocus={handleNoteListFocus}
      onClickCapture={focusNoteList}
      data-testid="note-list-container"
    >
      <NoteListContent
        entitySelection={entitySelection}
        searchedGroups={searchedGroups}
        query={query}
        collapsedGroups={collapsedGroups}
        sortPrefs={sortPrefs}
        toggleGroup={toggleGroup}
        handleSortChange={handleSortChange}
        renderItem={renderItem}
        isArchivedView={isArchivedView}
        isChangesView={isChangesView}
        isInboxView={isInboxView}
        modifiedFilesError={modifiedFilesError}
        searched={searched}
        noteListVirtuosoRef={noteListVirtuosoRef}
        locale={locale}
        layout={layout}
        entries={entries}
        typeEntryMap={typeEntryMap}
        customProperties={customProperties}
        selectedNotePath={selectedNotePath}
        handleClickNote={handleClickNote}
      />
    </div>
  )
}

function NoteListFooter({
  multiSelect,
  isArchivedView,
  handleBulkOrganize,
  handleBulkArchive,
  handleBulkDeletePermanently,
  handleBulkUnarchive,
  contextMenuNode,
  dialogNode,
}: Pick<
  NoteListLayoutProps,
  | 'multiSelect'
  | 'isArchivedView'
  | 'handleBulkOrganize'
  | 'handleBulkArchive'
  | 'handleBulkDeletePermanently'
  | 'handleBulkUnarchive'
  | 'contextMenuNode'
  | 'dialogNode'
>) {
  return (
    <>
      <MultiSelectBar
        multiSelect={multiSelect}
        isArchivedView={isArchivedView}
        handleBulkOrganize={handleBulkOrganize}
        handleBulkArchive={handleBulkArchive}
        handleBulkDeletePermanently={handleBulkDeletePermanently}
        handleBulkUnarchive={handleBulkUnarchive}
      />
      {contextMenuNode}{dialogNode}
    </>
  )
}

/** Main note-list shell: header, project intelligence, list body, and footer actions. */
export function NoteListLayout({
  noteListPanelRef,
  handleNoteListPanelBlurCapture,
  handleNoteListPanelFocusCapture,
  renderProjectIntelligence,
  ...contentProps
}: NoteListLayoutProps) {
  const [layout, toggleLayout] = useNoteListLayout(contentProps.selection)
  return (
    <div
      ref={noteListPanelRef}
      className="note-list-panel flex flex-col select-none overflow-hidden border-r border-border bg-card text-foreground"
      style={{ height: '100%' }}
      onBlurCapture={handleNoteListPanelBlurCapture}
      onFocusCapture={handleNoteListPanelFocusCapture}
    >
      <NoteListTopChrome {...contentProps} renderProjectIntelligence={renderProjectIntelligence} layout={layout} onToggleLayout={toggleLayout} />
      <NoteListBody {...contentProps} layout={layout} />
      <NoteListFooter {...contentProps} />
    </div>
  )
}
