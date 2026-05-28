import { lazy, Suspense } from 'react'
import { MagnifyingGlass, Plus } from '@phosphor-icons/react'
import { Loader2 } from 'lucide-react'
import type { VaultEntry } from '../../types'
import type { SortOption, SortDirection } from '../../utils/noteListSorting'
import type { AppLocale } from '../../lib/i18nCore'
import { translateNoteList } from '../../lib/i18nNoteList'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useDragRegion } from '../../hooks/useDragRegion'
import { SortDropdown } from '../SortDropdown'
import type { ListPropertiesPopoverProps } from './ListPropertiesPopover'

const NOTE_LIST_ACTION_BUTTON_CLASSNAME = 'note-list-chrome-action'
const ListPropertiesPopoverSurface = lazy(async () => ({
  default: (await import('./ListPropertiesPopover')).ListPropertiesPopover,
}))

export function NoteListHeader({ title, typeDocument, isEntityView, listSort, listDirection, customProperties, sidebarCollapsed, searchVisible, search, isSearching, searchInputRef, propertyPicker, locale = 'en', onSortChange, onCreateNote, onOpenType, onToggleSearch, onSearchChange, onSearchKeyDown }: {
  title: string
  typeDocument: VaultEntry | null
  isEntityView: boolean
  listSort: SortOption
  listDirection: SortDirection
  customProperties: string[]
  sidebarCollapsed?: boolean
  searchVisible: boolean
  search: string
  isSearching: boolean
  searchInputRef: React.RefObject<HTMLInputElement | null>
  propertyPicker?: ListPropertiesPopoverProps | null
  locale?: AppLocale
  onSortChange: (groupLabel: string, option: SortOption, direction: SortDirection) => void
  onCreateNote: () => void
  onOpenType: (entry: VaultEntry) => void
  onToggleSearch: () => void
  onSearchChange: (value: string) => void
  onSearchKeyDown: (event: React.KeyboardEvent<HTMLInputElement>) => void
}) {
  const { onMouseDown: onDragMouseDown } = useDragRegion()
  return (
    <>
      <div className="note-list-chrome-row flex h-[52px] shrink-0 items-center justify-between border-b px-4" onMouseDown={onDragMouseDown} style={{ cursor: 'default', paddingLeft: sidebarCollapsed ? 80 : undefined }}>
        <h3
          className="m-0 min-w-0 flex-1 truncate text-[14px] font-semibold"
          style={typeDocument ? { cursor: 'pointer' } : undefined}
          onClick={typeDocument ? () => onOpenType(typeDocument) : undefined}
          data-testid={typeDocument ? 'type-header-link' : undefined}
        >
          {title}
        </h3>
        <div className="note-list-chrome-actions ml-3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
          {!isEntityView && (
            <SortDropdown
              groupLabel="__list__"
              current={listSort}
              direction={listDirection}
              customProperties={customProperties}
              triggerClassName={NOTE_LIST_ACTION_BUTTON_CLASSNAME}
              onChange={onSortChange}
            />
          )}
          <Button type="button" variant="ghost" size="icon-xs" className={NOTE_LIST_ACTION_BUTTON_CLASSNAME} onClick={onToggleSearch} title={translateNoteList(locale, 'noteList.searchAction')} aria-label={translateNoteList(locale, 'noteList.searchAction')}>
            <MagnifyingGlass size={16} />
          </Button>
          {propertyPicker && (
            <Suspense fallback={null}>
              <ListPropertiesPopoverSurface {...propertyPicker} triggerClassName={NOTE_LIST_ACTION_BUTTON_CLASSNAME} />
            </Suspense>
          )}
          <Button type="button" variant="ghost" size="icon-xs" className={NOTE_LIST_ACTION_BUTTON_CLASSNAME} onClick={onCreateNote} title={translateNoteList(locale, 'noteList.createNote')} aria-label={translateNoteList(locale, 'noteList.createNote')}>
            <Plus size={16} />
          </Button>
        </div>
      </div>
      {searchVisible && (
        <div className="note-list-search-row border-b px-3 py-2">
          <div className="relative flex-1" aria-live="polite">
            <Input
              ref={searchInputRef}
              placeholder={translateNoteList(locale, 'noteList.searchPlaceholder')}
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              onKeyDown={onSearchKeyDown}
              className="h-8 pr-8 text-[13px]"
            />
            {isSearching && (
              <span
                className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-muted-foreground"
                data-testid="note-list-search-loading"
              >
                <Loader2 size={12} className="animate-spin" />
              </span>
            )}
          </div>
        </div>
      )}
    </>
  )
}
