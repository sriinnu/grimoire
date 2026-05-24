import { lazy, memo, Suspense, useCallback, useEffect } from 'react'
import { NoteListLayout } from './note-list/NoteListLayout'
import { useNoteListModel, type NoteListProps } from './note-list/useNoteListModel'
import type { NoteListMultiSelectionCommands } from './note-list/multiSelectionCommands'
import { useMultiSelectKeyboard } from './note-list/useMultiSelectKeyboard'
import './note-list/NoteListChrome.css'

const ProjectIntelligenceStrip = lazy(() =>
  import('./ProjectIntelligenceStrip').then((module) => ({ default: module.ProjectIntelligenceStrip })),
)

type NoteListInnerProps = NoteListProps & {
  onBulkOrganize?: (paths: string[]) => void
  multiSelectionCommandRef?: React.MutableRefObject<NoteListMultiSelectionCommands | null>
}

function NoteListInner({ onBulkOrganize, multiSelectionCommandRef, ...props }: NoteListInnerProps) {
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
      projectIntelligenceNode={props.selection.kind === 'folder' ? (
        <Suspense fallback={null}>
          <ProjectIntelligenceStrip
            entries={props.entries}
            selection={props.selection}
            onSelectNote={props.onSelectNote}
          />
        </Suspense>
      ) : null}
    />
  )
}

export const NoteList = memo(NoteListInner)
