import type { SidebarSelection } from '../../types'

export function isSelectionActive(current: SidebarSelection, check: SidebarSelection): boolean {
  if (current.kind !== check.kind) return false
  switch (check.kind) {
    case 'dashboard': return true
    case 'filter': return (current as typeof check).filter === check.filter
    case 'sectionGroup': return (current as typeof check).type === check.type
    case 'folder': return (current as typeof check).path === check.path
    case 'entity': return (current as typeof check).entry.path === check.entry.path
    case 'view': return (current as typeof check).filename === check.filename
    default: return false
  }
}
