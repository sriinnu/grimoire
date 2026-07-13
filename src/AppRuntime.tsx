import { useMemo } from 'react'
import { Sidebar } from './components/Sidebar'
import { LazyNoteList as NoteList } from './components/LazyNoteList'
import { LazyEditor as Editor } from './components/LazyEditor'
import { ResizeHandle } from './components/ResizeHandle'
import { Toast } from './components/Toast'
import {
  LazyAudioRecordingDialog as AudioRecordingDialog,
  LazyCloneVaultModal as CloneVaultModal,
  LazyCommandPalette as CommandPalette,
  LazyCommitDialog as CommitDialog,
  LazyConfirmDeleteDialog as ConfirmDeleteDialog,
  LazyConflictResolverModal as ConflictResolverModal,
  LazyCreateTypeDialog as CreateTypeDialog,
  LazyCreateVaultDialog as CreateVaultDialog,
  LazyCreateViewDialog as CreateViewDialog,
  LazyDashboardRoute as DashboardRoute,
  LazyDeleteProgressNotice as DeleteProgressNotice,
  LazyFeedbackDialog as FeedbackDialog,
  LazyGraphModal as GraphModal,
  LazyMcpSetupDialog as McpSetupDialog,
  LazyNoteRetargetingDialogs as NoteRetargetingDialogs,
  LazyPulseView as PulseView,
  LazyQuickOpenPalette as QuickOpenPalette,
  LazyRenameDetectedBanner as RenameDetectedBanner,
  LazySearchPanel as SearchPanel,
  LazySettingsPanel as SettingsPanel,
  LazyStatusBar as StatusBar,
  LazyUpdateBanner as UpdateBanner,
  LazyVaultRebuildProgressNotice as VaultRebuildProgressNotice,
  LazyWeatherSnapshotDialog as WeatherSnapshotDialog,
} from './components/AppLazySurfaces'
import { NoteRetargetingProvider } from './components/note-retargeting/noteRetargetingContext'
import type { NoteListItem } from './utils/ai-context'
import { filterEntries, filterInboxEntries } from './utils/noteListHelpers'
import { useAppBootstrap } from './app/useAppBootstrap'
import { useAppCommandRegistry } from './app/useAppCommandRegistry'
import { useAppShellState } from './app/useAppShellState'
import { useAppStartupGate } from './app/useAppStartupGate'
import { useDeferredAppActions } from './app/useDeferredAppActions'
import { useEntryWorkspace } from './app/useEntryWorkspace'
import { useGitWorkflow } from './app/useGitWorkflow'
import { useKnowledgeOrganization } from './app/useKnowledgeOrganization'
import { useNativeIntegrations } from './app/useNativeIntegrations'
import { useNoteWorkspace } from './app/useNoteWorkspace'
import { useVaultFoundation } from './app/useVaultFoundation'
import './App.css'

// Type declarations for mock content storage and test overrides
declare global {
  interface Window {
    __mockContent?: Record<string, string>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock handler map for Playwright test overrides
    __mockHandlers?: Record<string, (args: any) => any>
  }
}

