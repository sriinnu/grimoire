import {
  AI_AGENT_DEFINITIONS,
  type AiAgentId,
  type AiAgentsStatus,
  type AiAgentStatus,
} from './aiAgents'
import type { AskContextPackage } from './askContextPackage'
import { getPrivateAgentLane, listPrivateAgentLanes, type PrivateAgentLane } from './privateAgentLanes'
import { buildAgentCouncilClaims } from './agentCouncilContributions'
import { buildContextSources, buildGraphSources, memoryConflictLabels } from './agentCouncilContext'
import {
  buildCouncilContextEvidence,
  buildLocalSearchEvidence,
  buildVaultGraphEvidence,
  evidenceFromSources,
  toolEvidence,
} from './agentCouncilEvidence'
import { buildRedTeamCouncilContribution, buildRedTeamCouncilSources } from './agentCouncilRedTeam'
import type { AgentCouncilEvidence, AgentCouncilHealth, AgentCouncilMember, AgentCouncilSource } from './agentCouncilTypes'
import type { RedTeamPlanReview } from './redTeamPlan'
import type { AgentGraphContext } from '../utils/agentGraphContext'
export type { AgentCouncilEvidence, AgentCouncilHealth, AgentCouncilMember, AgentCouncilSource, AgentCouncilSourceKind } from './agentCouncilTypes'

interface AgentCouncilParams {
  statuses: AiAgentsStatus
  activeAgent: AiAgentId
  activeContextProtected: boolean
  activeSourceLabel?: string | null
  activeSourcePath?: string | null
  askContextPackage?: AskContextPackage | null
  graphContext?: AgentGraphContext | null
  linkedContextCount?: number
  redTeamReview?: RedTeamPlanReview | null
}

export interface AgentCouncilBrief {
  synthesis: string
  disagreements: string[]
  sourceLabels: string[]
}

/** Builds the source-safe Agent Council cards shown in the AI panel. */
export function buildAgentCouncilMembers({
  statuses,
  activeAgent,
  activeContextProtected,
  activeSourceLabel,
  activeSourcePath,
  askContextPackage,
  graphContext,
  linkedContextCount = 0,
  redTeamReview,
}: AgentCouncilParams): AgentCouncilMember[] {
  const permission = activeContextProtected
    ? 'Active local-only note withheld'
    : 'Vault-context notes only'
  const contextSources = buildContextSources(
    activeContextProtected,
    activeSourceLabel,
    activeSourcePath,
    askContextPackage,
    linkedContextCount,
  )
  const graphSources = buildGraphSources(graphContext, activeContextProtected)
  const contextEvidence = buildCouncilContextEvidence({
    activeContextProtected,
    activeSourceLabel,
    activeSourcePath,
    askContextPackage,
    linkedContextCount,
  })
  const cliMembers = AI_AGENT_DEFINITIONS
    .filter((definition) => definition.id !== 'chitragupta')
    .map((definition) => ({
      id: definition.id,
      label: definition.label,
      role: roleForAgent(definition.id),
      health: healthForAgentStatus(statuses[definition.id].status),
      permission,
      stance: stanceForAgent(statuses[definition.id].status, definition.id === activeAgent),
      contribution: contributionForAgent(definition.id, activeContextProtected, linkedContextCount, askContextPackage),
      evidence: contextEvidence,
      sources: contextSources,
      active: definition.id === activeAgent,
    }))
  return attachClaims([
    ...cliMembers,
    localMember(
      'local_search',
      'Local Search',
      'Finds matching Markdown and source-backed context.',
      permission,
      'Can ground answers in vault Markdown search results.',
      [...contextSources, { kind: 'tool', label: 'Markdown index' }],
      buildLocalSearchEvidence({
        activeContextProtected,
        activeSourceLabel,
        activeSourcePath,
        askContextPackage,
        linkedContextCount,
      }),
    ),
    localMember(
      'vault_graph',
      'Vault Graph',
      'Surfaces links, backlinks, and nearby notes.',
      permission,
      graphContribution(graphContext, activeContextProtected),
      [...contextSources, ...graphSources, { kind: 'tool', label: 'Wikilink graph' }],
      buildVaultGraphEvidence({ activeContextProtected, askContextPackage, graphContext }),
    ),
    localMember(
      'red_team',
      'Red Team',
      'Critiques product, code, UX, privacy, evidence, and execution risk.',
      permission,
      buildRedTeamCouncilContribution(redTeamReview, activeContextProtected),
      buildRedTeamCouncilSources(redTeamReview, activeContextProtected, contextSources),
      evidenceFromSources(
        buildRedTeamCouncilSources(redTeamReview, activeContextProtected, contextSources),
        { detail: 'Product, code, UX, privacy, evidence, and execution critique.', label: 'Red-Team My Plan', sourceKind: 'red-team' },
      ),
    ),
    localMember(
      'portability_context',
      'Import/Export',
      'Explains importer, export, and sync constraints.',
      permission,
      'Can flag import, export, sync, and local-only constraints.',
      [{ kind: 'tool', label: 'Portability registry' }, { kind: 'tool', label: 'Locality Firewall' }],
      toolEvidence('Portability registry', 'Import/export/sync constraints stay visible before handoff.'),
    ),
    chitraguptaPrivateMember(
      getPrivateAgentLane('chitragupta'),
      statuses.chitragupta.status,
      activeAgent === 'chitragupta',
      activeContextProtected,
      contextSources,
    ),
    ...privateLaneMembers(activeContextProtected),
  ])
}

