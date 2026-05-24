import { useMemo, useState } from 'react'
import {
  createAiAgentAvailability,
  createMissingAiAgentsStatus,
  type AiAgentId,
  type AiAgentsStatus,
} from '../lib/aiAgents'
import type { AskContextPackage } from '../lib/askContextPackage'
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
import { buildAgentGraphContext } from '../utils/agentGraphContext'
import type { NoteListItem } from '../utils/ai-context'
import { AgentCouncilStrip } from './AgentCouncilStrip'
import { AiCrystallizeLoopCard } from './AiCrystallizeLoopCard'
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
  entries: VaultEntry[]
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
  entries,
  hasContext,
  hasLatestResponse,
  linkedEntries,
  noteList,
  noteListFilter,
  onCrystallize,
  onOpenNote,
  openTabs,
  proposalSummary,
  askContextPackage,
}: AiPanelIntelligenceRailProps) {
  const [contextCapsuleOpen, setContextCapsuleOpen] = useState(false)
  const [redTeamPlanOpen, setRedTeamPlanOpen] = useState(false)
  const activeContextProtected = activePolicy?.localOnly === true
  const aiAgentsStatus = useMemo(() => {
    const statuses = providedAiAgentsStatus ?? createMissingAiAgentsStatus()
    return {
      ...statuses,
      [defaultAiAgent]: createAiAgentAvailability(defaultAiAgentReady ? 'installed' : 'missing'),
    }
  }, [defaultAiAgent, defaultAiAgentReady, providedAiAgentsStatus])
  const graphContext = useMemo(() => buildAgentGraphContext({
    activeEntry,
    entries,
  }), [activeEntry, entries])
  const contextCapsule = useMemo(() => (
    askContextPackage && !activeEntry
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

  return (
    <>
      {activeEntry || askContextPackage ? (
        <ContextCapsuleCard
          preview={contextCapsule}
          onReviewPackage={() => setContextCapsuleOpen(true)}
        />
      ) : null}
      <AgentCouncilStrip
        statuses={aiAgentsStatus}
        activeAgent={defaultAiAgent}
        activeContextProtected={activeContextProtected}
        activeSourceLabel={activePolicy?.localOnly ? null : activeEntry?.title}
        activeSourcePath={activePolicy?.localOnly ? null : activeEntry?.path}
        askContextPackage={activeContextProtected ? null : askContextPackage}
        graphContext={graphContext}
        linkedContextCount={activeContextProtected ? 0 : linkedEntries.length}
        onOpenSource={onOpenNote}
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
      <RedTeamPlanDialog
        open={redTeamPlanOpen}
        plan={redTeamPatchPlan}
        onClose={() => setRedTeamPlanOpen(false)}
      />
      <ContextCapsuleDialog
        open={contextCapsuleOpen}
        packagePreview={contextCapsulePackage}
        onClose={() => setContextCapsuleOpen(false)}
      />
    </>
  )
}
