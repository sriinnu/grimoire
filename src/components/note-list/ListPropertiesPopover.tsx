import { lazy, Suspense, useState, useMemo, useCallback, useEffect, useId, useRef, type KeyboardEvent, type RefObject } from 'react'
import { SlidersHorizontal } from '@phosphor-icons/react'
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import {
  consumePendingNoteListPropertiesPicker,
  OPEN_NOTE_LIST_PROPERTIES_EVENT,
  type NoteListPropertiesScope,
  type OpenListPropertiesEventDetail,
} from './noteListPropertiesEvents'
import {
  ListPropertyOption,
  type NoteListPropertyKey,
} from './listPropertiesOptions'

const LazyListPropertiesSortableOptions = lazy(() => import('./ListPropertiesSortableOptions')
  .then((module) => ({ default: module.ListPropertiesSortableOptions })))

/** Props for the note-list column/property picker trigger and panel. */
export interface ListPropertiesPopoverProps {
  scope: NoteListPropertiesScope
  availableProperties: NoteListPropertyKey[]
  currentDisplay: NoteListPropertyKey[]
  onSave: (value: NoteListPropertyKey[] | null) => void
  triggerTitle: string
  triggerClassName?: string
}

function getSelectedProperties(currentDisplay: NoteListPropertyKey[], availableProperties: NoteListPropertyKey[]) {
  return currentDisplay.filter((property) => availableProperties.includes(property))
}

function getOrderedItems(currentDisplay: NoteListPropertyKey[], availableProperties: NoteListPropertyKey[]) {
  const selected = getSelectedProperties(currentDisplay, availableProperties)
  const unselected = availableProperties.filter((property) => !selected.includes(property))
  return [...selected, ...unselected]
}

function normalizePropertyQuery(query: string) {
  return query.trim().toLowerCase()
}

function filterOrderedItems(orderedItems: NoteListPropertyKey[], query: string) {
  const normalized = normalizePropertyQuery(query)
  if (normalized === '') return orderedItems
  return orderedItems.filter((property) => property.toLowerCase().includes(normalized))
}

function toggleDisplayProperty(currentDisplay: NoteListPropertyKey[], selectedSet: Set<NoteListPropertyKey>, key: NoteListPropertyKey) {
  if (selectedSet.has(key)) {
    const filtered = currentDisplay.filter((property) => property !== key)
    return filtered.length > 0 ? filtered : null
  }

  return [...currentDisplay, key]
}