type AgentCouncilMemberDraft = Omit<AgentCouncilMember, 'claims'>

function attachClaims(members: AgentCouncilMemberDraft[]): AgentCouncilMember[] {
  return members.map((member) => ({
    ...member,
    claims: buildAgentCouncilClaims(member),
  }))
}

/** Builds the small synthesis row below the Council cards. */
export function buildAgentCouncilBrief(
  members: AgentCouncilMember[],
  activeContextProtected: boolean,
  askContextPackage?: AskContextPackage | null,
): AgentCouncilBrief {
  const missing = members.filter((member) => member.health === 'missing').map((member) => member.label)
  const checking = members.filter((member) => member.health === 'checking').map((member) => member.label)
  const privateLocal = members.some((member) => member.health === 'private-local')
  const memoryConflicts = !activeContextProtected && askContextPackage ? memoryConflictLabels(askContextPackage) : []
  const sourceLabels = uniqueSourceLabels(members)
  const disagreements = [
    activeContextProtected ? 'Privacy gate keeps protected note content out of the pass.' : null,
    missing.length > 0 ? `Unavailable lanes: ${missing.join(', ')}.` : null,
    checking.length > 0 ? `Pending lanes: ${checking.join(', ')}.` : null,
    memoryConflicts.length > 0 ? `Memory conflicts: ${memoryConflicts.join(', ')}.` : null,
    privateLocal ? 'Private lanes require explicit output approval.' : null,
  ].filter((item): item is string => Boolean(item))

  return {
    synthesis: activeContextProtected
      ? 'Council can compare capability and policy while the protected note stays local.'
      : askContextPackage
        ? `Council can synthesize the ${askContextPackageLabel(askContextPackage)}, related memory, graph, and local tool constraints.`
      : 'Council can synthesize the active context, graph, search, and portability constraints.',
    disagreements,
    sourceLabels,
  }
}

function askContextPackageLabel(contextPackage: AskContextPackage): string {
  return contextPackage.kind === 'graph-council' ? 'graph Council package' : 'dashboard ask package'
}

function roleForAgent(agent: AiAgentId): string {
  if (agent === 'codex') return 'Code and execution critique lane.'
  return 'Reasoning, writing, and implementation lane.'
}

function healthForAgentStatus(status: AiAgentStatus): AgentCouncilHealth {
  if (status === 'installed') return 'ready'
  if (status === 'checking') return 'checking'
  return 'missing'
}

function stanceForAgent(status: AiAgentStatus, active: boolean): string {
  if (status === 'missing') return 'Needs local setup before it can contribute.'
  if (status === 'checking') return 'Checking local availability.'
  return active ? 'Current speaker.' : 'Available for a council pass.'
}

