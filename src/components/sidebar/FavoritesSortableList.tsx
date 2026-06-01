import { useCallback } from 'react'
import {
  DndContext, PointerSensor, closestCenter, type DragEndEvent, useSensor, useSensors,
} from '@dnd-kit/core'
import {
  SortableContext, arrayMove, useSortable, verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import type { VaultEntry, SidebarSelection } from '../../types'
import { isSelectionActive } from '../SidebarParts'
import {
  FavoriteListItemContent,
  type FavoriteTypeEntryMap,
} from './favoritesSectionContent'

function reorderFavoriteIds(favoriteIds: string[], event: DragEndEvent) {
  const { active, over } = event
  if (!over || active.id === over.id) return null
  const oldIndex = favoriteIds.indexOf(active.id as string)
  const newIndex = favoriteIds.indexOf(over.id as string)
  if (oldIndex === -1 || newIndex === -1) return null
  return arrayMove(favoriteIds, oldIndex, newIndex)
}

function SortableFavoriteItem({
  entry,
  isActive,
  onSelect,
  typeEntryMap,
}: {
  entry: VaultEntry
  isActive: boolean
  onSelect: () => void
  typeEntryMap: FavoriteTypeEntryMap
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: entry.path })

  return (
    <div
      ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.5 : 1 }}
      {...attributes}
      {...listeners}
    >
      <FavoriteListItemContent
        entry={entry}
        isActive={isActive}
        typeEntryMap={typeEntryMap}
        onSelect={onSelect}
      />
    </div>
  )
}

/** Props for the lazy favorite-note reorder list. */
export interface FavoritesSortableListProps {
  favorites: VaultEntry[]
  favoriteIds: string[]
  selection: SidebarSelection
  typeEntryMap: FavoriteTypeEntryMap
  onSelectEntry: (entry: VaultEntry) => void
  onReorder: (orderedPaths: string[]) => void
}

/**
 * Enables favorite-note reordering without making DnD part of app startup.
 */
export function FavoritesSortableList({
  favorites,
  favoriteIds,
  selection,
  typeEntryMap,
  onSelectEntry,
  onReorder,
}: FavoritesSortableListProps) {
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }))

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const reordered = reorderFavoriteIds(favoriteIds, event)
    if (reordered) onReorder(reordered)
  }, [favoriteIds, onReorder])

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={favoriteIds} strategy={verticalListSortingStrategy}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 4 }}>
          {favorites.map((entry) => (
            <SortableFavoriteItem
              key={entry.path}
              entry={entry}
              isActive={isSelectionActive(selection, { kind: 'entity', entry })}
              typeEntryMap={typeEntryMap}
              onSelect={() => onSelectEntry(entry)}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  )
}
