import { Archive, FileText, Sparkle, Tray } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { SidebarSelection } from '../../types'
import { isSelectionActive, NavItem } from '../SidebarParts'

type SidebarNavTone = 'aura' | 'amber' | 'blue' | 'violet'

interface SidebarTopNavProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  showInbox: boolean
  inboxCount: number
  activeCount: number
  archivedCount: number
}

function ToneNavItem({
  active,
  children,
  tone,
}: {
  active: boolean
  children: ReactNode
  tone: SidebarNavTone
}) {
  return (
    <div
      className="sidebar-top-nav__tone"
      data-active={active || undefined}
      data-sidebar-nav-tone={tone}
    >
      {children}
    </div>
  )
}

export function SidebarTopNav({
  selection,
  onSelect,
  showInbox,
  inboxCount,
  activeCount,
  archivedCount,
}: SidebarTopNavProps) {
  const dashboardActive = isSelectionActive(selection, { kind: 'dashboard' })
  const inboxActive = isSelectionActive(selection, { kind: 'filter', filter: 'inbox' })
  const allNotesActive = isSelectionActive(selection, { kind: 'filter', filter: 'all' })
  const archiveActive = isSelectionActive(selection, { kind: 'filter', filter: 'archived' })

  return (
    <div className="border-b border-border" data-testid="sidebar-top-nav" style={{ padding: '4px 6px' }}>
      <ToneNavItem active={dashboardActive} tone="aura">
        <NavItem
          icon={Sparkle}
          label="Dashboard"
          isActive={dashboardActive}
          activeClassName="bg-primary/10 text-primary"
          onClick={() => onSelect({ kind: 'dashboard' })}
        />
      </ToneNavItem>
      {showInbox && (
        <ToneNavItem active={inboxActive} tone="amber">
          <NavItem
            icon={Tray}
            label="Inbox"
            count={inboxCount}
            isActive={inboxActive}
            badgeClassName="text-muted-foreground"
            badgeStyle={{ background: 'var(--muted)' }}
            activeBadgeClassName="bg-primary text-primary-foreground"
            onClick={() => onSelect({ kind: 'filter', filter: 'inbox' })}
          />
        </ToneNavItem>
      )}
      <ToneNavItem active={allNotesActive} tone="blue">
        <NavItem
          icon={FileText}
          label="All Notes"
          count={activeCount}
          isActive={allNotesActive}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          activeBadgeClassName="bg-primary text-primary-foreground"
          onClick={() => onSelect({ kind: 'filter', filter: 'all' })}
        />
      </ToneNavItem>
      <ToneNavItem active={archiveActive} tone="violet">
        <NavItem
          icon={Archive}
          label="Archive"
          count={archivedCount}
          isActive={archiveActive}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          activeBadgeClassName="bg-primary text-primary-foreground"
          onClick={() => onSelect({ kind: 'filter', filter: 'archived' })}
        />
      </ToneNavItem>
    </div>
  )
}
