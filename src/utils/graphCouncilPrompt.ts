import type { VaultEntry } from '../types'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { AgentGraphContext } from './agentGraphContext'
import type { NoteReference } from './ai-context'
import type { PositionedGraphNode } from './graphDisplay'

export interface GraphCouncilPrompt {
  references: NoteReference[]
  text: string
}

interface GraphCouncilPromptParams {
  agentGraphContext: AgentGraphContext
  selectedEntry: VaultEntry | null
  selectedNode: PositionedGraphNode
}

const MAX_REFERENCES = 8

/** Builds a source-safe Agent Council prompt from the visible graph selection. */
export function buildGraphCouncilPrompt({
  agentGraphContext,
  selectedEntry,
  selectedNode,
}: GraphCouncilPromptParams): GraphCouncilPrompt {
  if (selectionIsProtected(selectedEntry) || agentGraphContext.state === 'protected-active') {
    return protectedGraphPrompt(agentGraphContext)
  }

  const references = graphReferences(agentGraphContext, selectedEntry, selectedNode)
  const omitted = agentGraphContext.omitted
  const held = omitted.protectedNodes + omitted.protectedEdges
  const trimmed = omitted.truncatedNodes + omitted.truncatedEdges
  const visibility = [
    `${agentGraphContext.nodes.length} visible notes`,
    `${agentGraphContext.edges.length} visible links`,
    held > 0 ? `${held} held local` : null,
    trimmed > 0 ? `${trimmed} trimmed` : null,
  ].filter(Boolean).join(', ')

  return {
    references,
    text: [
      `Ask the Agent Council about the graph node [[${selectedNode.title}]].`,
      `Node type: ${selectedNode.type}. Degree: ${selectedNode.degree}.`,
      `Source-safe graph package: ${visibility}.`,
      'Compare local search, vault graph, Chitragupta memory, Codex, and Claude stances.',
      'Return: why this node matters, missing links/backlinks, contradictions, and the next reviewable Markdown change.',
    ].join('\n'),
  }
}

function selectionIsProtected(entry: VaultEntry | null): boolean {
  return entry ? resolveEntryLocalityPolicy(entry).localOnly : false
}

function protectedGraphPrompt(context: AgentGraphContext): GraphCouncilPrompt {
  const held = context.omitted.protectedNodes + context.omitted.protectedEdges

  return {
    references: [],
    text: [
      'Ask the Agent Council about the selected graph neighborhood without revealing protected labels, paths, or note bodies.',
      `Locality Firewall state: protected selection. ${held} graph items are held local.`,
      'Return only local-first next steps the user can inspect inside Grimoire.',
    ].join('\n'),
  }
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
