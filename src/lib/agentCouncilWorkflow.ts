import type { AgentCouncilBrief, AgentCouncilMember } from './agentCouncil'

export type AgentCouncilWorkflowStatus = 'ready' | 'limited' | 'blocked' | 'review'

export interface AgentCouncilWorkflowStep {
  id: 'intake' | 'council' | 'synthesis' | 'review'
  detail: string
  label: string
  status: AgentCouncilWorkflowStatus
}

export interface AgentCouncilPassBrief {
  deliverable: string
  safety: string
  scope: string
  title: string
}

interface WorkflowParams {
  activeContextProtected: boolean
  brief: AgentCouncilBrief
  members: AgentCouncilMember[]
}

/** Builds the visible workflow rail for source-safe Council asks. */
export function buildAgentCouncilWorkflow({
  activeContextProtected,
  brief,
  members,
}: WorkflowParams): AgentCouncilWorkflowStep[] {
  const readyCount = members.filter((member) => member.health === 'ready' || member.health === 'private-local').length
  const unavailableCount = members.filter((member) => member.health === 'missing' || member.health === 'checking').length
  const sourceCount = activeContextProtected ? 0 : brief.sourceLabels.length
  const hasPrivate = members.some((member) => member.health === 'private-local')

  return [
    {
      id: 'intake',
      label: 'Intake',
      status: activeContextProtected ? 'blocked' : 'ready',
      detail: activeContextProtected
        ? 'Protected context withheld.'
        : `${sourceCount} source labels ready.`,
    },
    {
      id: 'council',
      label: 'Council',
      status: unavailableCount > 0 ? 'limited' : 'ready',
      detail: unavailableCount > 0
        ? `${readyCount} lanes ready, ${unavailableCount} waiting.`
        : `${readyCount} lanes ready.`,
    },
    {
      id: 'synthesis',
      label: 'Synthesis',
      status: brief.disagreements.length > 0 ? 'limited' : 'ready',
      detail: brief.disagreements.length > 0
        ? `${brief.disagreements.length} friction signals.`
        : 'No friction signals.',
    },
    {
      id: 'review',
      label: 'Review',
      status: hasPrivate || activeContextProtected ? 'review' : 'ready',
      detail: hasPrivate
        ? 'Private outputs need approval.'
        : 'Ready for reviewable Markdown.',
    },
  ]
}

/** Summarizes the active Council pass in human-facing, source-safe terms. */
export function buildAgentCouncilPassBrief({
  activeContextProtected,
  brief,
  members,
}: WorkflowParams): AgentCouncilPassBrief {
  const missingCount = members.filter((member) => member.health === 'missing' || member.health === 'checking').length
  const privateCount = members.filter((member) => member.health === 'private-local').length

  if (activeContextProtected) {
    return {
      title: 'Policy-only pass',
      scope: 'Protected note withheld by Locality Firewall.',
      deliverable: 'Return safe next steps without note labels, paths, or bodies.',
      safety: 'No protected content enters agent context.',
    }
  }

  return {
    title: missingCount > 0 ? 'Limited council pass' : 'Source-safe council pass',
    scope: sourceScope(members, brief.sourceLabels),
    deliverable: 'Synthesize stances into one reviewable Markdown next step.',
    safety: privateCount > 0
      ? `${privateCount} private lanes require explicit approval.`
      : 'Public vault context only.',
  }
}

function sourceScope(members: AgentCouncilMember[], sourceLabels: string[]): string {
  const prioritized = prioritizedSourceLabels(members)
  const fallback = sourceLabels.filter((label) => label !== 'No active note')
  const labels = prioritized.length > 0 ? prioritized : fallback
  const visible = labels.slice(0, 3)
  if (visible.length === 0) return 'No active source yet.'
  const suffix = labels.length > visible.length ? ` +${labels.length - visible.length} more` : ''
  return `${visible.join(', ')}${suffix}`
}

function prioritizedSourceLabels(members: AgentCouncilMember[]): string[] {
  const priorities = ['active-note', 'ask-context', 'memory-ledger', 'memory-conflict', 'graph-node', 'linked-context'] as const
  return [...new Set(
    priorities.flatMap((kind) => members
      .flatMap((member) => member.sources)
      .filter((source) => source.kind === kind)
      .map((source) => source.label)),
  )]
}
