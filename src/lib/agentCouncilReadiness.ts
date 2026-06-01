import type { AgentCouncilMember } from './agentCouncilTypes'

export type AgentCouncilReadinessState = 'blocked' | 'private' | 'proof' | 'ready' | 'unavailable' | 'waiting'

export interface AgentCouncilReadinessLane {
  detail: string
  id: string
  label: string
  state: AgentCouncilReadinessState
  status: string
}

export interface AgentCouncilReadinessSummary {
  blocked: number
  private: number
  proof: number
  ready: number
  unavailable: number
  waiting: number
}

const EXTERNAL_AGENT_IDS = new Set(['claude_code', 'codex'])
const LOCAL_TOOL_IDS = new Set(['local_search', 'vault_graph', 'red_team'])

/** Converts Council health into explicit handoff readiness copy for the UI. */
export function buildAgentCouncilReadiness(
  members: AgentCouncilMember[],
  activeContextProtected: boolean,
): AgentCouncilReadinessLane[] {
  return members.map((member) => ({
    id: member.id,
    label: member.label,
    ...readinessForMember(member, activeContextProtected),
  }))
}

/** Counts explicit Council readiness states without reading note content. */
export function summarizeAgentCouncilReadiness(
  lanes: readonly AgentCouncilReadinessLane[],
): AgentCouncilReadinessSummary {
  return lanes.reduce<AgentCouncilReadinessSummary>((summary, lane) => ({
    ...summary,
    [lane.state]: summary[lane.state] + 1,
  }), {
    blocked: 0,
    private: 0,
    proof: 0,
    ready: 0,
    unavailable: 0,
    waiting: 0,
  })
}

function readinessForMember(
  member: AgentCouncilMember,
  activeContextProtected: boolean,
): Pick<AgentCouncilReadinessLane, 'detail' | 'state' | 'status'> {
  if (member.health === 'checking') {
    return { detail: 'Health check still running.', state: 'waiting', status: 'Waiting' }
  }

  if (member.health === 'missing') {
    return { detail: 'Local setup or contract is not ready.', state: 'unavailable', status: 'Unavailable' }
  }

  if (member.health === 'blocked') {
    return { detail: 'Runtime contract is blocked; no live handoff.', state: 'blocked', status: 'Blocked' }
  }

  if (member.health === 'private-local') {
    return { detail: 'Private lane; output needs approval.', state: 'private', status: 'Private' }
  }

  if (activeContextProtected && EXTERNAL_AGENT_IDS.has(member.id)) {
    return { detail: 'No protected packet leaves the vault.', state: 'blocked', status: 'Blocked' }
  }

  if (member.id === 'portability_context') {
    return {
      detail: 'Shows preview/apply evidence; live provider proof is still pending.',
      state: 'proof',
      status: 'Proof boundary',
    }
  }

  if (LOCAL_TOOL_IDS.has(member.id)) {
    return { detail: 'Runs against local metadata and source labels.', state: 'ready', status: 'Local' }
  }

  return { detail: 'Receives source-safe labels only.', state: 'ready', status: 'Source-safe' }
}
