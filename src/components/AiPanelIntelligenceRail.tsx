import { useMemo, useState } from 'react'
import type { AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import type { AskContextPackage } from '../lib/askContextPackage'
import type { CrystallizeProposalSummary } from '../lib/crystallizeProposal'
import type { EntryLocalityPolicy } from '../lib/localityPolicy'
import type { ChitraguptaRecallAttachment } from '../lib/chitraguptaContext'
import type { ContextManifestV1 } from '../lib/contextManifest'
import {
  buildAskContextCapsulePreview,
  buildContextCapsulePackagePreview,
  buildContextCapsulePreview,
} from '../lib/contextCapsule'
import type { ModifiedFile, VaultEntry } from '../types'
import type { NoteListItem } from '../utils/ai-context'
import { buildCachedAgentGraphContext } from '../utils/agentGraphContext'
import { ContextCapsuleDialog } from './ContextCapsuleDialog'
import { AiPanelIntelligenceSummary } from './AiPanelIntelligenceSummary'
import { RedTeamPlanCard } from './RedTeamPlanCard'
import { RedTeamPlanDialog } from './RedTeamPlanDialog'
import { buildRedTeamPatchPlan } from '../lib/redTeamPatchPlan'
import { buildRedTeamPlanReview } from '../lib/redTeamPlan'

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
  modifiedFiles?: readonly ModifiedFile[]
  hasContext: boolean
  hasLatestResponse: boolean
  linkedEntries: VaultEntry[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  onCrystallize: () => void
  onOpenNote?: (path: string) => void
  openTabs?: VaultEntry[]
  proposalSummary: CrystallizeProposalSummary | null
  askContextPackage?: AskContextPackage | null
  vaultPath?: string
  onUseContextManifest?: (manifest: ContextManifestV1) => void
  onUseChitraguptaRecall?: (attachment: ChitraguptaRecallAttachment) => void
}

/**
 * The rail owns exactly one always-visible promise: inspect the context that
 * will accompany a request. Council, memory review, and run workflows belong
 * to explicit actions, not the idle chat state.
 */
export function AiPanelIntelligenceRail({
  activeEntry,
  activeNoteContent,
  activePolicy,
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  entries,
  modifiedFiles,
  linkedEntries,
  noteList,
  noteListFilter,
  openTabs,
  askContextPackage,
  vaultPath,
  onUseContextManifest,
  onUseChitraguptaRecall,
}: AiPanelIntelligenceRailProps) {
  const [contextInspectorOpen, setContextInspectorOpen] = useState(false)
  const [planReviewOpen, setPlanReviewOpen] = useState(false)
  const [patchPlanOpen, setPatchPlanOpen] = useState(false)
  const activeContextProtected = activePolicy?.localOnly === true
  const redTeamReview = useMemo(
    () => buildRedTeamPlanReview({ activeEntry, activeNoteContent }),
    [activeEntry, activeNoteContent],
  )
  const redTeamPatchPlan = useMemo(() => buildRedTeamPatchPlan(redTeamReview), [redTeamReview])
  // Built with the exact helper the send path uses (useAiPanelContextSnapshot),
  // so the inspector's graph counts report what a request actually carries.
  const graphContext = useMemo(() => (
    activeEntry && !askContextPackage
      ? buildCachedAgentGraphContext(activeEntry, entries)
      : undefined
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
  const heldCount = activeContextProtected ? 1 : contextCapsule.counts.exclusions
  const sourceCount = activeContextProtected ? 0 : contextCapsule.includedNotes.length

  return (
    <>
      {(activeEntry || askContextPackage) ? (
        <AiPanelIntelligenceSummary
          activeContextProtected={activeContextProtected}
          heldCount={heldCount}
          sourceCount={sourceCount}
          onInspectContext={() => setContextInspectorOpen(true)}
          onReviewPlan={() => setPlanReviewOpen((open) => !open)}
          reviewOpen={planReviewOpen}
        />
      ) : null}
      {planReviewOpen && activeEntry ? (
        <RedTeamPlanCard
          review={redTeamReview}
          onReviewPlan={() => setPatchPlanOpen(true)}
        />
      ) : null}
      <ContextCapsuleDialog
        key={contextCapsulePackage.reviewReceipt}
        defaultAiAgent={defaultAiAgent}
        defaultAiModel={defaultAiModel}
        defaultAiProvider={defaultAiProvider}
        open={contextInspectorOpen}
        packagePreview={contextCapsulePackage}
        preview={contextCapsule}
        modifiedFiles={modifiedFiles}
        entries={entries}
        activeEntry={activeEntry}
        vaultPath={vaultPath}
        onUseContextManifest={onUseContextManifest}
        onUseChitraguptaRecall={onUseChitraguptaRecall}
        onClose={() => setContextInspectorOpen(false)}
      />
      <RedTeamPlanDialog
        open={patchPlanOpen}
        plan={redTeamPatchPlan}
        onClose={() => setPatchPlanOpen(false)}
      />
    </>
  )
}
