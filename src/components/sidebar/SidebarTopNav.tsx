import type { ReactNode } from 'react'
import type { SidebarSelection } from '../../types'
import { isSelectionActive, NavItem } from '../SidebarParts'
import {
  ArchiveGlyphIcon,
  DashboardGlyphIcon,
  DreamGlyphIcon,
  InboxGlyphIcon,
  JournalGlyphIcon,
  NotesGlyphIcon,
} from '../icons/sidebarGlyphIcons'

type SidebarNavTone = 'aura' | 'amber' | 'blue' | 'violet'

interface SidebarTopNavProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  showInbox: boolean
  inboxCount: number
  activeCount: number
  noteCount: number
  journalCount: number
  dreamCount: number
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
  noteCount,
  journalCount,
  dreamCount,
  archivedCount,
}: SidebarTopNavProps) {
  const dashboardActive = isSelectionActive(selection, { kind: 'dashboard' })
  const inboxActive = isSelectionActive(selection, { kind: 'filter', filter: 'inbox' })
  const allNotesActive = isSelectionActive(selection, { kind: 'filter', filter: 'all' })
  const notesActive = isSelectionActive(selection, { kind: 'sectionGroup', type: 'Note' })
  const journalActive = isSelectionActive(selection, { kind: 'sectionGroup', type: 'Journal' })
  const dreamsActive = isSelectionActive(selection, { kind: 'sectionGroup', type: 'Dream' })
  const archiveActive = isSelectionActive(selection, { kind: 'filter', filter: 'archived' })

  return (
    <div className="border-b border-border" data-testid="sidebar-top-nav" style={{ padding: '4px 6px' }}>
      <ToneNavItem active={dashboardActive} tone="aura">
        <NavItem
          icon={DashboardGlyphIcon}
          label="Dashboard"
          isActive={dashboardActive}
          activeClassName="bg-primary/10 text-primary"
          onClick={() => onSelect({ kind: 'dashboard' })}
        />
      </ToneNavItem>
      {showInbox && (
        <ToneNavItem active={inboxActive} tone="amber">
          <NavItem
            icon={InboxGlyphIcon}
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
          icon={NotesGlyphIcon}
          label="All Notes"
          count={activeCount}
          isActive={allNotesActive}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          activeBadgeClassName="bg-primary text-primary-foreground"
          onClick={() => onSelect({ kind: 'filter', filter: 'all' })}
        />
      </ToneNavItem>
      <ToneNavItem active={notesActive} tone="blue">
        <NavItem
          icon={NotesGlyphIcon}
          label="Notes"
          count={noteCount}
          isActive={notesActive}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          activeBadgeClassName="bg-primary text-primary-foreground"
          onClick={() => onSelect({ kind: 'sectionGroup', type: 'Note' })}
        />
      </ToneNavItem>
      <ToneNavItem active={journalActive} tone="aura">
        <NavItem
          icon={JournalGlyphIcon}
          label="Journal"
          count={journalCount}
          isActive={journalActive}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          activeBadgeClassName="bg-primary text-primary-foreground"
          onClick={() => onSelect({ kind: 'sectionGroup', type: 'Journal' })}
        />
      </ToneNavItem>
      <ToneNavItem active={dreamsActive} tone="violet">
        <NavItem
          icon={DreamGlyphIcon}
          label="Dreams"
          count={dreamCount}
          isActive={dreamsActive}
          badgeClassName="text-muted-foreground"
          badgeStyle={{ background: 'var(--muted)' }}
          activeBadgeClassName="bg-primary text-primary-foreground"
          onClick={() => onSelect({ kind: 'sectionGroup', type: 'Dream' })}
        />
      </ToneNavItem>
      <ToneNavItem active={archiveActive} tone="violet">
        <NavItem
          icon={ArchiveGlyphIcon}
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
