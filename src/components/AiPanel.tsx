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
import type { ModifiedFile, VaultEntry } from '../types'
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
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { AiPanelIntelligenceRail } from './AiPanelIntelligenceRail'
import type { ChitraguptaRecallAttachment } from '../lib/chitraguptaContext'
import type { ContextManifestV1 } from '../lib/contextManifest'

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
  modifiedFiles?: readonly ModifiedFile[]
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
  modifiedFiles?: readonly ModifiedFile[]
  openTabs?: VaultEntry[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  onFileCreated?: (relativePath: string) => void
  onFileModified?: (relativePath: string) => void
  onVaultChanged?: () => void
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
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
  modifiedFiles,
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
  const [askContextPackage, setAskContextPackage] = useState<AskContextPackage | null>(null)
  const [chitraguptaRecall, setChitraguptaRecall] = useState<ChitraguptaRecallAttachment | null>(null)
  const [contextManifest, setContextManifest] = useState<ContextManifestV1 | null>(null)
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
      activeNoteContent: onReplaceContent ? activeNoteContent : null,
      askContextPackage: latestCrystallizable?.contextPackage ?? null,
      response: latestResponse,
      vaultPath,
    })
  }, [
    activeEntry,
    activeNoteContent,
    crystallizeBlockedReason,
    latestResponse,
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
    setChitraguptaRecall(null)
    setContextManifest(null)
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
        {activeEntry ? <AiPanelContextBar activeEntry={activeEntry} linkedCount={linkedEntries.length} /> : null}
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto" data-testid="ai-panel-scroll-region">
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
            modifiedFiles={modifiedFiles}
            hasContext={hasContext}
            hasLatestResponse={!!latestResponse}
            linkedEntries={linkedEntries}
            noteList={noteList}
            noteListFilter={noteListFilter}
            onCrystallize={handleOpenLatestCrystallize}
            onOpenNote={onOpenNote}
            openTabs={openTabs}
            proposalSummary={crystallizeProposalSummary}
            askContextPackage={askContextPackage}
            vaultPath={vaultPath}
            onUseContextManifest={setContextManifest}
            onUseChitraguptaRecall={setChitraguptaRecall}
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
        </div>
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
          onSend={(text, references) => {
            if (chitraguptaRecall || contextManifest) {
              handleSend(text, references, undefined, chitraguptaRecall ?? undefined, contextManifest ?? undefined)
            } else {
              handleSend(text, references)
            }
            setChitraguptaRecall(null)
            setContextManifest(null)
          }}
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
  modifiedFiles,
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
      modifiedFiles={modifiedFiles}
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
