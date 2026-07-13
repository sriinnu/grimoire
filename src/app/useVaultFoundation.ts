import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useAiAgentPreferences } from '../hooks/useAiAgentPreferences'
import { useAppearanceSettings } from '../hooks/useAppearanceSettings'
import { useDocumentThemeMode } from '../hooks/useDocumentThemeMode'
import { useGitRemoteStatus } from '../hooks/useGitRemoteStatus'
import { useMcpStatus } from '../hooks/useMcpStatus'
import { useTelemetry } from '../hooks/useTelemetry'
import { useVaultAiGuidanceStatus } from '../hooks/useVaultAiGuidanceStatus'
import { useVaultConfig } from '../hooks/useVaultConfig'
import { useVaultLoader } from '../hooks/useVaultLoader'
import { useVaultSearchScopes } from '../hooks/useVaultSearchNavigation'
import {
  SYSTEM_UI_LANGUAGE,
  getBrowserLanguagePreferences,
  resolveEffectiveLocale,
  serializeUiLanguagePreference,
  type UiLanguagePreference,
} from '../lib/i18nCore'
import { trackEvent } from '../lib/telemetry'
import { buildVaultAiGuidanceRefreshKey } from '../lib/vaultAiGuidance'
import { isTauri } from '../mock-tauri'
import { focusNoteListContainer, popNeighborhoodHistory } from '../utils/neighborhoodHistory'
import { isExplicitOrganizationEnabled, sanitizeSelectionForOrganization } from '../utils/organizationWorkflow'
import {
  invokeAppCommand,
  invokeTauri,
  labelFromVaultPath,
  shouldPreferOnboardingVaultPath,
} from './appRuntimeSupport'
import type { AppBootstrap } from './useAppBootstrap'

