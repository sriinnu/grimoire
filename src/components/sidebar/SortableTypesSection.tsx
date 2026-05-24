import { useCallback } from 'react'
import {
  DndContext, KeyboardSensor, PointerSensor, closestCenter,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { SectionGroup } from '../SidebarParts'
import { SectionContent } from '../SidebarParts'
import { NoteDropTarget } from '../note-retargeting/NoteDropTarget'
import { useNoteRetargetingContext } from '../note-retargeting/noteRetargetingContext'
import { countByFilter } from '../../utils/noteListHelpers'
import { computeReorder } from './sidebarHooks'
import type { SidebarSectionProps } from './SidebarSections'

function SortableSection({
  group,
  sectionProps,
}: {
  group: SectionGroup
  sectionProps: SidebarSectionProps
}) {
  const noteRetargeting = useNoteRetargetingContext()
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: group.type })
  const itemCount = countByFilter(sectionProps.entries, group.type).open
  const isRenaming = sectionProps.renamingType === group.type
  const content = (
    <SectionContent
      group={group}
      itemCount={itemCount}
      selection={sectionProps.selection}
      onSelect={sectionProps.onSelect}
      onContextMenu={sectionProps.onContextMenu}
      dragHandleProps={listeners}
      isRenaming={isRenaming}
      renameInitialValue={isRenaming ? sectionProps.renameInitialValue : undefined}
      onRenameSubmit={sectionProps.onRenameSubmit}
      onRenameCancel={sectionProps.onRenameCancel}
    />
  )

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        padding: '0 6px',
      }}
      {...attributes}
    >
      {noteRetargeting ? (
        <NoteDropTarget
          canAcceptNotePath={(notePath) => noteRetargeting.canDropNoteOnType(notePath, group.type)}
          onDropNote={(notePath) => noteRetargeting.dropNoteOnType(notePath, group.type)}
        >
          {content}
        </NoteDropTarget>
      ) : content}
    </div>
  )
}

/** Props for the lazy sidebar type reorder surface. */
export interface SortableTypesSectionProps {
  visibleSections: SectionGroup[]
  sectionIds: string[]
  sectionProps: SidebarSectionProps
  onReorderSections: (orderedTypes: { typeName: string; order: number }[]) => void
}

/**
 * Loads sidebar type reordering only when expanded sortable lists are visible.
 */
export function SortableTypesSection({
  visibleSections,
  sectionIds,
  sectionProps,
  onReorderSections,
}: SortableTypesSectionProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    const reordered = computeReorder(sectionIds, active.id as string, over.id as string)
    if (reordered) onReorderSections(reordered.map((typeName, order) => ({ typeName, order })))
  }, [sectionIds, onReorderSections])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={sectionIds} strategy={verticalListSortingStrategy}>
        {visibleSections.map((group) => (
          <SortableSection key={group.type} group={group} sectionProps={sectionProps} />
        ))}
      </SortableContext>
    </DndContext>
  )
}
