import type { VaultEntry } from '../../types'
import type { RelationshipGroup } from '../../utils/noteListHelpers'
import type { SortConfig, SortDirection, SortOption } from '../../utils/noteListSorting'
import type { AppLocale } from '../../lib/i18nCore'
import { translateNoteList } from '../../lib/i18nNoteList'
import { PinnedCard } from './PinnedCard'
import { RelationshipGroupSection } from './RelationshipGroupSection'
import { EmptyMessage } from './TrashWarningBanner'

export interface EntityViewProps {
  collapsedGroups: Set<string>
  entity: VaultEntry
  groups: RelationshipGroup[]
  locale?: AppLocale
  query: string
  renderItem: (entry: VaultEntry, options?: { forceSelected?: boolean }) => React.ReactNode
  sortPrefs: Record<string, SortConfig>
  onSortChange: (label: string, opt: SortOption, dir: SortDirection) => void
  onToggleGroup: (label: string) => void
}

/** Entity-only relationship view that stays out of normal note-list startup. */
export function EntityView({
  collapsedGroups,
  entity,
  groups,
  locale = 'en',
  query,
  renderItem,
  sortPrefs,
  onSortChange,
  onToggleGroup,
}: EntityViewProps) {
  return (
    <div className="h-full overflow-y-auto">
      <PinnedCard entry={entity} renderItem={renderItem} />
      {groups.length === 0
        ? <EmptyMessage text={query ? translateNoteList(locale, 'noteList.empty.noMatchingItems') : translateNoteList(locale, 'noteList.empty.noRelatedItems')} />
        : groups.map((group) => (
          <RelationshipGroupSection
            key={group.label}
            group={group}
            isCollapsed={collapsedGroups.has(group.label)}
            sortPrefs={sortPrefs}
            onToggle={() => onToggleGroup(group.label)}
            handleSortChange={onSortChange}
            renderItem={renderItem}
          />
        ))
      }
    </div>
  )
}
