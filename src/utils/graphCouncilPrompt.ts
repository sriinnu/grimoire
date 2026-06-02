import type { VaultEntry } from '../types'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { AiAgentsStatus, AiAgentStatus } from '../lib/aiAgents'
import type { AgentGraphContext } from './agentGraphContext'
import type { NoteReference } from './ai-context'
import type { PositionedGraphNode } from './graphDisplay'
import { localMachineLabel } from './platform'
import { buildSourceLabelMap } from './sourceLabels'

export interface GraphCouncilPrompt {
  references: NoteReference[]
  text: string
}

interface GraphCouncilPromptParams {
  agentGraphContext: AgentGraphContext
  aiAgentsStatus?: AiAgentsStatus
  selectedEntry: VaultEntry | null
  selectedNode: PositionedGraphNode
}

const MAX_REFERENCES = 8
const MAX_EDGE_MANIFEST = 8

/** Builds a source-safe Agent Council prompt from the visible graph selection. */
export function buildGraphCouncilPrompt({
  agentGraphContext,
  aiAgentsStatus,
  selectedEntry,
  selectedNode,
}: GraphCouncilPromptParams): GraphCouncilPrompt {
  if (selectionIsProtected(selectedEntry) || agentGraphContext.state === 'protected-active') {
    return protectedGraphPrompt(agentGraphContext)
  }

  const references = graphReferences(agentGraphContext, selectedEntry, selectedNode)
  const labelsByPath = buildSourceLabelMap(references)
  const selectedPath = selectedEntry?.path ?? selectedNode.path
  const selectedLabel = labelsByPath.get(selectedPath) ?? selectedNode.title
  const omitted = agentGraphContext.omitted
  const trimmed = omitted.truncatedNodes + omitted.truncatedEdges
  const visibility = [
    `${agentGraphContext.nodes.length} visible notes`,
    `${agentGraphContext.edges.length} visible links`,
    hasHeldLocalGraphContext(omitted) ? 'local-only graph context held by policy' : null,
    trimmed > 0 ? `${trimmed} trimmed` : null,
  ].filter(Boolean).join(', ')

  return {
    references,
    text: [
      `Ask the Agent Council about the graph node ${selectedLabel}.`,
      `Node type: ${selectedNode.type}. Degree: ${selectedNode.degree}.`,
      `Source-safe graph package: ${visibility}.`,
      ...graphEdgeManifestLines(agentGraphContext, labelsByPath),
      ...councilLaneLines(aiAgentsStatus),
      'Return: why this node matters, missing links/backlinks, contradictions, and the next reviewable Markdown change.',
    ].join('\n'),
  }
}

function selectionIsProtected(entry: VaultEntry | null): boolean {
  return entry ? resolveEntryLocalityPolicy(entry).localOnly : false
}

function protectedGraphPrompt(context: AgentGraphContext): GraphCouncilPrompt {
  return {
    references: [],
    text: [
      'Ask the Agent Council about the selected graph neighborhood without revealing protected labels, paths, or note bodies.',
      `Locality Firewall state: protected selection. ${hasHeldLocalGraphContext(context.omitted) ? 'Graph context is held local by policy.' : 'No source labels may leave this protected selection.'}`,
      'Return only local-first next steps the user can inspect inside Grimoire.',
    ].join('\n'),
  }
}

function hasHeldLocalGraphContext(omitted: AgentGraphContext['omitted']): boolean {
  return omitted.protectedNodes + omitted.protectedEdges > 0
}

function graphReferences(
  context: AgentGraphContext,
  selectedEntry: VaultEntry | null,
  selectedNode: PositionedGraphNode,
): NoteReference[] {
  const references = new Map<string, NoteReference>()
  const add = (reference: NoteReference) => {
    if (references.size >= MAX_REFERENCES && !references.has(reference.path)) return
    references.set(reference.path, reference)
  }

  if (selectedEntry) {
    add({ path: selectedEntry.path, title: selectedEntry.title, type: selectedEntry.isA })
  } else {
    add({ path: selectedNode.path, title: selectedNode.title, type: selectedNode.type })
  }

  for (const node of context.nodes) {
    add({ path: node.path, title: node.title, type: node.type })
  }

  return [...references.values()].slice(0, MAX_REFERENCES)
}

function graphEdgeManifestLines(
  context: AgentGraphContext,
  labelsByPath: ReadonlyMap<string, string>,
): string[] {
  if (context.edges.length === 0) return ['Graph edge manifest: none visible.']

  const lines = context.edges.slice(0, MAX_EDGE_MANIFEST).map((edge) => {
    const sourceLabel = labelsByPath.get(edge.sourcePath) ?? edge.sourceTitle
    const targetLabel = labelsByPath.get(edge.targetPath) ?? edge.targetTitle
    return `- ${sourceLabel} -> ${targetLabel} (${edge.label}, ${edge.kind})`
  })
  const remaining = context.edges.length - lines.length

  return [
    'Graph edge manifest:',
    ...lines,
    ...(remaining > 0 ? [`- ${remaining} additional visible graph links omitted from this prompt.`] : []),
  ]
}

function councilLaneLines(aiAgentsStatus?: AiAgentsStatus): string[] {
  if (!aiAgentsStatus) {
    return ['Compare local search, vault graph, Chitragupta memory, Codex, and Claude stances.']
  }

  return [
    'Council lane availability:',
    `- Local search: available on ${localMachineLabel()}.`,
    `- Vault graph: available on ${localMachineLabel()}.`,
    agentLaneLine('Chitragupta memory', aiAgentsStatus.chitragupta.status, 'private/local eligible'),
    agentLaneLine('Codex', aiAgentsStatus.codex.status, 'source-safe eligible'),
    agentLaneLine('Claude Code', aiAgentsStatus.claude_code.status, 'source-safe eligible'),
    'Compare only available lanes; name unavailable lanes as unavailable instead of inventing their stance.',
  ]
}

function agentLaneLine(label: string, status: AiAgentStatus, readyLabel: string): string {
  if (status === 'installed') return `- ${label}: ${readyLabel}.`
  if (status === 'checking') return `- ${label}: checking; do not request its stance yet.`
  return `- ${label}: unavailable; do not request its stance.`
}
