import { DEFAULT_AI_AGENT, type AiAgentId, type AiAgentsStatus } from '../lib/aiAgents'
import type { VaultEntry } from '../types'
import type { NoteListItem } from '../utils/ai-context'
import { AiPanelView } from './AiPanel'
import type { AiPanelController } from './useAiPanelController'

export interface AiChatRightPanelProps {
  aiAgentsStatus?: AiAgentsStatus
  controller: AiPanelController
  defaultAiAgent?: AiAgentId
  defaultAiAgentReady?: boolean
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  entries: VaultEntry[]
  inspectorContent: string | null
  inspectorEntry: VaultEntry | null
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  onFileCreated?: (relativePath: string) => void
  onFileModified?: (relativePath: string) => void
  onOpenNote?: (path: string) => void
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
  onToggleAIChat?: () => void
  onUnsupportedAiPaste?: (message: string) => void
  onVaultChanged?: () => void
  vaultPath: string
  width: number
}

/** Hosts the full AI surface behind a lazy boundary so Inspector-only startup stays light. */
export function AiChatRightPanel({
  aiAgentsStatus,
  controller,
  defaultAiAgent,
  defaultAiAgentReady,
  defaultAiModel,
  defaultAiProvider,
  entries,
  inspectorContent,
  inspectorEntry,
  noteList,
  noteListFilter,
  onFileCreated,
  onFileModified,
  onOpenNote,
  onReplaceContent,
  onToggleAIChat,
  onUnsupportedAiPaste,
  onVaultChanged,
  vaultPath,
  width,
}: AiChatRightPanelProps) {
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
        defaultAiProvider={defaultAiProvider}
        defaultAiModel={defaultAiModel}
        aiAgentsStatus={aiAgentsStatus}
        activeEntry={inspectorEntry}
        activeNoteContent={inspectorContent}
        entries={entries}
        noteList={noteList}
        noteListFilter={noteListFilter}
        onFileCreated={onFileCreated}
        onFileModified={onFileModified}
        onVaultChanged={onVaultChanged}
        onReplaceContent={onReplaceContent}
      />
    </div>
  )
}