export function useVaultFoundation(bootstrap: AppBootstrap) {
  const {
    aiAgentsStatus,
    handleSetSelection,
    mcpDialogAction,
    neighborhoodHistoryRef,
    noteWindowParams,
    onboarding,
    saveSettings,
    selection,
    selectionRef,
    setMcpDialogAction,
    setNoteListFilter,
    setSelection,
    setShowMcpSetupDialog,
    setToastMessage,
    settings,
    settingsLoaded,
    vaultFolderPickerPending,
    vaultSwitcher,
    vaultSwitchTarget,
    setVaultFolderPickerPending,
    setVaultSwitchTarget,
  } = bootstrap

  const resolvedPath = noteWindowParams?.vaultPath ?? (
    shouldPreferOnboardingVaultPath(onboarding.state, vaultSwitcher.allVaults)
      ? onboarding.state.vaultPath
      : vaultSwitcher.vaultPath
  )
  const activeVaultOption = useMemo(
    () => vaultSwitcher.allVaults.find((vault) => vault.path === resolvedPath) ?? null,
    [resolvedPath, vaultSwitcher.allVaults],
  )
  const searchVaultScopes = useVaultSearchScopes({
    activeVaultLabel: activeVaultOption?.label,
    allVaults: vaultSwitcher.allVaults,
    resolvedPath,
  })
  const [gitRepoState, setGitRepoState] = useState<'checking' | 'required' | 'ready'>('checking')
  const [gitCapabilityUpdating, setGitCapabilityUpdating] = useState(false)
  useEffect(() => {
    if (!resolvedPath) return
    let cancelled = false
    setGitRepoState('checking')
    const check = isTauri()
      ? invokeTauri<boolean>('is_git_repo', { vaultPath: resolvedPath })
      : Promise.resolve(true)
    check
      .then(isGit => { if (!cancelled) setGitRepoState(isGit ? 'ready' : 'required') })
      .catch(() => { if (!cancelled) setGitRepoState('ready') })
    return () => { cancelled = true }
  }, [resolvedPath])

  const hasGitMetadata = gitRepoState === 'ready'
  const gitSyncProvider = activeVaultOption?.syncProvider
  const gitCapabilityEnabled = gitSyncProvider === 'git' || (gitSyncProvider == null && hasGitMetadata)
  const isGitVault = hasGitMetadata && gitCapabilityEnabled
  const persistActiveVaultSyncProvider = useCallback(async (syncProvider: 'git' | 'none') => {
    if (!resolvedPath) return
    await vaultSwitcher.registerVaultSelection(
      resolvedPath,
      activeVaultOption?.label ?? labelFromVaultPath(resolvedPath),
      { verifyAvailability: false, storageProvider: activeVaultOption?.storageProvider, syncProvider },
    )
  }, [activeVaultOption, resolvedPath, vaultSwitcher])
  const handleSetGitEnabled = useCallback(async (enabled: boolean) => {
    if (!resolvedPath || gitCapabilityUpdating) return
    setGitCapabilityUpdating(true)
    try {
      if (enabled && !hasGitMetadata) {
        await invokeAppCommand('init_git_repo', { vaultPath: resolvedPath })
        setGitRepoState('ready')
      }
      await persistActiveVaultSyncProvider(enabled ? 'git' : 'none')
      setToastMessage(enabled
        ? 'Git is on for this vault. Commits and sync stay under your control.'
        : 'Git is off for this vault. Grimoire will keep it local-only.')
    } catch (err) {
      setToastMessage(`Could not update Git for this vault: ${err}`)
    } finally {
      setGitCapabilityUpdating(false)
    }
  }, [gitCapabilityUpdating, hasGitMetadata, persistActiveVaultSyncProvider, resolvedPath, setToastMessage])

  const vault = useVaultLoader(noteWindowParams ? '' : resolvedPath, { isGitVault })
  const handleStatusBarSwitchVault = useCallback((path: string) => {
    if (!path || path === resolvedPath) return
    const label = vaultSwitcher.allVaults.find((option) => option.path === path)?.label ?? labelFromVaultPath(path)
    setVaultSwitchTarget({ label, path })
    window.setTimeout(() => vaultSwitcher.switchVault(path), 0)
  }, [resolvedPath, setVaultSwitchTarget, vaultSwitcher])
  const handleStatusBarOpenLocalFolder = useCallback(() => {
    if (vaultFolderPickerPending) return
    setVaultFolderPickerPending(true)
    void vaultSwitcher.handleOpenLocalFolder().finally(() => setVaultFolderPickerPending(false))
  }, [setVaultFolderPickerPending, vaultFolderPickerPending, vaultSwitcher])
  useEffect(() => {
    if (!vaultSwitchTarget || resolvedPath !== vaultSwitchTarget.path || vault.isLoading) return
    if (vault.loadError) setToastMessage(`Could not open ${vaultSwitchTarget.label}: ${vault.loadError}`)
    setVaultSwitchTarget(null)
  }, [resolvedPath, setToastMessage, setVaultSwitchTarget, vault.isLoading, vault.loadError, vaultSwitchTarget])
  const handleGitInitialized = useCallback(() => {
    setGitRepoState('ready')
    void persistActiveVaultSyncProvider('git')
  }, [persistActiveVaultSyncProvider])
  const { status: vaultAiGuidanceStatus, refresh: refreshVaultAiGuidance } = useVaultAiGuidanceStatus(
    resolvedPath,
    buildVaultAiGuidanceRefreshKey(vault.entries),
  )
  const { config: vaultConfig, updateConfig } = useVaultConfig(resolvedPath)
  const explicitOrganizationEnabled = isExplicitOrganizationEnabled(vaultConfig.inbox?.explicitOrganization)
  const effectiveSelection = sanitizeSelectionForOrganization(selection, vaultConfig.inbox?.explicitOrganization)

  useEffect(() => { selectionRef.current = effectiveSelection }, [effectiveSelection, selectionRef])
  useEffect(() => {
    if (effectiveSelection === selection) return
    if (effectiveSelection.kind !== 'entity') neighborhoodHistoryRef.current = []
    setSelection(effectiveSelection)
    setNoteListFilter('open')
  }, [effectiveSelection, neighborhoodHistoryRef, selection, setNoteListFilter, setSelection])
  const handleNeighborhoodHistoryBack = useCallback(() => {
    const { previousSelection, nextHistory } = popNeighborhoodHistory(neighborhoodHistoryRef.current)
    if (!previousSelection) return false
    neighborhoodHistoryRef.current = nextHistory
    handleSetSelection(previousSelection, { preserveNeighborhoodHistory: true })
    requestAnimationFrame(() => focusNoteListContainer(document))
    return true
  }, [handleSetSelection, neighborhoodHistoryRef])
  const handleSaveExplicitOrganization = useCallback((enabled: boolean) => {
    updateConfig('inbox', {
      noteListProperties: vaultConfig.inbox?.noteListProperties ?? null,
      explicitOrganization: enabled,
    })
  }, [updateConfig, vaultConfig.inbox?.noteListProperties])
  const systemLocale = useMemo(() => resolveEffectiveLocale(SYSTEM_UI_LANGUAGE, getBrowserLanguagePreferences()), [])
  const appLocale = useMemo(() => resolveEffectiveLocale(settings.ui_language, [systemLocale]), [settings.ui_language, systemLocale])
  const selectedUiLanguage: UiLanguagePreference = settings.ui_language ?? SYSTEM_UI_LANGUAGE
  useEffect(() => { document.documentElement.lang = appLocale }, [appLocale])
  useAppearanceSettings({
    themeMode: settings.theme_mode,
    themePreset: settings.theme_preset,
    editorFont: settings.editor_font,
    editorLineHeight: settings.editor_line_height,
    nativeShellMaterial: settings.native_shell_material,
    loaded: settingsLoaded,
  })
  const documentThemeMode = useDocumentThemeMode()
  const handleToggleThemeMode = useCallback(() => {
    void saveSettings({ ...settings, theme_mode: documentThemeMode === 'dark' ? 'light' : 'dark' })
  }, [documentThemeMode, saveSettings, settings])
  const handleSetUiLanguage = useCallback((uiLanguage: UiLanguagePreference) => {
    void saveSettings({ ...settings, ui_language: serializeUiLanguagePreference(uiLanguage) })
  }, [saveSettings, settings])
  const aiAgentPreferences = useAiAgentPreferences({ settings, saveSettings, aiAgentsStatus, onToast: setToastMessage })
  useTelemetry(settings, settingsLoaded)
  const vaultOpenedRef = useRef('')
  useEffect(() => {
    if (vault.entries.length > 0 && gitRepoState !== 'checking' && resolvedPath !== vaultOpenedRef.current) {
      vaultOpenedRef.current = resolvedPath
      trackEvent('vault_opened', { has_git: isGitVault ? 1 : 0, note_count: vault.entries.length })
    }
  }, [vault.entries.length, gitRepoState, isGitVault, resolvedPath])
  const { mcpStatus, connectMcp, disconnectMcp } = useMcpStatus(resolvedPath, setToastMessage)
  const gitRemoteStatus = useGitRemoteStatus(resolvedPath, { enabled: isGitVault })
  const openMcpSetupDialog = useCallback(() => setShowMcpSetupDialog(true), [setShowMcpSetupDialog])
  const closeMcpSetupDialog = useCallback(() => {
    if (mcpDialogAction === null) setShowMcpSetupDialog(false)
  }, [mcpDialogAction, setShowMcpSetupDialog])
  const handleConnectMcp = useCallback(async () => {
    setMcpDialogAction('connect')
    try { if (await connectMcp()) setShowMcpSetupDialog(false) } finally { setMcpDialogAction(null) }
  }, [connectMcp, setMcpDialogAction, setShowMcpSetupDialog])
  const handleDisconnectMcp = useCallback(async () => {
    setMcpDialogAction('disconnect')
    try { if (await disconnectMcp()) setShowMcpSetupDialog(false) } finally { setMcpDialogAction(null) }
  }, [disconnectMcp, setMcpDialogAction, setShowMcpSetupDialog])

  return {
    ...bootstrap, resolvedPath, activeVaultOption, searchVaultScopes, gitRepoState, gitCapabilityUpdating,
    hasGitMetadata, isGitVault, handleSetGitEnabled, vault, handleStatusBarSwitchVault,
    handleStatusBarOpenLocalFolder, handleGitInitialized, vaultAiGuidanceStatus, refreshVaultAiGuidance,
    vaultConfig, updateConfig, explicitOrganizationEnabled, effectiveSelection, handleNeighborhoodHistoryBack,
    handleSaveExplicitOrganization, systemLocale, appLocale, selectedUiLanguage, documentThemeMode,
    handleToggleThemeMode, handleSetUiLanguage, aiAgentPreferences, mcpStatus, gitRemoteStatus,
    openMcpSetupDialog, closeMcpSetupDialog, handleConnectMcp, handleDisconnectMcp,
  }
}

export type VaultFoundation = ReturnType<typeof useVaultFoundation>
