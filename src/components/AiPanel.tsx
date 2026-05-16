import { useMemo, useRef, useState } from 'react'
import {
  AiPanelComposer,
  AiPanelContextBar,
  AiPanelHeader,
  AiPanelMessageHistory,
} from './AiPanelChrome'
import { DEFAULT_AI_AGENT, getAiAgentDefinition, type AiAgentId } from '../lib/aiAgents'
import { type NoteListItem } from '../utils/ai-context'
import type { VaultEntry } from '../types'
import { useAiPanelController, type AiPanelController } from './useAiPanelController'
import { useAiPanelPromptQueue } from './useAiPanelPromptQueue'
import { useAiPanelFocus } from './useAiPanelFocus'
import { CrystallizeReviewDialog } from './CrystallizeReviewDialog'
import {
  buildCrystallizeProposal,
  latestCrystallizableResponse,
  persistCrystallizedNote,
} from '../lib/crystallizeProposal'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'

export type { AiAgentMessage } from '../hooks/useCliAiAgent'

interface AiPanelProps {
  onClose: () => void
  onOpenNote?: (path: string) => void
  onUnsupportedAiPaste?: (message: string) => void
  defaultAiAgent?: AiAgentId
  defaultAiAgentReady?: boolean
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
  activeEntry?: VaultEntry | null
  entries?: VaultEntry[]
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
  activeEntry,
  entries,
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
  const agentLabel = getAiAgentDefinition(defaultAiAgent).label
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

  useAiPanelPromptQueue({ agent, input, isActive, setInput })
  useAiPanelFocus({
    inputRef,
    panelRef,
    hasMessages: agent.messages.length > 0,
    isActive,
    onClose,
  })
  const latestResponse = useMemo(() => latestCrystallizableResponse(agent.messages), [agent.messages])
  const activePolicy = useMemo(() => activeEntry ? resolveEntryLocalityPolicy(activeEntry) : null, [activeEntry])
  const crystallizeBlockedReason = activePolicy?.localOnly
    ? 'Local-only context is protected. Crystallize from a public note or start a fresh chat.'
    : latestResponse ? null : 'Send an AI message first.'
  const crystallizeProposal = useMemo(() => {
    if (!latestResponse || !vaultPath) return null
    return buildCrystallizeProposal({ response: latestResponse, vaultPath, activeEntry })
  }, [activeEntry, latestResponse, vaultPath])
  const canCrystallize = !!crystallizeProposal && !crystallizeBlockedReason

  async function handleApplyCrystallize(): Promise<void> {
    if (!crystallizeProposal || crystallizeBlockedReason) return
    setCrystallizeApplying(true)
    setCrystallizeError(null)
    try {
      await persistCrystallizedNote(crystallizeProposal)
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

  return (
    <>
      <aside
        ref={panelRef}
        tabIndex={-1}
        className="flex flex-1 flex-col overflow-hidden bg-background text-foreground"
        style={{
          outline: 'none',
          borderLeft: isActive
            ? '2px solid var(--accent-blue)'
            : '1px solid var(--border)',
          animation: isActive ? 'ai-border-pulse 2s ease-in-out infinite' : undefined,
          transition: 'border-color 0.3s ease',
        }}
        data-testid="ai-panel"
        data-ai-active={isActive || undefined}
      >
        <AiPanelHeader
          agentLabel={agentLabel}
          agentReady={defaultAiAgentReady}
          canCrystallize={canCrystallize}
          crystallizeBlockedReason={crystallizeBlockedReason}
          legacyCopy={useLegacyAiExperience}
          onClose={onClose}
          onCrystallize={() => setCrystallizeOpen(true)}
          onNewChat={handleNewChat}
        />
        {activeEntry && (
          <AiPanelContextBar activeEntry={activeEntry} linkedCount={linkedEntries.length} />
        )}
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
        onApply={() => { void handleApplyCrystallize() }}
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
      activeEntry={activeEntry}
      entries={entries}
      onFileCreated={onFileCreated}
      onVaultChanged={onVaultChanged}
    />
  )
}
