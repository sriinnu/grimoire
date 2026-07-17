import type { CSSProperties, PointerEvent as ReactPointerEvent } from 'react'
import { cn } from '@/lib/utils'
import { truncateGraphLabel, type PositionedGraphNode } from '../utils/graphDisplay'

interface GraphNodeProps {
  labelVisible: boolean
  localOnly: boolean
  node: PositionedGraphNode
  highlighted?: boolean
  focusDimmed?: boolean
  onNodePointerDown?: (node: PositionedGraphNode, event: ReactPointerEvent) => void
  onOpenNode: (path: string) => void
  onSelectNode: (node: PositionedGraphNode) => void
  selected: boolean
}

/** A document node. Privacy is a local visual state, never an agent-package badge. */
export function GraphNode({
  labelVisible,
  localOnly,
  node,
  highlighted,
  focusDimmed,
  onNodePointerDown,
  onOpenNode,
  onSelectNode,
  selected,
}: GraphNodeProps) {
  const radius = node.active ? 23 : Math.min(19, 10 + node.degree * 1.7)
  const dimmed = !node.neighborhood && !node.active
  const label = truncateGraphLabel(node.title)
  const labelWidth = Math.min(176, Math.max(64, label.length * 8.2 + 24))
  const typeWidth = Math.min(124, Math.max(56, node.type.length * 7 + 20))
  const style = { '--node-color': node.color, '--node-fill': node.lightColor } as CSSProperties
  const localBadge = { x: node.x - radius + 2, y: node.y - radius + 2 }
  const degreeBadge = { x: node.x + radius - 2, y: node.y - radius + 2 }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Select ${node.title}${localOnly ? ', private/local' : ''}`}
      aria-pressed={selected}
      onPointerDown={(event) => onNodePointerDown?.(node, event)}
      onClick={() => onSelectNode(node)}
      onDoubleClick={(event) => { event.stopPropagation(); onOpenNode(node.path) }}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectNode(node)
        }
      }}
      data-testid="graph-node"
      data-label-visible={labelVisible ? 'true' : 'false'}
      data-highlighted={highlighted ? 'true' : undefined}
      data-focus-dim={focusDimmed ? 'true' : undefined}
      className={cn(
        'grimoire-graph-node cursor-pointer',
        node.active && 'grimoire-graph-node--active',
        localOnly && 'grimoire-graph-node--local',
        selected && 'grimoire-graph-node--selected',
        highlighted && 'grimoire-graph-node--highlighted',
        dimmed && 'opacity-70',
      )}
      style={style}
    >
      <title>{localOnly ? `${node.title} - private/local` : node.title}</title>
      <desc>{localOnly ? 'Private/local document relationship node.' : 'Document relationship node.'}</desc>
      {node.active || selected ? <circle className="grimoire-graph-node-halo" cx={node.x} cy={node.y} r={selected ? 42 : 36} /> : null}
      <circle
        className="grimoire-graph-node-core"
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={node.active ? 'var(--node-color)' : 'var(--node-fill)'}
        stroke="var(--node-color)"
        strokeWidth={node.active || selected ? 3 : 1.7}
        vectorEffect="non-scaling-stroke"
      />
      <circle
        cx={node.x - radius * 0.35}
        cy={node.y - radius * 0.38}
        r={Math.max(2.6, radius * 0.18)}
        fill="color-mix(in srgb, var(--node-color) 18%, var(--surface-editor))"
      />
      {localOnly ? <LocalBadge position={localBadge} /> : null}
      <NodeLabel label={label} labelWidth={labelWidth} node={node} selected={selected} typeWidth={typeWidth} visible={labelVisible} />
      {node.degree > 0 ? <DegreeBadge count={node.degree} position={degreeBadge} /> : null}
    </g>
  )
}

function LocalBadge({ position }: { position: { x: number; y: number } }) {
  return (
    <g className="grimoire-graph-node-local-badge" aria-hidden="true" data-testid="graph-node-local-badge">
      <circle cx={position.x} cy={position.y} r="10" />
      <rect x={position.x - 4} y={position.y - 1} width="8" height="6" rx="1.8" fill="none" stroke="var(--foreground)" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
      <path d={`M ${position.x - 3.2} ${position.y - 1} v -2.2 a 3.2 3.2 0 0 1 6.4 0 v 2.2`} fill="none" stroke="var(--foreground)" strokeLinecap="round" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </g>
  )
}

function NodeLabel({ label, labelWidth, node, selected, typeWidth, visible }: { label: string; labelWidth: number; node: PositionedGraphNode; selected: boolean; typeWidth: number; visible: boolean }) {
  const emphasized = node.active || selected
  return (
    <g className={cn('grimoire-graph-node-label', !visible && 'grimoire-graph-node-label--quiet')}>
      <rect className="grimoire-graph-node-title-backdrop" x={node.x - labelWidth / 2} y={node.y + 25} width={labelWidth} height="25" rx="12.5" />
      <text x={node.x} y={node.y + 38} textAnchor="middle" fill="var(--foreground)" fontSize="16" fontWeight={emphasized ? 720 : 600} pointerEvents="none">{label}</text>
      {emphasized ? (
        <>
          <rect className="grimoire-graph-node-type-pill" x={node.x - typeWidth / 2} y={node.y + 45} width={typeWidth} height="20" rx="10" />
          <text x={node.x} y={node.y + 59} textAnchor="middle" fill="var(--muted-foreground)" fontSize="12" pointerEvents="none">{node.type}</text>
        </>
      ) : null}
    </g>
  )
}

function DegreeBadge({ count, position }: { count: number; position: { x: number; y: number } }) {
  return (
    <g className="grimoire-graph-node-degree-badge" aria-hidden="true">
      <circle cx={position.x} cy={position.y} r="10" />
      <text x={position.x} y={position.y + 4} textAnchor="middle" fontSize="10" fontWeight="720" pointerEvents="none">{Math.min(count, 99)}</text>
    </g>
  )
}
