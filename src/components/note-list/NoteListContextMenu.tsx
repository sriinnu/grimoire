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

function menuItemClassName(danger = false, active = false): string {
  return `h-7 w-full justify-start gap-2 rounded-[5px] px-2 text-left text-xs font-medium ${
    danger ? 'text-destructive hover:text-destructive' : 'text-foreground'
  } ${active ? 'bg-accent/70' : ''}`
}

function menuSeparator() {
  return <div className="my-1 h-px bg-border/70" role="none" />
}

function menuSectionLabel(label: string) {
  return (
    <div className="px-2 pb-1 pt-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground" role="presentation">
      {label}
    </div>
  )
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

function statusForEntry(entry: VaultEntry): string {
  const value = entry.status ?? entry.properties.status ?? entry.properties.Status
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function colorForEntry(entry: VaultEntry): string {
  const value = entry.color ?? entry.properties.color ?? entry.properties.Color
  return typeof value === 'string' ? value.toLowerCase() : ''
}

function isProjectEntry(entry: VaultEntry): boolean {
  return entry.isA?.toLowerCase() === 'project'
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
  const activeStatus = menu ? statusForEntry(menu.entry) : ''
  const activeColor = menu ? colorForEntry(menu.entry) : ''
  const projectEntry = menu ? isProjectEntry(menu.entry) : false

  const contextMenuNode = menu ? (
    <div
      ref={menuRef}
      className="grimoire-context-menu-surface fixed z-50 max-h-[min(360px,calc(100vh-16px))] w-[216px] max-w-[calc(100vw-16px)] overflow-y-auto rounded-lg border border-border bg-popover/95 p-1.5 shadow-xl backdrop-blur"
      style={{ left: menuPosition?.left, top: menuPosition?.top }}
      data-testid="note-context-menu"
      role="menu"
      aria-label={`Actions for ${menu.entry.title}`}
      onKeyDown={handleMenuKeyDown}
    >
      <div className="px-2 pb-1 pt-1" role="presentation">
        <div className="truncate text-xs font-semibold text-foreground">{menu.entry.title}</div>
        <div className="text-[10px] font-medium uppercase tracking-[0.12em] text-muted-foreground">Note actions</div>
      </div>
      {menuSeparator()}
      {menuSectionLabel('Open')}
      {onOpenInNewWindow && (
        <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName()} onClick={openInNewWindow}>
          <ExternalLink className="size-3.5" />
          Open in new window
        </Button>
      )}
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName(false, projectEntry)} disabled={projectEntry} onClick={() => void update('type', 'Project')} data-testid="note-context-make-project">
        {projectEntry ? <CheckCircle2 className="size-3.5" /> : <FolderKanban className="size-3.5" />}
        {projectEntry ? 'Already a project' : 'Convert to project'}
      </Button>
      {menuSeparator()}
      {menuSectionLabel('Status')}
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName(false, activeStatus === 'active')} onClick={() => void update('status', 'Active')}>
        {activeStatus === 'active' ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
        Status: Active
      </Button>
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName(false, activeStatus === 'done')} onClick={() => void update('status', 'Done')}>
        {activeStatus === 'done' ? <CheckCircle2 className="size-3.5" /> : <Circle className="size-3.5" />}
        Status: Done
      </Button>
      <Button type="button" role="menuitem" variant="ghost" size="sm" className={menuItemClassName(false, menu.entry.favorite)} onClick={() => void update('_favorite', !menu.entry.favorite)} data-testid="note-context-toggle-favorite">
        <Star className={`size-3.5${menu.entry.favorite ? ' fill-current' : ''}`} />
        {menu.entry.favorite ? 'Remove favorite flag' : 'Favorite flag'}
      </Button>
      {menuSeparator()}
      {menuSectionLabel('Color')}
      <div className="grid grid-cols-5 gap-1 px-1 py-0.5" role="group" aria-label="Color flag">
        {NOTE_CONTEXT_COLORS.map(color => (
          <Button
            key={color}
            type="button"
            role="menuitem"
            variant="ghost"
            size="icon"
            className={`size-7 rounded-[6px] ${activeColor === color ? 'ring-1 ring-primary/70 ring-offset-1 ring-offset-popover' : ''}`}
            onClick={() => void update('color', color)}
            data-testid={`note-context-color-${color}`}
            title={`Color: ${color}`}
            aria-label={`Color: ${color}`}
          >
            <span
              className={`size-3.5 rounded-full border ${activeColor === color ? 'border-foreground/70' : 'border-border'}`}
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
      {menuSectionLabel('Tags')}
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
