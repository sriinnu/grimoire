import { memo, useMemo, useState } from 'react'
import { CaretDown, CaretRight, Hash } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { SidebarSelection } from '../../types'
import { useTagSnapshot } from '../../lib/bodyIndex/tagSnapshot'
import { buildTagTree, type TagTreeNode } from './tagTree'
import { SidebarCountPill } from './SidebarNavItem'
import { SidebarGroupHeader } from './SidebarGroupHeader'
import { isSelectionActive } from './sidebarSelection'
import { SIDEBAR_ROW_RADIUS, SIDEBAR_SECTION_INSET, SIDEBAR_TREE_STEP } from './sidebarStyles'

function TagRow({
  node,
  depth,
  expanded,
  selection,
  onSelect,
  onToggle,
}: {
  node: TagTreeNode
  depth: number
  expanded: Record<string, boolean>
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  onToggle: (tag: string) => void
}) {
  const hasChildren = node.children.length > 0
  const isOpen = expanded[node.tag] ?? true
  const isActive = isSelectionActive(selection, { kind: 'tag', tag: node.tag })
  return (
    <>
      <div
        className={cn(
          'tag-row group flex items-center rounded transition-colors',
          isActive ? 'text-primary' : 'text-foreground hover:bg-accent',
        )}
        data-testid={`tag-row:${node.tag}`}
        data-selected={isActive ? 'true' : 'false'}
        style={{ paddingLeft: 8 + depth * SIDEBAR_TREE_STEP, paddingRight: 8, borderRadius: SIDEBAR_ROW_RADIUS }}
      >
        <button
          type="button"
          className="flex size-5 shrink-0 cursor-pointer items-center justify-center border-none bg-transparent p-0 text-muted-foreground"
          aria-label={isOpen ? `Collapse ${node.tag}` : `Expand ${node.tag}`}
          aria-expanded={hasChildren ? isOpen : undefined}
          onClick={() => onToggle(node.tag)}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
          tabIndex={hasChildren ? 0 : -1}
        >
          {isOpen ? <CaretDown size={12} /> : <CaretRight size={12} />}
        </button>
        <button
          type="button"
          className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 border-none bg-transparent py-1 pr-0 text-left text-[13px] leading-5"
          aria-current={isActive ? 'page' : undefined}
          onClick={() => onSelect({ kind: 'tag', tag: node.tag })}
        >
          <span className="sidebar-row-glyph"><Hash size={14} className="text-muted-foreground" aria-hidden="true" /></span>
          <span className="min-w-0 flex-1 truncate">{node.label}</span>
          <SidebarCountPill count={node.count} compact className="text-muted-foreground" style={{ background: 'var(--muted)' }} />
        </button>
      </div>
      {hasChildren && isOpen ? node.children.map((child) => (
        <TagRow
          key={child.tag}
          node={child}
          depth={depth + 1}
          expanded={expanded}
          selection={selection}
          onSelect={onSelect}
          onToggle={onToggle}
        />
      )) : null}
    </>
  )
}

interface TagsSectionProps {
  selection: SidebarSelection
  onSelect: (selection: SidebarSelection) => void
  collapsed: boolean
  onToggle: () => void
}

/** Every tag in the vault with a count; renders nothing until the body index finds one. */
export const TagsSection = memo(function TagsSection({ selection, onSelect, collapsed, onToggle }: TagsSectionProps) {
  const snapshot = useTagSnapshot()
  const tree = useMemo(() => buildTagTree(snapshot.tags), [snapshot])
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})
  const rootCount = useMemo(() => tree.length, [tree])

  if (tree.length === 0) return null

  return (
    <div className="border-b border-border" style={{ padding: SIDEBAR_SECTION_INSET }} data-testid="sidebar-tags">
      <SidebarGroupHeader label="Tags" collapsed={collapsed} onToggle={onToggle} count={rootCount} />
      <div className="sidebar-section-content" data-collapsed={collapsed || undefined}>
        <div style={{ paddingBottom: 4 }}>
          {!collapsed && tree.map((node) => (
            <TagRow
              key={node.tag}
              node={node}
              depth={0}
              expanded={expanded}
              selection={selection}
              onSelect={onSelect}
              onToggle={(tag) => setExpanded((current) => ({ ...current, [tag]: !(current[tag] ?? true) }))}
            />
          ))}
        </div>
      </div>
    </div>
  )
})
