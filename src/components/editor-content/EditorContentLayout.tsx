import { lazy, Suspense } from 'react'
import type React from 'react'
import { cn } from '@/lib/utils'
import { DiffView } from '../DiffView'
import { BreadcrumbBar } from '../BreadcrumbBar'
import { ArchivedNoteBanner } from '../ArchivedNoteBanner'
import { ConflictNoteBanner } from '../ConflictNoteBanner'
import { SingleEditorView } from '../SingleEditorView'
import type { useEditorContentModel } from './useEditorContentModel'
import { HtmlPreview } from './HtmlPreview'
import { VaultImagePreview } from './VaultImagePreview'
import { EditorLoadingState } from '../EditorLoadingState'
import { EditorConstellationMeta } from '../EditorConstellationMeta'
import { EditorAgentComposerBar } from '../EditorAgentComposerBar'

const RawEditorViewSurface = lazy(async () => ({
  default: (await import('../RawEditorView')).RawEditorView,
}))

type EditorContentModel = ReturnType<typeof useEditorContentModel>

type BreadcrumbActions = Pick<
  EditorContentModel,
  | 'diffMode'
  | 'diffLoading'
  | 'onToggleDiff'
  | 'effectiveRawMode'
  | 'onToggleRaw'
  | 'forceRawMode'
  | 'showAIChat'
  | 'onToggleAIChat'
  | 'inspectorCollapsed'
  | 'onToggleInspector'
  | 'showDiffToggle'
  | 'onToggleFavorite'
  | 'onToggleOrganized'
  | 'onDeleteNote'
  | 'onArchiveNote'
  | 'onUnarchiveNote'
  | 'onRenameFilename'
  | 'noteLayout'
  | 'onToggleNoteLayout'
>

function EditorLoadingSkeleton() {
  return <EditorLoadingState detail="Opening your note" />
}

function DiffModeView({ diffContent, onToggleDiff }: { diffContent: string | null; onToggleDiff: () => void }) {
  return (
    <div className="grimoire-page-arrive flex-1 overflow-auto">
      <button
        className="flex items-center gap-1.5 px-4 py-2 text-xs text-primary bg-muted border-b border-border cursor-pointer hover:bg-accent transition-colors w-full border-t-0 border-l-0 border-r-0"
        onClick={onToggleDiff}
        title="Back to editor"
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>&larr;</span>
        Back to editor
      </button>
      <DiffView diff={diffContent ?? ''} />
    </div>
  )
}

function RawModeEditorSection({
  activeTab,
  entries,
  rawMode,
  rawModeContent,
  onRawContentChange,
  onSave,
  rawLatestContentRef,
  vaultPath,
}: Pick<
  EditorContentModel,
  'activeTab' | 'entries' | 'onRawContentChange' | 'onSave' | 'rawLatestContentRef' | 'rawModeContent' | 'vaultPath'
> & {
  rawMode: boolean
}) {
  if (!rawMode || !activeTab) return null

  return (
    <Suspense fallback={<EditorLoadingState detail="Opening raw editor" />}>
      <RawEditorViewSurface
        key={activeTab.entry.path}
        content={rawModeContent ?? activeTab.content}
        path={activeTab.entry.path}
        entries={entries}
        onContentChange={onRawContentChange ?? (() => {})}
        onSave={onSave ?? (() => {})}
        latestContentRef={rawLatestContentRef}
        vaultPath={vaultPath}
      />
    </Suspense>
  )
}

function bindPath(cb: ((path: string) => void) | undefined, path: string) {
  return cb ? () => cb(path) : undefined
}

function ActiveTabBreadcrumb({
  activeTab,
  barRef,
  wordCount,
  path,
  actions,
}: {
  activeTab: NonNullable<EditorContentModel['activeTab']>
  barRef: React.RefObject<HTMLDivElement | null>
  wordCount: number
  path: string
  actions: BreadcrumbActions
}) {
  return (
    <BreadcrumbBar
      entry={activeTab.entry}
      wordCount={wordCount}
      barRef={barRef}
      showDiffToggle={actions.showDiffToggle}
      diffMode={actions.diffMode}
      diffLoading={actions.diffLoading}
      onToggleDiff={actions.onToggleDiff}
      rawMode={actions.effectiveRawMode}
      onToggleRaw={actions.onToggleRaw}
      forceRawMode={actions.forceRawMode}
      showAIChat={actions.showAIChat}
      onToggleAIChat={actions.onToggleAIChat}
      inspectorCollapsed={actions.inspectorCollapsed}
      onToggleInspector={actions.onToggleInspector}
      onToggleFavorite={bindPath(actions.onToggleFavorite, path)}
      onToggleOrganized={bindPath(actions.onToggleOrganized, path)}
      onDelete={bindPath(actions.onDeleteNote, path)}
      onArchive={bindPath(actions.onArchiveNote, path)}
      onUnarchive={bindPath(actions.onUnarchiveNote, path)}
      onRenameFilename={actions.onRenameFilename}
      noteLayout={actions.noteLayout}
      onToggleNoteLayout={actions.onToggleNoteLayout}
    />
  )
}

function EditorChrome({
  isArchived,
  onUnarchiveNote,
  path,
  isConflicted,
  onKeepMine,
  onKeepTheirs,
  diffMode,
  diffContent,
  onToggleDiff,
}: Pick<
  EditorContentModel,
  'isArchived' | 'onUnarchiveNote' | 'path' | 'isConflicted' | 'onKeepMine' | 'onKeepTheirs' | 'diffMode' | 'diffContent' | 'onToggleDiff'
>) {
  return (
    <>
      {isArchived && onUnarchiveNote && (
        <ArchivedNoteBanner onUnarchive={() => onUnarchiveNote(path)} />
      )}
      {isConflicted && (
        <ConflictNoteBanner
          onKeepMine={() => onKeepMine?.(path)}
          onKeepTheirs={() => onKeepTheirs?.(path)}
        />
      )}
      {diffMode && <DiffModeView diffContent={diffContent} onToggleDiff={onToggleDiff} />}
    </>
  )
}

