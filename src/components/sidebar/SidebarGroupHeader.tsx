import type { ReactNode } from 'react'
import { CaretDown, CaretRight } from '@phosphor-icons/react'
import { SidebarCountPill } from '../SidebarParts'
import { SIDEBAR_GROUP_HEADER_PADDING } from './sidebarStyles'

interface SidebarGroupHeaderProps {
  label: string
  collapsed: boolean
  onToggle: () => void
  count?: number
  actionsOpen?: boolean
  children?: ReactNode
}

export function SidebarGroupHeader({
  label,
  collapsed,
  onToggle,
  count,
  actionsOpen = false,
  children,
}: SidebarGroupHeaderProps) {
  return (
    <div
      className="sidebar-group-header flex w-full items-center justify-between text-muted-foreground"
      data-actions-open={actionsOpen || undefined}
      style={{ padding: count != null ? SIDEBAR_GROUP_HEADER_PADDING.withCount : SIDEBAR_GROUP_HEADER_PADDING.regular }}
    >
      <button
        type="button"
        className="sidebar-group-header__toggle flex min-w-0 flex-1 cursor-pointer select-none items-center gap-1 border-none bg-transparent p-0 text-muted-foreground"
        onClick={onToggle}
      >
        {collapsed ? <CaretRight size={12} /> : <CaretDown size={12} />}
        <span className="text-[10px] font-semibold" style={{ letterSpacing: 0 }}>{label}</span>
      </button>
      {children ? (
        <span className="sidebar-group-header__actions">
          {children}
        </span>
      ) : count != null && (
        <SidebarCountPill count={count} className="text-muted-foreground" compact style={{ background: 'var(--muted)' }} />
      )}
    </div>
  )
}
