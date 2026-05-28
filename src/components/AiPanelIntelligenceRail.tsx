import { useMemo, useState } from 'react'
import {
  createAiAgentAvailability,
  createMissingAiAgentsStatus,
  type AiAgentId,
  type AiAgentsStatus,
} from '../lib/aiAgents'
import type { AskContextPackage } from '../lib/askContextPackage'
import type { AgentCouncilSynthesisPacket } from '../lib/agentCouncilSynthesis'
import type { CrystallizeProposalSummary } from '../lib/crystallizeProposal'
import type { EntryLocalityPolicy } from '../lib/localityPolicy'
import {
  buildAskContextCapsulePreview,
  buildContextCapsulePackagePreview,
  buildContextCapsulePreview,
} from '../lib/contextCapsule'
import { buildRedTeamPlanReview } from '../lib/redTeamPlan'
import { buildRedTeamPatchPlan } from '../lib/redTeamPatchPlan'
import type { VaultEntry } from '../types'
import { buildAgentGraphContext, type AgentGraphContext } from '../utils/agentGraphContext'
import type { NoteListItem } from '../utils/ai-context'
import { AgentCouncilStrip } from './AgentCouncilStrip'
import { AiCrystallizeLoopCard } from './AiCrystallizeLoopCard'
import { AiPanelIntelligenceSummary } from './AiPanelIntelligenceSummary'
import { ContextCapsuleCard } from './ContextCapsuleCard'
import { ContextCapsuleDialog } from './ContextCapsuleDialog'
import { RedTeamPlanCard } from './RedTeamPlanCard'
import { RedTeamPlanDialog } from './RedTeamPlanDialog'

