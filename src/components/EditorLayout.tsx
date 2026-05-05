import type React from 'react'
import { useDragRegion } from '../hooks/useDragRegion'
import { formatShortcutDisplay } from '../hooks/appCommandCatalog'
import type { AiAgentId } from '../lib/aiAgents'
import type { FrontmatterValue } from './Inspector'
import type { GitCommit, NoteLayout, NoteStatus, VaultEntry } from '../types'
import type { NoteListItem } from '../utils/ai-context'
import { ResizeHandle } from './ResizeHandle'
import { EditorRightPanel } from './EditorRightPanel'
import { EditorContent } from './EditorContent'
import type { useCreateBlockNote } from '@blocknote/react'
import { persistContent } from '../hooks/useSaveNote'

interface EditorLayoutTab {
  entry: VaultEntry
  content: string
}

interface EditorLayoutProps {
  tabs: EditorLayoutTab[]
  activeTab: EditorLayoutTab | null
  isLoadingNewTab: boolean
  entries: VaultEntry[]
  editor: ReturnType<typeof useCreateBlockNote>
  diffMode: boolean
  diffContent: string | null
  diffLoading: boolean
  handleToggleDiffExclusive: () => void | Promise<void>
  rawMode: boolean
  handleToggleRawExclusive: () => void
  onContentChange?: (path: string, content: string) => void
  onSave?: () => void
  activeStatus: NoteStatus
  showDiffToggle: boolean
  showAIChat?: boolean
  onToggleAIChat?: () => void
  inspectorCollapsed: boolean
  onToggleInspector: () => void
  onNavigateWikilink: (target: string) => void
  handleEditorChange: () => void
  onToggleFavorite?: (path: string) => void
  onToggleOrganized?: (path: string) => void
  onDeleteNote?: (path: string) => void
  onArchiveNote?: (path: string) => void
  onUnarchiveNote?: (path: string) => void
  vaultPath?: string
  rawModeContent: string | null
  rawLatestContentRef: React.MutableRefObject<string | null>
  onRenameFilename?: (path: string, newFilenameStem: string) => void
  noteLayout?: NoteLayout
  onToggleNoteLayout?: () => void
  isConflicted?: boolean
  onKeepMine?: (path: string) => void
  onKeepTheirs?: (path: string) => void
  onInspectorResize: (delta: number) => void
  inspectorWidth: number
  defaultAiAgent: AiAgentId
  defaultAiAgentReady: boolean
  inspectorEntry: VaultEntry | null
  inspectorContent: string | null
  gitHistory: GitCommit[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
  handleViewCommitDiff: (commitHash: string) => Promise<void>
  onUpdateFrontmatter?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onDeleteProperty?: (path: string, key: string) => Promise<void>
  onAddProperty?: (path: string, key: string, value: FrontmatterValue) => Promise<void>
  onCreateMissingType?: (path: string, missingType: string, nextTypeName: string) => Promise<boolean | void>
  onCreateAndOpenNote?: (title: string) => Promise<boolean>
  onInitializeProperties?: (path: string) => void
  onFileCreated?: (relativePath: string) => void
  onFileModified?: (relativePath: string) => void
  onVaultChanged?: () => void
  onUnsupportedAiPaste?: (message: string) => void
}

async function replacePersistedContent(
  path: string,
  content: string,
  onContentChange?: (path: string, content: string) => void,
) {
  await persistContent(path, content)
  onContentChange?.(path, content)
}

function EditorEmptyState() {
  const breadcrumbBarHeight = 52
  const { onMouseDown } = useDragRegion()
  const quickOpenShortcut = formatShortcutDisplay({ display: '⌘P / ⌘O' })
  const newNoteShortcut = formatShortcutDisplay({ display: '⌘N' })

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div
        aria-hidden="true"
        data-tauri-drag-region
        data-testid="editor-empty-state-drag-region"
        className="shrink-0"
        onMouseDown={onMouseDown}
        style={{ height: breadcrumbBarHeight }}
      />
      <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center text-muted-foreground">
        <p className="m-0 text-[15px]">Select a note to start editing</p>
        <span className="text-xs text-muted-foreground">{quickOpenShortcut} to search &middot; {newNoteShortcut} to create</span>
      </div>
    </div>
  )
}

