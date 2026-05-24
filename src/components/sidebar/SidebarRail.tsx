import { Archive, FileText, Inbox, LayoutDashboard, PanelLeftOpen } from 'lucide-react'
import type { ComponentType } from 'react'
import type { LucideProps } from 'lucide-react'
import grimoireIcon from '@/assets/app-icon.png'
import { Button } from '@/components/ui/button'
import type { SidebarSelection } from '../../types'
import { cn } from '../../lib/utils'
import { isSelectionActive } from '../SidebarParts'

interface SidebarRailProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  onExpand?: () => void
  showInbox: boolean
  inboxCount: number
  activeCount: number
  archivedCount: number
}

interface RailItem {
  label: string
  icon: ComponentType<LucideProps>
  selection: SidebarSelection
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
        active && 'bg-primary/10 text-primary shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--primary)_22%,transparent)]',
      )}
      aria-label={item.label}
      title={item.label}
      data-testid={`sidebar-rail-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
      onClick={() => onSelect(item.selection)}
    >
      <Icon size={18} strokeWidth={active ? 2.5 : 2} />
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
  archivedCount,
}: SidebarRailProps) {
  const items: RailItem[] = [
    {
      label: 'Dashboard',
      icon: LayoutDashboard,
      selection: { kind: 'dashboard' },
    },
    ...(showInbox
      ? [{
          label: 'Inbox',
          icon: Inbox,
          selection: { kind: 'filter', filter: 'inbox' } as SidebarSelection,
          count: inboxCount,
        }]
      : []),
    {
      label: 'All Notes',
      icon: FileText,
      selection: { kind: 'filter', filter: 'all' },
      count: activeCount,
    },
    {
      label: 'Archive',
      icon: Archive,
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
          className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Expand sidebar"
          title="Expand sidebar"
          onClick={onExpand}
        >
          <PanelLeftOpen size={18} />
        </Button>
      )}
    </aside>
  )
}
