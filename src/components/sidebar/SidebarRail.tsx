import type { ComponentType } from 'react'
import { MagnifyingGlass, type IconProps } from '@phosphor-icons/react'
import grimoireIcon from '@/assets/app-icon.png'
import { Button } from '@/components/ui/button'
import type { SidebarSelection } from '../../types'
import { cn } from '../../lib/utils'
import { isSelectionActive } from '../SidebarParts'
import {
  ArchiveGlyphIcon,
  DashboardGlyphIcon,
  DreamGlyphIcon,
  InboxGlyphIcon,
  JournalGlyphIcon,
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
  onOpenSearch?: () => void
}

interface RailItem {
  label: string
  icon: ComponentType<IconProps>
  selection: SidebarSelection
  tone: 'aura' | 'amber' | 'blue' | 'violet'
  count?: number
}

function RailCount({ count, active }: { count?: number; active: boolean }) {
  if (!count || count < 1) return null

  return (
    <span
      className={cn(
        'absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-semibold leading-none',
        active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
      )}
      data-testid="sidebar-rail-count"
    >
      {count > 99 ? '99+' : count}
    </span>
  )
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
        active && 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_22%,transparent)]',
      )}
      aria-label={item.label}
      title={item.label}
      data-active={active ? 'true' : 'false'}
      data-sidebar-rail-tone={item.tone}
      data-testid={`sidebar-rail-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={() => onSelect(item.selection)}
    >
      <span className="sidebar-rail__glyph" data-active={active ? 'true' : 'false'}>
        <span className="sidebar-rail__signal" />
        <span className="sidebar-rail__bead sidebar-rail__bead--near" />
        <span className="sidebar-rail__bead sidebar-rail__bead--far" />
        <Icon size={21} weight={active ? 'duotone' : 'regular'} />
      </span>
      <RailCount count={item.count} active={active} />
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
  inboxCount,
  activeCount,
  noteCount,
  journalCount,
  dreamCount,
  archivedCount,
  onOpenSearch,
}: SidebarRailProps) {
  const items: RailItem[] = [
    {
      label: 'Dashboard',
      icon: DashboardGlyphIcon,
      tone: 'aura',
      selection: { kind: 'dashboard' },
    },
    ...(showInbox
      ? [{
          label: 'Inbox',
          icon: InboxGlyphIcon,
          tone: 'amber' as const,
          selection: { kind: 'filter', filter: 'inbox' } as SidebarSelection,
          count: inboxCount,
        }]
      : []),
    {
      label: 'All Notes',
      icon: NotesGlyphIcon,
      tone: 'blue',
      selection: { kind: 'filter', filter: 'all' },
      count: activeCount,
    },
    {
      label: 'Notes',
      icon: NotesGlyphIcon,
      tone: 'blue',
      selection: { kind: 'sectionGroup', type: 'Note' },
      count: noteCount,
    },
    {
      label: 'Journal',
      icon: JournalGlyphIcon,
      tone: 'aura',
      selection: { kind: 'sectionGroup', type: 'Journal' },
      count: journalCount,
    },
    {
      label: 'Dreams',
      icon: DreamGlyphIcon,
      tone: 'violet',
      selection: { kind: 'sectionGroup', type: 'Dream' },
      count: dreamCount,
    },
    {
      label: 'Archive',
      icon: ArchiveGlyphIcon,
      tone: 'violet',
      selection: { kind: 'filter', filter: 'archived' },
      count: archivedCount,
    },
  ]

  return (
    <aside
      className="app-sidebar-rail flex h-full flex-col items-center border-r border-[var(--sidebar-border)] bg-sidebar px-2 pb-3 pt-[72px] text-sidebar-foreground"
      data-testid="sidebar-rail"
      aria-label="Collapsed sidebar"
    >
      <div className="app-sidebar-rail__mark mb-5 grid h-10 w-10 place-items-center rounded-xl border border-border bg-background shadow-xs">
        <img
          src={grimoireIcon}
          alt="Grimoire icon"
          className="h-8 w-8 rounded-lg object-cover"
        />
      </div>
      {onOpenSearch && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="mb-3 h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sidebar-rail__tone"
          aria-label="Search open vaults"
          title="Search open vaults"
          data-sidebar-rail-tone="blue"
          data-testid="sidebar-rail-search"
          onClick={onOpenSearch}
        >
          <span className="sidebar-rail__glyph" data-active="false">
            <span className="sidebar-rail__signal" />
            <span className="sidebar-rail__bead sidebar-rail__bead--near" />
            <span className="sidebar-rail__bead sidebar-rail__bead--far" />
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
            <span className="sidebar-rail__signal" />
            <span className="sidebar-rail__bead sidebar-rail__bead--near" />
            <span className="sidebar-rail__bead sidebar-rail__bead--far" />
            <SidebarExpandGlyphIcon size={21} weight="regular" />
          </span>
        </Button>
      )}
    </aside>
  )
}
