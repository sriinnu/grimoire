export interface AgentCouncilMember {
  id: string
  label: string
  role: string
  health: AgentCouncilHealth
  permission: string
  stance: string
  contribution: string
  claims: AgentCouncilClaim[]
  evidence: AgentCouncilEvidence[]
  sources: AgentCouncilSource[]
  active: boolean
}

export type AgentCouncilHealth = 'ready' | 'checking' | 'missing' | 'private-local'

export type AgentCouncilClaimConfidence = 'blocked' | 'high' | 'low' | 'medium'

export interface AgentCouncilClaim {
  claim: string
  confidence: AgentCouncilClaimConfidence
  conflictsWith: string[]
  sourceLabels: string[]
  stance: string
}

export type AgentCouncilSourceKind =
  | 'active-note'
  | 'ask-context'
  | 'graph-node'
  | 'linked-context'
  | 'memory-conflict'
  | 'memory-ledger'
  | 'red-team'
  | 'tool'
  | 'withheld'

export interface AgentCouncilSource {
  kind: AgentCouncilSourceKind
  label: string
  navigationTarget?: string
  targetPath?: string
}

export interface AgentCouncilEvidence {
  detail: string
  label: string
  navigationTarget?: string
  sourceKind: AgentCouncilSourceKind
  targetPath?: string
}
