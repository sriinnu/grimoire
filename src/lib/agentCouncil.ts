import {
  AI_AGENT_DEFINITIONS,
  type AiAgentId,
  type AiAgentsStatus,
  type AiAgentStatus,
} from './aiAgents'
import type { AskContextPackage } from './askContextPackage'
import { getPrivateAgentLane, listPrivateAgentLanes, type PrivateAgentLane } from './privateAgentLanes'
import type { AgentGraphContext } from '../utils/agentGraphContext'

export interface AgentCouncilMember {
  id: string
  label: string
  role: string
  health: AgentCouncilHealth
  permission: string
  stance: string
  contribution: string
  sources: AgentCouncilSource[]
  active: boolean
}

export type AgentCouncilHealth = 'ready' | 'checking' | 'missing' | 'private-local'
export type AgentCouncilSourceKind =
  | 'active-note'
  | 'ask-context'
  | 'graph-node'
  | 'linked-context'
  | 'memory-ledger'
  | 'tool'
  | 'withheld'

export interface AgentCouncilSource {
  kind: AgentCouncilSourceKind
  label: string
  targetPath?: string
}

interface AgentCouncilParams {
  statuses: AiAgentsStatus
  activeAgent: AiAgentId
  activeContextProtected: boolean
  activeSourceLabel?: string | null
  activeSourcePath?: string | null
  askContextPackage?: AskContextPackage | null
  graphContext?: AgentGraphContext | null
  linkedContextCount?: number
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
      sources: contextSources,
      active: definition.id === activeAgent,
    }))
  return [
    ...cliMembers,
    localMember(
      'local_search',
      'Local Search',
      'Finds matching Markdown and source-backed context.',
      permission,
      'Can ground answers in vault Markdown search results.',
      [...contextSources, { kind: 'tool', label: 'Markdown index' }],
    ),
    localMember(
      'vault_graph',
      'Vault Graph',
      'Surfaces links, backlinks, and nearby notes.',
      permission,
      graphContribution(graphContext, activeContextProtected),
      [...contextSources, ...graphSources, { kind: 'tool', label: 'Wikilink graph' }],
    ),
    localMember(
      'portability_context',
      'Import/Export',
      'Explains importer, export, and sync constraints.',
      permission,
      'Can flag import, export, sync, and local-only constraints.',
      [{ kind: 'tool', label: 'Portability registry' }, { kind: 'tool', label: 'Locality Firewall' }],
    ),
    chitraguptaPrivateMember(
      getPrivateAgentLane('chitragupta'),
      statuses.chitragupta.status,
      activeAgent === 'chitragupta',
      activeContextProtected,
      contextSources,
    ),
    ...privateLaneMembers(activeContextProtected),
  ]
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
  const sourceLabels = uniqueSourceLabels(members)
  const disagreements = [
    activeContextProtected ? 'Privacy gate keeps protected note content out of the pass.' : null,
    missing.length > 0 ? `Unavailable lanes: ${missing.join(', ')}.` : null,
    checking.length > 0 ? `Pending lanes: ${checking.join(', ')}.` : null,
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
    return `Can synthesize ${askContextPackage.references.length} ask sources and ${askContextPackage.memoryReferences.length} memory records.`
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
): AgentCouncilMember {
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
): AgentCouncilMember {
  return {
    id,
    label,
    role,
    health: 'ready',
    permission,
    stance: 'Ready to contribute source-backed context.',
    contribution,
    sources,
    active: false,
  }
}

function privateLaneMembers(activeContextProtected: boolean): AgentCouncilMember[] {
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
      sources: [{ kind: 'tool', label: 'Private local capability' }],
      active: false,
    }))
}

function buildContextSources(
  protectedContext: boolean,
  activeSourceLabel: string | null | undefined,
  activeSourcePath: string | null | undefined,
  askContextPackage: AskContextPackage | null | undefined,
  linkedCount: number,
): AgentCouncilSource[] {
  if (protectedContext) return [{ kind: 'withheld', label: 'Protected active note' }]
  const sources: AgentCouncilSource[] = []
  if (askContextPackage) {
    sources.push(...askContextSources(askContextPackage))
  }
  if (activeSourceLabel) {
    sources.push({ kind: 'active-note', label: activeSourceLabel, targetPath: activeSourcePath ?? undefined })
  }
  if (linkedCount > 0) sources.push({ kind: 'linked-context', label: `${linkedCount} linked notes` })
  return sources.length > 0 ? sources : [{ kind: 'tool', label: 'No active note' }]
}

function askContextSources(contextPackage: AskContextPackage): AgentCouncilSource[] {
  const references = contextPackage.references.slice(0, 3).map((reference) => ({
    kind: 'ask-context' as const,
    label: reference.title,
    targetPath: reference.path,
  }))
  const memories = contextPackage.memoryReferences.slice(0, 2).map((memory) => ({
    kind: 'memory-ledger' as const,
    label: memory.title,
    targetPath: memory.path,
  }))
  const withheld = contextPackage.withheld.protectedNotes
    + contextPackage.withheld.protectedMemories
    + (contextPackage.graph?.protectedEdges ?? 0)
  const withheldLabel = contextPackage.kind === 'graph-council' ? 'graph items withheld' : 'dashboard items withheld'
  return [
    ...references,
    ...memories,
    ...(withheld > 0 ? [{ kind: 'withheld' as const, label: `${withheld} ${withheldLabel}` }] : []),
  ]
}

function buildGraphSources(
  graphContext: AgentGraphContext | null | undefined,
  protectedContext: boolean,
): AgentCouncilSource[] {
  if (protectedContext || graphContext?.state === 'protected-active') {
    return [{ kind: 'withheld', label: 'Protected graph neighborhood' }]
  }
  if (!graphContext || graphContext.state !== 'ready') return []

  return graphContext.nodes
    .filter((node) => !node.active)
    .slice(0, 2)
    .map((node) => ({
      kind: 'graph-node',
      label: node.title,
      targetPath: node.path,
    }))
}

function uniqueSourceLabels(members: AgentCouncilMember[]): string[] {
  return [...new Set(members.flatMap((member) => member.sources.map((source) => source.label)))]
}
