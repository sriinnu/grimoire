import { useCallback, useState, type KeyboardEvent, type MouseEvent } from 'react'
import { XIcon } from 'lucide-react'
import type { FrontmatterValue } from '../Inspector'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { PROPERTY_CHIP_STYLE } from '../propertyChipStyles'
import { StatusDropdown } from '../StatusDropdown'
import { TagsDropdown } from '../TagsDropdown'
import { getStatusStyle } from '../../utils/statusStyles'
import { getTagStyle } from '../../utils/tagStyles'
import { formatDateValue, toISODate } from '../../utils/propertyTypes'
import type { ScalarEditProps } from './propertyValueCellTypes'

function parseDateValue(value: string): Date | undefined {
  const iso = toISODate(value)
  const d = new Date(iso + 'T00:00:00')
  return isNaN(d.getTime()) ? undefined : d
}

function dateToISO(day: Date): string {
  const yyyy = day.getFullYear()
  const mm = String(day.getMonth() + 1).padStart(2, '0')
  const dd = String(day.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

export function StatusValue({ propKey, value, isEditing, vaultStatuses, onSave, onStartEdit }: {
  propKey: string; value: FrontmatterValue; isEditing: boolean; vaultStatuses: string[]
  onSave: (key: string, value: string) => void; onStartEdit: (key: string | null) => void
}) {
  const statusStr = String(value)
  const style = getStatusStyle(statusStr)
  return (
    <span className="relative inline-flex min-w-0 items-center">
      <span
        className="inline-flex cursor-pointer items-center gap-1.5 transition-opacity hover:opacity-80"
        style={{ ...PROPERTY_CHIP_STYLE, backgroundColor: style.bg, color: style.color }}
        onClick={() => onStartEdit(propKey)}
        data-testid="status-badge"
      >
        <span className="inline-block size-1.5 shrink-0 rounded-full" style={{ backgroundColor: style.color }} />
        {statusStr}
      </span>
      {isEditing && (
        <StatusDropdown
          value={statusStr}
          vaultStatuses={vaultStatuses}
          onSave={(newValue) => onSave(propKey, newValue)}
          onCancel={() => onStartEdit(null)}
        />
      )}
    </span>
  )
}

export function TagsValue({ propKey, value, isEditing, vaultTags, onSave, onStartEdit }: {
  propKey: string; value: string[]; isEditing: boolean; vaultTags: string[]
  onSave: (key: string, items: string[]) => void; onStartEdit: (key: string | null) => void
}) {
  const handleToggle = useCallback((tag: string) => {
    const idx = value.indexOf(tag)
    const next = idx >= 0 ? value.filter((_, i) => i !== idx) : [...value, tag]
    onSave(propKey, next)
  }, [propKey, value, onSave])

  const handleRemove = useCallback((tag: string) => {
    onSave(propKey, value.filter(t => t !== tag))
  }, [propKey, value, onSave])

  return (
    <span className="relative inline-flex min-w-0 flex-wrap items-center gap-1">
      {value.map(tag => {
        const style = getTagStyle(tag)
        return (
          <span
            key={tag}
            className="group/tag relative inline-flex items-center overflow-hidden"
            style={{ ...PROPERTY_CHIP_STYLE, backgroundColor: style.bg, maxWidth: 120 }}
          >
            <span
              className="transition-[max-width] duration-150 group-hover/tag:[mask-image:linear-gradient(to_right,black_60%,transparent_100%)]"
              style={{
                color: style.color,
                overflow: 'hidden',
                whiteSpace: 'nowrap' as const,
              }}
            >
              {tag}
            </span>
            <button
              className="ml-0.5 max-w-0 overflow-hidden border-none bg-transparent p-0 leading-none opacity-0 transition-all duration-150 group-hover/tag:max-w-[14px] group-hover/tag:opacity-100"
              style={{ color: style.color, fontSize: 11, flexShrink: 0 }}
              onClick={() => handleRemove(tag)}
              title={`Remove ${tag}`}
            >
              &times;
            </button>
          </span>
        )
      })}
      <button
        className="inline-flex shrink-0 items-center justify-center border-none bg-muted text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
        style={PROPERTY_CHIP_STYLE}
        onClick={() => onStartEdit(propKey)}
        title="Add tag"
        data-testid="tags-add-button"
      >+</button>
      {isEditing && (
        <TagsDropdown
          selectedTags={value}
          vaultTags={vaultTags}
          onToggle={handleToggle}
          onClose={() => onStartEdit(null)}
        />
      )}
    </span>
  )
}

export function BooleanToggle({ value, onToggle }: { value: boolean; onToggle: () => void }) {
  return (
    <label className="inline-flex h-6 cursor-pointer items-center gap-1.5" data-testid="boolean-toggle">
      <input
        type="checkbox"
        checked={value}
        onChange={onToggle}
        className="size-3.5 cursor-pointer accent-primary"
      />
      <span className="text-[12px] text-secondary-foreground">{value ? 'Yes' : 'No'}</span>
    </label>
  )
}

export function NumberValue({
  value,
  onSave,
  onCancel,
  isEditing,
  onStartEdit,
}: ScalarEditProps) {
  const [editValue, setEditValue] = useState(value)

  const restoreValue = useCallback(() => {
    setEditValue(value)
  }, [value])

  const commitValue = useCallback(() => {
    const trimmed = editValue.trim()
    if (trimmed === '') {
      onSave('')
      return
    }

    const parsed = Number(trimmed)
    if (Number.isFinite(parsed)) {
      onSave(trimmed)
      return
    }

    restoreValue()
    onCancel()
  }, [editValue, onCancel, onSave, restoreValue])

  const handleKeyDown = useCallback((event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      commitValue()
      return
    }

    if (event.key === 'Escape') {
      restoreValue()
      onCancel()
    }
  }, [commitValue, onCancel, restoreValue])

  if (isEditing) {
    return (
      <Input
        className="h-7 w-full border-ring bg-muted px-2 py-1 text-left font-mono text-[12px] tabular-nums"
        type="text"
        inputMode="decimal"
        value={editValue}
        onChange={(event) => setEditValue(event.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={commitValue}
        autoFocus
        data-testid="number-input"
      />
    )
  }

  return (
    <button
      type="button"
      className="inline-flex h-6 w-full min-w-0 items-center justify-start overflow-hidden rounded-md border-none bg-muted/60 px-2 text-left font-mono text-[12px] tabular-nums text-foreground transition-colors hover:bg-muted"
      onClick={onStartEdit}
      title={value || 'Click to edit'}
      data-testid="number-display"
    >
      <span className="min-w-0 truncate">{value || '\u2014'}</span>
    </button>
  )
}

export function DateValue({ value, onSave, autoOpen = false, onCancel }: {
  value: string
  onSave: (newValue: string) => void
  autoOpen?: boolean
  onCancel?: () => void
}) {
  const [open, setOpen] = useState(autoOpen)
  const formatted = formatDateValue(value)
  const selectedDate = parseDateValue(value)

  const handleSelect = (day: Date | undefined) => {
    if (day) onSave(dateToISO(day))
    setOpen(false)
  }

  const handleClear = (e: MouseEvent) => {
    e.stopPropagation()
    onSave('')
    setOpen(false)
  }

  return (
    <Popover
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen && !value) onCancel?.()
      }}
    >
      <PopoverTrigger asChild>
        <button
          className={`inline-flex min-w-0 cursor-pointer items-center gap-1 border-none text-left transition-colors hover:opacity-80${formatted ? ' bg-muted text-accent-foreground' : ' bg-transparent text-muted-foreground'}`}
          style={PROPERTY_CHIP_STYLE}
          title={value}
          data-testid="date-display"
        >
          <span className={`min-w-0 truncate${!formatted ? ' text-muted-foreground' : ''}`}>{formatted || 'Pick a date\u2026'}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="end" side="left" data-testid="date-picker-popover">
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={handleSelect}
          defaultMonth={selectedDate}
          data-testid="date-picker-calendar"
        />
        {selectedDate && (
          <div className="border-t px-3 py-2">
            <button
              className="inline-flex items-center gap-1 border-none bg-transparent text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={handleClear}
              data-testid="date-picker-clear"
            >
              <XIcon className="size-3" />
              Clear date
            </button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )
}
