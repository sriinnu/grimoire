import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import {
  truncateGraphLabel,
  type PositionedGraphNode,
} from '../utils/graphDisplay'

interface GraphNodeProps {
  localOnly: boolean
  node: PositionedGraphNode
  onOpenNode: (path: string) => void
  onSelectNode: (node: PositionedGraphNode) => void
  selected: boolean
  sourceSafe: boolean
}

interface BadgePosition {
  x: number
  y: number
}

/** Source-safe graph node with local-only, agent-package, and relationship badges. */
export function GraphNode({
  localOnly,
  node,
  onOpenNode,
  onSelectNode,
  selected,
  sourceSafe,
}: GraphNodeProps) {
  const radius = node.active ? 23 : Math.min(19, 10 + node.degree * 1.7)
  const dimmed = !node.neighborhood && !node.active
  const label = truncateGraphLabel(node.title)
  const labelWidth = Math.min(176, Math.max(64, label.length * 8.2 + 24))
  const typeWidth = Math.min(124, Math.max(56, node.type.length * 7 + 20))
  const style = { '--node-color': node.color, '--node-fill': node.lightColor } as CSSProperties
  const councilBadge = { x: node.x + radius - 2, y: node.y + radius - 2 }
  const localBadge = { x: node.x - radius + 2, y: node.y - radius + 2 }
  const degreeBadge = { x: node.x + radius - 2, y: node.y - radius + 2 }

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={nodeAriaLabel(node.title, localOnly)}
      aria-pressed={selected}
      onClick={() => onSelectNode(node)}
      onDoubleClick={() => onOpenNode(node.path)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelectNode(node)
        }
      }}
      data-testid="graph-node"
      className={cn(
        'grimoire-graph-node cursor-pointer',
        node.active && 'grimoire-graph-node--active',
        localOnly && 'grimoire-graph-node--local',
        selected && 'grimoire-graph-node--selected',
        sourceSafe && 'grimoire-graph-node--source-safe',
        dimmed && 'opacity-70',
      )}
      style={style}
    >
      <title>{nodeTitle(node.title, { localOnly, sourceSafe })}</title>
      <desc>{nodeDescription({ localOnly, sourceSafe })}</desc>
      {sourceSafe && !localOnly ? (
        <circle className="grimoire-graph-node-package-orbit" cx={node.x} cy={node.y} r={radius + 10} />
      ) : null}
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
      {sourceSafe && !localOnly ? <CouncilBadge position={councilBadge} /> : null}
      <NodeLabel
        label={label}
        labelWidth={labelWidth}
        node={node}
        selected={selected}
        typeWidth={typeWidth}
      />
      {node.degree > 0 ? <DegreeBadge count={node.degree} position={degreeBadge} /> : null}
    </g>
  )
}

function LocalBadge({ position }: { position: BadgePosition }) {
  return (
    <g className="grimoire-graph-node-local-badge" aria-hidden="true" data-testid="graph-node-local-badge">
      <circle cx={position.x} cy={position.y} r="10" />
      <rect
        x={position.x - 4}
        y={position.y - 1}
        width="8"
        height="6"
        rx="1.8"
        fill="none"
        stroke="var(--foreground)"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
      <path
        d={`M ${position.x - 3.2} ${position.y - 1} v -2.2 a 3.2 3.2 0 0 1 6.4 0 v 2.2`}
        fill="none"
        stroke="var(--foreground)"
        strokeLinecap="round"
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </g>
  )
}

function nodeAriaLabel(title: string, localOnly: boolean): string {
  if (!localOnly) return `Select ${title}`
  return `Select ${title} local-only visible here, withheld from agents`
}

function nodeTitle(title: string, {
  localOnly,
  sourceSafe,
}: {
  localOnly: boolean
  sourceSafe: boolean
}): string {
  if (localOnly) return `${title} - local-only, visible here and withheld from agents`
  if (sourceSafe) return `${title} - source-safe, eligible for agent package`
  return `${title} - graph context only`
}

function nodeDescription({
  localOnly,
  sourceSafe,
}: {
  localOnly: boolean
  sourceSafe: boolean
}): string {
  if (localOnly) return 'Local-only graph node. The title can be inspected here, but the note is held from agent packages.'
  if (sourceSafe) return 'Source-safe graph node. This note can be included in an inspected agent package.'
  return 'Graph node outside the current inspected agent package.'
}

function CouncilBadge({ position }: { position: BadgePosition }) {
  return (
    <g className="grimoire-graph-node-council-badge" aria-hidden="true" data-testid="graph-node-council-badge">
      <circle cx={position.x} cy={position.y} r="10" />
      <path
        d={`M ${position.x - 4} ${position.y + 1} L ${position.x - 1} ${position.y + 4} L ${position.x + 5} ${position.y - 5}`}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </g>
  )
}

function NodeLabel({
  label,
  labelWidth,
  node,
  selected,
  typeWidth,
}: {
  label: string
  labelWidth: number
  node: PositionedGraphNode
  selected: boolean
  typeWidth: number
}) {
  const emphasized = node.active || selected
  return (
    <>
      <rect
        className="grimoire-graph-node-title-backdrop"
        x={node.x - labelWidth / 2}
        y={node.y + 25}
        width={labelWidth}
        height="25"
        rx="12.5"
      />
      <text
        x={node.x}
        y={node.y + 38}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize="16"
        fontWeight={emphasized ? 720 : 600}
        pointerEvents="none"
      >
        {label}
      </text>
      <rect
        className="grimoire-graph-node-type-pill"
        x={node.x - typeWidth / 2}
        y={node.y + 45}
        width={typeWidth}
        height="20"
        rx="10"
      />
      <text
        x={node.x}
        y={node.y + 59}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize="12"
        pointerEvents="none"
      >
        {node.type}
      </text>
    </>
  )
}

function DegreeBadge({ count, position }: { count: number; position: BadgePosition }) {
  return (
    <g className="grimoire-graph-node-degree-badge" aria-hidden="true">
      <circle cx={position.x} cy={position.y} r="10" />
      <text
        x={position.x}
        y={position.y + 4}
        textAnchor="middle"
        fontSize="10"
        fontWeight="720"
        pointerEvents="none"
      >
        {Math.min(count, 99)}
      </text>
    </g>
  )
}