function ListPropertiesSearchInput({
  inputRef,
  query,
  open,
  listboxId,
  onQueryChange,
  onKeyDown,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  open: boolean
  listboxId: string
  onQueryChange: (value: string) => void
  onKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
}) {
  return (
    <div className="mb-2">
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => onQueryChange(event.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search properties..."
        role="combobox"
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-expanded={open}
        aria-label="Search note-list properties"
        className="h-8 text-[13px]"
        data-testid="list-properties-combobox-input"
      />
    </div>
  )
}

function ListPropertiesOptionsList({
  listboxId,
  filteredItems,
  selectedSet,
  currentDisplay,
  availableProperties,
  onSave,
  onToggle,
}: {
  listboxId: string
  filteredItems: NoteListPropertyKey[]
  selectedSet: Set<NoteListPropertyKey>
  currentDisplay: NoteListPropertyKey[]
  availableProperties: NoteListPropertyKey[]
  onSave: (value: NoteListPropertyKey[] | null) => void
  onToggle: (key: string) => void
}) {
  const staticOptions = (
    <div id={listboxId} role="listbox" aria-multiselectable="true" className="pr-3">
      {filteredItems.map((key) => (
        <ListPropertyOption
          key={key}
          id={key}
          checked={selectedSet.has(key)}
          onToggle={onToggle}
        />
      ))}
    </div>
  )

  return (
    <div className="max-h-60 overflow-y-auto" data-testid="list-properties-scroll-area">
      {filteredItems.length === 0 ? (
        <div className="px-1 py-2 text-[12px] text-muted-foreground">
          No properties match this search.
        </div>
      ) : (
        <Suspense fallback={staticOptions}>
          <LazyListPropertiesSortableOptions
            listboxId={listboxId}
            filteredItems={filteredItems}
            selectedSet={selectedSet}
            currentDisplay={currentDisplay}
            availableProperties={availableProperties}
            onSave={onSave}
            onToggle={onToggle}
          />
        </Suspense>
      )}
    </div>
  )
}

function ListPropertiesPopoverPanel({
  inputRef,
  query,
  open,
  listboxId,
  filteredItems,
  selectedSet,
  currentDisplay,
  availableProperties,
  onQueryChange,
  onSearchKeyDown,
  onPanelKeyDown,
  onSave,
  onToggle,
}: {
  inputRef: RefObject<HTMLInputElement | null>
  query: string
  open: boolean
  listboxId: string
  filteredItems: NoteListPropertyKey[]
  selectedSet: Set<NoteListPropertyKey>
  currentDisplay: NoteListPropertyKey[]
  availableProperties: NoteListPropertyKey[]
  onQueryChange: (value: string) => void
  onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void
  onPanelKeyDown: (event: KeyboardEvent<HTMLDivElement>) => void
  onSave: (value: NoteListPropertyKey[] | null) => void
  onToggle: (key: string) => void
}) {
  if (!open) return null

  return (
    <PopoverContent
      align="end"
      className="w-64 overflow-hidden p-2"
      onOpenAutoFocus={(event) => event.preventDefault()}
      data-testid="list-properties-popover"
    >
      <div onKeyDownCapture={onPanelKeyDown}>
        <div className="mb-2 px-1 text-[11px] font-medium text-muted-foreground">
          Show in note list
        </div>
        <ListPropertiesSearchInput
          inputRef={inputRef}
          query={query}
          open={open}
          listboxId={listboxId}
          onQueryChange={onQueryChange}
          onKeyDown={onSearchKeyDown}
        />
        <ListPropertiesOptionsList
          listboxId={listboxId}
          filteredItems={filteredItems}
          selectedSet={selectedSet}
          currentDisplay={currentDisplay}
          availableProperties={availableProperties}
          onSave={onSave}
          onToggle={onToggle}
        />
      </div>
    </PopoverContent>
  )
}

function handleEscapeKey(event: KeyboardEvent<HTMLInputElement | HTMLDivElement>, closePopover: () => void) {
  if (event.key !== 'Escape') return
  event.preventDefault()
  closePopover()
}

function useListPropertiesPopoverState({
  scope,
  availableProperties,
  currentDisplay,
  onSave,
}: Pick<ListPropertiesPopoverProps, 'scope' | 'availableProperties' | 'currentDisplay' | 'onSave'>) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const listboxId = useId()
  const closePopover = useCallback(() => {
    setQuery('')
    setOpen(false)
  }, [])

  const orderedItems = useMemo(
    () => getOrderedItems(currentDisplay, availableProperties),
    [availableProperties, currentDisplay],
  )
  const filteredItems = useMemo(
    () => filterOrderedItems(orderedItems, query),
    [orderedItems, query],
  )
  const selectedSet = useMemo(
    () => new Set(getSelectedProperties(currentDisplay, availableProperties)),
    [availableProperties, currentDisplay],
  )

  useEffect(() => {
    let pendingOpenFrame = 0
    if (consumePendingNoteListPropertiesPicker(scope)) {
      pendingOpenFrame = requestAnimationFrame(() => setOpen(true))
    }

    const handler = (event: Event) => {
      const detail = (event as CustomEvent<OpenListPropertiesEventDetail>).detail
      if (detail?.scope === scope) {
        consumePendingNoteListPropertiesPicker(scope)
        setOpen(true)
      }
    }
    window.addEventListener(OPEN_NOTE_LIST_PROPERTIES_EVENT, handler)
    return () => {
      if (pendingOpenFrame) cancelAnimationFrame(pendingOpenFrame)
      window.removeEventListener(OPEN_NOTE_LIST_PROPERTIES_EVENT, handler)
    }
  }, [scope])

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => inputRef.current?.focus())
  }, [open])

  const handleToggle = useCallback((key: string) => {
    const nextSelected = toggleDisplayProperty(currentDisplay, selectedSet, key)
    onSave(nextSelected)
  }, [currentDisplay, onSave, selectedSet])

  const handleSearchKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    handleEscapeKey(event, closePopover)
  }, [closePopover])

  const handlePanelKeyDown = useCallback((event: KeyboardEvent<HTMLDivElement>) => {
    handleEscapeKey(event, closePopover)
  }, [closePopover])

  const handleOpenChange = useCallback((nextOpen: boolean) => {
    setOpen(nextOpen)
    if (!nextOpen) setQuery('')
  }, [])

  return {
    open,
    query,
    inputRef,
    listboxId,
    filteredItems,
    selectedSet,
    setQuery,
    handleSearchKeyDown,
    handlePanelKeyDown,
    handleOpenChange,
    handleToggle,
  }
}

/**
 * Renders a searchable property picker for note-list metadata columns.
 */
export function ListPropertiesPopover({
  scope,
  availableProperties,
  currentDisplay,
  onSave,
  triggerTitle,
  triggerClassName,
}: ListPropertiesPopoverProps) {
  const {
    open,
    query,
    inputRef,
    listboxId,
    filteredItems,
    selectedSet,
    setQuery,
    handleSearchKeyDown,
    handlePanelKeyDown,
    handleOpenChange,
    handleToggle,
  } = useListPropertiesPopoverState({ scope, availableProperties, currentDisplay, onSave })

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          className={cn('h-7 w-7 text-muted-foreground', triggerClassName)}
          title={triggerTitle}
          aria-label={triggerTitle}
          data-testid="list-properties-btn"
      >
        <SlidersHorizontal size={16} />
      </Button>
      </PopoverTrigger>
      <ListPropertiesPopoverPanel
        inputRef={inputRef}
        query={query}
        open={open}
        listboxId={listboxId}
        filteredItems={filteredItems}
        selectedSet={selectedSet}
        currentDisplay={currentDisplay}
        availableProperties={availableProperties}
        onQueryChange={setQuery}
        onSearchKeyDown={handleSearchKeyDown}
        onPanelKeyDown={handlePanelKeyDown}
        onSave={onSave}
        onToggle={handleToggle}
      />
    </Popover>
  )
}