interface AiPanelIntelligenceRailProps {
  activeEntry?: VaultEntry | null
  activeNoteContent?: string | null
  activePolicy: EntryLocalityPolicy | null
  aiAgentsStatus?: AiAgentsStatus
  canCrystallize: boolean
  crystallizeBlockedReason: string | null
  defaultAiAgent: AiAgentId
  defaultAiAgentReady: boolean
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  entries: VaultEntry[]
  hasContext: boolean
  hasLatestResponse: boolean
  linkedEntries: VaultEntry[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  onCrystallize: () => void
  onCrystallizeCouncil?: (packet: AgentCouncilSynthesisPacket) => void
  onOpenNote?: (path: string) => void
  openTabs?: VaultEntry[]
  proposalSummary: CrystallizeProposalSummary | null
  askContextPackage?: AskContextPackage | null
}

/** Intelligence surfaces that sit above the AI message stream. */
export function AiPanelIntelligenceRail({
  activeEntry,
  activeNoteContent,
  activePolicy,
  aiAgentsStatus: providedAiAgentsStatus,
  canCrystallize,
  crystallizeBlockedReason,
  defaultAiAgent,
  defaultAiAgentReady,
  defaultAiModel,
  defaultAiProvider,
  entries,
  hasContext,
  hasLatestResponse,
  linkedEntries,
  noteList,
  noteListFilter,
  onCrystallize,
  onCrystallizeCouncil,
  onOpenNote,
  openTabs,
  proposalSummary,
  askContextPackage,
}: AiPanelIntelligenceRailProps) {
  const [contextCapsuleOpen, setContextCapsuleOpen] = useState(false)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [redTeamPlanOpen, setRedTeamPlanOpen] = useState(false)
  const activeContextProtected = activePolicy?.localOnly === true
  const councilContextProtected = activeContextProtected && !askContextPackage
  const aiAgentsStatus = useMemo(() => {
    const statuses = providedAiAgentsStatus ?? createMissingAiAgentsStatus()
    return {
      ...statuses,
      [defaultAiAgent]: createAiAgentAvailability(defaultAiAgentReady ? 'installed' : 'missing'),
    }
  }, [defaultAiAgent, defaultAiAgentReady, providedAiAgentsStatus])
  const graphContext = useMemo(() => (
    graphCouncilContextFromPackage(askContextPackage)
      ?? buildAgentGraphContext({ activeEntry, entries })
  ), [activeEntry, askContextPackage, entries])
  const contextCapsule = useMemo(() => (
    askContextPackage
      ? buildAskContextCapsulePreview(askContextPackage)
      : buildContextCapsulePreview({
          activeEntry,
          entries,
          graphContext,
          linkedEntries,
          noteList,
          noteListFilter,
          openTabs,
        })
  ), [activeEntry, askContextPackage, entries, graphContext, linkedEntries, noteList, noteListFilter, openTabs])
  const contextCapsulePackage = useMemo(
    () => buildContextCapsulePackagePreview(contextCapsule),
    [contextCapsule],
  )
  const redTeamReview = useMemo(() => buildRedTeamPlanReview({
    activeEntry,
    activeNoteContent,
  }), [activeEntry, activeNoteContent])
  const redTeamPatchPlan = useMemo(() => buildRedTeamPatchPlan(redTeamReview), [redTeamReview])
  const heldCount = activeContextProtected ? 1 : contextCapsule.counts.exclusions
  const sourceCount = activeContextProtected ? 0 : contextCapsule.includedNotes.length
  const graphNodeCount = activeContextProtected ? 0 : contextCapsule.projectMap.graphNodes
  const routeReady = aiAgentsStatus[defaultAiAgent]?.status === 'installed'

  return (
    <>
      <AiPanelIntelligenceSummary
        activeContextProtected={activeContextProtected}
        canCrystallize={canCrystallize}
        expanded={detailsOpen}
        graphNodeCount={graphNodeCount}
        hasContext={hasContext}
        hasLatestResponse={hasLatestResponse}
        heldCount={heldCount}
        routeReady={routeReady}
        sourceCount={sourceCount}
        onCrystallize={onCrystallize}
        onToggle={() => setDetailsOpen((open) => !open)}
      />
      {detailsOpen ? (
        <div data-testid="ai-intelligence-details">
          {activeEntry || askContextPackage ? (
            <ContextCapsuleCard
              defaultAiAgent={defaultAiAgent}
              defaultAiModel={defaultAiModel}
              defaultAiProvider={defaultAiProvider}
              preview={contextCapsule}
              reviewReceipt={contextCapsulePackage.reviewReceipt}
              onReviewPackage={() => setContextCapsuleOpen(true)}
            />
          ) : null}
          <AgentCouncilStrip
            statuses={aiAgentsStatus}
            activeAgent={defaultAiAgent}
            activeContextProtected={councilContextProtected}
            activeSourceLabel={councilContextProtected || askContextPackage ? null : activeEntry?.title}
            activeSourcePath={councilContextProtected || askContextPackage ? null : activeEntry?.path}
            askContextPackage={councilContextProtected ? null : askContextPackage}
            defaultAiModel={defaultAiModel}
            defaultAiProvider={defaultAiProvider}
            graphContext={graphContext}
            linkedContextCount={councilContextProtected || askContextPackage ? 0 : linkedEntries.length}
            onCrystallizeSynthesis={onCrystallizeCouncil}
            onOpenSource={onOpenNote}
            redTeamReview={redTeamReview}
          />
          <AiCrystallizeLoopCard
            activeContextProtected={activeContextProtected}
            blockedReason={crystallizeBlockedReason}
            canCrystallize={canCrystallize}
            hasContext={hasContext}
            hasLatestResponse={hasLatestResponse}
            linkedCount={activeContextProtected ? 0 : linkedEntries.length}
            onCrystallize={onCrystallize}
            proposalSummary={activeContextProtected ? null : proposalSummary}
          />
          <RedTeamPlanCard review={redTeamReview} onReviewPlan={() => setRedTeamPlanOpen(true)} />
        </div>
      ) : null}
      <RedTeamPlanDialog
        open={redTeamPlanOpen}
        plan={redTeamPatchPlan}
        onClose={() => setRedTeamPlanOpen(false)}
      />
      <ContextCapsuleDialog
        defaultAiAgent={defaultAiAgent}
        defaultAiModel={defaultAiModel}
        defaultAiProvider={defaultAiProvider}
        open={contextCapsuleOpen}
        packagePreview={contextCapsulePackage}
        onClose={() => setContextCapsuleOpen(false)}
      />
    </>
  )
}

function graphCouncilContextFromPackage(contextPackage?: AskContextPackage | null): AgentGraphContext | null {
  if (contextPackage?.kind !== 'graph-council') return null

  const pathByTitle = new Map(contextPackage.references.map((reference) => [reference.title, reference.path]))
  const graph = contextPackage.graph
  return {
    edges: (graph?.edges ?? []).map((edge) => ({
      kind: graphPackageEdgeKind(edge.kind),
      label: edge.label,
      sourcePath: pathByTitle.get(edge.sourceTitle) ?? edge.sourceTitle,
      sourceTitle: edge.sourceTitle,
      targetPath: pathByTitle.get(edge.targetTitle) ?? edge.targetTitle,
      targetTitle: edge.targetTitle,
    })),
    omitted: {
      protectedEdges: graph?.protectedEdges ?? 0,
      protectedNodes: contextPackage.withheld.protectedNotes,
      truncatedEdges: graph?.truncatedEdges ?? 0,
      truncatedNodes: graph?.truncatedNodes ?? 0,
    },
    nodes: contextPackage.references.map((reference, index) => ({
      active: index === 0,
      degree: 0,
      path: reference.path,
      title: reference.title,
      type: reference.type ?? 'Note',
    })),
    state: contextPackage.visibleCount > 0 ? 'ready' : 'empty',
    totals: {
      visibleEdges: graph?.visibleEdges ?? 0,
      visibleNodes: graph?.visibleNodes ?? contextPackage.visibleCount,
    },
  }
}

function graphPackageEdgeKind(kind: string): AgentGraphContext['edges'][number]['kind'] {
  return kind === 'relationship' ? 'relationship' : 'body-link'
}
