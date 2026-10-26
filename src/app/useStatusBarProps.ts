import { useMemo } from 'react'
import { useStableFunctionProps } from '../hooks/useStableHandlers'
import type { useAppShellState } from './useAppShellState'
import type { useGitWorkflow } from './useGitWorkflow'
import type { useNoteWorkspace } from './useNoteWorkspace'
import type { useVaultFoundation } from './useVaultFoundation'

interface StatusBarWorkspaces {
  foundation: ReturnType<typeof useVaultFoundation>
  noteWorkspace: ReturnType<typeof useNoteWorkspace>
  gitWorkflow: ReturnType<typeof useGitWorkflow>
  shell: ReturnType<typeof useAppShellState>
}

/** The StatusBar's view-model: keeps its prop bag stable across App re-renders. */
export function useStatusBarProps({
  foundation,
  noteWorkspace,
  gitWorkflow,
  shell,
}: StatusBarWorkspaces) {
  const {
    vault, vaultSwitcher, settingsLoaded, resolvedPath, vaultFolderPickerPending,
    handleStatusBarSwitchVault, handleStatusBarOpenLocalFolder, handleGitInitialized,
    cloneGettingStartedVault, openCreateVaultDialog, dialogs, openFeedback,
    networkStatus, isGitVault, aiAgentsStatus, vaultAiGuidanceStatus,
    aiAgentPreferences, mcpStatus, openMcpSetupDialog, handleToggleThemeMode,
    handleSetSelection, documentThemeMode,
  } = foundation
  const { autoSync, effectiveRemoteStatus, conflictFlow } = noteWorkspace
  const { handleCommitPush } = gitWorkflow
  const { zoom, buildNumber, handleCheckForUpdates, restoreVaultAiGuidance } = shell

  const openingVault = useMemo(
    () => (vaultFolderPickerPending ? { label: 'Choose vault folder', path: '' } : null),
    [vaultFolderPickerPending],
  )

  return useStableFunctionProps({
    noteCount: vault.entries.length,
    modifiedCount: isGitVault ? vault.modifiedFiles.length : 0,
    vaultPath: resolvedPath,
    vaults: vaultSwitcher.allVaults,
    openingVault,
    onSwitchVault: handleStatusBarSwitchVault,
    onOpenSettings: dialogs.openSettings,
    onOpenFeedback: openFeedback,
    onOpenLocalFolder: handleStatusBarOpenLocalFolder,
    onCreateEmptyVault: openCreateVaultDialog,
    onCloneVault: dialogs.openCloneVault,
    onCloneGettingStarted: cloneGettingStartedVault,
    onGitInitialized: handleGitInitialized,
    onClickPending: isGitVault ? () => handleSetSelection({ kind: 'filter', filter: 'changes' }) : undefined,
    onClickPulse: isGitVault ? () => handleSetSelection({ kind: 'filter', filter: 'pulse' }) : undefined,
    onCommitPush: isGitVault ? handleCommitPush : undefined,
    isOffline: networkStatus.isOffline,
    isGitVault,
    syncStatus: autoSync.syncStatus,
    lastSyncTime: autoSync.lastSyncTime,
    conflictCount: isGitVault ? autoSync.conflictFiles.length : 0,
    remoteStatus: isGitVault ? effectiveRemoteStatus : null,
    onTriggerSync: isGitVault ? autoSync.triggerSync : undefined,
    onPullAndPush: isGitVault ? autoSync.pullAndPush : undefined,
    onOpenConflictResolver: isGitVault ? conflictFlow.handleOpenConflictResolver : undefined,
    zoomLevel: zoom.zoomLevel,
    themeMode: documentThemeMode,
    onZoomReset: zoom.zoomReset,
    onToggleThemeMode: settingsLoaded ? handleToggleThemeMode : undefined,
    buildNumber,
    panchangamEnabled: foundation.settings.panchangam_enabled !== false,
    onCheckForUpdates: handleCheckForUpdates,
    onRemoveVault: vaultSwitcher.removeVault,
    mcpStatus,
    onInstallMcp: openMcpSetupDialog,
    aiAgentsStatus,
    vaultAiGuidanceStatus,
    defaultAiAgent: aiAgentPreferences.defaultAiAgent,
    defaultAiProvider: aiAgentPreferences.defaultAiProvider,
    defaultAiModel: aiAgentPreferences.defaultAiModel,
    onSetDefaultAiAgent: aiAgentPreferences.setDefaultAiAgent,
    onRestoreVaultAiGuidance: () => { void restoreVaultAiGuidance() },
  })
}
