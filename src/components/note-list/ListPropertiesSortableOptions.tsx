import { useCallback } from 'react'
import { DotsSixVertical } from '@phosphor-icons/react'
import {
  DndContext, closestCenter, PointerSensor,
  useSensor, useSensors, type DragEndEvent,
} from '@dnd-kit/core'
import {
  SortableContext, useSortable, verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button } from '@/components/ui/button'
import {
  ListPropertyOption,
  type NoteListPropertyKey,
} from './listPropertiesOptions'

function getSelectedProperties(
  currentDisplay: NoteListPropertyKey[],
  availableProperties: NoteListPropertyKey[],
) {
  return currentDisplay.filter((property) => availableProperties.includes(property))
}

function reorderDisplayProperties(
  event: DragEndEvent,
  currentDisplay: NoteListPropertyKey[],
  availableProperties: NoteListPropertyKey[],
) {
  const { active, over } = event
  if (!over || active.id === over.id) return undefined

  const selected = getSelectedProperties(currentDisplay, availableProperties)
  const oldIndex = selected.indexOf(String(active.id) as NoteListPropertyKey)
  const newIndex = selected.indexOf(String(over.id) as NoteListPropertyKey)
  if (oldIndex === -1 || newIndex === -1) return undefined

  return arrayMove(selected, oldIndex, newIndex)
}

function SortablePropertyItem({
  id,
  checked,
  onToggle,
}: {
  id: NoteListPropertyKey
  checked: boolean
  onToggle: (key: NoteListPropertyKey) => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id })
  const style = { transform: CSS.Transform.toString(transform), transition }
  const dragAttributes = { ...attributes, tabIndex: -1 }

  const dragHandle = (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      className="shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
      aria-label={`Reorder ${id}`}
      {...dragAttributes}
      {...listeners}
    >
      <DotsSixVertical size={14} />
    </Button>
  )

  return (
    <div ref={setNodeRef} style={style}>
      <ListPropertyOption
        id={id}
        checked={checked}
        onToggle={onToggle}
        dragHandle={dragHandle}
      />
    </div>
  )
}

/** Props for the lazy sortable note-list property chooser. */
export interface ListPropertiesSortableOptionsProps {
  listboxId: string
  filteredItems: NoteListPropertyKey[]
  selectedSet: Set<NoteListPropertyKey>
  currentDisplay: NoteListPropertyKey[]
  availableProperties: NoteListPropertyKey[]
  onSave: (value: NoteListPropertyKey[] | null) => void
  onToggle: (key: NoteListPropertyKey) => void
}

/**
 * Loads DnD only while the note-list properties picker is open.
 */
export function ListPropertiesSortableOptions({
  listboxId,
  filteredItems,
  selectedSet,
  currentDisplay,
  availableProperties,
  onSave,
  onToggle,
}: ListPropertiesSortableOptionsProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  )

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const reordered = reorderDisplayProperties(event, currentDisplay, availableProperties)
    if (!reordered) return
    onSave(reordered)
  }, [availableProperties, currentDisplay, onSave])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <div id={listboxId} role="listbox" aria-multiselectable="true" className="pr-3">
        <SortableContext items={filteredItems} strategy={verticalListSortingStrategy}>
          {filteredItems.map((key) => (
            <SortablePropertyItem
              key={key}
              id={key}
              checked={selectedSet.has(key)}
              onToggle={onToggle}
            />
          ))}
        </SortableContext>
      </div>
    </DndContext>
  )
}
