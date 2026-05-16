import { useEffect } from 'react'
import { DEFAULT_AI_AGENT, type AiAgentId } from '../lib/aiAgents'
import type { VaultEntry, GitCommit } from '../types'
import type { NoteListItem } from '../utils/ai-context'
import { Inspector, type FrontmatterValue } from './Inspector'
import { AiPanelView } from './AiPanel'
import { useAiPanelController, type AiPanelController } from './useAiPanelController'
import { NEW_AI_CHAT_EVENT } from '../utils/aiPromptBridge'

interface EditorRightPanelProps {
  showAIChat?: boolean
  inspectorCollapsed: boolean
  inspectorWidth: number
  defaultAiAgent?: AiAgentId
  defaultAiAgentReady?: boolean
  defaultAiProvider?: string | null
  defaultAiModel?: string | null
  onUnsupportedAiPaste?: (message: string) => void
  inspectorEntry: VaultEntry | null
  inspectorContent: string | null
  entries: VaultEntry[]
  gitHistory: GitCommit[]
  vaultPath: string
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  onToggleInspector: () => void
  onToggleAIChat?: () => void
  onNavigateWikilink: (target: string) => void
  onViewCommitDiff: (commitHash: string) => Promise<void>
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onDeleteProperty?: (path: string, key: string) => Promise<void>
  onAddProperty?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onCreateMissingType?: (path: string, missingType: string, nextTypeName: string) => Promise<boolean | void>
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onInitializeProperties?: (path: string) => void
  onToggleRawEditor?: () => void
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
  onOpenNote?: (path: string) => void
  onFileCreated?: (relativePath: string) => void
  onFileModified?: (relativePath: string) => void
  onVaultChanged?: () => void
}

function AiChatRightPanel({
  width,
  controller,
  defaultAiAgent,
  defaultAiAgentReady,
  onUnsupportedAiPaste,
  inspectorEntry,
  entries,
  vaultPath,
  onToggleAIChat,
  onOpenNote,
  onFileCreated,
  onVaultChanged,
}: Pick<EditorRightPanelProps,
  | 'defaultAiAgent'
  | 'defaultAiAgentReady'
  | 'onUnsupportedAiPaste'
  | 'inspectorEntry'
  | 'entries'
  | 'vaultPath'
  | 'onToggleAIChat'
  | 'onOpenNote'
  | 'onFileCreated'
  | 'onVaultChanged'
> & { controller: AiPanelController; width: number }) {
  return (
    <div
      className="shrink-0 flex flex-col min-h-0"
      style={{ width, minWidth: 240, height: '100%' }}
    >
      <AiPanelView
        controller={controller}
        vaultPath={vaultPath}
        onClose={() => onToggleAIChat?.()}
        onOpenNote={onOpenNote}
        onUnsupportedAiPaste={onUnsupportedAiPaste}
        defaultAiAgent={defaultAiAgent ?? DEFAULT_AI_AGENT}
        defaultAiAgentReady={defaultAiAgentReady ?? true}
        activeEntry={inspectorEntry}
        entries={entries}
        onFileCreated={onFileCreated}
        onVaultChanged={onVaultChanged}
      />
    </div>
  )
}

export function EditorRightPanel({
  showAIChat, inspectorCollapsed, inspectorWidth,
  defaultAiAgent = DEFAULT_AI_AGENT, defaultAiAgentReady = true,
  defaultAiProvider,
  defaultAiModel,
  onUnsupportedAiPaste,
  inspectorEntry, inspectorContent, entries, gitHistory, vaultPath,
  noteList, noteListFilter,
  onToggleInspector, onToggleAIChat, onNavigateWikilink, onViewCommitDiff,
  onUpdateFrontmatter, onDeleteProperty, onAddProperty, onCreateMissingType, onCreateAndOpenNote, onInitializeProperties, onToggleRawEditor, onReplaceContent, onOpenNote,
  onFileCreated, onFileModified, onVaultChanged,
}: EditorRightPanelProps) {
  const aiPanelController = useAiPanelController({
    vaultPath,
    defaultAiAgent,
    defaultAiAgentReady,
    defaultAiProvider,
    defaultAiModel,
    activeEntry: inspectorEntry,
    activeNoteContent: inspectorContent,
    entries,
    noteList,
    noteListFilter,
    onOpenNote,
    onFileCreated,
    onFileModified,
    onVaultChanged,
  })
  const { handleNewChat } = aiPanelController

  useEffect(() => {
    const handleRequestedNewChat = () => {
      handleNewChat()
    }

    window.addEventListener(NEW_AI_CHAT_EVENT, handleRequestedNewChat)
    return () => window.removeEventListener(NEW_AI_CHAT_EVENT, handleRequestedNewChat)
  }, [handleNewChat])

  if (showAIChat) {
    return (
      <AiChatRightPanel
        width={inspectorWidth}
        controller={aiPanelController}
        defaultAiAgent={defaultAiAgent}
        defaultAiAgentReady={defaultAiAgentReady}
        onUnsupportedAiPaste={onUnsupportedAiPaste}
        inspectorEntry={inspectorEntry}
        entries={entries}
        vaultPath={vaultPath}
        onToggleAIChat={onToggleAIChat}
        onOpenNote={onOpenNote}
        onFileCreated={onFileCreated}
        onVaultChanged={onVaultChanged}
      />
    )
  }

  if (inspectorCollapsed) return null

  return (
    <div
      className="shrink-0 flex flex-col min-h-0"
      style={{ width: inspectorWidth, height: '100%' }}
    >
      <Inspector
        collapsed={inspectorCollapsed}
        onToggle={onToggleInspector}
        entry={inspectorEntry}
        content={inspectorContent}
        entries={entries}
        gitHistory={gitHistory}
        vaultPath={vaultPath}
        onNavigate={onNavigateWikilink}
        onViewCommitDiff={onViewCommitDiff}
        onUpdateFrontmatter={onUpdateFrontmatter}
        onDeleteProperty={onDeleteProperty}
        onAddProperty={onAddProperty}
        onCreateMissingType={onCreateMissingType}
        onCreateAndOpenNote={onCreateAndOpenNote}
        onInitializeProperties={onInitializeProperties}
        onToggleRawEditor={onToggleRawEditor}
        onReplaceContent={onReplaceContent}
      />
    </div>
  )
}