/** Renders the editor canvas and right-side inspector/AI shell. */
export function EditorLayout({
  tabs,
  activeTab,
  isLoadingNewTab,
  entries,
  editor,
  diffMode,
  diffContent,
  diffLoading,
  handleToggleDiffExclusive,
  rawMode,
  handleToggleRawExclusive,
  onContentChange,
  onSave,
  activeStatus,
  showDiffToggle,
  showAIChat,
  onToggleAIChat,
  inspectorCollapsed,
  onToggleInspector,
  onNavigateWikilink,
  handleEditorChange,
  onToggleFavorite,
  onToggleOrganized,
  onDeleteNote,
  onArchiveNote,
  onUnarchiveNote,
  vaultPath,
  rawModeContent,
  rawLatestContentRef,
  onRenameFilename,
  noteLayout,
  onToggleNoteLayout,
  isConflicted,
  onKeepMine,
  onKeepTheirs,
  onInspectorResize,
  inspectorWidth,
  defaultAiAgent,
  defaultAiAgentReady,
  inspectorEntry,
  inspectorContent,
  gitHistory,
  noteList,
  noteListFilter,
  handleViewCommitDiff,
  onUpdateFrontmatter,
  onDeleteProperty,
  onAddProperty,
  onCreateMissingType,
  onCreateAndOpenNote,
  onInitializeProperties,
  onFileCreated,
  onFileModified,
  onVaultChanged,
  onUnsupportedAiPaste,
}: EditorLayoutProps) {
  return (
    <div className="editor flex flex-col min-h-0 overflow-hidden bg-background text-foreground">
      <div className="flex flex-1 min-h-0">
        {tabs.length === 0
          ? <EditorEmptyState />
          : <EditorContent
              activeTab={activeTab}
              isLoadingNewTab={isLoadingNewTab}
              entries={entries}
              editor={editor}
              diffMode={diffMode}
              diffContent={diffContent}
              diffLoading={diffLoading}
              onToggleDiff={handleToggleDiffExclusive}
              rawMode={rawMode}
              onToggleRaw={handleToggleRawExclusive}
              onRawContentChange={onContentChange}
              onSave={onSave}
              activeStatus={activeStatus}
              showDiffToggle={showDiffToggle}
              showAIChat={showAIChat}
              onToggleAIChat={onToggleAIChat}
              inspectorCollapsed={inspectorCollapsed}
              onToggleInspector={onToggleInspector}
              onNavigateWikilink={onNavigateWikilink}
              onCreateAndOpenNote={onCreateAndOpenNote}
              onEditorChange={handleEditorChange}
              onToggleFavorite={onToggleFavorite}
              onToggleOrganized={onToggleOrganized}
              onDeleteNote={onDeleteNote}
              onArchiveNote={onArchiveNote}
              onUnarchiveNote={onUnarchiveNote}
              vaultPath={vaultPath}
              rawModeContent={rawModeContent}
              rawLatestContentRef={rawLatestContentRef}
              onRenameFilename={onRenameFilename}
              noteLayout={noteLayout}
              onToggleNoteLayout={onToggleNoteLayout}
              isConflicted={isConflicted}
              onKeepMine={onKeepMine}
              onKeepTheirs={onKeepTheirs}
            />
        }
        {(showAIChat || !inspectorCollapsed) && <ResizeHandle onResize={onInspectorResize} />}
        <EditorRightPanel
          showAIChat={showAIChat}
          inspectorCollapsed={inspectorCollapsed}
          inspectorWidth={inspectorWidth}
          defaultAiAgent={defaultAiAgent}
          defaultAiAgentReady={defaultAiAgentReady}
          onUnsupportedAiPaste={onUnsupportedAiPaste}
          inspectorEntry={inspectorEntry}
          inspectorContent={inspectorContent}
          entries={entries}
          gitHistory={gitHistory}
          vaultPath={vaultPath ?? ''}
          noteList={noteList}
          noteListFilter={noteListFilter}
          onToggleInspector={onToggleInspector}
          onToggleAIChat={onToggleAIChat}
          onNavigateWikilink={onNavigateWikilink}
          onViewCommitDiff={handleViewCommitDiff}
          onUpdateFrontmatter={onUpdateFrontmatter}
          onDeleteProperty={onDeleteProperty}
          onAddProperty={onAddProperty}
          onCreateMissingType={onCreateMissingType}
          onCreateAndOpenNote={onCreateAndOpenNote}
          onInitializeProperties={onInitializeProperties}
          onToggleRawEditor={handleToggleRawExclusive}
          onReplaceContent={(path, content) => replacePersistedContent(path, content, onContentChange)}
          onOpenNote={onNavigateWikilink}
          onFileCreated={onFileCreated}
          onFileModified={onFileModified}
          onVaultChanged={onVaultChanged}
        />
      </div>
    </div>
  )
}
