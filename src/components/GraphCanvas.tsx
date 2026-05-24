import type { CSSProperties } from 'react'
import { cn } from '@/lib/utils'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import type { NoteGraph } from '../utils/noteGraph'
import {
  GRAPH_CENTER_X,
  GRAPH_CENTER_Y,
  GRAPH_VIEWBOX_HEIGHT,
  GRAPH_VIEWBOX_WIDTH,
  truncateGraphLabel,
  type GraphLayout,
  type PositionedGraphNode,
} from '../utils/graphDisplay'

interface GraphCanvasProps {
  agentGraphContext: AgentGraphContext
  layout: GraphLayout
  localOnlyNodeIds: ReadonlySet<string>
  nodeById: Map<string, PositionedGraphNode>
  selectedNodeId: string | null
  onOpenNode: (path: string) => void
  onSelectNode: (node: PositionedGraphNode) => void
}

/** Interactive SVG canvas for note graph nodes and source-safe agent package state. */
export function GraphCanvas({
  agentGraphContext,
  layout,
  localOnlyNodeIds,
  nodeById,
  selectedNodeId,
  onOpenNode,
  onSelectNode,
}: GraphCanvasProps) {
  const held = agentGraphContext.omitted.protectedNodes + agentGraphContext.omitted.protectedEdges
  const sourceSafeNodeIds = new Set(agentGraphContext.nodes.map((node) => node.path))
  const sourceSafeEdgeIds = new Set(agentGraphContext.edges.map(agentEdgeKey))
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null
  const selectedLocalOnly = selectedNode ? localOnlyNodeIds.has(selectedNode.id) : false

  return (
    <div
      className="graph-canvas-shell grimoire-constellation-focus relative overflow-hidden rounded-md border"
      data-testid="graph-canvas"
    >
      <div className="graph-canvas-hud" data-testid="graph-canvas-agent-hud">
        <span data-state={agentGraphContext.state}>{graphPackageLabel(agentGraphContext.state)}</span>
        <span>{agentGraphContext.nodes.length} nodes</span>
        <span>{agentGraphContext.edges.length} links</span>
        {held > 0 ? <span>{held} held local</span> : null}
        {selectedNode ? (
          <span data-testid="graph-canvas-selected-summary">
            {selectedLocalOnly ? 'Selected protected' : `Selected ${truncateGraphLabel(selectedNode.title)}`}
          </span>
        ) : null}
      </div>
      <svg
        viewBox={`0 0 ${GRAPH_VIEWBOX_WIDTH} ${GRAPH_VIEWBOX_HEIGHT}`}
        className="block h-[min(60vh,640px)] w-full"
        role="img"
        aria-label="Vault relationship graph"
        data-testid="graph-svg"
      >
        <defs>
          <pattern id="graph-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--border-subtle)" strokeOpacity="0.5" />
          </pattern>
        </defs>
        <rect width={GRAPH_VIEWBOX_WIDTH} height={GRAPH_VIEWBOX_HEIGHT} fill="var(--surface-editor)" />
        <rect width={GRAPH_VIEWBOX_WIDTH} height={GRAPH_VIEWBOX_HEIGHT} fill="url(#graph-grid)" />
        {layout.edges.map((edge) => {
          const source = nodeById.get(edge.source)
          const target = nodeById.get(edge.target)
          if (!source || !target) return null
          return (
            <GraphEdge
              key={edge.id}
              edge={edge}
              localOnly={localOnlyNodeIds.has(edge.source) || localOnlyNodeIds.has(edge.target)}
              selected={Boolean(selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id))}
              source={source}
              sourceSafe={sourceSafeEdgeIds.has(noteEdgeKey(edge))}
              target={target}
            />
          )
        })}
        {layout.nodes.map((node) => (
          <GraphNode
            key={node.id}
            localOnly={localOnlyNodeIds.has(node.id)}
            node={node}
            selected={node.id === selectedNodeId}
            sourceSafe={sourceSafeNodeIds.has(node.id)}
            onOpenNode={onOpenNode}
            onSelectNode={onSelectNode}
          />
        ))}
        {layout.nodes.length === 0 ? (
          <text x={GRAPH_CENTER_X} y={GRAPH_CENTER_Y} textAnchor="middle" fill="var(--muted-foreground)" fontSize="18">
            No matching notes
          </text>
        ) : null}
      </svg>
      <div className="graph-canvas-legend" data-testid="graph-canvas-legend">
        <LegendItem tone="safe" label="Council-ready" />
        <LegendItem tone="selected" label="Selected path" />
        <LegendItem tone="local" label="Local-only held" />
      </div>
    </div>
  )
}

