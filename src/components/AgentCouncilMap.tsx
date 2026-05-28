import { Network, ShieldCheck } from 'lucide-react'
import type { CSSProperties } from 'react'
import type { AgentCouncilBrief, AgentCouncilHealth, AgentCouncilMember, AgentCouncilSource } from '../lib/agentCouncil'
import {
  buildAgentCouncilReadiness,
  summarizeAgentCouncilReadiness,
  type AgentCouncilReadinessLane,
} from '../lib/agentCouncilReadiness'
import type { AgentCouncilOneAnswer } from '../lib/agentCouncilSynthesis'

interface AgentCouncilMapProps {
  activeContextProtected: boolean
  brief: AgentCouncilBrief
  members: AgentCouncilMember[]
  oneAnswer: AgentCouncilOneAnswer
}

interface CouncilMetric {
  label: string
  value: string
}

interface CouncilStep {
  detail: string
  id: string
  label: string
  status: 'ready' | 'limited' | 'blocked' | 'review'
}

interface CouncilFrictionMoment {
  detail: string
  id: string
  label: string
  status: 'blocked' | 'clear' | 'guarded' | 'review'
}

/** Source-safe orchestration map for the current Agent Council pass. */
export function AgentCouncilMap({
  activeContextProtected,
  brief,
  members,
  oneAnswer,
}: AgentCouncilMapProps) {
  const safeSourceCount = countSourceLabels(members, activeContextProtected)
  const heldLocalCount = countHeldLocalSources(members, activeContextProtected)
  const readyCount = members.filter((member) => member.health === 'ready').length
  const privateCount = members.filter((member) => member.health === 'private-local').length
  const waitingCount = members.length - readyCount - privateCount
  const metrics: CouncilMetric[] = [
    { label: 'Sources', value: activeContextProtected ? '0' : String(safeSourceCount) },
    { label: 'Lanes', value: `${readyCount + privateCount}/${members.length}` },
    { label: 'Friction', value: String(oneAnswer.conflictCount) },
    { label: 'Held local', value: String(heldLocalCount) },
  ]
  const steps = councilSteps({
    activeContextProtected,
    heldLocalCount,
    safeSourceCount,
    waitingCount,
    frictionCount: oneAnswer.conflictCount,
  })
  const readiness = buildAgentCouncilReadiness(members, activeContextProtected)
  const readinessSummary = summarizeAgentCouncilReadiness(readiness)
  const frictionMoments = councilFrictionMoments({
    activeContextProtected,
    disagreements: brief.disagreements,
    oneAnswer,
  })

  return (
    <section
      className="grimoire-agent-council__map grimoire-control-entrance mb-2 rounded-md border border-border bg-background/60 p-2"
      data-locality={activeContextProtected ? 'protected-local' : 'source-safe'}
      data-testid="agent-council-map"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[10px] font-semibold text-foreground">
          <Network className="size-3.5 shrink-0 text-[var(--grimoire-signal-accent)]" />
          <span className="truncate">Council map</span>
        </div>
        <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
          <ShieldCheck className="size-3" />
          <span>{activeContextProtected ? 'Local hold' : 'Source-safe'}</span>
        </div>
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1" data-testid="agent-council-map-metrics">
        {metrics.map((metric) => (
          <div key={metric.label} className="grimoire-agent-council__map-metric rounded-md border border-border px-1.5 py-1">
            <div className="text-[11px] font-semibold text-foreground">{metric.value}</div>
            <div className="truncate text-[8px] uppercase text-muted-foreground">{metric.label}</div>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1.5" data-testid="agent-council-map-steps">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className="grimoire-agent-council__map-step rounded-md border border-border px-1.5 py-1.5"
            data-status={step.status}
            style={{ '--motion-stagger-delay': `${index * 34}ms` } as CSSProperties}
          >
            <div className="flex items-center gap-1 text-[9px] font-medium text-foreground">
              <span className={`size-1.5 rounded-full ${stepDotClass(step.status)}`} />
              <span className="truncate">{step.label}</span>
            </div>
            <div className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-muted-foreground">
              {step.detail}
            </div>
          </div>
        ))}
      </div>

      <div
        className="grimoire-agent-council__friction-rail mt-2 grid grid-cols-3 gap-1.5"
        data-conflict-count={oneAnswer.conflictCount}
        data-testid="agent-council-friction-rail"
        aria-label="Agent Council friction to answer"
      >
        {frictionMoments.map((moment, index) => (
          <div
            key={moment.id}
            className="grimoire-agent-council__friction-step rounded-md border border-border px-1.5 py-1.5"
            data-state={moment.status}
            style={{ '--motion-stagger-delay': `${(index + 4) * 34}ms` } as CSSProperties}
          >
            <div className="flex items-center gap-1 text-[9px] font-medium text-foreground">
              <span className={`size-1.5 rounded-full ${frictionDotClass(moment.status)}`} />
              <span className="truncate">{moment.label}</span>
            </div>
            <div className="mt-0.5 line-clamp-2 text-[8px] leading-snug text-muted-foreground">
              {moment.detail}
            </div>
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-2 gap-1.5" data-testid="agent-council-map-lanes">
        {members.slice(0, 8).map((member) => (
          <div
            key={member.id}
            className="grimoire-agent-council__map-lane flex min-w-0 items-center gap-1.5 rounded-md border border-border px-1.5 py-1"
            data-active={member.active ? 'true' : 'false'}
            data-health={member.health}
          >
            <span className={`size-1.5 shrink-0 rounded-full ${healthDotClass(member.health)}`} />
            <span className="min-w-0 flex-1 truncate text-[9px] text-foreground">{member.label}</span>
          </div>
        ))}
      </div>
      <ReadinessRail lanes={readiness} summary={readinessSummary} />

      <p className="mt-2 line-clamp-2 text-[9px] leading-snug text-muted-foreground">
        {brief.synthesis}
      </p>
    </section>
  )
}

function ReadinessRail({
  lanes,
  summary,
}: {
  lanes: AgentCouncilReadinessLane[]
  summary: ReturnType<typeof summarizeAgentCouncilReadiness>
}) {
  const summaryText = [
    summary.ready > 0 ? `${summary.ready} source-safe` : null,
    summary.proof > 0 ? `${summary.proof} proof-boundary` : null,
    summary.private > 0 ? `${summary.private} private` : null,
    summary.blocked > 0 ? `${summary.blocked} blocked` : null,
    summary.unavailable > 0 ? `${summary.unavailable} unavailable` : null,
    summary.waiting > 0 ? `${summary.waiting} waiting` : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="grimoire-agent-council__readiness mt-2 rounded-md border border-border px-1.5 py-1.5" data-testid="agent-council-readiness-rail">
      <div className="flex items-center justify-between gap-2 px-0.5">
        <span className="text-[9px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">Live readiness</span>
        <span className="truncate text-[9px] text-muted-foreground">{summaryText}</span>
      </div>
      <div className="mt-1 grid grid-cols-2 gap-1">
        {lanes.slice(0, 8).map((lane) => (
          <div key={lane.id} className="grimoire-agent-council__readiness-lane rounded-md border px-1.5 py-1" data-state={lane.state}>
            <div className="flex min-w-0 items-center gap-1 text-[9px]">
              <span className={`size-1.5 shrink-0 rounded-full ${readinessDotClass(lane.state)}`} />
              <strong className="min-w-0 flex-1 truncate font-semibold text-foreground">{lane.label}</strong>
              <em className="shrink-0 not-italic text-muted-foreground">{lane.status}</em>
            </div>
            <div className="mt-0.5 line-clamp-1 text-[8px] leading-snug text-muted-foreground">{lane.detail}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function councilFrictionMoments({
  activeContextProtected,
  disagreements,
  oneAnswer,
}: {
  activeContextProtected: boolean
  disagreements: string[]
  oneAnswer: AgentCouncilOneAnswer
}): CouncilFrictionMoment[] {
  const hasFriction = oneAnswer.conflictCount > 0
  const frictionDetail = activeContextProtected
    ? 'Protected content held locally; only policy signals move.'
    : hasFriction ? disagreements.slice(0, 2).join(' ') : 'No friction signals.'

  return [
    {
      id: 'friction',
      label: 'Friction',
      status: activeContextProtected ? 'blocked' : hasFriction ? 'guarded' : 'clear',
      detail: frictionDetail,
    },
    {
      id: 'synthesis',
      label: 'Synthesis',
      status: oneAnswer.confidence === 'blocked' ? 'blocked' : hasFriction ? 'review' : 'clear',
      detail: oneAnswer.title,
    },
    {
      id: 'answer',
      label: 'One answer',
      status: oneAnswer.confidence === 'blocked' ? 'blocked' : hasFriction ? 'review' : 'clear',
      detail: oneAnswer.nextStep,
    },
  ]
}

function councilSteps({
  activeContextProtected,
  frictionCount,
  heldLocalCount,
  safeSourceCount,
  waitingCount,
}: {
  activeContextProtected: boolean
  frictionCount: number
  heldLocalCount: number
  safeSourceCount: number
  waitingCount: number
}): CouncilStep[] {
  return [
    {
      id: 'context',
      label: 'Context',
      status: activeContextProtected ? 'blocked' : 'ready',
      detail: activeContextProtected ? 'Protected note withheld.' : `${safeSourceCount} source labels.`,
    },
    {
      id: 'lanes',
      label: 'Lanes',
      status: waitingCount > 0 ? 'limited' : 'ready',
      detail: waitingCount > 0 ? `${waitingCount} waiting.` : 'All lanes resolved.',
    },
    {
      id: 'synthesis',
      label: 'Synthesis',
      status: frictionCount > 0 ? 'limited' : 'ready',
      detail: frictionCount > 0 ? `${frictionCount} friction signals.` : 'Clean stance merge.',
    },
    {
      id: 'review',
      label: 'Review',
      status: heldLocalCount > 0 || activeContextProtected ? 'review' : 'ready',
      detail: heldLocalCount > 0 ? `${heldLocalCount} held local.` : 'Markdown packet ready.',
    },
  ]
}

function countSourceLabels(members: AgentCouncilMember[], activeContextProtected: boolean): number {
  if (activeContextProtected) return 0
  return new Set(members
    .flatMap((member) => member.sources)
    .filter((source) => source.kind !== 'withheld')
    .map((source) => source.label)
    .filter((label) => label !== 'No active note')).size
}

function countHeldLocalSources(members: AgentCouncilMember[], activeContextProtected: boolean): number {
  if (activeContextProtected) return 1
  return uniqueWithheldSources(members).reduce((sum, source) => sum + countFromWithheldLabel(source.label), 0)
}

function uniqueWithheldSources(members: AgentCouncilMember[]): AgentCouncilSource[] {
  const seen = new Set<string>()
  return members
    .flatMap((member) => member.sources)
    .filter((source) => source.kind === 'withheld')
    .filter((source) => {
      if (seen.has(source.label)) return false
      seen.add(source.label)
      return true
    })
}

function countFromWithheldLabel(label: string): number {
  const match = /^(\d+)\s/.exec(label.trim())
  return match ? Number(match[1]) : 1
}

function healthDotClass(health: AgentCouncilHealth): string {
  if (health === 'ready') return 'bg-[var(--grimoire-signal-accent)]'
  if (health === 'checking') return 'bg-[var(--primary)]'
  if (health === 'private-local') return 'bg-[var(--grimoire-private-local-accent)]'
  return 'bg-muted-foreground/45'
}

function stepDotClass(status: CouncilStep['status']): string {
  if (status === 'ready') return 'bg-[var(--grimoire-signal-accent)]'
  if (status === 'blocked') return 'bg-[var(--status-bar-danger-fg,var(--destructive))]'
  if (status === 'review') return 'bg-[var(--grimoire-private-local-accent)]'
  return 'bg-[var(--status-bar-warning-fg,var(--primary))]'
}

function frictionDotClass(status: CouncilFrictionMoment['status']): string {
  if (status === 'clear') return 'bg-[var(--grimoire-signal-accent)]'
  if (status === 'blocked') return 'bg-[var(--status-bar-danger-fg,var(--destructive))]'
  if (status === 'review') return 'bg-[var(--grimoire-private-local-accent)]'
  return 'bg-[var(--status-bar-warning-fg,var(--primary))]'
}

function readinessDotClass(state: AgentCouncilReadinessLane['state']): string {
  if (state === 'ready') return 'bg-[var(--grimoire-signal-accent)]'
  if (state === 'proof') return 'bg-[var(--status-bar-warning-fg,var(--primary))]'
  if (state === 'private') return 'bg-[var(--grimoire-private-local-accent)]'
  if (state === 'blocked') return 'bg-[var(--status-bar-danger-fg,var(--destructive))]'
  if (state === 'waiting') return 'bg-[var(--status-bar-warning-fg,var(--primary))]'
  return 'bg-muted-foreground/45'
}
