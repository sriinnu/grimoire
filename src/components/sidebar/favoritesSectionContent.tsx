import type { VaultEntry } from '../../types'
import { buildTypeEntryMap, getTypeColor, getTypeLightColor } from '../../utils/typeColors'
import { NoteTitleIcon } from '../NoteTitleIcon'
import { SIDEBAR_ITEM_PADDING } from './sidebarStyles'

const FAVORITE_TYPE_ICON_MAP: Record<string, string> = {
  Project: 'wrench',
  project: 'wrench',
  Experiment: 'flask',
  experiment: 'flask',
  Responsibility: 'target',
  responsibility: 'target',
  Procedure: 'arrows-clockwise',
  procedure: 'arrows-clockwise',
  Person: 'users',
  person: 'users',
  Event: 'calendar-blank',
  event: 'calendar-blank',
  Topic: 'tag',
  topic: 'tag',
  Type: 'stack-simple',
  type: 'stack-simple',
}

/** Favorite type metadata keyed by type name. */
export type FavoriteTypeEntryMap = ReturnType<typeof buildTypeEntryMap>

function getFavoriteIcon(entry: VaultEntry, typeEntryMap: FavoriteTypeEntryMap) {
  const typeEntry = entry.isA ? typeEntryMap[entry.isA] : undefined
  return entry.icon ?? typeEntry?.icon ?? FAVORITE_TYPE_ICON_MAP[entry.isA ?? ''] ?? 'file-text'
}

/** Props for shared favorite row content. */
export interface FavoriteListItemContentProps {
  entry: VaultEntry
  isActive: boolean
  onSelect: () => void
  typeEntryMap: FavoriteTypeEntryMap
}

/**
 * Renders the shared favorite row content for static and sortable sidebars.
 */
export function FavoriteListItemContent({
  entry,
  isActive,
  onSelect,
  typeEntryMap,
}: FavoriteListItemContentProps) {
  const typeEntry = entry.isA ? typeEntryMap[entry.isA] : undefined
  const icon = getFavoriteIcon(entry, typeEntryMap)
  const typeColor = getTypeColor(entry.isA ?? null, typeEntry?.color)
  const typeLightColor = getTypeLightColor(entry.isA ?? null, typeEntry?.color)

  return (
    <div
      className={`group/section flex cursor-pointer select-none items-center justify-between rounded transition-colors ${isActive ? '' : 'hover:bg-accent'}`}
      style={{ padding: SIDEBAR_ITEM_PADDING.withCount, borderRadius: 4, gap: 4, ...(isActive ? { background: typeLightColor } : {}) }}
      onClick={onSelect}
    >
      <div className="flex min-w-0 flex-1 items-center" style={{ gap: 4 }}>
        <NoteTitleIcon icon={icon} size={16} color={typeColor} />
        <span className="truncate text-[13px] font-medium" style={{ marginLeft: 4, color: isActive ? typeColor : undefined }}>
          {entry.title}
        </span>
      </div>
    </div>
  )
}
