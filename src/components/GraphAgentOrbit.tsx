import type { AiAgentStatus } from '../lib/aiAgents'
import {
  graphAgentStateLabel,
  type GraphAgentLane,
  type GraphAgentLaneState,
} from '../lib/graphAgentLanes'
import type { PositionedGraphNode } from '../utils/graphDisplay'

export interface GraphAgentOrbitState {
  agent: GraphAgentLane
  availability: AiAgentStatus | null
  label: string
  state: GraphAgentLaneState
}

interface GraphAgentOrbitProps {
  agentStates: readonly GraphAgentOrbitState[]
  selectedNode: PositionedGraphNode | null
}

const ORBIT_RADIUS = 62
const CONNECTOR_START_RADIUS = 34
const CONNECTOR_END_RADIUS = 49

/** Draws agent readiness around the selected graph node without exposing note content. */
export function GraphAgentOrbit({
  agentStates,
  selectedNode,
}: GraphAgentOrbitProps) {
  if (!selectedNode) return null

  return (
    <g className="grimoire-graph-agent-orbit" data-testid="graph-agent-orbit" aria-hidden="true">
      <circle
        className="grimoire-graph-agent-orbit__track"
        cx={selectedNode.x}
        cy={selectedNode.y}
        r="62"
      />
      {agentStates.map(({ agent, availability, label, state }) => {
        const point = orbitPoint(selectedNode, agent.angle, ORBIT_RADIUS)
        const connector = orbitConnector(selectedNode, agent.angle)
        const health = availability ?? 'local'

        return (
          <g key={agent.id}>
            <line
              className="grimoire-graph-agent-orbit__connector"
              data-state={state}
              data-testid="graph-agent-orbit-connector"
              stroke={connectorStroke(state)}
              strokeDasharray={connectorDash(state)}
              strokeLinecap="round"
              strokeOpacity={connectorOpacity(state)}
              strokeWidth="1.55"
              vectorEffect="non-scaling-stroke"
              x1={connector.start.x}
              x2={connector.end.x}
              y1={connector.start.y}
              y2={connector.end.y}
            />
            <g
              className="grimoire-graph-agent-orbit__lane"
              data-agent={agent.id}
              data-availability={health}
              data-label={label}
              data-state={state}
              data-testid="graph-agent-orbit-lane"
              transform={`translate(${point.x} ${point.y})`}
            >
              <title>{`${agent.name}: ${label}; ${graphAgentStateLabel(state, availability)}`}</title>
              <circle r="12" />
              <text y="4" textAnchor="middle">
                {agent.shortLabel}
              </text>
              <circle
                className="grimoire-graph-agent-orbit__health"
                cx="8"
                cy="-8"
                data-availability={health}
                r="3.4"
              />
            </g>
          </g>
        )
      })}
    </g>
  )
}

function orbitPoint(node: PositionedGraphNode, angle: number, radius: number): { x: number; y: number } {
  const radians = (angle * Math.PI) / 180
  return {
    x: node.x + Math.cos(radians) * radius,
    y: node.y + Math.sin(radians) * radius,
  }
}

function orbitConnector(node: PositionedGraphNode, angle: number): {
  start: { x: number; y: number }
  end: { x: number; y: number }
} {
  return {
    start: orbitPoint(node, angle, CONNECTOR_START_RADIUS),
    end: orbitPoint(node, angle, CONNECTOR_END_RADIUS),
  }
}

function connectorStroke(state: GraphAgentLaneState): string {
  if (state === 'ready') return 'var(--primary)'
  if (state === 'blocked') return 'var(--destructive)'
  if (state === 'guarded') return 'var(--grimoire-graph-edge-local, var(--accent-orange))'
  return 'var(--muted-foreground)'
}

function connectorDash(state: GraphAgentLaneState): string | undefined {
  if (state === 'ready') return undefined
  if (state === 'blocked') return '5 5'
  return '2 6'
}

function connectorOpacity(state: GraphAgentLaneState): number {
  if (state === 'ready') return 0.54
  if (state === 'blocked') return 0.42
  return 0.36
}
