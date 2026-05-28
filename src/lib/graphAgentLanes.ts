import type { AgentGraphContext } from '../utils/agentGraphContext'
import type { AiAgentId, AiAgentsStatus, AiAgentStatus } from './aiAgents'

export type GraphAgentLaneKind = 'handoff' | 'local' | 'private'
export type GraphAgentLaneState = 'blocked' | 'guarded' | 'ready' | 'waiting'
export type GraphAgentLaneId = 'graph' | 'search' | AiAgentId

export interface GraphAgentLane {
  angle: number
  aiAgentId?: AiAgentId
  id: GraphAgentLaneId
  kind: GraphAgentLaneKind
  name: string
  role: string
  shortLabel: string
  shortName: string
}

export const GRAPH_AGENT_LANES: readonly GraphAgentLane[] = [
  { angle: -138, id: 'search', kind: 'local', name: 'Local search', role: 'Nearby text', shortLabel: 'S', shortName: 'Search' },
  { angle: -86, id: 'graph', kind: 'local', name: 'Vault graph', role: 'Links and gaps', shortLabel: 'G', shortName: 'Graph' },
  { aiAgentId: 'chitragupta', angle: -34, id: 'chitragupta', kind: 'private', name: 'Chitragupta', role: 'Private memory', shortLabel: 'C', shortName: 'Chitra' },
  { aiAgentId: 'codex', angle: 18, id: 'codex', kind: 'handoff', name: 'Codex', role: 'Patch path', shortLabel: 'X', shortName: 'Codex' },
  { aiAgentId: 'claude_code', angle: 70, id: 'claude_code', kind: 'handoff', name: 'Claude Code', role: 'Second stance', shortLabel: 'L', shortName: 'Claude' },
] as const

export function resolveGraphAgentLaneState(
  lane: GraphAgentLane,
  contextState: AgentGraphContext['state'],
  selectedLocalOnly: boolean,
  aiAgentsStatus?: AiAgentsStatus,
): GraphAgentLaneState {
  if (contextState === 'empty') return 'waiting'
  if (contextState === 'protected-active' || selectedLocalOnly) {
    return lane.kind === 'handoff' ? 'blocked' : 'guarded'
  }
  const availability = agentLaneAvailability(lane, aiAgentsStatus)
  if (availability === 'checking') return 'waiting'
  if (availability === 'missing') return 'blocked'
  return lane.kind === 'private' ? 'guarded' : 'ready'
}

export function graphAgentLaneCopy(
  lane: GraphAgentLane,
  state: GraphAgentLaneState,
  aiAgentsStatus?: AiAgentsStatus,
  policyProtected = false,
): string {
  const availability = agentLaneAvailability(lane, aiAgentsStatus)
  if (!policyProtected && availability === 'checking') return 'Checking'
  if (!policyProtected && availability === 'missing') return 'Missing'
  if (state === 'waiting') return 'Waiting'
  if (state === 'blocked') return 'Blocked'
  if (state === 'guarded') return lane.kind === 'private'
    ? availability === 'installed' ? 'CLI eligible' : 'Private'
    : 'Local only'
  return 'Source-safe'
}

export function graphAgentStateLabel(
  state: GraphAgentLaneState,
  availability?: AiAgentStatus | null,
): string {
  if (availability === 'checking') return 'checking local CLI status'
  if (availability === 'missing') return 'local CLI missing'
  if (state === 'ready') return 'source-safe'
  if (state === 'guarded') return 'local or private'
  if (state === 'blocked') return 'blocked by Locality Firewall'
  return 'waiting for graph package'
}

export function agentLaneAvailability(
  lane: GraphAgentLane,
  aiAgentsStatus?: AiAgentsStatus,
): AiAgentStatus | null {
  return lane.aiAgentId ? aiAgentsStatus?.[lane.aiAgentId]?.status ?? null : null
}

export function graphHandoffLaneLabel(): string {
  return GRAPH_AGENT_LANES
    .filter((lane) => lane.kind === 'handoff')
    .map((lane) => lane.name)
    .join(' / ')
}
