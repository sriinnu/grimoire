import { useMemo, useRef, useState } from 'react'
import {
  AiPanelComposer,
  AiPanelContextBar,
  AiPanelHeader,
  AiPanelMessageHistory,
} from './AiPanelChrome'
import {
  DEFAULT_AI_AGENT,
  describeAiAgentRoute,
  getAiAgentDefinition,
  type AiAgentId,
  type AiAgentsStatus,
} from '../lib/aiAgents'
import type { AskContextPackage } from '../lib/askContextPackage'
import { type NoteListItem } from '../utils/ai-context'
import type { VaultEntry } from '../types'
import { useAiPanelController, type AiPanelController } from './useAiPanelController'
import { useAiPanelPromptQueue } from './useAiPanelPromptQueue'
import { useAiPanelFocus } from './useAiPanelFocus'
import { CrystallizeReviewDialog } from './CrystallizeReviewDialog'
import {
  buildCrystallizeProposal,
  latestCrystallizableMessage,
  persistCrystallizedNote,
  summarizeCrystallizeProposal,
} from '../lib/crystallizeProposal'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { AiPanelIntelligenceRail } from './AiPanelIntelligenceRail'

export type { AiAgentMessage } from '../hooks/useCliAiAgent'

interface AiPanelProps {
  onClose: () => void
  onOpenNote?: (path: string) => void
  onUnsupportedAiPaste?: (message: string) => void
  defaultAiAgent?: AiAgentId
  defaultAiAgentReady?: boolean
  aiAgentsStatus?: AiAgentsStatus
  defaultAiProvider?: string | null
  defaultAiModel?: string | null
  onFileCreated?: (relativePath: string) => void
  onFileModified?: (relativePath: string) => void
  onVaultChanged?: () => void
  vaultPath: string
  activeEntry?: VaultEntry | null
  /** Direct content of the active note from the editor tab. */
  activeNoteContent?: string | null
  entries?: VaultEntry[]
  openTabs?: VaultEntry[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
}

interface AiPanelViewProps {
  controller: AiPanelController
  vaultPath: string
  onClose: () => void
  onOpenNote?: (path: string) => void
  onUnsupportedAiPaste?: (message: string) => void
  defaultAiAgent?: AiAgentId
  defaultAiAgentReady?: boolean
  aiAgentsStatus?: AiAgentsStatus
  defaultAiProvider?: string | null
  defaultAiModel?: string | null
  activeEntry?: VaultEntry | null
  activeNoteContent?: string | null
  entries?: VaultEntry[]
  openTabs?: VaultEntry[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  onFileCreated?: (relativePath: string) => void
  onVaultChanged?: () => void
}

export function AiPanelView({
  controller,
  vaultPath,
  onClose,
  onOpenNote,
  onUnsupportedAiPaste,
  defaultAiAgent: providedDefaultAiAgent,
  defaultAiAgentReady: providedDefaultAiAgentReady,
  aiAgentsStatus: providedAiAgentsStatus,
  defaultAiProvider,
  defaultAiModel,
  activeEntry,
  activeNoteContent,
  entries,
  openTabs,
  noteList,
  noteListFilter,
  onFileCreated,
  onVaultChanged,
}: AiPanelViewProps) {
  const defaultAiAgent = providedDefaultAiAgent ?? DEFAULT_AI_AGENT
  const defaultAiAgentReady = providedDefaultAiAgentReady ?? true
  const useLegacyAiExperience = providedDefaultAiAgent === undefined && providedDefaultAiAgentReady === undefined
  const inputRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [crystallizeOpen, setCrystallizeOpen] = useState(false)
  const [crystallizeApplying, setCrystallizeApplying] = useState(false)
  const [crystallizeError, setCrystallizeError] = useState<string | null>(null)
  const [askContextPackage, setAskContextPackage] = useState<AskContextPackage | null>(null)
  const agentLabel = getAiAgentDefinition(defaultAiAgent).label
  const agentRouteLabel = describeAiAgentRoute(defaultAiAgent, defaultAiProvider, defaultAiModel)
  const {
    agent,
    input,
    setInput,
    linkedEntries,
    hasContext,
    isActive,
    handleSend,
    handleNavigateWikilink,
    handleNewChat,
  } = controller

  useAiPanelPromptQueue({
    agent,
    input,
    isActive,
    onContextPackage: setAskContextPackage,
    setInput,
  })
  useAiPanelFocus({
    inputRef,
    panelRef,
    hasMessages: agent.messages.length > 0,
    isActive,
    onClose,
  })
  const latestCrystallizable = useMemo(() => latestCrystallizableMessage(agent.messages), [agent.messages])
  const latestResponse = latestCrystallizable?.response ?? null
  const activePolicy = useMemo(() => activeEntry ? resolveEntryLocalityPolicy(activeEntry) : null, [activeEntry])
  const crystallizeBlockedReason = activePolicy?.localOnly
    ? 'Local-only context is protected. Crystallize from a public note or start a fresh chat.'
    : latestResponse ? null : 'Send an AI message first.'
  const crystallizeProposal = useMemo(() => {
    if (!latestResponse || !vaultPath || crystallizeBlockedReason) return null
    return buildCrystallizeProposal({
      activeEntry,
      askContextPackage: latestCrystallizable?.contextPackage ?? null,
      response: latestResponse,
      vaultPath,
    })
  }, [activeEntry, crystallizeBlockedReason, latestCrystallizable?.contextPackage, latestResponse, vaultPath])
  const crystallizeProposalSummary = useMemo(
    () => summarizeCrystallizeProposal(crystallizeProposal),
    [crystallizeProposal],
  )
  const canCrystallize = !!crystallizeProposal && !crystallizeBlockedReason

  async function handleApplyCrystallize(markdown: string): Promise<void> {
    if (!crystallizeProposal || crystallizeBlockedReason) return
    setCrystallizeApplying(true)
    setCrystallizeError(null)
    try {
      await persistCrystallizedNote({ ...crystallizeProposal, markdown })
      onFileCreated?.(crystallizeProposal.relativePath)
      onVaultChanged?.()
      onOpenNote?.(crystallizeProposal.relativePath.replace(/\.md$/i, ''))
      setCrystallizeOpen(false)
    } catch (error) {
      setCrystallizeError(error instanceof Error ? error.message : String(error))
    } finally {
      setCrystallizeApplying(false)
    }
  }

  function handlePanelNewChat(): void {
    setAskContextPackage(null)
    handleNewChat()
  }

  return (
    <>
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="ai-panel flex flex-1 flex-col overflow-hidden bg-background text-foreground"
        style={{
          outline: 'none',
          borderLeft: isActive
            ? '2px solid var(--grimoire-signal-accent, var(--accent-blue))'
            : '1px solid var(--border)',
          transition: 'border-color 0.3s ease',
        }}
        data-testid="ai-panel"
        data-panel-role="ai-panel"
        data-ai-active={isActive || undefined}
      >
        <AiPanelHeader
          agentLabel={agentLabel}
          agentRouteLabel={agentRouteLabel}
          agentReady={defaultAiAgentReady}
          canCrystallize={canCrystallize}
          crystallizeBlockedReason={crystallizeBlockedReason}
          legacyCopy={useLegacyAiExperience}
          onClose={onClose}
          onCrystallize={() => setCrystallizeOpen(true)}
          onNewChat={handlePanelNewChat}
        />
        {activeEntry && (
          <AiPanelContextBar activeEntry={activeEntry} linkedCount={linkedEntries.length} />
        )}
        <AiPanelIntelligenceRail
          activeEntry={activeEntry}
          activeNoteContent={activeNoteContent}
          activePolicy={activePolicy}
          aiAgentsStatus={providedAiAgentsStatus}
          canCrystallize={canCrystallize}
          crystallizeBlockedReason={crystallizeBlockedReason}
          defaultAiAgent={defaultAiAgent}
          defaultAiAgentReady={defaultAiAgentReady}
          entries={entries ?? []}
          hasContext={hasContext}
          hasLatestResponse={!!latestResponse}
          linkedEntries={linkedEntries}
          noteList={noteList}
          noteListFilter={noteListFilter}
          onCrystallize={() => setCrystallizeOpen(true)}
          onOpenNote={onOpenNote}
          openTabs={openTabs}
          proposalSummary={crystallizeProposalSummary}
          askContextPackage={askContextPackage}
        />
        <AiPanelMessageHistory
          agentLabel={agentLabel}
          agentReady={defaultAiAgentReady}
          legacyCopy={useLegacyAiExperience}
          messages={agent.messages}
          isActive={isActive}
          onOpenNote={onOpenNote}
          onNavigateWikilink={handleNavigateWikilink}
          hasContext={hasContext}
        />
        <AiPanelComposer
          entries={entries ?? []}
          agentLabel={agentLabel}
          agentReady={defaultAiAgentReady}
          hasContext={hasContext}
          input={input}
          inputRef={inputRef}
          isActive={isActive}
          legacyCopy={useLegacyAiExperience}
          onChange={setInput}
          onSend={handleSend}
          onUnsupportedAiPaste={onUnsupportedAiPaste}
        />
      </aside>
      <CrystallizeReviewDialog
        open={crystallizeOpen}
        proposal={crystallizeProposal}
        blockedReason={crystallizeBlockedReason}
        applying={crystallizeApplying}
        error={crystallizeError}
        onApply={(markdown) => { void handleApplyCrystallize(markdown) }}
        onClose={() => setCrystallizeOpen(false)}
      />
    </>
  )
}

export function AiPanel({
  onClose,
  onOpenNote,
  onUnsupportedAiPaste,
  defaultAiAgent: providedDefaultAiAgent,
  defaultAiAgentReady: providedDefaultAiAgentReady,
  aiAgentsStatus,
  defaultAiProvider,
  defaultAiModel,
  onFileCreated,
  onFileModified,
  onVaultChanged,
  vaultPath,
  activeEntry,
  activeNoteContent,
  entries,
  openTabs,
  noteList,
  noteListFilter,
}: AiPanelProps) {
  const controller = useAiPanelController({
    vaultPath,
    defaultAiAgent: providedDefaultAiAgent ?? DEFAULT_AI_AGENT,
    defaultAiAgentReady: providedDefaultAiAgentReady ?? true,
    defaultAiProvider,
    defaultAiModel,
    activeEntry,
    activeNoteContent,
    entries,
    openTabs,
    noteList,
    noteListFilter,
    onOpenNote,
    onFileCreated,
    onFileModified,
    onVaultChanged,
  })

  return (
    <AiPanelView
      controller={controller}
      vaultPath={vaultPath}
      onClose={onClose}
      onOpenNote={onOpenNote}
      onUnsupportedAiPaste={onUnsupportedAiPaste}
      defaultAiAgent={providedDefaultAiAgent}
      defaultAiAgentReady={providedDefaultAiAgentReady}
      aiAgentsStatus={aiAgentsStatus}
      defaultAiProvider={defaultAiProvider}
      defaultAiModel={defaultAiModel}
      activeEntry={activeEntry}
      activeNoteContent={activeNoteContent}
      entries={entries}
      openTabs={openTabs}
      noteList={noteList}
      noteListFilter={noteListFilter}
      onFileCreated={onFileCreated}
      onVaultChanged={onVaultChanged}
    />
  )
}
