import { cn } from '@/lib/utils'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import type { AiAgentsStatus } from '../lib/aiAgents'
import {
  GRAPH_AGENT_LANES,
  agentLaneAvailability,
  graphAgentLaneCopy,
  graphAgentStateLabel,
  resolveGraphAgentLaneState,
  type GraphAgentLane,
  type GraphAgentLaneState,
} from '../lib/graphAgentLanes'
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
import { GraphAgentOrbit } from './GraphAgentOrbit'
import { GraphCanvasPackageTethers } from './GraphCanvasPackageTethers'
import { GraphNode } from './GraphNode'

interface GraphCanvasProps {
  agentGraphContext: AgentGraphContext
  aiAgentsStatus?: AiAgentsStatus
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
  aiAgentsStatus,
  layout,
  localOnlyNodeIds,
  nodeById,
  selectedNodeId,
  onOpenNode,
  onSelectNode,
}: GraphCanvasProps) {
  const held = agentGraphContext.omitted.protectedNodes + agentGraphContext.omitted.protectedEdges
  const sourceSafeNodePaths = new Set(agentGraphContext.nodes.map((node) => node.path))
  const sourceSafeEdgeIds = new Set(agentGraphContext.edges.map(agentEdgeKey))
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null
  const selectedLocalOnly = selectedNode ? localOnlyNodeIds.has(selectedNode.id) : false
  const policyProtected = agentGraphContext.state === 'protected-active' || selectedLocalOnly
  const agentStates = GRAPH_CANVAS_AGENTS.map((agent) => {
    const state = resolveGraphAgentLaneState(agent, agentGraphContext.state, selectedLocalOnly, aiAgentsStatus)
    return {
      agent,
      availability: agentLaneAvailability(agent, aiAgentsStatus),
      label: graphAgentLaneCopy(agent, state, aiAgentsStatus, policyProtected),
      state,
    }
  })
  const readiness = graphAgentReadiness(agentStates)

  return (
    <div
      className="graph-canvas-shell grimoire-constellation-focus relative overflow-hidden rounded-md border"
      data-testid="graph-canvas"
    >
      <div className="graph-canvas-hud" data-testid="graph-canvas-agent-hud">
        <div className="graph-canvas-package-card" data-state={agentGraphContext.state}>
          <span data-state={agentGraphContext.state}>{graphPackageLabel(agentGraphContext.state)}</span>
          <span>{agentGraphContext.nodes.length} nodes</span>
          <span>{agentGraphContext.edges.length} links</span>
          {held > 0 ? <span>{held} held from agents</span> : null}
          {selectedNode ? (
            <span data-testid="graph-canvas-selected-summary">
              {selectedLocalOnly ? 'Selected protected' : `Selected ${truncateGraphLabel(selectedNode.title)}`}
            </span>
          ) : null}
          <span data-testid="graph-canvas-agent-summary">{readiness.label}</span>
        </div>
        <div className="graph-canvas-agent-rail" data-testid="graph-canvas-agent-rail" aria-label="Graph agent eligibility">
          {agentStates.map(({ agent, availability, label, state }) => (
            <AgentReadinessChip
              key={agent.id}
              agent={agent}
              availability={availability}
              label={label}
              state={state}
            />
          ))}
        </div>
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
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--grimoire-graph-grid-stroke, var(--border-subtle))" strokeOpacity="0.5" />
          </pattern>
        </defs>
        <rect width={GRAPH_VIEWBOX_WIDTH} height={GRAPH_VIEWBOX_HEIGHT} fill="transparent" />
        <rect width={GRAPH_VIEWBOX_WIDTH} height={GRAPH_VIEWBOX_HEIGHT} fill="url(#graph-grid)" />
        <GraphCanvasPackageTethers
          localOnlyNodeIds={localOnlyNodeIds}
          nodeById={nodeById}
          selectedNode={selectedNode}
          sourceSafeNodeIds={sourceSafeNodePaths}
        />
        <GraphAgentOrbit
          agentStates={agentStates}
          selectedNode={selectedNode}
        />
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
            sourceSafe={sourceSafeNodePaths.has(node.path)}
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
        <LegendItem tone="safe" label="Source-safe node" />
        <LegendItem tone="package" label="Agent package" />
        <LegendItem tone="selected" label="Selected path" />
        <LegendItem tone="local" label="Local-only visible" />
        <LegendItem tone="health" label="Route health" />
      </div>
    </div>
  )
}

const GRAPH_CANVAS_AGENTS = [
  ...GRAPH_AGENT_LANES,
] as const

function AgentReadinessChip({
  agent,
  availability,
  label,
  state,
}: {
  agent: GraphAgentLane
  availability: ReturnType<typeof agentLaneAvailability>
  label: string
  state: GraphAgentLaneState
}) {
  return (
    <span
      aria-label={`${agent.name}: ${label}. ${agent.role}.`}
      data-agent={agent.id}
      data-state={state}
      title={`${agent.name}: ${agent.role}; ${graphAgentStateLabel(state, availability)}`}
    >
      <i aria-hidden="true" className="graph-canvas-agent-rail__mark" />
      <strong>{agent.shortName}</strong>
      <em>{label}</em>
    </span>
  )
}

function graphAgentReadiness(agentStates: readonly { state: GraphAgentLaneState }[]): { label: string } {
  const counts = { blocked: 0, guarded: 0, ready: 0, waiting: 0 } satisfies Record<GraphAgentLaneState, number>
  for (const { state } of agentStates) {
    counts[state] += 1
  }

  return {
    label: [
      `${counts.ready} source-safe`,
      counts.guarded > 0 ? `${counts.guarded} local/private` : null,
      counts.blocked > 0 ? `${counts.blocked} blocked` : null,
      counts.waiting > 0 ? `${counts.waiting} waiting` : null,
    ].filter(Boolean).join(' · '),
  }
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
      stroke={localOnly
        ? 'var(--grimoire-graph-edge-local, var(--destructive))'
        : relationship
          ? 'var(--grimoire-graph-edge-relationship, var(--primary))'
          : 'var(--grimoire-graph-edge-wikilink, var(--muted-foreground))'}
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

function LegendItem({ label, tone }: { label: string; tone: 'health' | 'local' | 'package' | 'safe' | 'selected' }) {
  return (
    <span className="graph-canvas-legend__item" data-tone={tone}>
      <span className="graph-canvas-legend__mark" />
      {label}
    </span>
  )
}
