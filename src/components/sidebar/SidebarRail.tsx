import type { ComponentType } from 'react'
import { MagnifyingGlass, type IconProps } from '@phosphor-icons/react'
import { Button } from '@/components/ui/button'
import type { SidebarSelection } from '../../types'
import { cn } from '../../lib/utils'
import { isSelectionActive } from '../SidebarParts'
import grimoireLogo from '@/assets/app-icon.png'
import {
  ArchiveGlyphIcon,
  DreamGlyphIcon,
  GraphGlyphIcon,
  InboxGlyphIcon,
  JournalGlyphIcon,
  NotebookGlyphIcon,
  NotesGlyphIcon,
  SidebarExpandGlyphIcon,
} from '../icons/sidebarGlyphIcons'

interface SidebarRailProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  onExpand?: () => void
  showInbox: boolean
  inboxCount: number
  activeCount: number
  noteCount: number
  journalCount: number
  dreamCount: number
  archivedCount: number
  onOpenSearch?: (initialQuery?: string) => void
  onOpenGraph?: () => void
}

interface RailItem {
  label: string
  icon: ComponentType<IconProps>
  selection: SidebarSelection
  tone: 'aura' | 'amber' | 'blue' | 'violet'
}

function RailButton({
  item,
  active,
  onSelect,
}: {
  item: RailItem
  active: boolean
  onSelect: (selection: SidebarSelection) => void
}) {
  const Icon = item.icon

  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={cn(
        'relative h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground',
        'sidebar-rail__tone',
        active && 'text-foreground',
      )}
      aria-label={item.label}
      title={item.label}
      data-active={active ? 'true' : 'false'}
      data-sidebar-rail-tone={item.tone}
      data-testid={`sidebar-rail-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={() => onSelect(item.selection)}
    >
      <span className="sidebar-rail__glyph" data-active={active ? 'true' : 'false'}>
        <Icon size={22} weight={active ? 'duotone' : 'regular'} />
      </span>
    </Button>
  )
}

/**
 * Compact icon rail for the primary sidebar when the left column is collapsed.
 */
export function SidebarRail({
  selection,
  onSelect,
  onExpand,
  showInbox,
  onOpenSearch,
  onOpenGraph,
}: SidebarRailProps) {
  const items: RailItem[] = [
    {
      label: 'Notebook',
      icon: NotebookGlyphIcon,
      tone: 'aura',
      selection: { kind: 'dashboard' },
    },
    ...(showInbox
      ? [{
          label: 'Inbox',
          icon: InboxGlyphIcon,
          tone: 'amber' as const,
          selection: { kind: 'filter', filter: 'inbox' } as SidebarSelection,
        }]
      : []),
    {
      label: 'Pages',
      icon: NotesGlyphIcon,
      tone: 'blue',
      selection: { kind: 'filter', filter: 'all' },
    },
    {
      label: 'Journal',
      icon: JournalGlyphIcon,
      tone: 'aura',
      selection: { kind: 'sectionGroup', type: 'Journal' },
    },
    {
      label: 'Dreams',
      icon: DreamGlyphIcon,
      tone: 'violet',
      selection: { kind: 'sectionGroup', type: 'Dream' },
    },
    {
      label: 'Archive',
      icon: ArchiveGlyphIcon,
      tone: 'violet',
      selection: { kind: 'filter', filter: 'archived' },
    },
  ]

  return (
    <aside
      className="app-sidebar-rail flex h-full flex-col items-center border-r border-[var(--sidebar-border)] bg-sidebar px-2 pb-3 text-sidebar-foreground"
      style={{ paddingTop: 'var(--sidebar-rail-safe-top)' }}
      data-testid="sidebar-rail"
      aria-label="Collapsed sidebar"
    >
      <div className="app-sidebar-rail__mark mb-5 grid h-10 w-10 place-items-center overflow-hidden rounded-xl">
        <img src={grimoireLogo} alt="Grimoire" className="h-full w-full object-cover" draggable={false} />
      </div>
      {onOpenSearch && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mb-3 h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sidebar-rail__tone"
          aria-label="Open notebook search"
          title="Open notebook search"
          data-sidebar-rail-tone="blue"
          data-testid="sidebar-rail-search"
          onClick={() => onOpenSearch()}
        >
          <span className="sidebar-rail__glyph" data-active="false">
            <MagnifyingGlass size={21} weight="regular" />
          </span>
        </Button>
      )}
      <nav className="flex flex-1 flex-col items-center gap-2" aria-label="Primary sidebar shortcuts">
        {items.map((item) => (
          <RailButton
            key={item.label}
            item={item}
            active={isSelectionActive(selection, item.selection)}
            onSelect={onSelect}
          />
        ))}
        {onOpenGraph && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="relative h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sidebar-rail__tone"
            aria-label="Graph"
            title="Graph"
            data-active="false"
            data-sidebar-rail-tone="blue"
            data-testid="sidebar-rail-graph"
            onClick={onOpenGraph}
          >
            <span className="sidebar-rail__glyph" data-active="false">
            <GraphGlyphIcon size={22} weight="regular" />
            </span>
          </Button>
        )}
      </nav>
      {onExpand && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sidebar-rail__tone"
          aria-label="Expand sidebar"
          title="Expand sidebar"
          data-sidebar-rail-tone="aura"
          onClick={onExpand}
        >
          <span className="sidebar-rail__glyph" data-active="false">
            <SidebarExpandGlyphIcon size={22} weight="regular" />
          </span>
        </Button>
      )}
    </aside>
  )
}
