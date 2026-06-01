import type { ReactNode } from 'react'
import { Checkbox } from '@/components/ui/checkbox'

/** A note-list metadata field that can be shown as a row chip. */
export type NoteListPropertyKey = string

/**
 * Generates a stable checkbox id for a note-list property key.
 */
function propertyInputId(id: NoteListPropertyKey): string {
  return `list-prop-${id.replace(/[^a-z0-9_-]+/gi, '-')}`
}

/** Props for a selectable note-list property row. */
export interface ListPropertyOptionProps {
  id: NoteListPropertyKey
  checked: boolean
  onToggle: (key: NoteListPropertyKey) => void
  dragHandle?: ReactNode
}

/**
 * Renders one selectable note-list property row shared by static and sortable lists.
 */
export function ListPropertyOption({
  id,
  checked,
  onToggle,
  dragHandle,
}: ListPropertyOptionProps) {
  const inputId = propertyInputId(id)

  return (
    <div
      className="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted"
      data-testid={`list-prop-item-${id}`}
    >
      <Checkbox
        id={inputId}
        checked={checked}
        onCheckedChange={() => onToggle(id)}
        aria-label={id}
      />
      <label
        htmlFor={inputId}
        className="flex flex-1 cursor-pointer items-center gap-2 text-[13px]"
        onClick={(event) => {
          event.preventDefault()
          onToggle(id)
        }}
      >
        <span className="truncate">{id}</span>
      </label>
      {dragHandle}
    </div>
  )
}