/** Wraps useEditorSave to also keep outgoingLinks in sync on save and on content change. */
function App() {
  const deferred = useDeferredAppActions()
  const foundation = useVaultFoundation(useAppBootstrap(deferred))
  const {
    pendingDashboardCaptureRequest, noteListFilter,
    setNoteListFilter, inboxPeriod, handleSetSelection,
    handleEnterNeighborhood, clearPendingDashboardCapture, layout,
    visibleNotesRef, multiSelectionCommandRef, toastMessage, setToastMessage,
    dialogs, showFeedback, showMcpSetupDialog, showGraphModal, showWeatherSnapshotDialog,
    showAudioRecordingDialog, mcpDialogAction, openFeedback, closeFeedback, openGraphModal,
    closeGraphModal, closeWeatherSnapshotDialog,
    closeAudioRecordingDialog, networkStatus, vaultFolderPickerPending,
    vaultSwitcher, settings, settingsLoaded, saveSettings,
    cloneGettingStartedVault, showCreateVaultDialog, openCreateVaultDialog,
    closeCreateVaultDialog, handleCreateVaultFromDialog, aiAgentsStatus,
    resolvedPath, activeVaultOption, searchVaultScopes, gitCapabilityUpdating, hasGitMetadata,
    isGitVault, handleSetGitEnabled, vault, handleStatusBarSwitchVault,
    handleStatusBarOpenLocalFolder, handleGitInitialized, vaultAiGuidanceStatus,
    vaultConfig, explicitOrganizationEnabled,
    effectiveSelection, handleSaveExplicitOrganization,
    systemLocale, appLocale, documentThemeMode, handleToggleThemeMode,
    aiAgentPreferences, mcpStatus, openMcpSetupDialog,
    closeMcpSetupDialog, handleConnectMcp, handleDisconnectMcp,
  } = foundation
  const native = useNativeIntegrations(foundation, deferred)
  const { detectedRenames, handleUpdateWikilinks, handleDismissRenames, conflictResolver } = native
  const noteWorkspace = useNoteWorkspace(foundation, native, deferred)
  const {
    flushPendingRawContentRef, notes,
    openTabWithContent, handleSidebarSelect, handleDashboardCaptureCreated, handleDashboardOpenNote,
    handleSearchResultSelect, autoSync, effectiveRemoteStatus, pendingDiffRequest,
    handlePendingDiffHandled, handlePulseOpenNote, handleOpenFavorite, vaultBridge, conflictFlow,
    appSave, aiActivity, handleGoBack, handleGoForward, canGoBack, canGoForward,
  } = noteWorkspace
  const entryWorkspace = useEntryWorkspace(foundation, noteWorkspace)
  const {
    handleInitializeProperties,
    handleUpdateAllNotesNoteListProperties, handleUpdateInboxNoteListProperties, handleCreateFolder,
    folderActions, handleOpenEntryInNewWindow,
    handleDiscardFile, handleOpenDeletedNote, handleReplaceActiveTabWithQueuedDiff,
  } = entryWorkspace

  const gitWorkflow = useGitWorkflow(foundation, noteWorkspace)
  const {
    commitFlow, suggestedCommitMessage, handleCommitPush, handleTrackedContentChange,
    handleInsertWeatherSnapshot, handleTrackedSave, entryActions, deleteActions,
  } = gitWorkflow
  const knowledge = useKnowledgeOrganization(foundation, noteWorkspace, gitWorkflow)
  const {
    gitHistory, handleCreateType, handleCreateMissingType, handleCreateOrUpdateView,
    handleUpdateViewDefinition, handleEditView, handleDeleteView, availableFields, bulkActions,
  } = knowledge
  // Raw-toggle ref: Editor registers its handleToggleRaw here so the command palette can call it
  const shell = useAppShellState(foundation, noteWorkspace, entryWorkspace, gitWorkflow)
  const {
    rawToggleRef, diffToggleRef, sidebarVisible, noteListVisible, sidebarColumnCollapsed,
    noteLayout, toggleNoteLayout, zoom, buildNumber, handleSetViewMode, handleToggleInspector,
    handleSetSidebarColumnCollapsed, updateStatus, updateActions, handleCheckForUpdates,
    restoreVaultAiGuidance, activeDeletedFile, noteRetargetingUi,
    toggleOrganizedCommand, audioTranscription, handleOpenGraphNote,
  } = shell

  const commands = useAppCommandRegistry(foundation, noteWorkspace, entryWorkspace, gitWorkflow, shell)
  const startupGate = useAppStartupGate(foundation)

  const activeTab = notes.tabs.find((t) => t.entry.path === notes.activeTabPath) ?? null

  const inboxCount = useMemo(() => filterInboxEntries(vault.entries, inboxPeriod).length, [vault.entries, inboxPeriod])

  const aiNoteList = useMemo<NoteListItem[]>(() => {
    const isInbox = effectiveSelection.kind === 'filter' && effectiveSelection.filter === 'inbox'
    const filtered = isInbox ? filterInboxEntries(vault.entries, inboxPeriod) : filterEntries(vault.entries, effectiveSelection, undefined, vault.views)
    return filtered.map(e => ({
      path: e.path, title: e.title, type: e.isA ?? 'Note',
    }))
  }, [vault.entries, vault.views, effectiveSelection, inboxPeriod])

  const aiNoteListFilter = useMemo(() => {
    if (effectiveSelection.kind === 'sectionGroup') return { type: effectiveSelection.type, query: '' }
    if (effectiveSelection.kind === 'entity') return { type: null, query: effectiveSelection.entry.title }
    return { type: null, query: '' }
  }, [effectiveSelection])
  const dashboardSelected = effectiveSelection.kind === 'dashboard'

  if (startupGate) return startupGate

  return (
    <NoteRetargetingProvider value={noteRetargetingUi.contextValue}>
      <div className="app-shell">
        <div className="app">
          {sidebarVisible && (
            <>
              <div
                className={`app__sidebar${sidebarColumnCollapsed ? ' app__sidebar--collapsed' : ''}`}
                style={{ width: sidebarColumnCollapsed ? 68 : layout.sidebarWidth }}
              >
                <Sidebar entries={vault.entries} folders={vault.folders} views={vault.views} selection={effectiveSelection} onSelect={handleSidebarSelect} onSelectNote={notes.handleSelectNote} onSelectFavorite={handleOpenFavorite} onReorderFavorites={entryActions.handleReorderFavorites} onCreateType={notes.handleCreateNoteImmediate} onCreateNewType={dialogs.openCreateType} onCustomizeType={entryActions.handleCustomizeType} onUpdateTypeTemplate={entryActions.handleUpdateTypeTemplate} onReorderSections={entryActions.handleReorderSections} onRenameSection={entryActions.handleRenameSection} onToggleTypeVisibility={entryActions.handleToggleTypeVisibility} onCreateFolder={handleCreateFolder} onRenameFolder={folderActions.renameFolder} onDeleteFolder={folderActions.requestDeleteFolder} renamingFolderPath={folderActions.renamingFolderPath} onStartRenameFolder={folderActions.startFolderRename} onCancelRenameFolder={folderActions.cancelFolderRename} onCreateView={dialogs.openCreateView} onEditView={handleEditView} onDeleteView={handleDeleteView} showInbox={explicitOrganizationEnabled} inboxCount={inboxCount} collapsed={sidebarColumnCollapsed} onCollapse={() => handleSetSidebarColumnCollapsed(true)} onExpand={() => handleSetSidebarColumnCollapsed(false)} onOpenSearch={dialogs.openSearch} onOpenGraph={openGraphModal} />
              </div>
              {!sidebarColumnCollapsed && <ResizeHandle onResize={layout.handleSidebarResize} />}
            </>
          )}
          {noteListVisible && !dashboardSelected && (
            <>
              <div className={`app__note-list${aiActivity.highlightElement === 'notelist' ? ' ai-highlight' : ''}`} style={{ width: layout.noteListWidth }}>
                {effectiveSelection.kind === 'filter' && effectiveSelection.filter === 'pulse' ? (
                  <PulseView vaultPath={resolvedPath} onOpenNote={handlePulseOpenNote} sidebarCollapsed={!sidebarVisible} onExpandSidebar={() => handleSetViewMode('all')} />
                ) : (
                  <NoteList entries={vault.entries} selection={effectiveSelection} selectedNote={activeTab?.entry ?? null} noteListFilter={noteListFilter} onNoteListFilterChange={setNoteListFilter} inboxPeriod={inboxPeriod} modifiedFiles={vault.modifiedFiles} modifiedFilesError={vault.modifiedFilesError} getNoteStatus={vault.getNoteStatus} sidebarCollapsed={!sidebarVisible} onSelectNote={notes.handleSelectNote} onReplaceActiveTab={handleReplaceActiveTabWithQueuedDiff} onEnterNeighborhood={handleEnterNeighborhood} onCreateNote={notes.handleCreateNoteImmediate} onBulkOrganize={explicitOrganizationEnabled ? bulkActions.handleBulkOrganize : undefined} onBulkArchive={bulkActions.handleBulkArchive} onBulkDeletePermanently={deleteActions.handleBulkDeletePermanently} onUpdateTypeSort={notes.handleUpdateFrontmatter} onUpdateFrontmatter={notes.handleUpdateFrontmatter} onUpdateViewDefinition={handleUpdateViewDefinition} updateEntry={vault.updateEntry} onOpenInNewWindow={handleOpenEntryInNewWindow} onDiscardFile={handleDiscardFile} onOpenDeletedNote={handleOpenDeletedNote} allNotesNoteListProperties={vaultConfig.allNotes?.noteListProperties ?? null} onUpdateAllNotesNoteListProperties={handleUpdateAllNotesNoteListProperties} inboxNoteListProperties={vaultConfig.inbox?.noteListProperties ?? null} onUpdateInboxNoteListProperties={handleUpdateInboxNoteListProperties} views={vault.views} visibleNotesRef={visibleNotesRef} multiSelectionCommandRef={multiSelectionCommandRef} locale={appLocale} />
                )}
              </div>
              <ResizeHandle onResize={layout.handleNoteListResize} />
            </>
          )}
          {dashboardSelected ? (
            <div className="app__dashboard">
              <DashboardRoute
                activeVault={activeVaultOption ?? undefined}
                addEntry={vault.addEntry}
                addPendingSave={vault.addPendingSave}
                conflictCount={isGitVault ? autoSync.conflictFiles.length : 0}
                createTypeEntry={notes.createTypeEntrySilent}
                entries={vault.entries}
                isGitVault={isGitVault}
                loadModifiedFiles={vault.loadModifiedFiles}
                modifiedCount={isGitVault ? vault.modifiedFiles.length : 0}
                onCaptureCreated={handleDashboardCaptureCreated}
                onOpenCreateVault={openCreateVaultDialog}
                onOpenNote={handleDashboardOpenNote}
                onPendingCaptureConsumed={clearPendingDashboardCapture}
                openTabWithContent={openTabWithContent}
                pendingCaptureRequest={pendingDashboardCaptureRequest}
                removeEntry={vault.removeEntry}
                removePendingSave={vault.removePendingSave}
                setToastMessage={setToastMessage}
                syncStatus={autoSync.syncStatus}
                vaultPath={resolvedPath}
              />
            </div>
          ) : (
            <div className={`app__editor${aiActivity.highlightElement === 'editor' || aiActivity.highlightElement === 'tab' ? ' ai-highlight' : ''}`}>
              <Editor
              tabs={notes.tabs}
              activeTabPath={notes.activeTabPath}
              entries={vault.entries}
              onNavigateWikilink={notes.handleNavigateWikilink}
              onLoadDiff={vault.loadDiff}
              onLoadDiffAtCommit={vault.loadDiffAtCommit}
              pendingCommitDiffRequest={pendingDiffRequest}
              onPendingCommitDiffHandled={handlePendingDiffHandled}
              getNoteStatus={vault.getNoteStatus}
              onCreateNote={notes.handleCreateNoteImmediate}
              inspectorCollapsed={layout.inspectorCollapsed}
              onToggleInspector={handleToggleInspector}
              inspectorWidth={layout.inspectorWidth}
              defaultAiAgent={aiAgentPreferences.defaultAiAgent}
              defaultAiAgentReady={aiAgentPreferences.defaultAiAgentReady}
              aiAgentsStatus={aiAgentsStatus}
              defaultAiProvider={aiAgentPreferences.defaultAiProvider}
              defaultAiModel={aiAgentPreferences.defaultAiModel}
              onUnsupportedAiPaste={setToastMessage}
              onInspectorResize={layout.handleInspectorResize}
              inspectorEntry={activeTab?.entry ?? null}
              inspectorContent={activeTab?.content ?? null}
              gitHistory={gitHistory}
              onUpdateFrontmatter={notes.handleUpdateFrontmatter}
              onDeleteProperty={notes.handleDeleteProperty}
              onAddProperty={notes.handleAddProperty}
              onCreateMissingType={handleCreateMissingType}
              onCreateAndOpenNote={notes.handleCreateNoteForRelationship}
              onInitializeProperties={handleInitializeProperties}
              showAIChat={dialogs.showAIChat}
              onToggleAIChat={dialogs.toggleAIChat}
              vaultPath={resolvedPath}
              noteList={aiNoteList}
              noteListFilter={aiNoteListFilter}
              onToggleFavorite={activeDeletedFile ? undefined : entryActions.handleToggleFavorite}
              onToggleOrganized={activeDeletedFile || !explicitOrganizationEnabled ? undefined : toggleOrganizedCommand}
              onDeleteNote={activeDeletedFile ? undefined : deleteActions.handleDeleteNote}
              onArchiveNote={activeDeletedFile ? undefined : entryActions.handleArchiveNote}
              onUnarchiveNote={activeDeletedFile ? undefined : entryActions.handleUnarchiveNote}
              onContentChange={handleTrackedContentChange}
              onSave={handleTrackedSave}
              onRenameFilename={activeDeletedFile ? undefined : appSave.handleFilenameRename}
              noteLayout={noteLayout}
              onToggleNoteLayout={toggleNoteLayout}
              rawToggleRef={rawToggleRef}
              diffToggleRef={diffToggleRef}
              canGoBack={canGoBack}
              canGoForward={canGoForward}
              onGoBack={handleGoBack}
              onGoForward={handleGoForward}
              leftPanelsCollapsed={!sidebarVisible && !noteListVisible}
              onFileCreated={vaultBridge.handleAgentFileCreated}
              onFileModified={vaultBridge.handleAgentFileModified}
              onVaultChanged={vaultBridge.handleAgentVaultChanged}
              isConflicted={conflictFlow.isConflicted}
              onKeepMine={conflictFlow.handleKeepMine}
              onKeepTheirs={conflictFlow.handleKeepTheirs}
              flushPendingRawContentRef={flushPendingRawContentRef}
            />
            </div>
          )}
        </div>
        <UpdateBanner status={updateStatus} actions={updateActions} />
        <RenameDetectedBanner renames={detectedRenames} onUpdate={handleUpdateWikilinks} onDismiss={handleDismissRenames} />
        <StatusBar noteCount={vault.entries.length} modifiedCount={isGitVault ? vault.modifiedFiles.length : 0} vaultPath={resolvedPath} vaults={vaultSwitcher.allVaults} openingVault={vaultFolderPickerPending ? { label: 'Choose vault folder', path: '' } : null} onSwitchVault={handleStatusBarSwitchVault} onOpenSettings={dialogs.openSettings} onOpenFeedback={openFeedback} onOpenLocalFolder={handleStatusBarOpenLocalFolder} onCreateEmptyVault={openCreateVaultDialog} onCloneVault={dialogs.openCloneVault} onCloneGettingStarted={cloneGettingStartedVault} onGitInitialized={handleGitInitialized} onClickPending={isGitVault ? () => handleSetSelection({ kind: 'filter', filter: 'changes' }) : undefined} onClickPulse={isGitVault ? () => handleSetSelection({ kind: 'filter', filter: 'pulse' }) : undefined} onCommitPush={isGitVault ? handleCommitPush : undefined} isOffline={networkStatus.isOffline} isGitVault={isGitVault} syncStatus={autoSync.syncStatus} lastSyncTime={autoSync.lastSyncTime} conflictCount={isGitVault ? autoSync.conflictFiles.length : 0} remoteStatus={isGitVault ? effectiveRemoteStatus : null} onTriggerSync={isGitVault ? autoSync.triggerSync : undefined} onPullAndPush={isGitVault ? autoSync.pullAndPush : undefined} onOpenConflictResolver={isGitVault ? conflictFlow.handleOpenConflictResolver : undefined} zoomLevel={zoom.zoomLevel} themeMode={documentThemeMode} onZoomReset={zoom.zoomReset} onToggleThemeMode={settingsLoaded ? handleToggleThemeMode : undefined} buildNumber={buildNumber} onCheckForUpdates={handleCheckForUpdates} onRemoveVault={vaultSwitcher.removeVault} mcpStatus={mcpStatus} onInstallMcp={openMcpSetupDialog} aiAgentsStatus={aiAgentsStatus} vaultAiGuidanceStatus={vaultAiGuidanceStatus} defaultAiAgent={aiAgentPreferences.defaultAiAgent} defaultAiProvider={aiAgentPreferences.defaultAiProvider} defaultAiModel={aiAgentPreferences.defaultAiModel} onSetDefaultAiAgent={aiAgentPreferences.setDefaultAiAgent} onRestoreVaultAiGuidance={() => { void restoreVaultAiGuidance() }} />
        <DeleteProgressNotice count={deleteActions.pendingDeleteCount} />
        <VaultRebuildProgressNotice progress={vault.rebuildProgress} onCancel={() => { void vault.cancelVaultReload() }} />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
        <QuickOpenPalette open={dialogs.showQuickOpen} entries={vault.entries} onSelect={handleDashboardOpenNote} onClose={dialogs.closeQuickOpen} />
        <CommandPalette
          open={dialogs.showCommandPalette}
          commands={commands}
          entries={vault.entries}
          aiAgentReady={aiAgentPreferences.defaultAiAgentReady}
          aiAgentLabel={aiAgentPreferences.defaultAiAgentLabel}
          locale={appLocale}
          onClose={dialogs.closeCommandPalette}
        />
        <SearchPanel open={dialogs.showSearch} vaultPath={resolvedPath} vaultScopes={searchVaultScopes} initialQuery={dialogs.searchInitialQuery} openKey={dialogs.searchOpenKey} entries={vault.entries} onSelectNote={notes.handleSelectNote} onSelectSearchResult={handleSearchResultSelect} onClose={dialogs.closeSearch} />
        <GraphModal open={showGraphModal} entries={vault.entries} activePath={notes.activeTabPath} defaultAiAgent={aiAgentPreferences.defaultAiAgent} defaultAiProvider={aiAgentPreferences.defaultAiProvider} defaultAiModel={aiAgentPreferences.defaultAiModel} aiAgentsStatus={aiAgentsStatus} onOpenNote={handleOpenGraphNote} onClose={closeGraphModal} />
        <WeatherSnapshotDialog open={showWeatherSnapshotDialog} onInsert={handleInsertWeatherSnapshot} onClose={closeWeatherSnapshotDialog} />
        <AudioRecordingDialog open={showAudioRecordingDialog} vaultPath={resolvedPath} onClose={closeAudioRecordingDialog} onRecordingSaved={audioTranscription.transcribeRecordedAudio} />
        <CreateTypeDialog open={dialogs.showCreateTypeDialog} onClose={dialogs.closeCreateType} onCreate={handleCreateType} />
        <CreateVaultDialog
          initialThemePreset={settings.theme_preset}
          open={showCreateVaultDialog}
          onClose={closeCreateVaultDialog}
          onCreate={handleCreateVaultFromDialog}
        />
        <NoteRetargetingDialogs
          dialogState={noteRetargetingUi.dialogState}
          dialogEntry={noteRetargetingUi.dialogEntry}
          typeOptions={noteRetargetingUi.typeOptions}
          folderOptions={noteRetargetingUi.folderOptions}
          onClose={noteRetargetingUi.closeDialog}
          onSelectType={noteRetargetingUi.selectType}
          onSelectFolder={noteRetargetingUi.selectFolder}
        />
        <CreateViewDialog open={dialogs.showCreateViewDialog} onClose={dialogs.closeCreateView} onCreate={handleCreateOrUpdateView} availableFields={availableFields} editingView={dialogs.editingView?.definition ?? null} />
        <CommitDialog
          open={isGitVault && commitFlow.showCommitDialog}
          modifiedCount={vault.modifiedFiles.length}
          commitMode={commitFlow.commitMode}
          suggestedMessage={suggestedCommitMessage}
          onCommit={commitFlow.handleCommitPush}
          onClose={commitFlow.closeCommitDialog}
        />
        <ConflictResolverModal
          open={dialogs.showConflictResolver}
          fileStates={conflictResolver.fileStates}
          allResolved={conflictResolver.allResolved}
          committing={conflictResolver.committing}
          error={conflictResolver.error}
          onResolveFile={conflictResolver.resolveFile}
          onOpenInEditor={conflictResolver.openInEditor}
          onCommit={conflictResolver.commitResolution}
          onClose={conflictFlow.handleCloseConflictResolver}
        />
        <SettingsPanel
          open={dialogs.showSettings}
          settings={settings}
          aiAgentsStatus={aiAgentsStatus}
          mcpStatus={mcpStatus}
          onInstallMcp={openMcpSetupDialog}
          locale={appLocale}
          systemLocale={systemLocale}
          vaultPath={resolvedPath}
          entries={vault.entries}
          reloadVault={vault.reloadVault}
          reloadFolders={vault.reloadFolders}
          loadModifiedFiles={vault.loadModifiedFiles}
          setToastMessage={setToastMessage}
          isGitVault={isGitVault}
          hasGitMetadata={hasGitMetadata}
          gitCapabilityUpdating={gitCapabilityUpdating}
          onSetGitEnabled={(enabled) => { void handleSetGitEnabled(enabled) }}
          onSave={saveSettings}
          explicitOrganizationEnabled={explicitOrganizationEnabled}
          onSaveExplicitOrganization={handleSaveExplicitOrganization}
          onClose={dialogs.closeSettings}
        />
        <FeedbackDialog open={showFeedback} onClose={closeFeedback} />
        <McpSetupDialog open={showMcpSetupDialog} status={mcpStatus} busyAction={mcpDialogAction} onClose={closeMcpSetupDialog} onConnect={handleConnectMcp} onDisconnect={handleDisconnectMcp} />
        <CloneVaultModal key={dialogs.showCloneVault ? 'clone-open' : 'clone-closed'} open={dialogs.showCloneVault} onClose={dialogs.closeCloneVault} onVaultCloned={vaultSwitcher.handleVaultCloned} />
        {deleteActions.confirmDelete && (
          <ConfirmDeleteDialog
            open={true}
            title={deleteActions.confirmDelete.title}
            message={deleteActions.confirmDelete.message}
            confirmLabel={deleteActions.confirmDelete.confirmLabel}
            onConfirm={deleteActions.confirmDelete.onConfirm}
            onCancel={() => deleteActions.setConfirmDelete(null)}
          />
        )}
        {folderActions.confirmDeleteFolder && (
          <ConfirmDeleteDialog
            open={true}
            title={folderActions.confirmDeleteFolder.title}
            message={folderActions.confirmDeleteFolder.message}
            confirmLabel={folderActions.confirmDeleteFolder.confirmLabel}
            onConfirm={folderActions.confirmDeleteSelectedFolder}
            onCancel={folderActions.cancelDeleteFolder}
          />
        )}
      </div>
    </NoteRetargetingProvider>
  )
}

export default App
