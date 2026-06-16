import type { ReactNode } from 'react'
import type { SidebarSelection } from '../../types'
import { isSelectionActive, NavItem } from '../SidebarParts'
import {
  ArchiveGlyphIcon,
  DreamGlyphIcon,
  GraphGlyphIcon,
  InboxGlyphIcon,
  JournalGlyphIcon,
  NotebookGlyphIcon,
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
  onOpenGraph?: () => void
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
  onOpenGraph,
  showInbox,
}: SidebarTopNavProps) {
  const dashboardActive = isSelectionActive(selection, { kind: 'dashboard' })
  const inboxActive = isSelectionActive(selection, { kind: 'filter', filter: 'inbox' })
  const pagesActive = isSelectionActive(selection, { kind: 'filter', filter: 'all' })
  const journalActive = isSelectionActive(selection, { kind: 'sectionGroup', type: 'Journal' })
  const dreamsActive = isSelectionActive(selection, { kind: 'sectionGroup', type: 'Dream' })
  const archiveActive = isSelectionActive(selection, { kind: 'filter', filter: 'archived' })

  return (
    <div className="border-b border-border" data-testid="sidebar-top-nav" style={{ padding: '4px 6px' }}>
      <ToneNavItem active={dashboardActive} tone="aura">
        <NavItem
          icon={NotebookGlyphIcon}
          label="Notebook"
          isActive={dashboardActive}
          onClick={() => onSelect({ kind: 'dashboard' })}
        />
      </ToneNavItem>
      {showInbox && (
        <ToneNavItem active={inboxActive} tone="amber">
          <NavItem
            icon={InboxGlyphIcon}
            label="Inbox"
            isActive={inboxActive}
            onClick={() => onSelect({ kind: 'filter', filter: 'inbox' })}
          />
        </ToneNavItem>
      )}
      <ToneNavItem active={pagesActive} tone="blue">
        <NavItem
          icon={NotesGlyphIcon}
          label="Pages"
          isActive={pagesActive}
          onClick={() => onSelect({ kind: 'filter', filter: 'all' })}
        />
      </ToneNavItem>
      {onOpenGraph && (
        <ToneNavItem active={false} tone="blue">
          <NavItem
            icon={GraphGlyphIcon}
            label="Graph"
            isActive={false}
            onClick={onOpenGraph}
          />
        </ToneNavItem>
      )}
      <ToneNavItem active={journalActive} tone="aura">
        <NavItem
          icon={JournalGlyphIcon}
          label="Journal"
          isActive={journalActive}
          onClick={() => onSelect({ kind: 'sectionGroup', type: 'Journal' })}
        />
      </ToneNavItem>
      <ToneNavItem active={dreamsActive} tone="violet">
        <NavItem
          icon={DreamGlyphIcon}
          label="Dreams"
          isActive={dreamsActive}
          onClick={() => onSelect({ kind: 'sectionGroup', type: 'Dream' })}
        />
      </ToneNavItem>
      <ToneNavItem active={archiveActive} tone="violet">
        <NavItem
          icon={ArchiveGlyphIcon}
          label="Archive"
          isActive={archiveActive}
          onClick={() => onSelect({ kind: 'filter', filter: 'archived' })}
        />
      </ToneNavItem>
    </div>
  )
}