function contributionForAgent(
  agent: AiAgentId,
  protectedContext: boolean,
  linkedCount: number,
  askContextPackage?: AskContextPackage | null,
): string {
  if (protectedContext) return 'Can respond without protected note body, title, or path.'
  if (askContextPackage) {
    const askSources = countLabel(askContextPackage.references.length, 'ask source')
    const memoryRecords = countLabel(askContextPackage.memoryReferences.length, 'memory record')
    const conflictCount = memoryConflictLabels(askContextPackage).length
    if (conflictCount > 0) {
      return `Can synthesize ${askSources}, ${memoryRecords}, and ${countLabel(conflictCount, 'memory conflict')}.`
    }
    return `Can synthesize ${askSources} and ${memoryRecords}.`
  }
  if (agent === 'codex') return 'Can critique plans and execution risks from allowed context.'
  return linkedCount > 0
    ? 'Can synthesize the active note with linked context.'
    : 'Can work from the active vault-context note.'
}

function chitraguptaPrivateMember(
  lane: PrivateAgentLane,
  status: AiAgentStatus,
  active: boolean,
  activeContextProtected: boolean,
  contextSources: AgentCouncilSource[],
): AgentCouncilMemberDraft {
  const health = status === 'missing'
    ? 'missing'
    : status === 'checking' ? 'checking' : 'private-local'
  return {
    id: lane.id,
    label: lane.label,
    role: lane.role,
    health,
    permission: activeContextProtected
      ? 'Private memory lane; protected note withheld'
      : 'Private memory lane; contract-gated outputs',
    stance: chitraguptaStance(status),
    contribution: activeContextProtected
      ? 'Can report capability health while the protected note stays local.'
      : 'Live recall, wiki, graph, and diagnostics require the Chitragupta MCP contract.',
    evidence: activeContextProtected
      ? toolEvidence('Locality Firewall', 'Protected active note stays out of the private memory lane.')
      : toolEvidence('Chitragupta MCP contract', 'Local memory action is contract-gated and approval-gated.'),
    sources: [
      ...contextSources,
      { kind: 'tool', label: 'Chitragupta MCP contract' },
      { kind: 'tool', label: 'Locality Firewall' },
    ],
    active,
  }
}

function chitraguptaStance(status: AiAgentStatus): string {
  if (status === 'missing') return 'Private memory contract unavailable until local setup is repaired.'
  if (status === 'checking') return 'Checking private local memory contract; no handoff yet.'
  return 'Private memory contract is local; outputs require explicit approval.'
}

function graphContribution(
  graphContext: AgentGraphContext | null | undefined,
  protectedContext: boolean,
): string {
  if (protectedContext || graphContext?.state === 'protected-active') {
    return 'Graph neighborhood withheld by the Locality Firewall.'
  }
  if (!graphContext || graphContext.state === 'empty' || graphContext.nodes.length <= 1) {
    return 'No source-safe graph neighbors found yet.'
  }
  const neighborCount = graphContext.nodes.filter((node) => !node.active).length
  return `Can traverse ${neighborCount} source-safe graph neighbors and ${graphContext.edges.length} edges.`
}

function localMember(
  id: string,
  label: string,
  role: string,
  permission: string,
  contribution: string,
  sources: AgentCouncilSource[],
  evidence: AgentCouncilEvidence[],
): AgentCouncilMemberDraft {
  return {
    id,
    label,
    role,
    health: 'ready',
    permission,
    stance: 'Ready to contribute source-backed context.',
    contribution,
    evidence,
    sources,
    active: false,
  }
}

function privateLaneMembers(activeContextProtected: boolean): AgentCouncilMemberDraft[] {
  const permission = activeContextProtected
    ? 'Private lane; protected note still withheld'
    : 'Private lane; explicit output approval'
  return listPrivateAgentLanes()
    .filter((lane) => lane.id !== 'chitragupta')
    .map((lane) => ({
      id: lane.id,
      label: lane.label,
      role: lane.role,
      health: 'private-local',
      permission,
      stance: 'Visible as capability only; no private internals exposed.',
      contribution: 'Can contribute only after explicit user approval of its output.',
      evidence: toolEvidence('Private local capability', 'Capability is visible; output requires explicit user approval.'),
      sources: [{ kind: 'tool', label: 'Private local capability' }],
      active: false,
    }))
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}`
}

function uniqueSourceLabels(members: AgentCouncilMember[]): string[] {
  return [...new Set(members.flatMap((member) => member.sources)
    .filter((source) => source.kind !== 'withheld')
    .map((source) => source.label))]
}
