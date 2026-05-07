import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { CheckCircle2, Circle, ExternalLink, Flag, FolderKanban, Star, Tag, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { VaultEntry } from '../../types'

type FrontmatterValue = string | number | boolean | string[] | null

interface NoteContextMenuParams {
  enabled: boolean
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void> | void
  onOpenInNewWindow?: (entry: VaultEntry) => void
}

type MenuState = { x: number; y: number; entry: VaultEntry } | null
const NOTE_CONTEXT_COLORS = ['yellow', 'green', 'blue', 'red'] as const
const TAG_PROPERTY_KEYS = ['tags', 'tag', 'keywords', 'labels'] as const
const MENU_WIDTH = 216
const MENU_MAX_HEIGHT = 360
const MENU_VIEWPORT_GAP = 8
const NOTE_CONTEXT_COLOR_VALUES: Record<(typeof NOTE_CONTEXT_COLORS)[number], string> = {
  yellow: '#f4c542',
  green: '#4ade80',
  blue: '#60a5fa',
  red: '#f87171',
}

function menuItemClassName(danger = false): string {
  return `h-7 w-full justify-start gap-2 rounded-[5px] px-2 text-left text-xs font-medium ${
    danger ? 'text-destructive hover:text-destructive' : 'text-foreground'
  }`
}

function menuSeparator() {
  return <div className="my-1 h-px bg-border/70" role="none" />
}

function clampMenuPosition(x: number, y: number): { left: number; top: number } {
  if (typeof window === 'undefined') return { left: x, top: y }
  const maxLeft = window.innerWidth - MENU_WIDTH - MENU_VIEWPORT_GAP
  const maxTop = window.innerHeight - MENU_MAX_HEIGHT - MENU_VIEWPORT_GAP
  return {
    left: Math.max(MENU_VIEWPORT_GAP, Math.min(x, maxLeft)),
    top: Math.max(MENU_VIEWPORT_GAP, Math.min(y, maxTop)),
  }
}

function splitTagValue(value: string): string[] {
  return value
    .split(',')
    .map(tag => tag.trim().replace(/^#+/, ''))
    .filter(Boolean)
}

function tagsForEntry(entry: VaultEntry): string[] {
  const tags: string[] = []
  for (const key of TAG_PROPERTY_KEYS) {
    const value = entry.properties[key]
    if (typeof value === 'string') tags.push(...splitTagValue(value))
    if (Array.isArray(value)) {
      for (const item of value) tags.push(...splitTagValue(item))
    }
    if (typeof value === 'number' || typeof value === 'boolean') tags.push(String(value))
  }
  return [...new Set(tags)]
}

function tagsWith(entry: VaultEntry, tag: string): string[] {
  const existingTags = tagsForEntry(entry)
  return existingTags.some(existing => existing.toLowerCase() === tag.toLowerCase())
    ? existingTags
    : [...existingTags, tag]
}

/** Right-click organization actions for normal note-list rows. */
export function useNoteListContextMenu({
  enabled,
  onUpdateFrontmatter,
  onOpenInNewWindow,
}: NoteContextMenuParams) {
  const [menu, setMenu] = useState<MenuState>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const closeMenu = useCallback(() => setMenu(null), [])

  useEffect(() => {
    if (!menu) return
    queueMicrotask(() => {
      menuRef.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus()
    })
    const handleOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) closeMenu()
    }
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeMenu()
    }
    document.addEventListener('mousedown', handleOutside)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handleOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [closeMenu, menu])

  const handleMenuKeyDown = useCallback((event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
    if (items.length === 0) return
    event.preventDefault()
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    const offset = event.key === 'ArrowDown' ? 1 : -1
    const nextIndex = currentIndex < 0
      ? 0
      : (currentIndex + offset + items.length) % items.length
    items[nextIndex]?.focus()
  }, [])

  const handleNoteContextMenu = useCallback((entry: VaultEntry, event: ReactMouseEvent) => {
    if (!enabled || entry.fileKind === 'binary') return
    event.preventDefault()
    event.stopPropagation()
    setMenu({ x: event.clientX, y: event.clientY, entry })
  }, [enabled])

  const update = useCallback(async (key: string, value: FrontmatterValue) => {
    if (!menu?.entry || !onUpdateFrontmatter) return
    const entry = menu.entry
    closeMenu()
    await onUpdateFrontmatter(entry.path, key, value)
  }, [closeMenu, menu, onUpdateFrontmatter])

  const openInNewWindow = useCallback(() => {
    if (!menu?.entry || !onOpenInNewWindow) return
    const entry = menu.entry
    closeMenu()
    onOpenInNewWindow(entry)
  }, [closeMenu, menu, onOpenInNewWindow])
  const menuPosition = menu ? clampMenuPosition(menu.x, menu.y) : null

  const contextMenuNode = menu ? (
    <div
      ref={menuRef}
      className="fixed z-50 max-h-[min(360px,calc(100vh-16px))] w-[216px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-lg border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur"
      style={{ left: menuPosition?.left, top: menuPosition?.top }}
      data-testid="note-context-menu"
      role="menu"
      aria-label={`Actions for ${menu.entry.title}`}
      onKeyDown={handleMenuKeyDown}
    >
      {onOpenInNewWindow && (
        <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName()} onClick={openInNewWindow}>
          <ExternalLink className="size-3.5" />
          Open in new window
        </Button>
      )}
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName()} onClick={() => void update('type', 'Project')} data-testid="note-context-make-project">
        <FolderKanban className="size-3.5" />
        Make project
      </Button>
      {menuSeparator()}
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName()} onClick={() => void update('status', 'Active')}>
        <Circle className="size-3.5" />
        Status: Active
      </Button>
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName()} onClick={() => void update('status', 'Done')}>
        <CheckCircle2 className="size-3.5" />
        Status: Done
      </Button>
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName()} onClick={() => void update('_favorite', !menu.entry.favorite)} data-testid="note-context-toggle-favorite">
        <Star className="size-3.5" />
        {menu.entry.favorite ? 'Remove favorite flag' : 'Favorite flag'}
      </Button>
      {menuSeparator()}
      <div className="grid grid-cols-5 gap-1 px-1 py-0.5" role="group" aria-label="Color flag">
        {NOTE_CONTEXT_COLORS.map(color => (
          <Button
            key={color}
            type="button"
            role="menuitem"
            variant="ghost"
            size="icon"
            className="size-7 rounded-[6px]"
            onClick={() => void update('color', color)}
            data-testid={`note-context-color-${color}`}
            title={`Color: ${color}`}
            aria-label={`Color: ${color}`}
          >
            <span
              className="size-3.5 rounded-full border border-border"
              style={{ backgroundColor: NOTE_CONTEXT_COLOR_VALUES[color] }}
            />
          </Button>
        ))}
        <Button
          type="button"
          role="menuitem"
          variant="ghost"
          size="icon"
          className="size-7 rounded-[6px]"
          onClick={() => void update('color', null)}
          data-testid="note-context-color-clear"
          title="Clear color"
          aria-label="Clear color"
        >
          <X className="size-3.5" />
        </Button>
      </div>
      {menuSeparator()}
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName()} onClick={() => void update('tags', tagsWith(menu.entry, 'todo'))} data-testid="note-context-tag-todo">
        <Flag className="size-3.5" />
        Add #todo
      </Button>
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName()} onClick={() => void update('tags', tagsWith(menu.entry, 'review'))} data-testid="note-context-tag-review">
        <Tag className="size-3.5" />
        Add #review
      </Button>
    </div>
  ) : null

  return {
    contextMenuNode,
    handleNoteContextMenu,
  }
}