function agentEdgeKey(edge: AgentGraphContext['edges'][number]): string {
  return `${edge.sourcePath}->${edge.targetPath}:${edge.kind}:${edge.label}`
}

function noteEdgeKey(edge: NoteGraph['edges'][number]): string {
  return `${edge.source}->${edge.target}:${edge.kind}:${edge.label}`
}

function graphPackageLabel(state: AgentGraphContext['state']): string {
  if (state === 'protected-active') return 'Agent package blocked'
  if (state === 'empty') return 'No agent package'
  return 'Source-safe package'
}

function GraphEdge({
  edge,
  localOnly,
  selected,
  source,
  sourceSafe,
  target,
}: {
  edge: NoteGraph['edges'][number]
  localOnly: boolean
  selected: boolean
  source: PositionedGraphNode
  sourceSafe: boolean
  target: PositionedGraphNode
}) {
  const relationship = edge.kind === 'relationship'
  return (
    <line
      className={cn(
        'grimoire-graph-edge',
        relationship && 'grimoire-graph-edge--relationship',
        localOnly && 'grimoire-graph-edge--local',
        selected && 'grimoire-graph-edge--selected',
        sourceSafe && 'grimoire-graph-edge--source-safe',
      )}
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke={relationship ? 'var(--primary)' : 'var(--muted-foreground)'}
      strokeDasharray={edgeDashArray({ localOnly, relationship, sourceSafe })}
      strokeLinecap="round"
      strokeOpacity={edgeOpacity({ localOnly, selected, sourceSafe })}
      strokeWidth={selected ? 3.1 : relationship ? 2.4 : 1.4}
    />
  )
}

function edgeDashArray({
  localOnly,
  relationship,
  sourceSafe,
}: {
  localOnly: boolean
  relationship: boolean
  sourceSafe: boolean
}): string | undefined {
  if (localOnly) return '2 8'
  if (!sourceSafe) return '4 10'
  return relationship ? undefined : '5 8'
}

function edgeOpacity({
  localOnly,
  selected,
  sourceSafe,
}: {
  localOnly: boolean
  selected: boolean
  sourceSafe: boolean
}): number {
  if (localOnly) return 0.22
  if (selected) return 0.68
  return sourceSafe ? 0.48 : 0.26
}

function GraphNode({
  localOnly,
  node,
  onOpenNode,
  onSelectNode,
  selected,
  sourceSafe,
}: {
  localOnly: boolean
  node: PositionedGraphNode
  onOpenNode: (path: string) => void
  onSelectNode: (node: PositionedGraphNode) => void
  selected: boolean
  sourceSafe: boolean
}) {
  const radius = node.active ? 23 : Math.min(19, 10 + node.degree * 1.7)
  const dimmed = !node.neighborhood && !node.active
  const style = { '--node-color': node.color, '--node-fill': node.lightColor } as CSSProperties
  const label = truncateGraphLabel(node.title)
  const labelWidth = Math.min(176, Math.max(64, label.length * 8.2 + 24))
  const typeWidth = Math.min(124, Math.max(56, node.type.length * 7 + 20))

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Select ${node.title}${localOnly ? ' local-only' : ''}`}
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
      />
      <circle
        cx={node.x - radius * 0.35}
        cy={node.y - radius * 0.38}
        r={Math.max(2.6, radius * 0.18)}
        fill="color-mix(in srgb, var(--node-color) 18%, var(--surface-editor))"
      />
      {localOnly ? (
        <g className="grimoire-graph-node-local-badge" aria-hidden="true">
          <circle cx={node.x - radius + 2} cy={node.y - radius + 2} r="10" />
          <text
            x={node.x - radius + 2}
            y={node.y - radius + 6}
            textAnchor="middle"
            fontSize="10"
            fontWeight="760"
            pointerEvents="none"
          >
            L
          </text>
        </g>
      ) : null}
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
        fontWeight={node.active || selected ? 720 : 600}
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
      {node.degree > 0 ? (
        <g className="grimoire-graph-node-degree-badge" aria-hidden="true">
          <circle cx={node.x + radius - 2} cy={node.y - radius + 2} r="10" />
          <text
            x={node.x + radius - 2}
            y={node.y - radius + 6}
            textAnchor="middle"
            fontSize="10"
            fontWeight="720"
            pointerEvents="none"
          >
            {Math.min(node.degree, 99)}
          </text>
        </g>
      ) : null}
    </g>
  )
}

function LegendItem({ label, tone }: { label: string; tone: 'local' | 'safe' | 'selected' }) {
  return (
    <span className="graph-canvas-legend__item" data-tone={tone}>
      <span className="graph-canvas-legend__mark" />
      {label}
    </span>
  )
}
