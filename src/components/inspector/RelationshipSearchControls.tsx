import { useCallback, useState } from 'react'
import { Plus, X } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { VaultEntry } from '../../types'
import type { FrontmatterValue } from '../Inspector'
import { NoteSearchList } from '../NoteSearchList'
import {
  canonicalRefForTitle,
  confirmRelationshipSelection,
  shouldShowSearchDropdown,
  useCreateAndOpen,
  useCreateOption,
  useInlineAddNoteState,
  useSearchKeyboard,
} from './relationshipSearchModel'
import { useNoteSearch } from '../../hooks/useNoteSearch'

function CreateAndOpenOption({
  title,
  selected,
  onClick,
  onHover,
}: {
  title: string
  selected: boolean
  onClick: () => void
  onHover: () => void
}) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-2 px-3 py-1.5 text-sm transition-colors ${selected ? 'bg-accent' : 'hover:bg-secondary'}`}
      data-testid="create-and-open-option"
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
      onMouseEnter={onHover}
    >
      <Plus size={14} className="shrink-0 text-muted-foreground" />
      <span className="truncate text-foreground">
        Create &amp; open <strong>{title}</strong>
      </span>
    </div>
  )
}

function SearchDropdownWithCreate({
  search,
  onSelect,
  query,
  entries,
  onCreateAndOpen,
}: {
  search: ReturnType<typeof useNoteSearch>
  onSelect: (entry: VaultEntry) => void
  query: string
  entries: VaultEntry[]
  onCreateAndOpen?: (title: string) => void
}) {
  const trimmed = query.trim()
  const { showCreate, createIndex } = useCreateOption({
    entries,
    trimmedQuery: trimmed,
    resultCount: search.results.length,
    hasCreator: !!onCreateAndOpen,
  })
  const hasResults = search.results.length > 0

  if (!hasResults && !showCreate) return null

  return (
    <div className="absolute left-0 right-0 top-full z-50 mt-0.5 rounded border border-border bg-popover shadow-md">
      {hasResults && (
        <NoteSearchList
          items={search.results}
          selectedIndex={search.selectedIndex}
          getItemKey={(item) => item.entry.path}
          onItemClick={(item) => onSelect(item.entry)}
          onItemHover={(index) => search.setSelectedIndex(index)}
          className="max-h-[160px] overflow-y-auto"
        />
      )}
      {showCreate && onCreateAndOpen && (
        <CreateAndOpenOption
          title={trimmed}
          selected={search.selectedIndex === createIndex}
          onClick={() => onCreateAndOpen(trimmed)}
          onHover={() => search.setSelectedIndex(createIndex)}
        />
      )}
    </div>
  )
}

/** Inline relationship reference picker with search and optional note creation. */
export function InlineAddNote({
  entries,
  vaultPath,
  onAdd,
  onCreateAndOpenNote,
}: {
  entries: VaultEntry[]
  vaultPath: string
  onAdd: (ref: string) => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
}) {
  const {
    active,
    setActive,
    query,
    setQuery,
    inputRef,
    search,
    dismiss,
    handleKeyDown,
    showDropdown,
    selectEntryAndClose,
    handleCreateAndOpen,
  } = useInlineAddNoteState(entries, vaultPath, onAdd, onCreateAndOpenNote)

  if (!active) {
    return (
      <Button
        className="mt-1 h-auto w-full justify-start border-dashed px-2.5 py-1.5 text-left text-xs text-muted-foreground hover:border-foreground hover:text-foreground"
        variant="outline"
        size="xs"
        onClick={() => setActive(true)}
        data-testid="add-relation-ref"
      >
        Add
      </Button>
    )
  }

  return (
    <div className="relative mt-1">
      <div className="group/add relative flex items-center">
        <Input
          ref={inputRef}
          autoFocus
          className="h-auto py-1.5 pr-7 text-xs"
          placeholder="Note title"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={handleKeyDown}
          data-testid="add-relation-ref-input"
        />
        <Button
          className="absolute right-1 top-1/2 size-5 -translate-y-1/2 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-foreground group-hover/add:opacity-100"
          variant="ghost"
          size="icon-xs"
          onClick={dismiss}
          aria-label="Cancel relationship reference"
        >
          <X size={12} />
        </Button>
      </div>
      {showDropdown && (
        <SearchDropdownWithCreate
          search={search}
          onSelect={selectEntryAndClose}
          query={query}
          entries={entries}
          onCreateAndOpen={
            onCreateAndOpenNote ? (title) => { handleCreateAndOpen(title) } : undefined
          }
        />
      )}
    </div>
  )
}

function NoteTargetInput({
  entries,
  value,
  onChange,
  onSubmit,
  onCancel,
  onCreateAndOpenNote,
  onSubmitWithCreate,
}: {
  entries: VaultEntry[]
  value: string
  onChange: (value: string) => void
  onSubmit?: () => void
  onCancel?: () => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onSubmitWithCreate?: (title: string) => void
}) {
  const [focused, setFocused] = useState(false)
  const search = useNoteSearch(entries, value, 8)

  const trimmed = value.trim()
  const { showCreate, createIndex, totalItems } = useCreateOption({
    entries,
    trimmedQuery: trimmed,
    resultCount: search.results.length,
    hasCreator: !!onCreateAndOpenNote,
  })

  const selectEntry = useCallback((entry: VaultEntry) => {
    onChange(entry.title)
    setFocused(false)
  }, [onChange])

  const handleConfirm = useCallback(() => {
    confirmRelationshipSelection({
      showCreate,
      selectedIndex: search.selectedIndex,
      createIndex,
      trimmed,
      selectedEntry: search.selectedEntry,
      onCreate: onSubmitWithCreate,
      onSelectEntry: selectEntry,
      onFallback: onSubmit,
    })
  }, [
    showCreate,
    search.selectedIndex,
    search.selectedEntry,
    createIndex,
    trimmed,
    onSubmitWithCreate,
    selectEntry,
    onSubmit,
  ])

  const handleEscape = useCallback(() => {
    onCancel?.()
  }, [onCancel])

  const handleKeyDown = useSearchKeyboard(search, totalItems, handleConfirm, handleEscape)
  const showDropdown = shouldShowSearchDropdown({
    focused,
    trimmed,
    resultCount: search.results.length,
    showCreate,
  })

  return (
    <div className="relative">
      <Input
        className="h-auto px-2 py-1 text-xs"
        placeholder="Note title"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setTimeout(() => setFocused(false), 150)}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && (
        <SearchDropdownWithCreate
          search={search}
          onSelect={selectEntry}
          query={value}
          entries={entries}
          onCreateAndOpen={
            onCreateAndOpenNote ? (title) => onSubmitWithCreate?.(title) : undefined
          }
        />
      )}
    </div>
  )
}

/** Add-relationship form used by the inspector relationship panel. */
export function AddRelationshipForm({
  entries,
  vaultPath,
  onAddProperty,
  onCreateAndOpenNote,
}: {
  entries: VaultEntry[]
  vaultPath: string
  onAddProperty: (key: string, value: FrontmatterValue) => void
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
}) {
  const [relKey, setRelKey] = useState('')
  const [relTarget, setRelTarget] = useState('')
  const [showForm, setShowForm] = useState(false)

  const resetForm = useCallback(() => {
    setShowForm(false)
    setRelKey('')
    setRelTarget('')
  }, [])

  const submitForm = useCallback((targetOverride?: string) => {
    const key = relKey.trim()
    const rawTarget = (targetOverride ?? relTarget).trim()
    if (!key || !rawTarget) return
    onAddProperty(key, canonicalRefForTitle({ title: rawTarget, entries, vaultPath }))
    resetForm()
  }, [relKey, relTarget, entries, vaultPath, onAddProperty, resetForm])

  const addPropertyForKey = useCallback((title: string) => {
    const key = relKey.trim()
    if (key) onAddProperty(key, canonicalRefForTitle({ title, entries, vaultPath }))
  }, [relKey, entries, vaultPath, onAddProperty])

  const handleCreateAndSubmit = useCreateAndOpen(
    onCreateAndOpenNote,
    addPropertyForKey,
    resetForm,
  )

  if (!showForm) {
    return (
      <Button
        className="mt-2 h-auto w-full px-3 py-1.5 text-xs text-muted-foreground"
        variant="outline"
        size="xs"
        onClick={() => setShowForm(true)}
      >
        + Add relationship
      </Button>
    )
  }

  return (
    <div className="mt-2 flex flex-col gap-1.5">
      <Input
        autoFocus
        className="h-auto px-2 py-1 text-xs"
        placeholder="Relationship name"
        value={relKey}
        onChange={(event) => setRelKey(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') submitForm()
          else if (event.key === 'Escape') resetForm()
        }}
      />
      <NoteTargetInput
        entries={entries}
        value={relTarget}
        onChange={setRelTarget}
        onSubmit={submitForm}
        onCancel={resetForm}
        onCreateAndOpenNote={onCreateAndOpenNote}
        onSubmitWithCreate={handleCreateAndSubmit}
      />
      <div className="flex gap-1.5">
        <Button
          className="h-auto flex-1 py-1 text-xs"
          variant="outline"
          size="xs"
          onClick={() => submitForm()}
          disabled={!relKey.trim() || !relTarget.trim()}
          data-testid="submit-add-relationship"
        >
          Add
        </Button>
        <Button
          className="h-auto py-1 text-xs text-muted-foreground"
          variant="outline"
          size="xs"
          onClick={resetForm}
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}
