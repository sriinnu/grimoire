import { BrainCircuit, Code2, GitBranch, Network, Search, ShieldCheck, Sparkles } from 'lucide-react'
import type React from 'react'
import { cn } from '@/lib/utils'
import type { AiAgentAvailability, AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { graphHandoffLaneLabel } from '../lib/graphAgentLanes'
import { AgentRouteDisclosure } from './AgentRouteDisclosure'

type RunwayState = 'blocked' | 'guarded' | 'ready' | 'waiting'

interface GraphAgentRunwayProps {
  agentGraphContext: AgentGraphContext
  defaultAiAgent?: AiAgentId
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  aiAgentsStatus?: AiAgentsStatus
  selectedLocalOnly: boolean
}

interface RunwayStep {
  detail: string
  icon: React.ReactNode
  label: string
  state: RunwayState
  status: string
}

/** Source-safe visual path from graph selection to agent review and Markdown diff. */
export function GraphAgentRunway({
  agentGraphContext,
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  aiAgentsStatus,
  selectedLocalOnly,
}: GraphAgentRunwayProps) {
  const defaultAgentStatus = defaultAiAgent ? aiAgentsStatus?.[defaultAiAgent] : undefined
  const steps = buildRunwaySteps(agentGraphContext, selectedLocalOnly)
  const summary = runwaySummary(agentGraphContext, selectedLocalOnly, defaultAgentStatus)

  return (
    <section
      className="graph-agent-surface graph-agent-runway grimoire-panel-reveal rounded-md border border-border p-3"
      data-state={summary.state}
      data-testid="graph-agent-runway"
    >
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Sparkles className="size-3.5" />
        Agent runway
      </div>
      <div className="graph-agent-runway__summary mt-3 grid gap-2 rounded-md border px-2.5 py-2" data-testid="graph-agent-runway-summary">
        {summary.metrics.map((metric) => (
          <div className="graph-agent-runway__metric rounded-md border px-2 py-1.5" data-state={metric.state} key={metric.label}>
            <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{metric.label}</div>
            <div className="mt-0.5 truncate text-xs font-semibold text-foreground">{metric.value}</div>
          </div>
        ))}
      </div>
      {defaultAiAgent ? (
        <AgentRouteDisclosure
          agent={defaultAiAgent}
          availability={defaultAgentStatus}
          className="mt-3"
          contextProtected={agentGraphContext.state === 'protected-active' || selectedLocalOnly}
          model={defaultAiModel}
          provider={defaultAiProvider}
        />
      ) : null}
      <div className="mt-3 grid gap-2">
        {steps.map((step, index) => (
          <RunwayStepCard
            key={step.label}
            first={index === 0}
            step={step}
          />
        ))}
      </div>
    </section>
  )
}

function buildRunwaySteps(
  context: AgentGraphContext,
  selectedLocalOnly: boolean,
): RunwayStep[] {
  const blocked = context.state === 'protected-active' || selectedLocalOnly
  const empty = context.state === 'empty'
  const held = context.omitted.protectedNodes + context.omitted.protectedEdges

  return [
    {
      detail: empty ? 'Choose a graph node first' : packageDetail(context, held),
      icon: <Network className="size-3.5" />,
      label: 'Package',
      state: empty ? 'waiting' : blocked ? 'guarded' : 'ready',
      status: empty ? 'Waiting' : blocked ? 'Local only' : 'Ready',
    },
    {
      detail: 'Vault graph and keyword search stay on this Mac.',
      icon: <Search className="size-3.5" />,
      label: 'Local scan',
      state: empty ? 'waiting' : 'guarded',
      status: empty ? 'Waiting' : 'On-device',
    },
    {
      detail: 'Private-memory lane is policy-eligible; live CLI/MCP health is checked outside this graph package.',
      icon: <BrainCircuit className="size-3.5" />,
      label: 'Chitragupta',
      state: empty ? 'waiting' : 'guarded',
      status: empty ? 'Waiting' : 'Eligible',
    },
    {
      detail: blocked ? 'External agents are blocked by the Locality Firewall.' : 'Codex and Claude Code are eligible for source-safe graph labels only.',
      icon: <Code2 className="size-3.5" />,
      label: graphHandoffLaneLabel(),
      state: empty ? 'waiting' : blocked ? 'blocked' : 'ready',
      status: empty ? 'Waiting' : blocked ? 'Blocked' : 'Source-safe',
    },
    {
      detail: blocked ? 'No durable write until a safe public packet exists.' : 'Any result still returns as a reviewable Markdown diff.',
      icon: blocked ? <ShieldCheck className="size-3.5" /> : <GitBranch className="size-3.5" />,
      label: 'Crystallize',
      state: empty ? 'waiting' : blocked ? 'guarded' : 'ready',
      status: empty ? 'Waiting' : blocked ? 'Guarded' : 'Review',
    },
  ]
}

function runwaySummary(
  context: AgentGraphContext,
  selectedLocalOnly: boolean,
  defaultAgentStatus?: AiAgentAvailability,
): {
  metrics: Array<{ label: string; state: RunwayState; value: string }>
  state: RunwayState
} {
  const blocked = context.state === 'protected-active' || selectedLocalOnly
  const empty = context.state === 'empty'
  const held = context.omitted.protectedNodes + context.omitted.protectedEdges
  const routeBlocked = defaultAgentStatus?.status === 'missing'
  const routeChecking = defaultAgentStatus?.status === 'checking'
  const sourceLabel = empty ? 'No package' : `${context.nodes.length} labels / ${context.edges.length} links`
  const privacyLabel = blocked ? 'Locality firewall' : held > 0 ? `${held} held from agents` : 'Source-safe'
  const reviewLabel = empty ? 'Waiting' : blocked ? 'Guarded review' : routeBlocked ? 'Agent missing' : routeChecking ? 'Agent checking' : 'Markdown diff'

  return {
    metrics: [
      { label: 'Packet', state: empty ? 'waiting' : blocked ? 'guarded' : 'ready', value: sourceLabel },
      { label: 'Privacy', state: blocked || held > 0 ? 'guarded' : 'ready', value: privacyLabel },
      { label: 'Result', state: empty ? 'waiting' : blocked ? 'guarded' : routeChecking ? 'waiting' : routeBlocked ? 'blocked' : 'ready', value: reviewLabel },
    ],
    state: empty ? 'waiting' : blocked ? 'guarded' : routeChecking ? 'waiting' : routeBlocked ? 'blocked' : 'ready',
  }
}

function packageDetail(context: AgentGraphContext, held: number): string {
  const nodeLabel = `${context.nodes.length} ${context.nodes.length === 1 ? 'note' : 'notes'}`
  const edgeLabel = `${context.edges.length} ${context.edges.length === 1 ? 'link' : 'links'}`
  return held > 0 ? `${nodeLabel} / ${edgeLabel}; ${held} held from agents.` : `${nodeLabel} / ${edgeLabel}.`
}

function RunwayStepCard({
  first,
  step,
}: {
  first: boolean
  step: RunwayStep
}) {
  return (
    <div className="graph-agent-runway__step grid grid-cols-[1.25rem_minmax(0,1fr)] gap-2" data-state={step.state}>
      <div className="relative flex justify-center">
        {!first ? <span className="graph-agent-runway__connector absolute -top-2 h-2 w-px bg-border" /> : null}
        <span
          className={cn(
            'graph-agent-runway__marker',
            'flex size-5 items-center justify-center rounded-full border bg-background text-muted-foreground',
            step.state === 'ready' && 'border-primary/45 text-primary',
            step.state === 'guarded' && 'border-border text-muted-foreground',
            step.state === 'blocked' && 'border-destructive/40 text-destructive',
          )}
        >
          {step.icon}
        </span>
      </div>
      <div className="graph-agent-card min-w-0 rounded-md border border-border px-2.5 py-2" data-state={step.state}>
        <div className="flex min-w-0 items-center justify-between gap-2">
          <span className="truncate text-xs font-semibold text-foreground">{step.label}</span>
          <span className={runwayBadgeClass(step.state)} data-state={step.state}>{step.status}</span>
        </div>
        <div className="mt-1 text-[11px] leading-4 text-muted-foreground">{step.detail}</div>
      </div>
    </div>
  )
}

function runwayBadgeClass(state: RunwayState): string {
  return cn(
    'inline-flex h-5 shrink-0 items-center rounded-full border px-1.5 text-[10px] font-semibold',
    'graph-agent-chip',
    state === 'ready' && 'border-primary/35 text-foreground',
    state === 'guarded' && 'border-border text-muted-foreground',
    state === 'blocked' && 'border-destructive/30 text-muted-foreground',
    state === 'waiting' && 'border-border text-muted-foreground',
  )
}
