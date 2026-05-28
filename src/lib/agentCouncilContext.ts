import type { AgentGraphContext } from '../utils/agentGraphContext'
import type { AskContextPackage } from './askContextPackage'
import type { AgentCouncilSource } from './agentCouncilTypes'

/** Builds source-safe labels for the active Council context. */
export function buildContextSources(
  protectedContext: boolean,
  activeSourceLabel: string | null | undefined,
  activeSourcePath: string | null | undefined,
  askContextPackage: AskContextPackage | null | undefined,
  linkedCount: number,
): AgentCouncilSource[] {
  if (protectedContext) return [{ kind: 'withheld', label: 'Protected active note' }]
  const sources: AgentCouncilSource[] = []
  if (askContextPackage) sources.push(...askContextSources(askContextPackage))
  if (activeSourceLabel) {
    sources.push({
      kind: 'active-note',
      label: activeSourceLabel,
      navigationTarget: activeSourceLabel,
      targetPath: activeSourcePath ?? undefined,
    })
  }
  if (linkedCount > 0) sources.push({ kind: 'linked-context', label: `${linkedCount} linked notes` })
  return sources.length > 0 ? sources : [{ kind: 'tool', label: 'No active note' }]
}

/** Builds source-safe graph labels for Council previews. */
export function buildGraphSources(
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
      navigationTarget: node.title,
      targetPath: node.path,
    }))
}

export function memoryConflictLabels(contextPackage: AskContextPackage): string[] {
  return [...new Set(contextPackage.memoryReferences.flatMap((memory) => memory.contradictionLabels ?? []))]
}

function askContextSources(contextPackage: AskContextPackage): AgentCouncilSource[] {
  const references = contextPackage.references.slice(0, 3).map((reference) => ({
    kind: 'ask-context' as const,
    label: reference.title,
    navigationTarget: reference.title,
    targetPath: reference.path,
  }))
  const memories = contextPackage.memoryReferences.slice(0, 2).map((memory) => ({
    kind: 'memory-ledger' as const,
    label: memory.title,
    navigationTarget: memory.title,
    targetPath: memory.path,
  }))
  const conflicts = memoryConflictLabels(contextPackage).slice(0, 2).map((label) => ({
    kind: 'memory-conflict' as const,
    label: `Conflicts: ${label}`,
  }))
  const withheld = contextPackage.withheld.protectedNotes
    + contextPackage.withheld.protectedMemories
    + (contextPackage.graph?.protectedEdges ?? 0)
  const withheldLabel = contextPackage.kind === 'graph-council' ? 'graph items withheld' : 'dashboard items withheld'
  return [
    ...references,
    ...memories,
    ...conflicts,
    ...(withheld > 0 ? [{ kind: 'withheld' as const, label: `${withheld} ${withheldLabel}` }] : []),
  ]
}
