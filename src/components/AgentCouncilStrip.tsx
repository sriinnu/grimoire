import { Brain, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { type CSSProperties } from 'react'
import {
  buildAgentCouncilBrief,
  buildAgentCouncilMembers,
  type AgentCouncilSource,
} from '../lib/agentCouncil'
import type { AskContextPackage } from '../lib/askContextPackage'
import {
  buildAgentCouncilPassBrief,
  buildAgentCouncilWorkflow,
  type AgentCouncilPassBrief,
  type AgentCouncilWorkflowStep,
} from '../lib/agentCouncilWorkflow'
import type { AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface AgentCouncilStripProps {
  statuses: AiAgentsStatus
  activeAgent: AiAgentId
  activeContextProtected: boolean
  activeSourceLabel?: string | null
  activeSourcePath?: string | null
  askContextPackage?: AskContextPackage | null
  graphContext?: AgentGraphContext | null
  linkedContextCount?: number
  onOpenSource?: (path: string) => void
}

/** Compact Agent Council surface with health, permissions, and current stances. */
export function AgentCouncilStrip({
  statuses,
  activeAgent,
  activeContextProtected,
  activeSourceLabel,
  activeSourcePath,
  askContextPackage,
  graphContext,
  linkedContextCount = 0,
  onOpenSource,
}: AgentCouncilStripProps) {
  const members = buildAgentCouncilMembers({
    statuses,
    activeAgent,
    activeContextProtected,
    activeSourceLabel,
    activeSourcePath,
    askContextPackage,
    graphContext,
    linkedContextCount,
  })
  const brief = buildAgentCouncilBrief(members, activeContextProtected, askContextPackage)
  const workflow = buildAgentCouncilWorkflow({ activeContextProtected, brief, members })
  const passBrief = buildAgentCouncilPassBrief({ activeContextProtected, brief, members })

  return (
    <section className="grimoire-agent-council border-b border-border px-3 py-2" data-testid="agent-council">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground">
          <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
          <span>Agent Council</span>
        </div>
        <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[10px]">
          <ShieldCheck className="size-3" />
          {activeContextProtected ? 'Protected context' : 'Source-safe'}
        </Badge>
      </div>
      <CouncilPassBrief brief={passBrief} />
      <div className="flex gap-1.5 overflow-x-auto pb-0.5">
        {members.map((member, index) => (
          <div
            key={member.id}
            className="grimoire-agent-council__member grimoire-control-entrance min-w-[154px] rounded-md border border-border bg-muted/30 px-2 py-1.5"
            data-testid="agent-council-member"
            style={{ '--motion-stagger-delay': `${index * 28}ms` } as CSSProperties}
          >
            <div className="flex min-w-0 items-center gap-1.5">
              <span className={`size-1.5 shrink-0 rounded-full ${healthDotClass(member.health)}`} />
              <span className="min-w-0 flex-1 truncate text-[11px] font-medium text-foreground">
                {member.label}
              </span>
              {member.active ? <Brain className="size-3 shrink-0 text-muted-foreground" /> : null}
            </div>
            <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
              {member.stance}
            </div>
            <div className="mt-1 line-clamp-2 text-[10px] leading-snug text-foreground">
              {member.contribution}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {member.sources.slice(0, 3).map((source) => (
                <SourceBadge
                  key={`${member.id}:${source.kind}:${source.label}`}
                  source={source}
                  onOpenSource={onOpenSource}
                />
              ))}
            </div>
            <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
              <Search className="size-3 shrink-0" />
              <span className="truncate">{member.permission}</span>
            </div>
          </div>
        ))}
      </div>
      <div
        className="grimoire-agent-council__brief mt-2 rounded-md border border-border bg-background/60 px-2 py-1.5"
        data-testid="agent-council-brief"
      >
        <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground">
          <Sparkles className="size-3 text-muted-foreground" />
          <span>Synthesis</span>
        </div>
        <p className="mt-0.5 line-clamp-2 text-[10px] leading-snug text-muted-foreground">{brief.synthesis}</p>
        <div className="mt-1 flex flex-wrap gap-1">
          {brief.disagreements.slice(0, 3).map((signal) => (
            <Badge key={signal} variant="outline" className="rounded-md px-1 text-[9px]">
              {signal}
            </Badge>
          ))}
        </div>
      </div>
      <CouncilWorkflow steps={workflow} />
    </section>
  )
}

function CouncilPassBrief({ brief }: { brief: AgentCouncilPassBrief }) {
  return (
    <div
      className="grimoire-agent-council__pass mb-2 rounded-md border border-border bg-background/60 px-2 py-1.5"
      data-testid="agent-council-pass"
    >
      <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground">
        <Sparkles className="size-3 text-muted-foreground" />
        <span>{brief.title}</span>
      </div>
      <div className="mt-1 grid gap-1 text-[9px] leading-snug text-muted-foreground">
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
      className="grimoire-agent-council__workflow mt-2 grid grid-cols-2 gap-1.5"
      data-testid="agent-council-workflow"
    >
      {steps.map((step) => (
        <div
          key={step.id}
          className="rounded-md border border-border bg-background/45 px-2 py-1.5"
          data-status={step.status}
        >
          <div className="flex items-center gap-1.5 text-[10px] font-medium text-foreground">
            <span className={`size-1.5 rounded-full ${workflowDotClass(step.status)}`} />
            <span>{step.label}</span>
          </div>
          <div className="mt-0.5 line-clamp-2 text-[9px] leading-snug text-muted-foreground">
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
    return (
      <Button
        type="button"
        variant="outline"
        size="xs"
        className="h-5 max-w-full px-1 text-[9px]"
        onClick={() => onOpenSource(targetPath)}
      >
        <span className="truncate">{source.label}</span>
      </Button>
    )
  }

  return (
    <Badge variant="outline" className="max-w-full rounded-md px-1 text-[9px]">
      <span className="truncate">{source.label}</span>
    </Badge>
  )
}

function healthDotClass(health: string): string {
  if (health === 'ready') return 'bg-[var(--grimoire-signal-accent)]'
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
