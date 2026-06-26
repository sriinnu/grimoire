import { useMemo, useRef, useState } from 'react'
import {
  AiPanelBrief,
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
import type { AgentCouncilSynthesisPacket } from '../lib/agentCouncilSynthesis'
import { type NoteListItem } from '../utils/ai-context'
import type { VaultEntry } from '../types'
import { useAiPanelController, type AiPanelController } from './useAiPanelController'
import { useAiPanelPromptQueue } from './useAiPanelPromptQueue'
import { useAiPanelFocus } from './useAiPanelFocus'
import { CrystallizeReviewDialog, type CrystallizeApplyDraft } from './CrystallizeReviewDialog'
import {
  applyCrystallizePatchToContent,
  buildCrystallizeProposal,
  latestCrystallizableMessage,
  persistCrystallizedNote,
  summarizeCrystallizeProposal,
} from '../lib/crystallizeProposal'
import {
  councilCrystallizeHandoffMetadata,
  councilCrystallizeMarkdown,
} from '../lib/crystallizeCouncilHandoff'
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
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
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
  onFileModified?: (relativePath: string) => void
  onVaultChanged?: () => void
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
}

type CrystallizeSource =
  | { kind: 'latest-response' }
  | { kind: 'agent-council'; packet: AgentCouncilSynthesisPacket }

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
  onFileModified,
  onVaultChanged,
  onReplaceContent,
}: AiPanelViewProps) {
  const defaultAiAgent = providedDefaultAiAgent ?? DEFAULT_AI_AGENT
  const defaultAiAgentReady = providedDefaultAiAgentReady ?? true
  const useLegacyAiExperience = providedDefaultAiAgent === undefined && providedDefaultAiAgentReady === undefined
  const inputRef = useRef<HTMLElement>(null)
  const panelRef = useRef<HTMLElement>(null)
  const [crystallizeOpen, setCrystallizeOpen] = useState(false)
  const [crystallizeApplying, setCrystallizeApplying] = useState(false)
  const [crystallizeError, setCrystallizeError] = useState<string | null>(null)
  const [crystallizeSource, setCrystallizeSource] = useState<CrystallizeSource>({ kind: 'latest-response' })
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
  const councilPacket = crystallizeSource.kind === 'agent-council' ? crystallizeSource.packet : null
  const crystallizeResponse = councilPacket ? councilCrystallizeMarkdown(councilPacket) : latestResponse
  const crystallizeBlockedReason = councilPacket?.protectedContext
    ? 'Protected Council packet is policy-only. Review safe guidance, but do not write it as shared memory from this context.'
    : activePolicy?.localOnly && !councilPacket
      ? 'Local-only context is protected. Crystallize from a public note or start a fresh chat.'
      : crystallizeResponse ? null : 'Send an AI message first.'
  const crystallizeProposal = useMemo(() => {
    if (!crystallizeResponse || !vaultPath || crystallizeBlockedReason) return null
    const safeActiveEntry = activePolicy?.localOnly && councilPacket ? null : activeEntry
    return buildCrystallizeProposal({
      activeEntry: safeActiveEntry,
      activeNoteContent: councilPacket ? null : onReplaceContent ? activeNoteContent : null,
      askContextPackage: councilPacket ? askContextPackage : latestCrystallizable?.contextPackage ?? null,
      handoffMetadata: councilPacket ? councilCrystallizeHandoffMetadata(councilPacket) : null,
      response: crystallizeResponse,
      sourceEntries: councilPacket ? entries : undefined,
      sourceLabels: councilPacket ? ['Agent Council', ...councilPacket.sourceLabels] : undefined,
      sourceName: councilPacket ? 'Agent Council' : 'AI Chat',
      titleSubject: councilPacket ? 'Agent Council' : undefined,
      vaultPath,
    })
  }, [
    activeEntry,
    activeNoteContent,
    activePolicy?.localOnly,
    askContextPackage,
    crystallizeBlockedReason,
    crystallizeResponse,
    councilPacket,
    entries,
    latestCrystallizable?.contextPackage,
    onReplaceContent,
    vaultPath,
  ])
  const crystallizeProposalSummary = useMemo(
    () => summarizeCrystallizeProposal(crystallizeProposal),
    [crystallizeProposal],
  )
  const canCrystallize = !!crystallizeProposal && !crystallizeBlockedReason

  function handleOpenLatestCrystallize(): void {
    setCrystallizeSource({ kind: 'latest-response' })
    setCrystallizeOpen(true)
  }

  function handleCrystallizeCouncil(packet: AgentCouncilSynthesisPacket): void {
    setCrystallizeSource({ kind: 'agent-council', packet })
    setCrystallizeOpen(true)
  }

  async function handleApplyCrystallize(draft: CrystallizeApplyDraft): Promise<void> {
    if (!crystallizeProposal || crystallizeBlockedReason) return
    setCrystallizeApplying(true)
    setCrystallizeError(null)
    try {
      await persistCrystallizedNote({ ...crystallizeProposal, markdown: draft.memoryMarkdown })
      if (
        crystallizeProposal.activeNotePatch
        && activeNoteContent != null
        && (draft.activeNoteAppendMarkdown || draft.activeNoteFrontmatterMarkdown)
        && onReplaceContent
      ) {
        const nextContent = applyCrystallizePatchToContent(
          activeNoteContent,
          draft.activeNoteFrontmatterMarkdown,
          draft.activeNoteAppendMarkdown,
        )
        await onReplaceContent(crystallizeProposal.activeNotePatch.targetPath, nextContent)
        onFileModified?.(crystallizeProposal.activeNotePatch.relativePath)
      }
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
    setCrystallizeSource({ kind: 'latest-response' })
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
            ? '2px solid var(--primary)'
            : '1px solid color-mix(in srgb, var(--grimoire-hairline, var(--border-default)) 85%, transparent)',
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
          onCrystallize={handleOpenLatestCrystallize}
          onNewChat={handlePanelNewChat}
        />
        {activeEntry && (
          <>
            <AiPanelBrief
              agentLabel={agentLabel}
              activeEntry={activeEntry}
              linkedCount={linkedEntries.length}
              conversationActive={agent.messages.length > 0 || isActive}
            />
            <AiPanelContextBar activeEntry={activeEntry} linkedCount={linkedEntries.length} />
          </>
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
          defaultAiModel={defaultAiModel}
          defaultAiProvider={defaultAiProvider}
          entries={entries ?? []}
          hasContext={hasContext}
          hasLatestResponse={!!latestResponse}
          linkedEntries={linkedEntries}
          noteList={noteList}
          noteListFilter={noteListFilter}
          onCrystallize={handleOpenLatestCrystallize}
          onCrystallizeCouncil={handleCrystallizeCouncil}
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
        onApply={(draft) => { void handleApplyCrystallize(draft) }}
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
  onReplaceContent,
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
      onFileModified={onFileModified}
      onVaultChanged={onVaultChanged}
      onReplaceContent={onReplaceContent}
    />
  )
}
