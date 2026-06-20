import { Brain, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { type CSSProperties, useMemo, useState } from 'react'
import {
  buildAgentCouncilBrief,
  buildAgentCouncilMembers,
  type AgentCouncilSource,
} from '../lib/agentCouncil'
import type { AgentCouncilClaim } from '../lib/agentCouncilContributions'
import {
  buildAgentCouncilSynthesisPacket,
  type AgentCouncilOneAnswer,
  type AgentCouncilSynthesisPacket,
} from '../lib/agentCouncilSynthesis'
import type { AskContextPackage } from '../lib/askContextPackage'
import type { RedTeamPlanReview } from '../lib/redTeamPlan'
import {
  buildAgentCouncilPassBrief,
  buildAgentCouncilWorkflow,
  type AgentCouncilPassBrief,
  type AgentCouncilWorkflowStep,
} from '../lib/agentCouncilWorkflow'
import type { AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { AgentRouteDisclosure } from './AgentRouteDisclosure'
import { AgentCouncilEvidenceList } from './AgentCouncilEvidenceList'
import { AgentCouncilMap } from './AgentCouncilMap'
import { AgentCouncilSynthesisDialog } from './AgentCouncilSynthesisDialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface AgentCouncilStripProps {
  statuses: AiAgentsStatus
  activeAgent: AiAgentId
  activeContextProtected: boolean
  activeSourceLabel?: string | null
  activeSourcePath?: string | null
  askContextPackage?: AskContextPackage | null
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  graphContext?: AgentGraphContext | null
  linkedContextCount?: number
  onCrystallizeSynthesis?: (packet: AgentCouncilSynthesisPacket) => void
  onOpenSource?: (path: string) => void
  redTeamReview?: RedTeamPlanReview | null
}

/** Compact Agent Council surface with health, permissions, and current stances. */
export function AgentCouncilStrip({
  statuses,
  activeAgent,
  activeContextProtected,
  activeSourceLabel,
  activeSourcePath,
  askContextPackage,
  defaultAiModel,
  defaultAiProvider,
  graphContext,
  linkedContextCount = 0,
  onCrystallizeSynthesis,
  onOpenSource,
  redTeamReview,
}: AgentCouncilStripProps) {
  const [synthesisOpen, setSynthesisOpen] = useState(false)
  const members = buildAgentCouncilMembers({
    statuses,
    activeAgent,
    activeContextProtected,
    activeSourceLabel,
    activeSourcePath,
    askContextPackage,
    graphContext,
    linkedContextCount,
    redTeamReview,
  })
  const brief = buildAgentCouncilBrief(members, activeContextProtected, askContextPackage)
  const workflow = buildAgentCouncilWorkflow({ activeContextProtected, brief, members })
  const passBrief = buildAgentCouncilPassBrief({ activeContextProtected, brief, members })
  const synthesisPacket = useMemo(() => buildAgentCouncilSynthesisPacket({
    activeContextProtected,
    brief,
    members,
    passBrief,
    redTeamReview,
    workflow,
  }), [activeContextProtected, brief, members, passBrief, redTeamReview, workflow])

  return (
    <section className="grimoire-agent-council border-b border-border px-4 py-3" data-testid="agent-council">
      <div className="mb-2 flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
          <Sparkles className="size-4 shrink-0 text-muted-foreground" />
          <span>Agent Council</span>
        </div>
        <Badge variant="outline" className="h-7 rounded-xl px-2.5 text-[13px]">
          <ShieldCheck className="size-4" />
          {activeContextProtected ? 'Protected context' : 'Source-safe'}
        </Badge>
      </div>
      <CouncilPassBrief brief={passBrief} onReviewSynthesis={() => setSynthesisOpen(true)} />
      <AgentRouteDisclosure
        agent={activeAgent}
        className="mb-3"
        contextProtected={activeContextProtected}
        model={defaultAiModel}
        provider={defaultAiProvider}
      />
      <AgentCouncilMap
        activeContextProtected={activeContextProtected}
        brief={brief}
        members={members}
        oneAnswer={synthesisPacket.oneAnswer}
      />
      <CouncilOneAnswer oneAnswer={synthesisPacket.oneAnswer} />
      <div className="flex gap-2 overflow-x-auto pb-0.5">
        {members.map((member, index) => (
          <div
            key={member.id}
            className="grimoire-agent-council__member grimoire-control-entrance min-w-[190px] rounded-xl border border-border bg-muted/30 px-3 py-2.5"
            data-testid="agent-council-member"
            style={{ '--motion-stagger-delay': `${index * 28}ms` } as CSSProperties}
          >
            <div className="flex min-w-0 items-center gap-2">
              <span className={`size-2 shrink-0 rounded-full ${healthDotClass(member.health)}`} />
              <span className="min-w-0 flex-1 truncate text-[13px] font-medium text-foreground">
                {member.label}
              </span>
              {member.active ? <Brain className="size-4 shrink-0 text-muted-foreground" /> : null}
            </div>
            <div className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
              {member.stance}
            </div>
            <div className="mt-2 line-clamp-2 text-[13px] leading-snug text-foreground">
              {member.contribution}
            </div>
            {member.claims[0] ? <ClaimMeta claim={member.claims[0]} /> : null}
            <AgentCouncilEvidenceList
              evidence={visibleEvidence(member)}
              memberId={member.id}
              memberLabel={member.label}
              onOpenSource={onOpenSource}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              {visibleSources(member.sources).map((source) => (
                <SourceBadge
                  key={`${member.id}:${source.kind}:${source.label}`}
                  source={source}
                  onOpenSource={onOpenSource}
                />
              ))}
            </div>
            <div className="mt-2 flex items-center gap-2 text-[13px] text-muted-foreground">
              <Search className="size-4 shrink-0" />
              <span className="truncate">{member.permission}</span>
            </div>
          </div>
        ))}
      </div>
      <div
        className="grimoire-agent-council__brief mt-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
        data-testid="agent-council-brief"
      >
        <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
          <Sparkles className="size-4 text-muted-foreground" />
          <span>Synthesis</span>
        </div>
        <p className="mt-1 line-clamp-2 text-[13px] leading-snug text-muted-foreground">{brief.synthesis}</p>
      </div>
      <CouncilWorkflow steps={workflow} />
      <AgentCouncilSynthesisDialog
        open={synthesisOpen}
        packet={synthesisPacket}
        onCrystallize={onCrystallizeSynthesis ? () => {
          setSynthesisOpen(false)
          onCrystallizeSynthesis(synthesisPacket)
        } : undefined}
        onClose={() => setSynthesisOpen(false)}
      />
    </section>
  )
}

function visibleSources(sources: AgentCouncilSource[]): AgentCouncilSource[] {
  const priority: AgentCouncilSource['kind'][] = ['memory-conflict', 'withheld', 'memory-ledger', 'active-note', 'ask-context']
  return [...sources].sort((a, b) => priorityRank(a.kind, priority) - priorityRank(b.kind, priority)).slice(0, 4)
}

function visibleEvidence(member: ReturnType<typeof buildAgentCouncilMembers>[number]) {
  return member.id === 'local_search' || member.id === 'vault_graph' || member.id === 'portability_context'
    ? member.evidence
    : []
}

function priorityRank(kind: AgentCouncilSource['kind'], priority: AgentCouncilSource['kind'][]): number {
  const rank = priority.indexOf(kind)
  return rank === -1 ? priority.length : rank
}

function CouncilOneAnswer({ oneAnswer }: { oneAnswer: AgentCouncilOneAnswer }) {
  return (
    <div
      className="grimoire-agent-council__answer grimoire-control-entrance mb-3 rounded-xl border border-[var(--grimoire-signal-border)] bg-[var(--grimoire-signal-bg)] px-3 py-2.5"
      data-answer-state={answerState(oneAnswer)}
      data-confidence={oneAnswer.confidence}
      data-conflicts={oneAnswer.conflictCount > 0 ? 'true' : 'false'}
      data-testid="agent-council-one-answer"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-semibold text-[var(--grimoire-signal-text)]">
          <Sparkles className="size-4 shrink-0" />
          <span className="truncate">{oneAnswer.title}</span>
        </div>
        <Badge variant="outline" className="shrink-0 rounded-lg px-2 text-[12px]">
          {oneAnswer.confidence}
        </Badge>
      </div>
      <p className="mt-2 text-[13px] leading-snug text-[var(--grimoire-signal-text)]">
        {oneAnswer.answer}
      </p>
      <div className="mt-2 flex flex-wrap gap-2">
        <Badge variant="secondary" className="rounded-lg px-2 text-[12px]">
          {countLabel(oneAnswer.sourceCount, 'source')}
        </Badge>
        <Badge variant="outline" className="rounded-lg px-2 text-[12px]">
          {countLabel(oneAnswer.conflictCount, 'friction')}
        </Badge>
      </div>
      <div className="mt-2 text-[12px] leading-snug text-muted-foreground">
        {oneAnswer.nextStep}
      </div>
    </div>
  )
}

function ClaimMeta({ claim }: { claim: AgentCouncilClaim }) {
  return (
    <div
      className="mt-2 flex flex-wrap gap-2 text-[12px] text-muted-foreground"
      data-testid="agent-council-claim"
    >
      <Badge variant="outline" className="rounded-lg px-2 text-[12px]">
        {claimConfidenceLabel(claim.confidence)}
      </Badge>
      <Badge variant="outline" className="rounded-lg px-2 text-[12px]">
        {countLabel(claim.sourceLabels.length, 'source')}
      </Badge>
      {claim.conflictsWith.length > 0 ? (
        <Badge variant="outline" className={`rounded-lg px-2 text-[12px] ${sourceBadgeClass('memory-conflict')}`}>
          {countLabel(claim.conflictsWith.length, 'conflict')}
        </Badge>
      ) : null}
    </div>
  )
}

function claimConfidenceLabel(confidence: string): string {
  if (confidence === 'blocked') return 'Blocked claim'
  return `${confidence[0]?.toUpperCase() ?? ''}${confidence.slice(1)} confidence`
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function answerState(oneAnswer: AgentCouncilOneAnswer): 'blocked' | 'guarded' | 'ready' {
  if (oneAnswer.confidence === 'blocked') return 'blocked'
  return oneAnswer.conflictCount > 0 ? 'guarded' : 'ready'
}

function CouncilPassBrief({
  brief,
  onReviewSynthesis,
}: {
  brief: AgentCouncilPassBrief
  onReviewSynthesis: () => void
}) {
  return (
    <div
      className="grimoire-agent-council__pass mb-3 rounded-xl border border-border bg-background/60 px-3 py-2.5"
      data-testid="agent-council-pass"
    >
      <div className="flex items-center justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
          <Sparkles className="size-4 shrink-0 text-muted-foreground" />
          <span className="truncate">{brief.title}</span>
        </div>
        <Button
          type="button"
          variant="outline"
          size="xs"
          className="h-7 shrink-0 px-2 text-[12px]"
          onClick={onReviewSynthesis}
          data-testid="agent-council-review-synthesis"
        >
          Review synthesis
        </Button>
      </div>
      <div className="mt-2 grid gap-2 text-[12px] leading-snug text-muted-foreground">
        <span>{brief.scope}</span>
        <span>{brief.deliverable}</span>
        <span>{brief.safety}</span>
      </div>
    </div>
  )
}

function CouncilWorkflow({ steps }: { steps: AgentCouncilWorkflowStep[] }) {
  return (
    <div
      className="grimoire-agent-council__workflow mt-3 grid grid-cols-2 gap-2"
      data-testid="agent-council-workflow"
    >
      {steps.map((step) => (
        <div
          key={step.id}
          className="rounded-xl border border-border bg-background/45 px-3 py-2.5"
          data-status={step.status}
        >
          <div className="flex items-center gap-2 text-[13px] font-medium text-foreground">
            <span className={`size-2 rounded-full ${workflowDotClass(step.status)}`} />
            <span>{step.label}</span>
          </div>
          <div className="mt-1 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
            {step.detail}
          </div>
        </div>
      ))}
    </div>
  )
}

function SourceBadge({
  source,
  onOpenSource,
}: {
  source: AgentCouncilSource
  onOpenSource?: (path: string) => void
}) {
  const targetPath = source.targetPath
  if (targetPath && onOpenSource) {
    const navigationTarget = source.navigationTarget ?? source.label
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        className={`h-7 max-w-full px-2 text-[12px] ${sourceBadgeClass(source.kind)}`}
        aria-label={`Open ${source.label} source`}
        onClick={() => onOpenSource(navigationTarget)}
        data-source-kind={source.kind}
      >
        <span className="truncate">{source.label}</span>
      </Button>
    )
  }

  return (
    <Badge
      variant="outline"
      className={`max-w-full rounded-lg px-2 text-[12px] ${sourceBadgeClass(source.kind)}`}
      data-source-kind={source.kind}
    >
      <span className="truncate">{source.label}</span>
    </Badge>
  )
}

function sourceBadgeClass(kind: AgentCouncilSource['kind']): string {
  return kind === 'memory-conflict'
    ? 'border-[var(--grimoire-private-local-accent)] text-[var(--grimoire-private-local-accent)]'
    : ''
}

function healthDotClass(health: string): string {
  if (health === 'ready') return 'bg-[var(--grimoire-signal-accent)]'
  if (health === 'blocked') return 'bg-[var(--status-bar-danger-fg,var(--destructive))]'
  if (health === 'checking') return 'bg-[var(--primary)]'
  if (health === 'private-local') return 'bg-[var(--grimoire-private-local-accent)]'
  return 'bg-muted-foreground/45'
}

function workflowDotClass(status: AgentCouncilWorkflowStep['status']): string {
  if (status === 'ready') return 'bg-[var(--grimoire-signal-accent)]'
  if (status === 'blocked') return 'bg-[var(--status-bar-danger-fg,var(--destructive))]'
  if (status === 'review') return 'bg-[var(--grimoire-private-local-accent)]'
  return 'bg-[var(--status-bar-warning-fg,var(--primary))]'
}
