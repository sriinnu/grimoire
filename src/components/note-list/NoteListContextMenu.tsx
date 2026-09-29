import { useCallback, useEffect, useRef, useState, type KeyboardEvent as ReactKeyboardEvent, type MouseEvent as ReactMouseEvent } from 'react'
import { Check, ExternalLink, FolderInput, FolderKanban, FolderOpen, Star, Tag } from 'lucide-react'
import { MenuItem } from './NoteListContextMenuItem'
import { clampFixedMenuPosition } from '@/lib/fixedMenuPosition'
import { revealInFileManagerLabel } from '@/utils/platform'
import type { VaultEntry } from '../../types'
import './NoteListContextMenu.css'

type FrontmatterValue = string | number | boolean | string[] | null

interface NoteContextMenuParams {
  enabled: boolean
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void> | void
  onOpenInNewWindow?: (entry: VaultEntry) => void
  onMoveToFolder?: (entry: VaultEntry) => void
  onRevealInFinder?: (entry: VaultEntry) => void
}

type MenuState = { x: number; y: number; entry: VaultEntry } | null
const NOTE_CONTEXT_COLORS = ['yellow', 'green', 'blue', 'red'] as const
const TAG_PROPERTY_KEYS = ['tags', 'tag', 'keywords', 'labels'] as const
const MENU_WIDTH = 224
const MENU_MAX_HEIGHT = 320
const MENU_VIEWPORT_GAP = 8
/* The same accent tokens the note rows use for their chips, so a flag looks the same everywhere. */
const NOTE_CONTEXT_COLOR_VALUES: Record<(typeof NOTE_CONTEXT_COLORS)[number], string> = {
  yellow: 'var(--accent-yellow)',
  green: 'var(--accent-green)',
  blue: 'var(--accent-blue)',
  red: 'var(--accent-red)',
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
  onMoveToFolder,
  onRevealInFinder,
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
    const vertical = event.key === 'ArrowDown' || event.key === 'ArrowUp'
    const horizontal = event.key === 'ArrowRight' || event.key === 'ArrowLeft'
    if (!vertical && !horizontal) return
    const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? [])
    if (items.length === 0) return
    event.preventDefault()
    const currentIndex = items.indexOf(document.activeElement as HTMLButtonElement)
    const forward = event.key === 'ArrowDown' || event.key === 'ArrowRight'
    const nextIndex = currentIndex < 0 ? 0 : (currentIndex + (forward ? 1 : -1) + items.length) % items.length
    items[nextIndex]?.focus()
  }, [])

  const handleNoteContextMenu = useCallback((entry: VaultEntry, event: ReactMouseEvent) => {
    if (!enabled || entry.fileKind === 'binary') return
    event.preventDefault()
    setMenu({ x: event.clientX, y: event.clientY, entry })
  }, [enabled])

  const update = useCallback(async (key: string, value: FrontmatterValue) => {
    if (!menu?.entry || !onUpdateFrontmatter) return
    const entry = menu.entry
    closeMenu()
    await onUpdateFrontmatter(entry.path, key, value)
  }, [closeMenu, menu, onUpdateFrontmatter])

  const withEntry = useCallback((action?: (entry: VaultEntry) => void) => () => {
    if (!menu?.entry || !action) return
    const entry = menu.entry
    closeMenu()
    action(entry)
  }, [closeMenu, menu])

  const menuPosition = menu ? clampFixedMenuPosition(menu.x, menu.y, {
    width: MENU_WIDTH,
    height: MENU_MAX_HEIGHT,
    gap: MENU_VIEWPORT_GAP,
  }) : null
  const activeStatus = menu ? statusForEntry(menu.entry) : ''
  const activeColor = menu ? colorForEntry(menu.entry) : ''
  const projectEntry = menu ? isProjectEntry(menu.entry) : false

  const contextMenuNode = menu ? (
    <div
      ref={menuRef}
      className="note-menu grimoire-context-menu-surface"
      style={{ left: menuPosition?.left, top: menuPosition?.top, width: MENU_WIDTH }}
      data-testid="note-context-menu"
      role="menu"
      aria-label={`Actions for ${menu.entry.title}`}
      onKeyDown={handleMenuKeyDown}
    >
      <div className="note-menu__title" role="presentation">{menu.entry.title}</div>

      {onOpenInNewWindow ? (
        <MenuItem icon={<ExternalLink />} label="Open in new window" onSelect={withEntry(onOpenInNewWindow)} />
      ) : null}
      {onMoveToFolder ? (
        <MenuItem icon={<FolderInput />} label="Move to…" onSelect={withEntry(onMoveToFolder)} testId="note-context-move-to-folder" />
      ) : null}
      {onRevealInFinder ? (
        <MenuItem icon={<FolderOpen />} label={revealInFileManagerLabel()} onSelect={withEntry(onRevealInFinder)} testId="note-context-reveal-in-finder" />
      ) : null}
      <MenuItem
        icon={<FolderKanban />}
        label={projectEntry ? 'Already a project' : 'Convert to project'}
        disabled={projectEntry}
        onSelect={() => void update('type', 'Project')}
        testId="note-context-make-project"
      />

      <div className="note-menu__separator" role="none" />

      <MenuItem label="Active" checked={activeStatus === 'active'} onSelect={() => void update('status', 'Active')} testId="note-context-status-active" />
      <MenuItem label="Done" checked={activeStatus === 'done'} onSelect={() => void update('status', 'Done')} testId="note-context-status-done" />
      <MenuItem
        icon={<Star className={menu.entry.favorite ? 'fill-current' : undefined} />}
        label={menu.entry.favorite ? 'Remove from favorites' : 'Add to favorites'}
        onSelect={() => void update('_favorite', !menu.entry.favorite)}
        testId="note-context-toggle-favorite"
      />

      <div className="note-menu__separator" role="none" />

      <div className="note-menu__colors" role="group" aria-label="Color flag">
        {NOTE_CONTEXT_COLORS.map(color => (
          <button
            key={color}
            type="button"
            role="menuitemradio"
            aria-checked={activeColor === color}
            aria-label={`${color[0].toUpperCase()}${color.slice(1)} flag`}
            className="note-menu__swatch"
            data-active={activeColor === color ? 'true' : undefined}
            style={{ ['--swatch' as string]: NOTE_CONTEXT_COLOR_VALUES[color] }}
            onClick={() => void update('color', color)}
            data-testid={`note-context-color-${color}`}
          >
            {activeColor === color ? <Check className="note-menu__swatch-check" aria-hidden="true" /> : null}
          </button>
        ))}
        <button
          type="button"
          role="menuitemradio"
          aria-checked={activeColor === ''}
          aria-label="No flag"
          className="note-menu__swatch note-menu__swatch--none"
          data-active={activeColor === '' ? 'true' : undefined}
          onClick={() => void update('color', null)}
          data-testid="note-context-color-clear"
        >
          {activeColor === '' ? <Check className="note-menu__swatch-check" aria-hidden="true" /> : null}
        </button>
      </div>

      <div className="note-menu__separator" role="none" />

      <MenuItem icon={<Tag />} label="Tag #todo" onSelect={() => void update('tags', tagsWith(menu.entry, 'todo'))} testId="note-context-tag-todo" />
      <MenuItem icon={<Tag />} label="Tag #review" onSelect={() => void update('tags', tagsWith(menu.entry, 'review'))} testId="note-context-tag-review" />
    </div>
  ) : null

  return {
    contextMenuNode,
    handleNoteContextMenu,
  }
}
