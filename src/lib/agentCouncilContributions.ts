import type {
  AgentCouncilClaim,
  AgentCouncilClaimConfidence,
  AgentCouncilEvidence,
  AgentCouncilHealth,
  AgentCouncilSource,
} from './agentCouncilTypes'

export type { AgentCouncilClaim, AgentCouncilClaimConfidence } from './agentCouncilTypes'

interface AgentCouncilClaimInput {
  contribution: string
  evidence: AgentCouncilEvidence[]
  health: AgentCouncilHealth
  sources: AgentCouncilSource[]
  stance: string
}

/** Converts a Council lane into an inspectable, source-backed claim. */
export function buildAgentCouncilClaims(member: AgentCouncilClaimInput): AgentCouncilClaim[] {
  return [{
    claim: `Capability: ${member.contribution}`,
    confidence: claimConfidence(member),
    conflictsWith: member.sources
      .filter((source) => source.kind === 'memory-conflict')
      .map((source) => source.label.replace(/^Conflicts:\s*/i, '')),
    sourceLabels: claimSourceLabels(member),
    stance: member.stance,
  }]
}

function claimSourceLabels(member: AgentCouncilClaimInput): string[] {
  return uniqueLabels([
    ...member.sources
      .filter((source) => source.kind !== 'withheld' && source.kind !== 'memory-conflict')
      .map((source) => source.label),
    ...member.evidence
      .filter((evidence) => evidence.sourceKind !== 'withheld' && evidence.sourceKind !== 'memory-conflict')
      .map((evidence) => evidence.label),
  ]).slice(0, 6)
}

function claimConfidence(member: AgentCouncilClaimInput): AgentCouncilClaimConfidence {
  if (member.health === 'missing') return 'blocked'
  if (member.health === 'checking') return 'low'
  if (member.sources.some((source) => source.kind === 'withheld')) return 'medium'
  if (member.health === 'private-local') return 'medium'
  return member.sources.length > 0 ? 'high' : 'medium'
}

function uniqueLabels(labels: string[]): string[] {
  return [...new Set(labels.filter((label) => label.trim().length > 0))]
}
