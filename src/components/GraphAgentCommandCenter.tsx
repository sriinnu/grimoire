import { Sparkles } from 'lucide-react'
import type React from 'react'
import type { GraphAgentLaneState } from '../lib/graphAgentLanes'
import type { AgentGraphContext } from '../utils/agentGraphContext'

interface GraphAgentCommandCenterProps {
  agentGraphContext: AgentGraphContext
  children: React.ReactNode
  selectedLocalOnly: boolean
}

/** Groups graph package, Council lanes, and agent runway into one handoff flow. */
export function GraphAgentCommandCenter({
  agentGraphContext,
  children,
  selectedLocalOnly,
}: GraphAgentCommandCenterProps) {
  const held = agentGraphContext.omitted.protectedNodes + agentGraphContext.omitted.protectedEdges
  const state = commandCenterState(agentGraphContext, selectedLocalOnly)

  return (
    <div className="graph-agent-command-center" data-state={state} data-testid="graph-agent-command-center">
      <div className="graph-agent-command-center__header">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            <Sparkles className="size-3.5" />
            Second Brain
          </div>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            {commandCenterCopy(agentGraphContext, selectedLocalOnly, held)}
          </p>
        </div>
        <span className="graph-agent-chip shrink-0 rounded-full border px-2 py-1 text-[11px] font-semibold" data-state={state}>
          {commandCenterLabel(state)}
        </span>
      </div>
      <div className="graph-agent-command-center__memory" data-testid="graph-working-memory">
        <MemoryMetric label="Nodes" value={`${agentGraphContext.nodes.length}`} />
        <MemoryMetric label="Links" value={`${agentGraphContext.edges.length}`} />
        <MemoryMetric label="Held local" value={`${held}`} state={held > 0 ? 'guarded' : state} />
      </div>
      <div className="graph-agent-command-center__stack">
        {children}
      </div>
    </div>
  )
}

function MemoryMetric({
  label,
  state,
  value,
}: {
  label: string
  state?: GraphAgentLaneState
  value: string
}) {
  return (
    <span className="graph-agent-command-center__memory-metric" data-state={state}>
      <strong>{value}</strong>
      <em>{label}</em>
    </span>
  )
}

function commandCenterState(
  context: AgentGraphContext,
  selectedLocalOnly: boolean,
): GraphAgentLaneState {
  if (context.state === 'empty') return 'waiting'
  if (context.state === 'protected-active' || selectedLocalOnly) return 'guarded'
  return 'ready'
}

function commandCenterLabel(state: GraphAgentLaneState): string {
  if (state === 'ready') return 'Ready for review'
  if (state === 'guarded') return 'Locality guarded'
  if (state === 'blocked') return 'Blocked'
  return 'Waiting'
}

function commandCenterCopy(
  context: AgentGraphContext,
  selectedLocalOnly: boolean,
  held: number,
): string {
  if (context.state === 'empty') return 'Pick a graph node to assemble a source-safe packet.'
  if (context.state === 'protected-active' || selectedLocalOnly) {
    return 'This selection stays local; external handoff is blocked while local/private lanes remain visible.'
  }

  const heldCopy = held > 0 ? `; ${held} local facts stay held` : ''
  return `${context.nodes.length} source labels and ${context.edges.length} links can be reviewed before any agent handoff${heldCopy}.`
}
