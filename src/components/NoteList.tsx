import { lazy, memo, Suspense, useCallback, useEffect, type ReactNode } from 'react'
import { NoteListLayout } from './note-list/NoteListLayout'
import { useNoteListModel, type NoteListProps } from './note-list/useNoteListModel'
import type { NoteListMultiSelectionCommands } from './note-list/multiSelectionCommands'
import { useMultiSelectKeyboard } from './note-list/useMultiSelectKeyboard'
import './note-list/NoteListChrome.css'
import './note-list/ProjectWorkspaceChrome.css'
import './note-list/NoteListFilterRail.css'

const ProjectIntelligenceStrip = lazy(() =>
  import('./ProjectIntelligenceStrip').then((module) => ({ default: module.ProjectIntelligenceStrip })),
)

export type NoteListSurfaceProps = NoteListProps & {
  onBulkOrganize?: (paths: string[]) => void
  multiSelectionCommandRef?: React.MutableRefObject<NoteListMultiSelectionCommands | null>
}

function ProjectFilterFallback({ filterNode }: { filterNode: ReactNode }) {
  return (
    <div className="project-workspace-strip grimoire-panel-reveal" data-testid="project-workspace-strip">
      <div className="project-workspace-chrome">
        <div className="project-workspace-chrome__filters" data-testid="project-workspace-filters">
          {filterNode}
        </div>
      </div>
    </div>
  )
}

function NoteListInner({ onBulkOrganize, multiSelectionCommandRef, ...props }: NoteListSurfaceProps) {
  const model = useNoteListModel(props)

  const handleBulkOrganize = useCallback(() => {
    const paths = [...model.multiSelect.selectedPaths]
    model.multiSelect.clear()
    onBulkOrganize?.(paths)
  }, [model.multiSelect, onBulkOrganize])

  useMultiSelectKeyboard({
    multiSelect: model.multiSelect,
    isEntityView: model.isEntityView,
    onBulkOrganize: onBulkOrganize ? handleBulkOrganize : undefined,
    onBulkDelete: props.onBulkDeletePermanently ? model.handleBulkDeletePermanently : undefined,
    enableActionShortcuts: !multiSelectionCommandRef,
  })

  useEffect(() => {
    if (!multiSelectionCommandRef) return

    multiSelectionCommandRef.current = {
      selectedPaths: [...model.multiSelect.selectedPaths],
      deleteSelected: props.onBulkDeletePermanently ? model.handleBulkDeletePermanently : undefined,
      organizeSelected: onBulkOrganize ? handleBulkOrganize : undefined,
    }

    return () => {
      multiSelectionCommandRef.current = null
    }
  }, [
    handleBulkOrganize,
    model.handleBulkDeletePermanently,
    model.multiSelect.selectedPaths,
    multiSelectionCommandRef,
    onBulkOrganize,
    props.onBulkDeletePermanently,
  ])

  return (
    <NoteListLayout
      {...model}
      handleBulkOrganize={onBulkOrganize ? handleBulkOrganize : undefined}
      renderProjectIntelligence={props.selection.kind === 'folder' ? (filterNode) => (
        <Suspense fallback={<ProjectFilterFallback filterNode={filterNode} />}>
          <ProjectIntelligenceStrip
            entries={props.entries}
            filterNode={filterNode}
            selection={props.selection}
            onSelectNote={props.onSelectNote}
          />
        </Suspense>
      ) : undefined}
    />
  )
}

export const NoteList = memo(NoteListInner)
