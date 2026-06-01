import type React from 'react'
import { cn } from '@/lib/utils'
import type { CommandAction, CommandGroup } from '../hooks/useCommandRegistry'
import { formatDroppedPathList } from './inlineWikilinkDropText'
import { Input } from './ui/input'
import { useNativePathDrop } from './useNativePathDrop'

/** Localized shortcut strings displayed in the command-palette footer. */
export interface CommandPaletteFooterText {
  aiMode: string
  navigate: string
  select: string
  send: string
  close: string
}

function inputSelectionRange(input: HTMLInputElement, fallbackIndex: number) {
  const start = input.selectionStart ?? fallbackIndex
  const end = input.selectionEnd ?? start
  return {
    start: Math.max(0, start),
    end: Math.max(start, end),
  }
}

/** Command-palette text field with native path-drop insertion support. */
export function CommandPaletteInput({
  inputRef,
  query,
  onChange,
  placeholder,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  query: string
  onChange: (value: string) => void
  placeholder: string
}) {
  const insertNativePathDrop = (paths: string[]) => {
    const droppedPathText = formatDroppedPathList(paths)
    const input = inputRef.current
    if (!droppedPathText || !input) return

    const { start, end } = inputSelectionRange(input, query.length)
    const nextValue = `${query.slice(0, start)}${droppedPathText}${query.slice(end)}`
    const nextCursor = start + droppedPathText.length

    onChange(nextValue)
    window.requestAnimationFrame(() => {
      input.focus()
      input.setSelectionRange(nextCursor, nextCursor)
    })
  }

  useNativePathDrop({
    targetRef: inputRef,
    onPathDrop: insertNativePathDrop,
  })

  return (
    <Input
      ref={inputRef}
      className="h-auto rounded-none border-x-0 border-t-0 border-b border-border bg-transparent px-4 py-3 text-[15px] text-foreground shadow-none transition-none outline-none placeholder:text-muted-foreground focus-visible:border-border focus-visible:ring-0 md:text-[15px]"
      type="text"
      placeholder={placeholder}
      value={query}
      spellCheck={false}
      autoCorrect="off"
      autoCapitalize="off"
      autoComplete="off"
      onChange={(event) => onChange(event.target.value)}
    />
  )
}

/** Grouped command list for keyboard and pointer selection. */
export function CommandPaletteResults({
  groups,
  selectedIndex,
  listRef,
  emptyText,
  onHover,
  onSelect,
}: {
  groups: { group: CommandGroup; items: CommandAction[] }[]
  selectedIndex: number
  listRef: React.RefObject<HTMLDivElement | null>
  emptyText: string
  onHover: (index: number) => void
  onSelect: (command: CommandAction) => void
}) {
  const flatList = groups.flatMap((group) => group.items)

  if (flatList.length === 0) {
    return (
      <div className="flex-1 overflow-y-auto py-1" ref={listRef}>
        <div className="px-4 py-6 text-center text-[13px] text-muted-foreground">
          {emptyText}
        </div>
      </div>
    )
  }

  const sections = groups.reduce<Array<{ group: CommandGroup; items: CommandAction[]; startIndex: number }>>(
    (acc, group) => {
      const previous = acc.at(-1)
      acc.push({
        ...group,
        startIndex: previous ? previous.startIndex + previous.items.length : 0,
      })
      return acc
    },
    [],
  )

  return (
    <div className="flex-1 overflow-y-auto py-1" ref={listRef}>
      {sections.map(({ group, items, startIndex }) => {
        return (
          <div key={group}>
            <div className="px-4 pb-1 pt-2 text-[11px] font-medium text-muted-foreground">
              {group}
            </div>
            {items.map((command, index) => {
              const globalIndex = startIndex + index
              return (
                <CommandRow
                  key={command.id}
                  command={command}
                  selected={globalIndex === selectedIndex}
                  onHover={() => onHover(globalIndex)}
                  onSelect={() => onSelect(command)}
                />
              )
            })}
          </div>
        )
      })}
    </div>
  )
}

/** Footer shortcut legend for command and AI modes. */
export function CommandPaletteFooter({
  aiMode,
  aiAgentLabel = 'Claude Code',
  footerText,
}: {
  aiMode: boolean
  aiAgentLabel?: string
  footerText: CommandPaletteFooterText
}) {
  return (
    <div className="flex items-center gap-4 border-t border-border px-4 py-1.5 text-[11px] text-muted-foreground">
      <span>{aiMode ? footerText.aiMode.replace('{agent}', aiAgentLabel) : footerText.navigate}</span>
      <span>{aiMode ? footerText.send : footerText.select}</span>
      <span>{footerText.close}</span>
    </div>
  )
}

function CommandRow({
  command,
  selected,
  onHover,
  onSelect,
}: {
  command: CommandAction
  selected: boolean
  onHover: () => void
  onSelect: () => void
}) {
  return (
    <div
      data-selected={selected}
      className={cn(
        'mx-1 flex cursor-pointer items-center justify-between rounded-md px-3 py-1.5 transition-colors',
        selected ? 'bg-accent' : 'hover:bg-secondary',
      )}
      onClick={onSelect}
      onMouseEnter={onHover}
    >
      <span className="text-sm text-foreground">{command.label}</span>
      {command.shortcut && (
        <span className="text-[11px] text-muted-foreground">{command.shortcut}</span>
      )}
    </div>
  )
}
