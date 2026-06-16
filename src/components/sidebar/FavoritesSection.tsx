import { lazy, Suspense, useCallback, useMemo } from 'react'
import type { VaultEntry, SidebarSelection } from '../../types'
import { buildTypeEntryMap } from '../../utils/typeColors'
import { isSelectionActive } from '../SidebarParts'
import { SidebarGroupHeader } from './SidebarGroupHeader'
import {
  FavoriteListItemContent,
  type FavoriteTypeEntryMap,
} from './favoritesSectionContent'

const LazyFavoritesSortableList = lazy(() => import('./FavoritesSortableList')
  .then((module) => ({ default: module.FavoritesSortableList })))

interface FavoritesSectionProps {
  entries: VaultEntry[]
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  onSelectNote?: (entry: VaultEntry) => void
  onReorder?: (orderedPaths: string[]) => void
  collapsed: boolean
  onToggle: () => void
}

function FavoritesStaticList({
  favorites,
  selection,
  typeEntryMap,
  onSelectEntry,
}: {
  favorites: VaultEntry[]
  selection: SidebarSelection
  typeEntryMap: FavoriteTypeEntryMap
  onSelectEntry: (entry: VaultEntry) => void
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 4 }}>
      {favorites.map((entry) => (
        <FavoriteListItemContent
          key={entry.path}
          entry={entry}
          isActive={isSelectionActive(selection, { kind: 'entity', entry })}
          typeEntryMap={typeEntryMap}
          onSelect={() => onSelectEntry(entry)}
        />
      ))}
    </div>
  )
}

function sortFavorites(entries: VaultEntry[]) {
  return entries
    .filter((entry) => entry.favorite && !entry.archived)
    .sort((a, b) => (a.favoriteIndex ?? Infinity) - (b.favoriteIndex ?? Infinity))
}

/**
 * Renders the favorites sidebar group, loading reorder logic only when needed.
 */
export function FavoritesSection({
  entries,
  selection,
  onSelect,
  onSelectNote,
  onReorder,
  collapsed,
  onToggle,
}: FavoritesSectionProps) {
  const favorites = useMemo(() => sortFavorites(entries), [entries])
  const favoriteIds = useMemo(() => favorites.map((entry) => entry.path), [favorites])
  const typeEntryMap = useMemo(() => buildTypeEntryMap(entries), [entries])

  const handleFavoriteSelect = useCallback((entry: VaultEntry) => {
    if (onSelectNote) {
      void onSelectNote(entry)
      return
    }

    onSelect({ kind: 'filter', filter: 'favorites' })
  }, [onSelect, onSelectNote])

  if (favorites.length === 0) return null
  const staticList = (
    <FavoritesStaticList
      favorites={favorites}
      selection={selection}
      typeEntryMap={typeEntryMap}
      onSelectEntry={handleFavoriteSelect}
    />
  )
  const favoriteList = onReorder && favoriteIds.length > 1 ? (
    <Suspense fallback={staticList}>
      <LazyFavoritesSortableList
        favorites={favorites}
        favoriteIds={favoriteIds}
        selection={selection}
        typeEntryMap={typeEntryMap}
        onSelectEntry={handleFavoriteSelect}
        onReorder={onReorder}
      />
    </Suspense>
  ) : staticList

  return (
    <div style={{ padding: '0 6px' }}>
      <SidebarGroupHeader label="Favorites" collapsed={collapsed} onToggle={onToggle} count={favorites.length} />
      {!collapsed && favoriteList}
    </div>
  )
}