function EditorCanvas({
  showEditor,
  cssVars,
  editor,
  entries,
  onNavigateWikilink,
  onCreateAndOpenNote,
  onEditorChange,
  isDeletedPreview,
  vaultPath,
  activeTab,
}: Pick<
  EditorContentModel,
  | 'showEditor'
  | 'cssVars'
  | 'editor'
  | 'entries'
  | 'onNavigateWikilink'
  | 'onCreateAndOpenNote'
  | 'onEditorChange'
  | 'isDeletedPreview'
  | 'vaultPath'
  | 'activeTab'
>) {
  if (!showEditor) return null

  return (
    <div className="editor-scroll-area grimoire-ink-settle" style={cssVars as React.CSSProperties}>
      <div className="editor-content-wrapper">
        <SingleEditorView
          activeContent={activeTab?.content ?? ''}
          editor={editor}
          entries={entries}
          onNavigateWikilink={onNavigateWikilink}
          onCreateAndOpenNote={onCreateAndOpenNote}
          onChange={onEditorChange}
          vaultPath={vaultPath}
          editable={!isDeletedPreview}
        />
      </div>
    </div>
  )
}

export function EditorContentLayout(model: EditorContentModel) {
  const {
    activeTab,
    isLoadingNewTab,
    entries,
    editor,
    diffMode,
    diffContent,
    onToggleDiff,
    effectiveRawMode,
    onRawContentChange,
    onSave,
    showEditor,
    isArchived,
    onUnarchiveNote,
    path,
    isConflicted,
    onKeepMine,
    onKeepTheirs,
    breadcrumbBarRef,
    wordCount,
    vaultPath,
    cssVars,
    onNavigateWikilink,
    onEditorChange,
    isDeletedPreview,
    rawLatestContentRef,
    rawModeContent,
    noteLayout,
  } = model
  const rootClassName = cn(
    'editor-canvas flex flex-1 flex-col min-w-0 min-h-0',
    noteLayout === 'left' ? 'editor-content-layout--left' : 'editor-content-layout--centered',
  )

  if (!activeTab) {
    return (
      <div className={rootClassName}>
        {isLoadingNewTab && showEditor && <EditorLoadingSkeleton />}
      </div>
    )
  }

  return (
    <div className={rootClassName}>
      <ActiveTabBreadcrumb
        activeTab={activeTab}
        barRef={breadcrumbBarRef}
        wordCount={wordCount}
        path={path}
        actions={{
          diffMode: model.diffMode,
          diffLoading: model.diffLoading,
          onToggleDiff: model.onToggleDiff,
          effectiveRawMode: model.effectiveRawMode,
          onToggleRaw: model.onToggleRaw,
          forceRawMode: model.forceRawMode,
          showAIChat: model.showAIChat,
          onToggleAIChat: model.onToggleAIChat,
          inspectorCollapsed: model.inspectorCollapsed,
          onToggleInspector: model.onToggleInspector,
          showDiffToggle: model.showDiffToggle,
          onToggleFavorite: model.onToggleFavorite,
          onToggleOrganized: model.onToggleOrganized,
          onDeleteNote: model.onDeleteNote,
          onArchiveNote: model.onArchiveNote,
          onUnarchiveNote: model.onUnarchiveNote,
          onRenameFilename: model.onRenameFilename,
          noteLayout: model.noteLayout,
          onToggleNoteLayout: model.onToggleNoteLayout,
        }}
      />
      <EditorConstellationMeta content={activeTab.content} entry={activeTab.entry} />
      <EditorChrome
        isArchived={isArchived}
        onUnarchiveNote={onUnarchiveNote}
        path={path}
        isConflicted={isConflicted}
        onKeepMine={onKeepMine}
        onKeepTheirs={onKeepTheirs}
        diffMode={diffMode}
        diffContent={diffContent}
        onToggleDiff={onToggleDiff}
      />
      <RawModeEditorSection
        activeTab={activeTab}
        entries={entries}
        rawMode={effectiveRawMode}
        rawModeContent={rawModeContent}
        onRawContentChange={onRawContentChange}
        onSave={onSave}
        rawLatestContentRef={rawLatestContentRef}
        vaultPath={vaultPath}
      />
      {model.isImagePreview && !diffMode ? <VaultImagePreview entry={activeTab.entry} /> : null}
      {model.isHtmlPreview && !diffMode && !effectiveRawMode ? (
        <HtmlPreview content={activeTab.content} title={activeTab.entry.title || activeTab.entry.filename} />
      ) : null}
      <EditorCanvas
        activeTab={activeTab}
        showEditor={showEditor}
        cssVars={cssVars}
        vaultPath={vaultPath}
        editor={editor}
        entries={entries}
        onNavigateWikilink={onNavigateWikilink}
        onEditorChange={onEditorChange}
        isDeletedPreview={isDeletedPreview}
      />
      {!diffMode && !effectiveRawMode && !model.isImagePreview && !model.isHtmlPreview ? (
        <EditorAgentComposerBar
          content={activeTab.content}
          disabled={model.showAIChat}
          onOpen={model.onToggleAIChat}
        />
      ) : null}
      {isLoadingNewTab && showEditor && <EditorLoadingSkeleton />}
    </div>
  )
}
