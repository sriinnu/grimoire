import type { AgentGraphContext } from '../utils/agentGraphContext'
import type { AskContextPackage } from './askContextPackage'
import type { AgentCouncilEvidence, AgentCouncilSource } from './agentCouncilTypes'

interface CouncilContextEvidenceParams {
  activeContextProtected: boolean
  activeSourceLabel?: string | null
  activeSourcePath?: string | null
  askContextPackage?: AskContextPackage | null
  linkedContextCount: number
}

/** Builds source-safe evidence snippets for generic Council lanes. */
export function buildCouncilContextEvidence({
  activeContextProtected,
  activeSourceLabel,
  activeSourcePath,
  askContextPackage,
  linkedContextCount,
}: CouncilContextEvidenceParams): AgentCouncilEvidence[] {
  if (activeContextProtected) return protectedEvidence()
  const evidence = [
    ...askContextEvidence(askContextPackage),
    ...(activeSourceLabel ? [{
      detail: 'Active note context root.',
      label: activeSourceLabel,
      navigationTarget: activeSourceLabel,
      sourceKind: 'active-note' as const,
      targetPath: activeSourcePath ?? undefined,
    }] : []),
    ...(linkedContextCount > 0 ? [{
      detail: 'Linked notes available for source-safe synthesis.',
      label: `${linkedContextCount} linked notes`,
      sourceKind: 'linked-context' as const,
    }] : []),
  ]
  return evidence.length > 0 ? evidence.slice(0, 4) : toolEvidence('No active note', 'Waiting for a source-safe note.')
}

/** Builds inspectable search evidence from active note, ask package, and linked context. */
export function buildLocalSearchEvidence(params: CouncilContextEvidenceParams): AgentCouncilEvidence[] {
  if (params.activeContextProtected) return protectedEvidence()
  const evidence = buildCouncilContextEvidence(params)
    .filter((item) => item.sourceKind !== 'tool' || item.label !== 'No active note')
  return evidence.length > 0
    ? evidence.slice(0, 4)
    : toolEvidence('Markdown index', 'Ready, but no matching source-safe note is selected yet.')
}

/** Builds inspectable graph evidence from live graph context or graph Council packages. */
export function buildVaultGraphEvidence({
  activeContextProtected,
  askContextPackage,
  graphContext,
}: {
  activeContextProtected: boolean
  askContextPackage?: AskContextPackage | null
  graphContext?: AgentGraphContext | null
}): AgentCouncilEvidence[] {
  if (activeContextProtected || graphContext?.state === 'protected-active') {
    return [{ detail: 'Graph neighborhood is withheld by the Locality Firewall.', label: 'Protected graph neighborhood', sourceKind: 'withheld' }]
  }
  const graphEvidence = graphContext?.state === 'ready' ? [
    ...graphContext.nodes
      .filter((node) => !node.active)
      .slice(0, 2)
      .map((node) => ({
        detail: `${node.type} neighbor, degree ${node.degree}.`,
        label: node.title,
        navigationTarget: node.title,
        sourceKind: 'graph-node' as const,
        targetPath: node.path,
      })),
    ...graphContext.edges.slice(0, 2).map((edge) => ({
      detail: `${edge.label || edge.kind} edge.`,
      label: `${edge.sourceTitle} -> ${edge.targetTitle}`,
      navigationTarget: edge.targetTitle,
      sourceKind: 'graph-node' as const,
      targetPath: edge.targetPath,
    })),
  ] : []
  const packagedEdges = askContextPackage?.graph?.edges?.slice(0, 2).map((edge) => ({
    detail: `${edge.label || edge.kind} package edge.`,
    label: `${edge.sourceTitle} -> ${edge.targetTitle}`,
    sourceKind: 'graph-node' as const,
  })) ?? []
  const omitted = graphOmissionEvidence(graphContext, askContextPackage)
  const evidence = [...graphEvidence, ...packagedEdges, ...omitted]
  return evidence.length > 0 ? evidence.slice(0, 5) : toolEvidence('Wikilink graph', 'Ready; no safe graph neighbors are visible yet.')
}

export function evidenceFromSources(sources: AgentCouncilSource[], fallback: AgentCouncilEvidence): AgentCouncilEvidence[] {
  const evidence = sources
    .filter((source) => source.kind !== 'memory-conflict')
    .slice(0, 3)
    .map((source) => ({
      detail: source.kind === 'withheld' ? 'Locality Firewall keeps this context local.' : 'Source-safe Council input.',
      label: source.label,
      navigationTarget: source.navigationTarget,
      sourceKind: source.kind,
      targetPath: source.targetPath,
    }))
  return evidence.length > 0 ? evidence : [fallback]
}

export function toolEvidence(label: string, detail: string): AgentCouncilEvidence[] {
  return [{ detail, label, sourceKind: 'tool' }]
}

function askContextEvidence(contextPackage: AskContextPackage | null | undefined): AgentCouncilEvidence[] {
  if (!contextPackage) return []
  return [
    ...contextPackage.references.slice(0, 1).map((reference) => ({
      detail: `${reference.type} surfaced by ${contextPackage.kind === 'graph-council' ? 'graph Council' : 'dashboard ask'} package.`,
      label: reference.title,
      navigationTarget: reference.title,
      sourceKind: 'ask-context' as const,
      targetPath: reference.path,
    })),
    ...contextPackage.memoryReferences.slice(0, 2).map((memory) => ({
      detail: `Memory ledger record, ${memory.confidence ?? 'unknown'} confidence.`,
      label: memory.title,
      navigationTarget: memory.title,
      sourceKind: 'memory-ledger' as const,
      targetPath: memory.path,
    })),
    ...contextPackage.references.slice(1, 2).map((reference) => ({
      detail: `${reference.type} surfaced by ${contextPackage.kind === 'graph-council' ? 'graph Council' : 'dashboard ask'} package.`,
      label: reference.title,
      navigationTarget: reference.title,
      sourceKind: 'ask-context' as const,
      targetPath: reference.path,
    })),
  ]
}

function graphOmissionEvidence(
  graphContext: AgentGraphContext | null | undefined,
  askContextPackage: AskContextPackage | null | undefined,
): AgentCouncilEvidence[] {
  const omitted = (graphContext?.omitted.protectedEdges ?? 0)
    + (graphContext?.omitted.protectedNodes ?? 0)
    + (graphContext?.omitted.truncatedEdges ?? 0)
    + (graphContext?.omitted.truncatedNodes ?? 0)
    + (askContextPackage?.graph?.protectedEdges ?? 0)
    + (askContextPackage?.graph?.truncatedEdges ?? 0)
    + (askContextPackage?.graph?.truncatedNodes ?? 0)
  return omitted > 0
    ? [{ detail: 'Protected or trimmed graph items stayed out of the packet.', label: 'Graph omissions', sourceKind: 'withheld' }]
    : []
}

function protectedEvidence(): AgentCouncilEvidence[] {
  return [{ detail: 'Locality Firewall withheld title, path, body, and frontmatter.', label: 'Protected active note', sourceKind: 'withheld' }]
}
