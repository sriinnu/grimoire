import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Sidebar } from './components/Sidebar'
import { LazyNoteList as NoteList } from './components/LazyNoteList'
import type { DeletedNoteEntry } from './components/note-list/noteListUtils'
import { LazyEditor as Editor } from './components/LazyEditor'
import { ResizeHandle } from './components/ResizeHandle'
import { Toast } from './components/Toast'
import { GrimoireRefreshAnimation } from './components/GrimoireRefreshAnimation'
import {
  LazyAiAgentsOnboardingPrompt as AiAgentsOnboardingPrompt,
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
  LazyTelemetryConsentDialog as TelemetryConsentDialog,
  LazyUpdateBanner as UpdateBanner,
  LazyVaultRebuildProgressNotice as VaultRebuildProgressNotice,
  LazyWelcomeScreen as WelcomeScreen,
  LazyWeatherSnapshotDialog as WeatherSnapshotDialog,
} from './components/AppLazySurfaces'
import { NoteRetargetingProvider } from './components/note-retargeting/noteRetargetingContext'
import { useTelemetry } from './hooks/useTelemetry'
import { useMcpStatus } from './hooks/useMcpStatus'
import { useAiAgentsOnboarding } from './hooks/useAiAgentsOnboarding'
import { useAiAgentsStatus } from './hooks/useAiAgentsStatus'
import { hasAnyInstalledAiAgent, isAiAgentsStatusChecking, isBrowserPreviewAiAgentsStatus } from './lib/aiAgents'
import { useVaultAiGuidanceStatus } from './hooks/useVaultAiGuidanceStatus'
import { useAutoGit } from './hooks/useAutoGit'
import { useVaultLoader } from './hooks/useVaultLoader'
import { useAiAgentPreferences } from './hooks/useAiAgentPreferences'
import { useSettings } from './hooks/useSettings'
import { useDocumentThemeMode } from './hooks/useDocumentThemeMode'
import { useAppearanceSettings } from './hooks/useAppearanceSettings'
import { useNoteActions } from './hooks/useNoteActions'
import { planNewTypeCreation, slugify } from './hooks/useNoteCreation'
import { useCommitFlow } from './hooks/useCommitFlow'
import { useGitRemoteStatus } from './hooks/useGitRemoteStatus'
import { useViewMode, type ViewMode } from './hooks/useViewMode'
import { useSidebarColumnCollapse } from './hooks/useSidebarColumnCollapse'
import { useNoteLayout } from './hooks/useNoteLayout'
import { useEntryActions } from './hooks/useEntryActions'
import { useAppCommands } from './hooks/useAppCommands'
import { useAudioTranscription } from './hooks/useAudioTranscription'
import { triggerCommitEntryAction } from './utils/commitEntryAction'
import { generateCommitMessage } from './utils/commitMessage'
import { useDialogs } from './hooks/useDialogs'
import { useVaultSwitcher } from './hooks/useVaultSwitcher'
import { useGitHistory } from './hooks/useGitHistory'
import { useUpdater, restartApp } from './hooks/useUpdater'
import { useAutoSync } from './hooks/useAutoSync'
import { useConflictResolver } from './hooks/useConflictResolver'
import { useZoom } from './hooks/useZoom'
import { useVaultConfig } from './hooks/useVaultConfig'
import { useBuildNumber } from './hooks/useBuildNumber'
import { useOnboarding } from './hooks/useOnboarding'
import { useGettingStartedClone } from './hooks/useGettingStartedClone'
import { useNetworkStatus } from './hooks/useNetworkStatus'
import { useAppNavigation } from './hooks/useAppNavigation'
import {
  applyMainWindowSizeConstraints,
  getMainWindowMinWidth,
  useMainWindowSizeConstraints,
} from './hooks/useMainWindowSizeConstraints'
import { useAiActivity } from './hooks/useAiActivity'
import { useBulkActions } from './hooks/useBulkActions'
import { useDeleteActions } from './hooks/useDeleteActions'
import { useFolderActions } from './hooks/useFolderActions'
import { useLayoutPanels } from './hooks/useLayoutPanels'
import { useConflictFlow } from './hooks/useConflictFlow'
import { useAppSave } from './hooks/useAppSave'
import { useNoteRetargetingUi } from './hooks/useNoteRetargetingUi'
import { useSearchResultNavigation, useVaultSearchScopes } from './hooks/useVaultSearchNavigation'
import type { CreateEmptyVaultRequest } from './utils/vaultCreation'
import { useVaultBridge } from './hooks/useVaultBridge'
import type { CommitDiffRequest } from './hooks/useDiffMode'
import { isTauri, mockInvoke } from './mock-tauri'
import type { SidebarSelection, InboxPeriod, VaultEntry, ViewDefinition } from './types'
import type { NoteListItem } from './utils/ai-context'
import type { CaptureKind, DashboardCaptureRequest } from './utils/dashboardCapture'
import { initializeNoteProperties } from './utils/initializeNoteProperties'
import { filterEntries, filterInboxEntries, type NoteListFilter } from './utils/noteListHelpers'
import { openNoteInNewWindow } from './utils/openNoteWindow'
import { refreshPulledVaultState } from './utils/pulledVaultRefresh'
import { isNoteWindow, getNoteWindowParams, getNoteWindowPathCandidates, type NoteWindowParams } from './utils/windowMode'
import type { DetectedRename } from './components/RenameDetectedBanner'
import { openNoteListPropertiesPicker } from './components/note-list/noteListPropertiesEvents'
import type { NoteListMultiSelectionCommands } from './components/note-list/multiSelectionCommands'
import { focusNoteIconPropertyEditor } from './components/noteIconPropertyEvents'
import { trackEvent } from './lib/telemetry'
import {
  SYSTEM_UI_LANGUAGE,
  getBrowserLanguagePreferences,
  resolveEffectiveLocale,
  serializeUiLanguagePreference,
  type UiLanguagePreference,
} from './lib/i18nCore'
import { normalizeReleaseChannel } from './lib/releaseChannel'
import {
  buildVaultAiGuidanceRefreshKey,
} from './lib/vaultAiGuidance'
import {
  resolveThemeDefinitionPreferredMode,
  resolveThemePresetDefinition,
} from './themes/themeRegistry'
import { extractDeletedContentFromDiff } from './components/note-list/noteListUtils'
import { hasNoteIconValue } from './utils/noteIcon'
import { filenameStemToTitle } from './utils/noteTitle'
import { appendMarkdownBlock } from './utils/markdownBlock'
import {
  focusNoteListContainer,
  isEditableElement,
  isEditorEscapeTarget,
  popNeighborhoodHistory,
  pushNeighborhoodHistory,
  shouldProcessNeighborhoodEscape,
} from './utils/neighborhoodHistory'
import { OPEN_AI_CHAT_EVENT } from './utils/aiPromptBridge'
import {
  DASHBOARD_SELECTION,
  isExplicitOrganizationEnabled,
  sanitizeSelectionForOrganization,
} from './utils/organizationWorkflow'
import './App.css'

// Type declarations for mock content storage and test overrides
declare global {
  interface Window {
    __mockContent?: Record<string, string>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- mock handler map for Playwright test overrides
    __mockHandlers?: Record<string, (args: any) => any>
  }
}

const DEFAULT_SELECTION: SidebarSelection = DASHBOARD_SELECTION

/** Stable identity for a primary screen; null for note/neighborhood (entity) focus. */
function selectionScreenKey(selection: SidebarSelection): string | null {
  switch (selection.kind) {
    case 'entity':
      return null
    case 'filter':
      return `filter:${selection.filter}`
    case 'view':
      return `view:${selection.filename}`
    case 'folder':
      return `folder:${selection.path}`
    case 'sectionGroup':
      return `type:${selection.type}`
    case 'dashboard':
      return 'dashboard'
    default:
      return 'screen'
  }
}

function getNextVisibleInboxEntry(entries: VaultEntry[], currentPath: string): VaultEntry | null {
  const currentIndex = entries.findIndex((entry) => entry.path === currentPath)
  if (currentIndex < 0) return null
  return entries[currentIndex + 1] ?? null
}

function shouldPreferOnboardingVaultPath(
  onboardingState: { status: string; vaultPath?: string },
  vaults: Array<{ path: string }>,
): onboardingState is { status: 'ready'; vaultPath: string } {
  return onboardingState.status === 'ready'
    && typeof onboardingState.vaultPath === 'string'
    && onboardingState.vaultPath.length > 0
    && !vaults.some((vault) => vault.path === onboardingState.vaultPath)
}

function labelFromVaultPath(path: string): string {
  return path.split('/').filter(Boolean).pop() || 'Local Notebook'
}

interface VaultSwitchTransition {
  label: string
  path: string
}

type TauriCoreModule = typeof import('@tauri-apps/api/core')

let tauriCoreImport: Promise<TauriCoreModule> | null = null

async function invokeTauri<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  tauriCoreImport ??= import('@tauri-apps/api/core')
  const module = await tauriCoreImport
  return module.invoke<T>(command, args)
}

function invokeAppCommand<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return isTauri() ? invokeTauri<T>(command, args) : mockInvoke<T>(command, args)
}

async function resolveNoteWindowEntry(noteWindowParams: NoteWindowParams): Promise<VaultEntry | undefined> {
  for (const path of getNoteWindowPathCandidates(noteWindowParams)) {
    try {
      const request = { path, vaultPath: noteWindowParams.vaultPath }
      const entry = await invokeAppCommand<VaultEntry | null>('reload_vault_entry', request)
      if (entry) return entry
    } catch {
      // Try the next normalized candidate before reporting the note as unavailable.
    }
  }
}

async function loadNoteWindowContent(path: string, vaultPath: string): Promise<string> {
  const request = { path, vaultPath }
  if (!isTauri()) return mockInvoke<string>('get_note_content', request)

  await invokeTauri('sync_vault_asset_scope_for_window', { vaultPath })
  return invokeTauri<string>('get_note_content', request)
}

function createPulseDeletedNoteEntry(fullPath: string, relativePath: string): DeletedNoteEntry {
  const filename = relativePath.split('/').pop() ?? relativePath
  return {
    path: fullPath,
    filename,
    title: filenameStemToTitle(filename),
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
    __deletedNotePreview: true,
    __deletedRelativePath: relativePath,
    __changeAddedLines: null,
    __changeDeletedLines: null,
    __changeBinary: false,
  }
}

/** Wraps useEditorSave to also keep outgoingLinks in sync on save and on content change. */
function App() {
  const noteWindowParams = useMemo(() => isNoteWindow() ? getNoteWindowParams() : null, [])
  const [selection, setSelection] = useState<SidebarSelection>(DEFAULT_SELECTION)
  const [pendingDashboardCaptureRequest, setPendingDashboardCaptureRequest] = useState<DashboardCaptureRequest | null>(null)
  const [noteListFilter, setNoteListFilter] = useState<NoteListFilter>('open')
  const selectionRef = useRef<SidebarSelection>(DEFAULT_SELECTION)
  const neighborhoodHistoryRef = useRef<SidebarSelection[]>([])
  const inboxPeriod: InboxPeriod = 'all'
  const handleSetSelection = useCallback((sel: SidebarSelection, options?: { preserveNeighborhoodHistory?: boolean }) => {
    if (!options?.preserveNeighborhoodHistory && sel.kind !== 'entity') {
      neighborhoodHistoryRef.current = []
    }
    setSelection(sel)
    setNoteListFilter('open')
  }, [])
  const handleEnterNeighborhood = useCallback((entry: VaultEntry) => {
    const nextSelection: SidebarSelection = { kind: 'entity', entry }
    neighborhoodHistoryRef.current = pushNeighborhoodHistory(
      neighborhoodHistoryRef.current,
      selectionRef.current,
      nextSelection,
    )
    handleSetSelection(nextSelection, { preserveNeighborhoodHistory: true })
  }, [handleSetSelection])
  const openDashboardCapture = useCallback((kind: CaptureKind) => {
    setPendingDashboardCaptureRequest((previous) => ({
      kind,
      nonce: (previous?.nonce ?? 0) + 1,
    }))
    handleSetSelection(DASHBOARD_SELECTION)
  }, [handleSetSelection])
  const clearPendingDashboardCapture = useCallback(() => {
    setPendingDashboardCaptureRequest(null)
  }, [])
  const layout = useLayoutPanels(noteWindowParams ? { initialInspectorCollapsed: true } : undefined)
  const { setInspectorCollapsed } = layout
  const visibleNotesRef = useRef<VaultEntry[]>([])
  const multiSelectionCommandRef = useRef<NoteListMultiSelectionCommands | null>(null)
  const [toastMessage, setToastMessage] = useState<string | null>(null)
  const dialogs = useDialogs()
  const { showAIChat, toggleAIChat } = dialogs
  const [showFeedback, setShowFeedback] = useState(false)
  const [showMcpSetupDialog, setShowMcpSetupDialog] = useState(false)
  const [showGraphModal, setShowGraphModal] = useState(false)
  const [showWeatherSnapshotDialog, setShowWeatherSnapshotDialog] = useState(false)
  const [showAudioRecordingDialog, setShowAudioRecordingDialog] = useState(false)
  const [mcpDialogAction, setMcpDialogAction] = useState<'connect' | 'disconnect' | null>(null)
  const openFeedback = useCallback(() => setShowFeedback(true), [])
  const closeFeedback = useCallback(() => setShowFeedback(false), [])
  const openGraphModal = useCallback(() => setShowGraphModal(true), [])
  const closeGraphModal = useCallback(() => setShowGraphModal(false), [])
  const openWeatherSnapshotDialog = useCallback(() => setShowWeatherSnapshotDialog(true), [])
  const closeWeatherSnapshotDialog = useCallback(() => setShowWeatherSnapshotDialog(false), [])
  const openAudioRecordingDialog = useCallback(() => setShowAudioRecordingDialog(true), [])
  const closeAudioRecordingDialog = useCallback(() => setShowAudioRecordingDialog(false), [])
  const networkStatus = useNetworkStatus()

  useEffect(() => {
    const handleOpenAiChat = () => {
      if (!showAIChat) toggleAIChat()
    }

    window.addEventListener(OPEN_AI_CHAT_EVENT, handleOpenAiChat)
    return () => window.removeEventListener(OPEN_AI_CHAT_EVENT, handleOpenAiChat)
  }, [showAIChat, toggleAIChat])

  // onSwitch closure captures `notes` declared below — safe because it's only
  // called on user interaction, never during render (refs inside the hook
  // guarantee the latest closure is always used).
  const [vaultSwitchTarget, setVaultSwitchTarget] = useState<VaultSwitchTransition | null>(null)
  const [vaultFolderPickerPending, setVaultFolderPickerPending] = useState(false)
  const handleVaultOpening = useCallback((target: VaultSwitchTransition) => {
    setVaultSwitchTarget(target)
  }, [])
  const vaultSwitcher = useVaultSwitcher({
    onSwitch: () => {
      if (noteWindowParams) return
      handleSetSelection(DEFAULT_SELECTION)
      notes.closeAllTabs()
    },
    onToast: (msg) => setToastMessage(msg),
    onVaultOpening: handleVaultOpening,
  })
  const {
    allVaults,
    registerVaultSelection,
    selectedVaultPath,
    syncVaultSelection,
    switchVault,
  } = vaultSwitcher
  const { settings, loaded: settingsLoaded, saveSettings } = useSettings()

  const rememberVaultChoice = useCallback((vaultPath: string) => {
    if (!vaultPath) return

    if (allVaults.some((vault) => vault.path === vaultPath)) {
      switchVault(vaultPath)
      return
    }

    const label = vaultPath.split('/').filter(Boolean).pop() || 'Local Notebook'
    syncVaultSelection(vaultPath, label)
  }, [allVaults, switchVault, syncVaultSelection])

  const handleGettingStartedVaultReady = useCallback((vaultPath: string) => {
    rememberVaultChoice(vaultPath)
    setToastMessage(`Getting Started notebook cloned and opened at ${vaultPath}`)
  }, [rememberVaultChoice])

  const handleOnboardingVaultReady = useCallback((vaultPath: string, source: 'template' | 'empty' | 'existing') => {
    rememberVaultChoice(vaultPath)
    if (source === 'template') {
      setToastMessage(`Getting Started notebook cloned and opened at ${vaultPath}`)
    }
  }, [rememberVaultChoice])
  const cloneGettingStartedVault = useGettingStartedClone({
    onError: (message) => setToastMessage(message),
    onSuccess: handleGettingStartedVaultReady,
  })
  const onboarding = useOnboarding(vaultSwitcher.vaultPath, {
    onVaultReady: handleOnboardingVaultReady,
    registerVault: registerVaultSelection,
  }, vaultSwitcher.loaded)
  const [showCreateVaultDialog, setShowCreateVaultDialog] = useState(false)
  const openCreateVaultDialog = useCallback(() => setShowCreateVaultDialog(true), [])
  const closeCreateVaultDialog = useCallback(() => setShowCreateVaultDialog(false), [])
  const handleCreateVaultFromDialog = useCallback(async (request: CreateEmptyVaultRequest) => {
    const created = !noteWindowParams && (onboarding.state.status === 'welcome' || onboarding.state.status === 'vault-missing')
      ? await onboarding.handleCreateEmptyVault(request)
      : await vaultSwitcher.handleCreateEmptyVault(request)

    if (created && request.themePreset) {
      const definition = resolveThemePresetDefinition(request.themePreset)
      void saveSettings({
        ...settings,
        theme_mode: resolveThemeDefinitionPreferredMode(definition),
        theme_preset: request.themePreset,
      })
    }

    return created
  }, [noteWindowParams, onboarding, saveSettings, settings, vaultSwitcher])
  const aiAgentsStatus = useAiAgentsStatus()
  const aiAgentsOnboarding = useAiAgentsOnboarding(onboarding.state.status === 'ready' && !noteWindowParams)

  // Onboarding can briefly own the vault path for a newly created/opened vault
  // before the persisted switcher catches up, but once the path is already in
  // the switcher list we should trust the explicit switcher state.
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
  // Git repo check: 'checking' | 'required' | 'ready'
  const [gitRepoState, setGitRepoState] = useState<'checking' | 'required' | 'ready'>('checking')
  const [gitCapabilityUpdating, setGitCapabilityUpdating] = useState(false)
  useEffect(() => {
    if (!resolvedPath) return
    let cancelled = false
    setGitRepoState('checking')
    const check = isTauri()
      ? invokeTauri<boolean>('is_git_repo', { vaultPath: resolvedPath })
      : Promise.resolve(true) // browser mock: assume git
    check
      .then(isGit => { if (!cancelled) setGitRepoState(isGit ? 'ready' : 'required') })
      .catch(() => { if (!cancelled) setGitRepoState('ready') }) // fail open
    return () => { cancelled = true }
  }, [resolvedPath])

  const hasGitMetadata = gitRepoState === 'ready'
  const gitSyncProvider = activeVaultOption?.syncProvider
  const gitCapabilityEnabled = gitSyncProvider === 'git' || (gitSyncProvider == null && hasGitMetadata)
  const isGitVault = hasGitMetadata && gitCapabilityEnabled

  const persistActiveVaultSyncProvider = useCallback(async (syncProvider: 'git' | 'none') => {
    if (!resolvedPath) return
    await registerVaultSelection(
      resolvedPath,
      activeVaultOption?.label ?? labelFromVaultPath(resolvedPath),
      {
        verifyAvailability: false,
        storageProvider: activeVaultOption?.storageProvider,
        syncProvider,
      },
    )
  }, [activeVaultOption, registerVaultSelection, resolvedPath])

  const handleSetGitEnabled = useCallback(async (enabled: boolean) => {
    if (!resolvedPath || gitCapabilityUpdating) return
    setGitCapabilityUpdating(true)
    try {
      if (enabled && !hasGitMetadata) {
        const args = { vaultPath: resolvedPath }
        await invokeAppCommand('init_git_repo', args)
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
  }, [
    gitCapabilityUpdating,
    hasGitMetadata,
    persistActiveVaultSyncProvider,
    resolvedPath,
    setToastMessage,
  ])

  const vault = useVaultLoader(noteWindowParams ? '' : resolvedPath, { isGitVault })
  const handleStatusBarSwitchVault = useCallback((path: string) => {
    if (!path || path === resolvedPath) return

    const label = vaultSwitcher.allVaults.find((vaultOption) => vaultOption.path === path)?.label
      ?? labelFromVaultPath(path)
    setVaultSwitchTarget({ label, path })
    window.setTimeout(() => {
      vaultSwitcher.switchVault(path)
    }, 0)
  }, [resolvedPath, vaultSwitcher])
  const handleStatusBarOpenLocalFolder = useCallback(() => {
    if (vaultFolderPickerPending) return

    setVaultFolderPickerPending(true)
    void vaultSwitcher.handleOpenLocalFolder().finally(() => {
      setVaultFolderPickerPending(false)
    })
  }, [vaultFolderPickerPending, vaultSwitcher])
  useEffect(() => {
    if (!vaultSwitchTarget) return
    if (resolvedPath !== vaultSwitchTarget.path || vault.isLoading) return

    if (vault.loadError) {
      setToastMessage(`Could not open ${vaultSwitchTarget.label}: ${vault.loadError}`)
    }

    setVaultSwitchTarget(null)
  }, [resolvedPath, vault.isLoading, vault.loadError, vaultSwitchTarget])
  const handleGitInitialized = useCallback(() => {
    setGitRepoState('ready')
    void persistActiveVaultSyncProvider('git')
  }, [persistActiveVaultSyncProvider])
  const {
    status: vaultAiGuidanceStatus,
    refresh: refreshVaultAiGuidance,
  } = useVaultAiGuidanceStatus(
    resolvedPath,
    buildVaultAiGuidanceRefreshKey(vault.entries),
  )
  const { config: vaultConfig, updateConfig } = useVaultConfig(resolvedPath)
  const explicitOrganizationEnabled = isExplicitOrganizationEnabled(vaultConfig.inbox?.explicitOrganization)
  const effectiveSelection = sanitizeSelectionForOrganization(selection, vaultConfig.inbox?.explicitOrganization)

  useEffect(() => {
    selectionRef.current = effectiveSelection
  }, [effectiveSelection])

  useEffect(() => {
    if (effectiveSelection !== selection) {
      if (effectiveSelection.kind !== 'entity') {
        neighborhoodHistoryRef.current = []
      }
      setSelection(effectiveSelection)
      setNoteListFilter('open')
    }
  }, [effectiveSelection, selection])

  const handleNeighborhoodHistoryBack = useCallback(() => {
    const { previousSelection, nextHistory } = popNeighborhoodHistory(neighborhoodHistoryRef.current)
    if (!previousSelection) return false

    neighborhoodHistoryRef.current = nextHistory
    handleSetSelection(previousSelection, { preserveNeighborhoodHistory: true })
    requestAnimationFrame(() => {
      focusNoteListContainer(document)
    })
    return true
  }, [handleSetSelection])

  const handleSaveExplicitOrganization = useCallback((enabled: boolean) => {
    updateConfig('inbox', {
      noteListProperties: vaultConfig.inbox?.noteListProperties ?? null,
      explicitOrganization: enabled,
    })
  }, [updateConfig, vaultConfig.inbox?.noteListProperties])
  const systemLocale = useMemo(
    () => resolveEffectiveLocale(SYSTEM_UI_LANGUAGE, getBrowserLanguagePreferences()),
    [],
  )
  const appLocale = useMemo(
    () => resolveEffectiveLocale(settings.ui_language, [systemLocale]),
    [settings.ui_language, systemLocale],
  )
  const selectedUiLanguage = settings.ui_language ?? SYSTEM_UI_LANGUAGE
  useEffect(() => {
    document.documentElement.lang = appLocale
  }, [appLocale])
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
    const theme_mode = documentThemeMode === 'dark' ? 'light' : 'dark'
    void saveSettings({ ...settings, theme_mode })
  }, [documentThemeMode, saveSettings, settings])
  const handleSetUiLanguage = useCallback((uiLanguage: UiLanguagePreference) => {
    void saveSettings({ ...settings, ui_language: serializeUiLanguagePreference(uiLanguage) })
  }, [saveSettings, settings])
  const aiAgentPreferences = useAiAgentPreferences({
    settings,
    saveSettings,
    aiAgentsStatus,
    onToast: setToastMessage,
  })
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

  const openMcpSetupDialog = useCallback(() => {
    setShowMcpSetupDialog(true)
  }, [])

  const closeMcpSetupDialog = useCallback(() => {
    if (mcpDialogAction !== null) return
    setShowMcpSetupDialog(false)
  }, [mcpDialogAction])

  const handleConnectMcp = useCallback(async () => {
    setMcpDialogAction('connect')
    try {
      const didConnect = await connectMcp()
      if (didConnect) setShowMcpSetupDialog(false)
    } finally {
      setMcpDialogAction(null)
    }
  }, [connectMcp])

  const handleDisconnectMcp = useCallback(async () => {
    setMcpDialogAction('disconnect')
    try {
      const didDisconnect = await disconnectMcp()
      if (didDisconnect) setShowMcpSetupDialog(false)
    } finally {
      setMcpDialogAction(null)
    }
  }, [disconnectMcp])

  // Detect external file renames on window focus
  const [detectedRenames, setDetectedRenames] = useState<DetectedRename[]>([])
  useEffect(() => {
    if (!isTauri() || !resolvedPath || !isGitVault) return
    const handleFocus = () => {
      invokeTauri<DetectedRename[]>('detect_renames', { vaultPath: resolvedPath })
        .then(renames => { if (renames.length > 0) setDetectedRenames(renames) })
        .catch((err) => console.warn('[vault] Git rename detection failed:', err))
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [isGitVault, resolvedPath])

  // macOS window focus/blur → dim the sidebar and titlebar when inactive
  useEffect(() => {
    if (!isTauri()) return
    let unlisten: (() => void) | undefined
    let cancelled = false
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      if (cancelled) return
      getCurrentWindow().onFocusChanged(({ payload: focused }) => {
        document.body.classList.toggle('window-inactive', !focused)
      }).then(fn => { unlisten = fn })
    })
    return () => {
      cancelled = true
      unlisten?.()
    }
  }, [])

  const handleUpdateWikilinks = useCallback(async () => {
    if (!isTauri()) return
    try {
      const count = await invokeTauri<number>('update_wikilinks_for_renames', { vaultPath: resolvedPath, renames: detectedRenames })
      setDetectedRenames([])
      vault.reloadVault()
      setToastMessage(`Updated wikilinks in ${count} file${count !== 1 ? 's' : ''}`)
    } catch (err) {
      setToastMessage(`Failed to update wikilinks: ${err}`)
    }
  }, [resolvedPath, detectedRenames, vault, setToastMessage])

  const handleDismissRenames = useCallback(() => setDetectedRenames([]), [])

  const conflictResolver = useConflictResolver({
    vaultPath: resolvedPath,
    onResolved: () => {
      dialogs.closeConflictResolver()
      autoSync.resumePull()
      vault.reloadVault()
      autoSync.triggerSync()
    },
    onToast: (msg) => setToastMessage(msg),
    onOpenFile: (relativePath) => conflictFlow.openConflictFileRef.current(relativePath),
  })
  const flushPendingRawContentRef = useRef<((path: string) => void) | null>(null)
  const flushEditorStateBeforeAction = async (path: string) => {
    flushPendingRawContentRef.current?.(path)
    await appSave.flushBeforeAction(path)
  }

  const notes = useNoteActions({
    addEntry: vault.addEntry,
    removeEntry: vault.removeEntry,
    entries: vault.entries,
    flushBeforeNoteSwitch: flushEditorStateBeforeAction,
    flushBeforeFrontmatterChange: flushEditorStateBeforeAction,
    flushBeforePathRename: flushEditorStateBeforeAction,
    reloadVault: vault.reloadVault,
    setToastMessage,
    updateEntry: vault.updateEntry,
    vaultPath: resolvedPath,
    addPendingSave: vault.addPendingSave,
    removePendingSave: vault.removePendingSave,
    trackUnsaved: vault.trackUnsaved,
    clearUnsaved: vault.clearUnsaved,
    unsavedPaths: vault.unsavedPaths,
    markContentPending: (path, content) => appSave.contentChangeRef.current(path, content),
    onNewNotePersisted: vault.loadModifiedFiles,
    replaceEntry: vault.replaceEntry,
    onFrontmatterPersisted: vault.loadModifiedFiles,
    onPathRenamed: (oldPath, newPath) => appSave.trackRenamedPath(oldPath, newPath),
  })
  const {
    handleSelectNote,
    handleReplaceActiveTab,
    closeAllTabs,
    openTabWithContent,
  } = notes
  const noteWindowActionsRef = useRef({ handleSelectNote, openTabWithContent })
  useEffect(() => {
    noteWindowActionsRef.current = { handleSelectNote, openTabWithContent }
  }, [handleSelectNote, openTabWithContent])
  // Switching primary screens from the sidebar (Pages → Dreams → Journal → …)
  // should not leave the previously opened document in the editor. A genuine
  // change to a different screen closes open tabs; re-selecting the current
  // screen and neighborhood/entity focus leave the editor untouched. Note opens
  // go through onSelectNote, not this handler, so they are unaffected.
  const handleSidebarSelect = useCallback(
    (sel: SidebarSelection, options?: { preserveNeighborhoodHistory?: boolean }) => {
      const nextKey = selectionScreenKey(sel)
      const currentKey = selectionScreenKey(selectionRef.current)
      handleSetSelection(sel, options)
      if (nextKey !== null && nextKey !== currentKey) {
        closeAllTabs()
      }
    },
    [handleSetSelection, closeAllTabs],
  )
  const handleDashboardCaptureCreated = useCallback((entry: VaultEntry) => {
    const typeName = entry.isA
    handleSetSelection(typeName && typeName !== 'Note'
      ? { kind: 'sectionGroup', type: typeName }
      : { kind: 'filter', filter: 'all' })
  }, [handleSetSelection])
  const handleDashboardOpenNote = useCallback((entry: VaultEntry) => {
    const typeName = entry.isA
    handleSetSelection(typeName && typeName !== 'Note'
      ? { kind: 'sectionGroup', type: typeName }
      : { kind: 'filter', filter: 'all' })
    void handleSelectNote(entry)
  }, [handleSelectNote, handleSetSelection])
  const handleSearchResultSelect = useSearchResultNavigation({
    entries: vault.entries,
    isLoading: vault.isLoading,
    onOpenEntry: handleDashboardOpenNote,
    onSwitchVault: handleStatusBarSwitchVault,
    onToast: setToastMessage,
    resolvedPath,
  })
  const handlePulledVaultUpdate = useCallback(async (updatedFiles: string[]) => {
    await refreshPulledVaultState({
      activeTabPath: notes.activeTabPath,
      closeAllTabs,
      hasUnsavedChanges: (path) => vault.unsavedPaths.has(path),
      reloadFolders: vault.reloadFolders,
      reloadVault: vault.reloadVault,
      reloadViews: vault.reloadViews,
      replaceActiveTab: handleReplaceActiveTab,
      updatedFiles,
      vaultPath: resolvedPath,
    })
  }, [
      closeAllTabs,
      handleReplaceActiveTab,
      notes.activeTabPath,
      resolvedPath,
      vault.reloadFolders,
      vault.reloadVault,
      vault.reloadViews,
      vault.unsavedPaths,
    ])
  const autoSync = useAutoSync({
    vaultPath: resolvedPath,
    enabled: isGitVault,
    intervalMinutes: settings.auto_pull_interval_minutes,
    onVaultUpdated: handlePulledVaultUpdate,
    onConflict: (files) => {
      const names = files.map((f) => f.split('/').pop()).join(', ')
      setToastMessage(`Conflict in ${names} — click to resolve`)
    },
    onToast: (msg) => setToastMessage(msg),
  })
  const effectiveRemoteStatus = autoSync.remoteStatus ?? gitRemoteStatus.remoteStatus
  const canAddRemote = !isGitVault || effectiveRemoteStatus?.hasRemote === false
  const pendingDiffRequestIdRef = useRef(0)
  const [pendingDiffRequest, setPendingDiffRequest] = useState<CommitDiffRequest | null>(null)

  // Note window: auto-open the note from URL params without scanning the whole vault.
  const noteWindowOpenedRef = useRef(false)
  const noteWindowMissingPathRef = useRef<string | null>(null)
  useEffect(() => {
    if (!noteWindowParams || noteWindowOpenedRef.current) return

    void resolveNoteWindowEntry(noteWindowParams).then(async (entry) => {
      if (noteWindowOpenedRef.current) return
      if (entry) {
        try {
          const content = await loadNoteWindowContent(entry.path, noteWindowParams.vaultPath)
          if (noteWindowOpenedRef.current) return
          noteWindowOpenedRef.current = true
          noteWindowMissingPathRef.current = null
          noteWindowActionsRef.current.openTabWithContent(entry, content)
        } catch {
          if (noteWindowOpenedRef.current) return
          noteWindowOpenedRef.current = true
          noteWindowMissingPathRef.current = null
          void noteWindowActionsRef.current.handleSelectNote(entry)
        }
        return
      }
      if (noteWindowMissingPathRef.current === noteWindowParams.notePath) return
      noteWindowMissingPathRef.current = noteWindowParams.notePath
      setToastMessage(`Could not open "${noteWindowParams.noteTitle}" in this window`)
    })
  }, [noteWindowParams, setToastMessage])

  // Note window: update window title when active note changes
  useEffect(() => {
    if (!noteWindowParams) return
    const activeEntry = notes.tabs.find(t => t.entry.path === notes.activeTabPath)?.entry
    const title = activeEntry?.title ?? noteWindowParams.noteTitle
    if (!isTauri()) { document.title = title; return }
    import('@tauri-apps/api/window').then(({ getCurrentWindow }) => {
      getCurrentWindow().setTitle(title)
    }).catch((err) => console.warn('[window] Failed to update note window title:', err))
  }, [noteWindowParams, notes.tabs, notes.activeTabPath])

  // Keep note entry in sync with vault entries so banners (trash/archive)
  // and read-only state react immediately without reopening the note.
  useEffect(() => {
    notes.setTabs(prev => {
      let changed = false
      const next = prev.map(tab => {
        const fresh = vault.entries.find(e => e.path === tab.entry.path)
        if (fresh && fresh !== tab.entry) {
          changed = true
          return { ...tab, entry: fresh }
        }
        return tab
      })
      return changed ? next : prev
    })
  }, [vault.entries]) // eslint-disable-line react-hooks/exhaustive-deps -- notes.setTabs is stable (useState setter)

  const { handleGoBack, handleGoForward, canGoBack, canGoForward, entriesByPath } = useAppNavigation({
    entries: vault.entries,
    activeTabPath: notes.activeTabPath,
    onSelectNote: notes.handleSelectNote,
  })

  const queuePendingDiff = useCallback((path: string, commitHash?: string) => {
    pendingDiffRequestIdRef.current += 1
    setPendingDiffRequest({
      requestId: pendingDiffRequestIdRef.current,
      path,
      commitHash,
    })
  }, [])

  const handlePendingDiffHandled = useCallback((requestId: number) => {
    setPendingDiffRequest((current) =>
      current?.requestId === requestId ? null : current,
    )
  }, [])

  const handlePulseOpenNote = useCallback((relativePath: string, commitHash?: string) => {
    const fullPath = `${resolvedPath}/${relativePath}`
    const entry = entriesByPath.get(fullPath) ?? entriesByPath.get(relativePath)

    if (commitHash) {
      const targetPath = entry?.path ?? fullPath
      queuePendingDiff(targetPath, commitHash)
      if (entry) {
        void handleSelectNote(entry)
      } else {
        openTabWithContent(createPulseDeletedNoteEntry(fullPath, relativePath), 'Content not available')
      }
      return
    }

    if (entry) {
      void handleSelectNote(entry)
    }
  }, [entriesByPath, resolvedPath, queuePendingDiff, handleSelectNote, openTabWithContent])

  const handleOpenFavorite = useCallback(async (entry: VaultEntry) => {
    await handleReplaceActiveTab(entry)
    handleEnterNeighborhood(entry)
  }, [handleEnterNeighborhood, handleReplaceActiveTab])

  const vaultBridge = useVaultBridge({
    entriesByPath,
    resolvedPath,
    reloadVault: vault.reloadVault,
    reloadFolders: vault.reloadFolders,
    reloadViews: vault.reloadViews,
    closeAllTabs,
    replaceActiveTab: handleReplaceActiveTab,
    hasUnsavedChanges: (path) => vault.unsavedPaths.has(path),
    onSelectNote: notes.handleSelectNote,
    activeTabPath: notes.activeTabPath,
  })

  const conflictFlow = useConflictFlow({
    resolvedPath, entries: vault.entries,
    conflictFiles: autoSync.conflictFiles,
    pausePull: autoSync.pausePull, resumePull: autoSync.resumePull,
    triggerSync: autoSync.triggerSync, reloadVault: vault.reloadVault,
    initConflictFiles: conflictResolver.initFiles,
    openConflictResolver: dialogs.openConflictResolver,
    closeConflictResolver: dialogs.closeConflictResolver,
    onSelectNote: notes.handleSelectNote,
    activeTabPath: notes.activeTabPath,
    setToastMessage,
  })

  const appSave = useAppSave({
    updateEntry: vault.updateEntry, setTabs: notes.setTabs, handleSwitchTab: notes.handleSwitchTab, setToastMessage,
    loadModifiedFiles: vault.loadModifiedFiles, reloadViews: async () => { await vault.reloadViews() },
    trackUnsaved: vault.trackUnsaved, clearUnsaved: vault.clearUnsaved, unsavedPaths: vault.unsavedPaths,
    tabs: notes.tabs, activeTabPath: notes.activeTabPath,
    handleRenameNote: notes.handleRenameNote, handleRenameFilename: notes.handleRenameFilename,
    replaceEntry: vault.replaceEntry, resolvedPath,
    initialH1AutoRenameEnabled: settings.initial_h1_auto_rename_enabled !== false,
  })

  const aiActivity = useAiActivity({
    onOpenNote: vaultBridge.openNoteByPath,
    onOpenTab: vaultBridge.openNoteByPath,
    onSetFilter: (filterType) => {
      handleSetSelection({ kind: 'sectionGroup', type: filterType })
    },
    onVaultChanged: () => { vault.reloadVault() },
  })

  const handleInitializeProperties = useCallback(async (path: string) => {
    await initializeNoteProperties(notes.handleUpdateFrontmatter, path)
  }, [notes])

  const handleRemoveNoteIcon = useCallback(async (path: string) => {
    await notes.handleDeleteProperty(path, 'icon')
  }, [notes])

  const handleSetNoteIconCommand = useCallback(() => {
    setInspectorCollapsed(false)
    window.requestAnimationFrame(() => {
      window.requestAnimationFrame(() => {
        focusNoteIconPropertyEditor()
      })
    })
  }, [setInspectorCollapsed])

  const handleCustomizeNoteListColumns = useCallback(() => {
    if (effectiveSelection.kind === 'view') {
      openNoteListPropertiesPicker('view')
      return
    }

    if (effectiveSelection.kind !== 'filter') return
    if (effectiveSelection.filter === 'all') {
      openNoteListPropertiesPicker('all')
      return
    }
    if (effectiveSelection.filter === 'inbox') {
      openNoteListPropertiesPicker('inbox')
    }
  }, [effectiveSelection])

  const handleUpdateAllNotesNoteListProperties = useCallback((value: string[] | null) => {
    updateConfig('allNotes', {
      ...(vaultConfig.allNotes ?? { noteListProperties: null }),
      noteListProperties: value && value.length > 0 ? value : null,
    })
  }, [updateConfig, vaultConfig.allNotes])

  const handleUpdateInboxNoteListProperties = useCallback((value: string[] | null) => {
    updateConfig('inbox', {
      ...(vaultConfig.inbox ?? { noteListProperties: null }),
      noteListProperties: value && value.length > 0 ? value : null,
    })
  }, [updateConfig, vaultConfig.inbox])

  const handleCreateFolder = useCallback(async (name: string) => {
    try {
      await invokeAppCommand('create_vault_folder', { vaultPath: resolvedPath, folderName: name })
      await vault.reloadFolders()
      setToastMessage(`Created folder "${name}"`)
      return true
    } catch (e) {
      setToastMessage(`Failed to create folder: ${e}`)
      return false
    }
  }, [resolvedPath, vault, setToastMessage])

  const folderActions = useFolderActions({
    vaultPath: resolvedPath,
    selection: effectiveSelection,
    setSelection: handleSetSelection,
    setTabs: notes.setTabs,
    activeTabPathRef: notes.activeTabPathRef,
    handleSwitchTab: notes.handleSwitchTab,
    closeAllTabs: notes.closeAllTabs,
    reloadVault: vault.reloadVault,
    reloadFolders: vault.reloadFolders,
    setToastMessage,
  })

  const handleRemoveNoteIconCommand = useCallback(() => {
    if (notes.activeTabPath) handleRemoveNoteIcon(notes.activeTabPath)
  }, [notes.activeTabPath, handleRemoveNoteIcon])

  const handleOpenInNewWindow = useCallback(() => {
    const activeTab = notes.tabs.find(t => t.entry.path === notes.activeTabPath)
    if (activeTab) openNoteInNewWindow(activeTab.entry.path, resolvedPath, activeTab.entry.title)
  }, [notes.tabs, notes.activeTabPath, resolvedPath])

  const handleRevealPathInFinder = useCallback(async (path: string, successMessage: string) => {
    if (!resolvedPath || !path) {
      setToastMessage('Open a vault before revealing files in Finder')
      return
    }
    if (!isTauri()) {
      setToastMessage('Reveal in Finder is available in the Mac app')
      return
    }
    try {
      await invokeAppCommand('reveal_path_in_finder', { vaultPath: resolvedPath, path })
      setToastMessage(successMessage)
    } catch (err) {
      setToastMessage(`Could not reveal in Finder: ${err}`)
    }
  }, [resolvedPath, setToastMessage])

  const handleRevealNoteInFinder = useCallback((path: string) => {
    void handleRevealPathInFinder(path, 'Revealed note in Finder')
  }, [handleRevealPathInFinder])

  const handlePreviewNoteWithQuickLook = useCallback(async (path: string) => {
    if (!resolvedPath || !path) {
      setToastMessage('Open a vault before previewing notes with Quick Look')
      return
    }
    if (!isTauri()) {
      setToastMessage('Quick Look preview is available in the Mac app')
      return
    }
    try {
      await invokeAppCommand('preview_path_with_quick_look', { vaultPath: resolvedPath, path })
      setToastMessage('Opened note in Quick Look')
    } catch (err) {
      setToastMessage(`Could not open Quick Look: ${err}`)
    }
  }, [resolvedPath, setToastMessage])

  const handleRevealVaultInFinder = useCallback(() => {
    void handleRevealPathInFinder(resolvedPath, 'Opened vault in Finder')
  }, [handleRevealPathInFinder, resolvedPath])

  const handleOpenEntryInNewWindow = useCallback((entry: { path: string; title: string }) => {
    openNoteInNewWindow(entry.path, resolvedPath, entry.title)
  }, [resolvedPath])

  const handleDiscardFile = useCallback(async (relativePath: string) => {
    const targetFile = vault.modifiedFiles.find((file) => file.relativePath === relativePath)
    const activePathBefore = notes.activeTabPath
    try {
      await invokeAppCommand('git_discard_file', { vaultPath: resolvedPath, relativePath })
      const reloadedEntries = await vault.reloadVault()
      const affectedActiveTab = !!activePathBefore
        && (activePathBefore === targetFile?.path || activePathBefore.endsWith('/' + relativePath))
      if (!affectedActiveTab) return
      const refreshedEntry = reloadedEntries.find((entry) =>
        entry.path === targetFile?.path || entry.path.endsWith('/' + relativePath),
      )
      if (refreshedEntry) {
        await notes.handleReplaceActiveTab(refreshedEntry)
      } else {
        notes.closeAllTabs()
      }
    } catch (err) {
      setToastMessage(typeof err === 'string' ? err : 'Failed to discard changes')
    }
  }, [resolvedPath, vault, notes, setToastMessage])

  const handleOpenDeletedNote = useCallback(async (entry: DeletedNoteEntry) => {
    let previewContent = 'Content not available (untracked)'
    let hasDiff = false
    try {
      const diff = await vault.loadDiff(entry.path)
      hasDiff = diff.length > 0
      previewContent = extractDeletedContentFromDiff(diff) ?? previewContent
    } catch (err) {
      console.warn('Failed to load deleted note preview:', err)
    }
    notes.openTabWithContent(entry, previewContent)
    if (hasDiff) {
      queuePendingDiff(entry.path)
    } else {
      setToastMessage('Content not available (untracked)')
    }
  }, [vault, notes, queuePendingDiff, setToastMessage])

  const handleReplaceActiveTabWithQueuedDiff = useCallback((entry: VaultEntry) => {
    const openNote = notes.handleReplaceActiveTab(entry)
    if (effectiveSelection.kind === 'filter' && effectiveSelection.filter === 'changes') {
      queuePendingDiff(entry.path)
    }
    return openNote
  }, [effectiveSelection, notes, queuePendingDiff])

  const commitFlow = useCommitFlow({
    enabled: isGitVault,
    savePending: appSave.savePending,
    loadModifiedFiles: vault.loadModifiedFiles,
    resolveRemoteStatus: gitRemoteStatus.refreshRemoteStatus,
    setToastMessage,
    onPushRejected: autoSync.handlePushRejected,
    vaultPath: resolvedPath,
  })
  const suggestedCommitMessage = useMemo(() => generateCommitMessage(vault.modifiedFiles), [vault.modifiedFiles])
  const modifiedFilesSignature = useMemo(
    () => vault.modifiedFiles.map((file) => `${file.relativePath}:${file.status}`).sort().join('|'),
    [vault.modifiedFiles],
  )
  const autoGit = useAutoGit({
    enabled: settings.autogit_enabled === true,
    idleThresholdSeconds: settings.autogit_idle_threshold_seconds ?? 90,
    inactiveThresholdSeconds: settings.autogit_inactive_threshold_seconds ?? 30,
    isGitVault,
    hasPendingChanges: vault.modifiedFiles.length > 0
      || ((autoSync.remoteStatus?.hasRemote ?? false) && (autoSync.remoteStatus?.ahead ?? 0) > 0),
    hasUnsavedChanges: vault.unsavedPaths.size > 0,
    onCheckpoint: () => commitFlow.runAutomaticCheckpoint(),
  })
  const recordAutoGitActivity = autoGit.recordActivity
  const openCommitDialog = commitFlow.openCommitDialog
  const runAutomaticCheckpoint = commitFlow.runAutomaticCheckpoint
  const handleAppContentChange = appSave.handleContentChange
  const handleAppSave = appSave.handleSave
  const loadModifiedFiles = vault.loadModifiedFiles

  useEffect(() => {
    if (modifiedFilesSignature.length === 0) return
    recordAutoGitActivity()
  }, [modifiedFilesSignature, recordAutoGitActivity])

  const handleCommitPush = useCallback(() => {
    if (!isGitVault) {
      setToastMessage('Git is not enabled for this vault')
      return
    }
    triggerCommitEntryAction({
      autoGitEnabled: settings.autogit_enabled === true,
      openCommitDialog,
      runAutomaticCheckpoint,
    })
  }, [isGitVault, openCommitDialog, runAutomaticCheckpoint, settings.autogit_enabled, setToastMessage])

  const handleTrackedContentChange = useCallback((path: string, content: string) => {
    recordAutoGitActivity()
    handleAppContentChange(path, content)
  }, [handleAppContentChange, recordAutoGitActivity])

  const handleInsertWeatherSnapshot = useCallback((markdown: string) => {
    const activePath = notes.activeTabPath
    const activeTab = activePath
      ? notes.tabs.find((tab) => tab.entry.path === activePath)
      : null

    if (!activePath || !activeTab) {
      setToastMessage('Open a note before adding weather')
      return
    }

    handleTrackedContentChange(activePath, appendMarkdownBlock(activeTab.content, markdown))
    setToastMessage('Weather added to note')
  }, [handleTrackedContentChange, notes.activeTabPath, notes.tabs, setToastMessage])

  const handleTrackedSave = useCallback(async (...args: Parameters<typeof handleAppSave>) => {
    const result = await handleAppSave(...args)
    recordAutoGitActivity()
    return result
  }, [handleAppSave, recordAutoGitActivity])

  const seedAutoGitSavedChange = useCallback(async () => {
    if (isTauri()) {
      throw new Error('seedAutoGitSavedChange is only available in browser smoke tests')
    }

    const activePath = notes.activeTabPath
    const activeTab = activePath
      ? notes.tabs.find((tab) => tab.entry.path === activePath)
      : null

    if (!activePath || !activeTab) {
      throw new Error('No active note is available for the AutoGit test bridge')
    }

    const saveNoteContent = window.__mockHandlers?.save_note_content
    if (typeof saveNoteContent === 'function') {
      await Promise.resolve(saveNoteContent({ path: activePath, content: activeTab.content }))
    } else {
      await mockInvoke('save_note_content', { path: activePath, content: activeTab.content })
    }

    await loadModifiedFiles()
    recordAutoGitActivity()
  }, [loadModifiedFiles, notes.activeTabPath, notes.tabs, recordAutoGitActivity])

  useEffect(() => {
    window.__grimoireTest = {
      ...window.__grimoireTest,
      activeTabPath: notes.activeTabPath,
      seedAutoGitSavedChange,
    }

    return () => {
      if (window.__grimoireTest?.seedAutoGitSavedChange === seedAutoGitSavedChange) {
        delete window.__grimoireTest.seedAutoGitSavedChange
      }
    }
  }, [notes.activeTabPath, seedAutoGitSavedChange])

  const entryActions = useEntryActions({
    entries: vault.entries, updateEntry: vault.updateEntry,
    handleUpdateFrontmatter: notes.handleUpdateFrontmatter,
    handleDeleteProperty: notes.handleDeleteProperty, setToastMessage,
    createTypeEntry: notes.createTypeEntrySilent,
    onBeforeAction: appSave.flushBeforeAction,
  })

  const deleteActions = useDeleteActions({
    onDeselectNote: (path: string) => { if (notes.activeTabPath === path) notes.closeAllTabs() },
    removeEntry: vault.removeEntry,
    removeEntries: vault.removeEntries,
    refreshModifiedFiles: vault.loadModifiedFiles,
    reloadVault: vault.reloadVault,
    setToastMessage,
  })

  const shouldLoadGitHistory = isGitVault && !layout.inspectorCollapsed && !showAIChat
  const gitHistory = useGitHistory(notes.activeTabPath, vault.loadGitHistory, shouldLoadGitHistory)
  const handleCreateType = useCallback(async (name: string, icon?: string) => {
    const created = await notes.handleCreateType(name)
    if (created && icon) {
      await notes.handleUpdateFrontmatter(`${resolvedPath}/${slugify(name)}.md`, 'icon', icon)
    }
    if (created) setToastMessage(`Type "${name}" created`)
    return created
  }, [notes, resolvedPath, setToastMessage])

  const handleCreateMissingType = useCallback(async (path: string, missingType: string, nextTypeName: string) => {
    const trimmed = nextTypeName.trim()
    if (!trimmed) return false

    const plan = planNewTypeCreation({ entries: vault.entries, typeName: trimmed, vaultPath: resolvedPath })
    if (plan.status === 'blocked') {
      setToastMessage(plan.message)
      return false
    }

    let resolvedTypeName = plan.status === 'existing' ? plan.entry.title : trimmed

    if (plan.status === 'create') {
      try {
        resolvedTypeName = (await notes.createTypeEntrySilent(trimmed)).title
      } catch {
        return false
      }
    }

    await notes.handleUpdateFrontmatter(path, 'type', resolvedTypeName)
    setToastMessage(
      plan.status === 'create' && resolvedTypeName === missingType
        ? `Type "${resolvedTypeName}" created`
        : `Type set to "${resolvedTypeName}"`,
    )
    return true
  }, [notes, resolvedPath, setToastMessage, vault.entries])

  const handleCreateOrUpdateView = useCallback(async (definition: ViewDefinition) => {
    const editing = dialogs.editingView
    const filename = editing
      ? editing.filename
      : definition.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '') + '.yml'
    const nextDefinition = editing ? { ...editing.definition, ...definition } : definition
    await invokeAppCommand('save_view_cmd', { vaultPath: resolvedPath, filename, definition: nextDefinition })
    trackEvent(editing ? 'view_updated' : 'view_created')
    await vault.reloadViews()
    await vault.reloadVault()
    vault.reloadFolders()
    setToastMessage(editing ? `View "${nextDefinition.name}" updated` : `View "${nextDefinition.name}" created`)
    handleSetSelection({ kind: 'view', filename })
  }, [resolvedPath, vault, handleSetSelection, dialogs.editingView])

  const handleUpdateViewDefinition = useCallback(async (filename: string, patch: Partial<ViewDefinition>) => {
    const existing = vault.views.find((view) => view.filename === filename)
    if (!existing) return

    await invokeAppCommand('save_view_cmd', {
      vaultPath: resolvedPath,
      filename,
      definition: { ...existing.definition, ...patch },
    })
    await vault.reloadViews()
  }, [resolvedPath, vault])

  const handleEditView = useCallback((filename: string) => {
    const view = vault.views.find((v) => v.filename === filename)
    if (view) dialogs.openEditView(filename, view.definition)
  }, [vault.views, dialogs])

  const handleDeleteView = useCallback(async (filename: string) => {
    await invokeAppCommand('delete_view_cmd', { vaultPath: resolvedPath, filename })
    await vault.reloadViews()
    await vault.reloadVault()
    vault.reloadFolders()
    if (selection.kind === 'view' && selection.filename === filename) {
      handleSetSelection({ kind: 'filter', filter: 'all' })
    }
    setToastMessage('View deleted')
  }, [resolvedPath, vault, selection, handleSetSelection])

  const availableFields = useMemo(() => {
    const builtIn = ['type', 'status', 'title', 'favorite', 'body']
    if (!vault.entries?.length) return builtIn
    const customFields = new Set<string>()
    for (const e of vault.entries) {
      if (e.properties) {
        for (const key of Object.keys(e.properties)) customFields.add(key)
      }
      if (e.relationships) {
        for (const key of Object.keys(e.relationships)) customFields.add(key)
      }
    }
    return [...builtIn, ...Array.from(customFields).sort()]
  }, [vault.entries])

  const bulkActions = useBulkActions(entryActions, vault.entries, setToastMessage)

  // Raw-toggle ref: Editor registers its handleToggleRaw here so the command palette can call it
  const rawToggleRef = useRef<() => void>(() => {})
  // Diff-toggle ref: Editor registers its handleToggleDiff here so the command palette can call it
  const diffToggleRef = useRef<() => void>(() => {})

  const { setViewMode, sidebarVisible, noteListVisible } = useViewMode(noteWindowParams ? 'editor-only' : undefined)
  const { sidebarColumnCollapsed, setSidebarColumnCollapsed } = useSidebarColumnCollapse()
  const { noteLayout, toggleNoteLayout } = useNoteLayout()
  const zoom = useZoom()
  const buildNumber = useBuildNumber()

  const updateMainWindowConstraints = useCallback((
    nextSidebarVisible: boolean,
    nextNoteListVisible: boolean,
    nextInspectorCollapsed: boolean = layout.inspectorCollapsed,
    nextSidebarCollapsed: boolean = sidebarColumnCollapsed,
  ) => {
    if (noteWindowParams) return

    const minWidth = getMainWindowMinWidth({
      sidebarVisible: nextSidebarVisible,
      sidebarCollapsed: nextSidebarCollapsed,
      noteListVisible: nextNoteListVisible,
      inspectorCollapsed: nextInspectorCollapsed,
    })

    void applyMainWindowSizeConstraints(minWidth).catch((err) => console.warn('[window] Size constraints failed:', err))
  }, [layout.inspectorCollapsed, noteWindowParams, sidebarColumnCollapsed])

  const handleSetViewMode = useCallback((mode: ViewMode) => {
    setViewMode(mode)
    updateMainWindowConstraints(mode === 'all', mode !== 'editor-only')
  }, [setViewMode, updateMainWindowConstraints])

  const handleToggleInspector = useCallback(() => {
    const nextInspectorCollapsed = !layout.inspectorCollapsed
    layout.setInspectorCollapsed(nextInspectorCollapsed)
    updateMainWindowConstraints(sidebarVisible, noteListVisible, nextInspectorCollapsed)
  }, [
    layout,
    noteListVisible,
    sidebarVisible,
    updateMainWindowConstraints,
  ])

  const handleSetSidebarColumnCollapsed = useCallback((collapsed: boolean) => {
    setSidebarColumnCollapsed(collapsed)
    updateMainWindowConstraints(sidebarVisible, noteListVisible, layout.inspectorCollapsed, collapsed)
  }, [
    layout.inspectorCollapsed,
    noteListVisible,
    setSidebarColumnCollapsed,
    sidebarVisible,
    updateMainWindowConstraints,
  ])

  useMainWindowSizeConstraints({
    enabled: !noteWindowParams,
    sidebarVisible,
    sidebarCollapsed: sidebarColumnCollapsed,
    noteListVisible,
    inspectorCollapsed: layout.inspectorCollapsed,
  })

  const { status: updateStatus, actions: updateActions } = useUpdater(settings.release_channel)

  const handleCheckForUpdates = useCallback(async () => {
    if (updateStatus.state === 'downloading') {
      setToastMessage('Update is downloading…')
      return
    }
    if (updateStatus.state === 'ready') {
      await restartApp()
      return
    }
    const result = await updateActions.checkForUpdates()
    if (result.kind === 'up-to-date') {
      const checkedChannel = normalizeReleaseChannel(settings.release_channel)
      setToastMessage(`No newer ${checkedChannel} update is available right now`)
    } else if (result.kind === 'available') {
      setToastMessage(`Grimoire ${result.displayVersion} is available`)
    } else {
      setToastMessage(result.message)
    }
  }, [settings.release_channel, updateActions, updateStatus.state, setToastMessage])

  const handleRepairVault = useCallback(async () => {
    if (!resolvedPath) return
    try {
      const msg = await invokeAppCommand<string>('repair_vault', { vaultPath: resolvedPath })
      await vault.reloadVault()
      await refreshVaultAiGuidance()
      setToastMessage(msg)
    } catch (err) {
      setToastMessage(`Failed to repair vault: ${err}`)
    }
  }, [refreshVaultAiGuidance, resolvedPath, vault, setToastMessage])

  const restoreVaultAiGuidance = useCallback(async (successToast: string | null = 'Grimoire AI guidance restored') => {
    if (!resolvedPath) return
    try {
      await invokeAppCommand('restore_vault_ai_guidance', { vaultPath: resolvedPath })
      await vault.reloadVault()
      await refreshVaultAiGuidance()
      if (successToast) setToastMessage(successToast)
    } catch (err) {
      setToastMessage(`Failed to restore Grimoire AI guidance: ${err}`)
    }
  }, [refreshVaultAiGuidance, resolvedPath, vault, setToastMessage])

  const activeDeletedFile = useMemo(() => {
    const activeTabPath = notes.activeTabPath
    if (!activeTabPath) return null
    return vault.modifiedFiles.find((file) =>
      file.status === 'deleted'
      && (file.path === activeTabPath || activeTabPath.endsWith('/' + file.relativePath)),
    ) ?? null
  }, [notes.activeTabPath, vault.modifiedFiles])

  const activeCommandEntry = useMemo(() => {
    if (!notes.activeTabPath) return null
    return notes.tabs.find((tab) => tab.entry.path === notes.activeTabPath)?.entry
      ?? vault.entries.find((entry) => entry.path === notes.activeTabPath)
      ?? null
  }, [notes.activeTabPath, notes.tabs, vault.entries])
  const noteRetargetingUi = useNoteRetargetingUi({
    activeEntry: activeCommandEntry,
    activeNoteBlocked: !!activeDeletedFile,
    entries: vault.entries,
    folders: vault.folders,
    selection: effectiveSelection,
    setSelection: handleSetSelection,
    setToastMessage,
    vaultPath: resolvedPath,
    updateFrontmatter: notes.handleUpdateFrontmatter,
    moveNoteToFolder: notes.handleMoveNoteToFolder,
  })

  const canToggleRichEditor = !!activeCommandEntry
    && activeCommandEntry.filename.toLowerCase().endsWith('.md')
    && !activeDeletedFile
  const shouldBlockNeighborhoodEscape = (
    dialogs.showCreateTypeDialog
    || dialogs.showQuickOpen
    || dialogs.showCommandPalette
    || dialogs.showAIChat
    || dialogs.showSettings
    || dialogs.showCloneVault
    || dialogs.showSearch
    || dialogs.showConflictResolver
    || dialogs.showCreateViewDialog
    || noteRetargetingUi.isDialogOpen
    || showFeedback
    || showMcpSetupDialog
    || showGraphModal
    || showWeatherSnapshotDialog
    || showAudioRecordingDialog
  )

  useEffect(() => {
    const handleWindowKeyDown = (event: KeyboardEvent) => {
      if (!shouldProcessNeighborhoodEscape(event, selectionRef.current, shouldBlockNeighborhoodEscape)) return

      const activeElement = document.activeElement
      if (isEditorEscapeTarget(activeElement)) {
        event.preventDefault()
        activeElement.blur()
        focusNoteListContainer(document)
        requestAnimationFrame(() => {
          focusNoteListContainer(document)
        })
        return
      }

      if (isEditableElement(activeElement)) return

      if (handleNeighborhoodHistoryBack()) {
        event.preventDefault()
      }
    }

    window.addEventListener('keydown', handleWindowKeyDown)
    return () => window.removeEventListener('keydown', handleWindowKeyDown)
  }, [handleNeighborhoodHistoryBack, shouldBlockNeighborhoodEscape])

  const noteListColumnsLabel = useMemo(() => {
    if (effectiveSelection.kind === 'view') {
      const selectedView = vault.views.find((view) => view.filename === effectiveSelection.filename)
      return selectedView ? `Customize ${selectedView.definition.name} columns` : 'Customize View columns'
    }

    return effectiveSelection.kind === 'filter' && effectiveSelection.filter === 'all'
      ? 'Customize Pages columns'
      : 'Customize Inbox columns'
  }, [effectiveSelection, vault.views])
  const activeNoteModified = useMemo(
    () => vault.modifiedFiles.some((file) => file.path === notes.activeTabPath),
    [notes.activeTabPath, vault.modifiedFiles],
  )
  const toggleDiffCommand = useCallback(() => diffToggleRef.current(), [])
  const toggleRawEditorCommand = useMemo(
    () => canToggleRichEditor ? () => rawToggleRef.current() : undefined,
    [canToggleRichEditor],
  )
  const removeActiveVaultCommand = useCallback(() => {
    vaultSwitcher.removeVault(vaultSwitcher.vaultPath)
  }, [vaultSwitcher])
  const restoreVaultAiGuidanceCommand = useCallback(() => {
    void restoreVaultAiGuidance()
  }, [restoreVaultAiGuidance])
  const changeNoteTypeCommand = useMemo(
    () => noteRetargetingUi.canChangeActiveNoteType ? noteRetargetingUi.openChangeNoteTypeDialog : undefined,
    [noteRetargetingUi.canChangeActiveNoteType, noteRetargetingUi.openChangeNoteTypeDialog],
  )
  const moveNoteToFolderCommand = useMemo(
    () => noteRetargetingUi.canMoveActiveNoteToFolder ? noteRetargetingUi.openMoveNoteToFolderDialog : undefined,
    [noteRetargetingUi.canMoveActiveNoteToFolder, noteRetargetingUi.openMoveNoteToFolderDialog],
  )
  const activeNoteHasIcon = useMemo(() => {
    const entry = vault.entries.find((candidate) => candidate.path === notes.activeTabPath)
    return hasNoteIconValue(entry?.icon)
  }, [notes.activeTabPath, vault.entries])
  const handleToggleOrganizedWithInboxAdvance = useCallback(async (path: string) => {
    const entry = vault.entries.find((candidate) => candidate.path === path)
    if (!entry) return

    const shouldAutoAdvance = settings.auto_advance_inbox_after_organize === true
      && !entry.organized
      && notes.activeTabPath === path
      && effectiveSelection.kind === 'filter'
      && effectiveSelection.filter === 'inbox'
    const nextVisibleInboxEntry = shouldAutoAdvance
      ? getNextVisibleInboxEntry(visibleNotesRef.current, path)
      : null

    const organized = await entryActions.handleToggleOrganized(path)

    if (organized && nextVisibleInboxEntry) {
      void notes.handleSelectNote(nextVisibleInboxEntry)
    }
  }, [effectiveSelection, entryActions, notes, settings.auto_advance_inbox_after_organize, vault.entries])
  const toggleOrganizedCommand = explicitOrganizationEnabled ? handleToggleOrganizedWithInboxAdvance : undefined
  const canCustomizeNoteListColumns = useMemo(() => (
    effectiveSelection.kind === 'view'
      || (
        effectiveSelection.kind === 'filter'
        && (effectiveSelection.filter === 'all' || (explicitOrganizationEnabled && effectiveSelection.filter === 'inbox'))
      )
  ), [effectiveSelection, explicitOrganizationEnabled])
  const restoreDeletedNoteCommand = useMemo(
    () => activeDeletedFile ? () => { void handleDiscardFile(activeDeletedFile.relativePath) } : undefined,
    [activeDeletedFile, handleDiscardFile],
  )
  const insertWeatherSnapshotCommand = useMemo(
    () => activeDeletedFile ? undefined : openWeatherSnapshotDialog,
    [activeDeletedFile, openWeatherSnapshotDialog],
  )
  const audioTranscription = useAudioTranscription({
    vaultPath: resolvedPath,
    entries: vault.entries,
    transcriptionProvider: settings.transcription_provider,
    cloudTranscriptionEnabled: settings.cloud_transcription_enabled,
    addEntry: vault.addEntry,
    openTabWithContent: notes.openTabWithContent,
    loadModifiedFiles: vault.loadModifiedFiles,
    setToastMessage,
  })
  const handleOpenGraphNote = useCallback((entry: VaultEntry) => {
    void handleSelectNote(entry)
    setShowGraphModal(false)
  }, [handleSelectNote])
  const handleCaptureThoughtCommand = useCallback(() => openDashboardCapture('note'), [openDashboardCapture])
  const handleCaptureJournalCommand = useCallback(() => openDashboardCapture('journal'), [openDashboardCapture])
  const handleCaptureDreamCommand = useCallback(() => openDashboardCapture('dream'), [openDashboardCapture])

  const commands = useAppCommands({
    activeTabPath: notes.activeTabPath, activeTabPathRef: notes.activeTabPathRef,
    entries: vault.entries,
    visibleNotesRef,
    multiSelectionCommandRef,
    modifiedCount: isGitVault ? vault.modifiedFiles.length : 0,
    isGitVault,
    activeNoteModified,
    selection: effectiveSelection,
    onQuickOpen: dialogs.openQuickOpen, onCommandPalette: dialogs.openCommandPalette,
    onSearch: dialogs.openSearch,
    onCreateNote: notes.handleCreateNoteImmediate,
    onCaptureThought: handleCaptureThoughtCommand,
    onCaptureJournal: handleCaptureJournalCommand,
    onCaptureDream: handleCaptureDreamCommand,
    onCreateNoteOfType: notes.handleCreateNoteImmediate,
    onSave: appSave.handleSave,
    onOpenSettings: dialogs.openSettings,
    onOpenFeedback: openFeedback,
    onDeleteNote: deleteActions.handleDeleteNote,
    onArchiveNote: entryActions.handleArchiveNote, onUnarchiveNote: entryActions.handleUnarchiveNote,
    onCommitPush: handleCommitPush,
    onPull: autoSync.triggerSync,
    onResolveConflicts: conflictFlow.handleOpenConflictResolver,
    onSetViewMode: handleSetViewMode,
    onToggleInspector: handleToggleInspector,
    onToggleDiff: toggleDiffCommand,
    onToggleRawEditor: toggleRawEditorCommand,
    onOpenGraph: openGraphModal,
    noteLayout,
    onToggleNoteLayout: toggleNoteLayout,
    onZoomIn: zoom.zoomIn, onZoomOut: zoom.zoomOut, onZoomReset: zoom.zoomReset,
    zoomLevel: zoom.zoomLevel,
    onSelect: handleSetSelection,
    onRenameFolder: folderActions.renameSelectedFolder,
    onDeleteFolder: folderActions.deleteSelectedFolder,
    showInbox: explicitOrganizationEnabled,
    onReplaceActiveTab: notes.handleReplaceActiveTab,
    onSelectNote: notes.handleSelectNote,
    onGoBack: handleGoBack, onGoForward: handleGoForward,
    canGoBack: canGoBack, canGoForward: canGoForward,
    onOpenVault: vaultSwitcher.handleOpenLocalFolder,
    onCreateEmptyVault: openCreateVaultDialog,
    canAddRemote,
    onCreateType: dialogs.openCreateType,
    onToggleAIChat: dialogs.toggleAIChat,
    onCheckForUpdates: handleCheckForUpdates,
    onRemoveActiveVault: removeActiveVaultCommand,
    onRestoreGettingStarted: cloneGettingStartedVault,
    isGettingStartedHidden: vaultSwitcher.isGettingStartedHidden,
    vaultCount: vaultSwitcher.allVaults.length,
    locale: appLocale,
    systemLocale,
    selectedUiLanguage,
    onSetUiLanguage: handleSetUiLanguage,
    mcpStatus,
    onInstallMcp: openMcpSetupDialog,
    onOpenAiAgents: dialogs.openSettings,
    aiAgentsStatus,
    vaultAiGuidanceStatus,
    onRestoreVaultAiGuidance: restoreVaultAiGuidanceCommand,
    selectedAiAgent: aiAgentPreferences.defaultAiAgent,
    onSetDefaultAiAgent: aiAgentPreferences.setDefaultAiAgent,
    onCycleDefaultAiAgent: aiAgentPreferences.cycleDefaultAiAgent,
    selectedAiAgentLabel: aiAgentPreferences.defaultAiAgentLabel,
    onReloadVault: vault.reloadVault,
    onRepairVault: handleRepairVault,
    onSetNoteIcon: handleSetNoteIconCommand,
    onRemoveNoteIcon: handleRemoveNoteIconCommand,
    onChangeNoteType: changeNoteTypeCommand,
    onMoveNoteToFolder: moveNoteToFolderCommand,
    canMoveNoteToFolder: noteRetargetingUi.canMoveActiveNoteToFolder,
    activeNoteHasIcon,
    noteListFilter,
    onSetNoteListFilter: setNoteListFilter,
    onOpenInNewWindow: handleOpenInNewWindow,
    onRevealNoteInFinder: handleRevealNoteInFinder,
    onPreviewNoteWithQuickLook: handlePreviewNoteWithQuickLook,
    onRevealVaultInFinder: handleRevealVaultInFinder,
    onToggleFavorite: entryActions.handleToggleFavorite,
    onToggleOrganized: toggleOrganizedCommand,
    onInsertWeatherSnapshot: insertWeatherSnapshotCommand,
    onTranscribeAudio: audioTranscription.transcribePickedAudio,
    onRecordAudio: openAudioRecordingDialog,
    onCustomizeNoteListColumns: handleCustomizeNoteListColumns,
    canCustomizeNoteListColumns,
    noteListColumnsLabel,
    onRestoreDeletedNote: restoreDeletedNoteCommand,
    canRestoreDeletedNote: !!activeDeletedFile,
  })

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

  const shouldResumeFreshStartOnboarding = useMemo(() => {
    if (onboarding.state.status !== 'ready' || !vaultSwitcher.loaded) return false
    const remembersOnlyImplicitDefaultVault = selectedVaultPath === null

    return remembersOnlyImplicitDefaultVault
      && vaultSwitcher.allVaults.length === 1
      && vaultSwitcher.allVaults[0]?.path === vaultSwitcher.vaultPath
      && onboarding.state.vaultPath === vaultSwitcher.vaultPath
  }, [onboarding.state, selectedVaultPath, vaultSwitcher.allVaults, vaultSwitcher.loaded, vaultSwitcher.vaultPath])

  // Show loading spinner while checking vault (skip for note windows)
  if (!noteWindowParams && onboarding.state.status === 'loading') {
    return <LoadingView />
  }

  // Show telemetry consent dialog on first launch (skip for note windows).
  // After the user answers, the next render can continue into onboarding.
  if (!noteWindowParams && settingsLoaded && settings.telemetry_consent === null) {
    return (
      <TelemetryConsentDialog
        onAccept={() => {
          const id = crypto.randomUUID()
          saveSettings({ ...settings, telemetry_consent: true, crash_reporting_enabled: true, analytics_enabled: false, anonymous_id: id })
        }}
        onDecline={() => {
          saveSettings({ ...settings, telemetry_consent: false, crash_reporting_enabled: false, analytics_enabled: false, anonymous_id: null })
        }}
      />
    )
  }

  // Show welcome/onboarding screen when vault doesn't exist (skip for note windows — vault path is known)
  if (!noteWindowParams && (onboarding.state.status === 'welcome' || onboarding.state.status === 'vault-missing' || shouldResumeFreshStartOnboarding)) {
    const welcomeOnboarding = shouldResumeFreshStartOnboarding
      ? { ...onboarding, state: { status: 'welcome' as const, defaultPath: vaultSwitcher.vaultPath } }
      : onboarding
    return (
      <WelcomeView
        onboarding={welcomeOnboarding}
        isOffline={networkStatus.isOffline}
        createVaultDialogOpen={showCreateVaultDialog}
        onOpenCreateVaultDialog={openCreateVaultDialog}
        onCloseCreateVaultDialog={closeCreateVaultDialog}
        onCreateVaultFromDialog={handleCreateVaultFromDialog}
        initialThemePreset={settings.theme_preset}
      />
    )
  }

  const shouldBlockForAiAgentSetup = aiAgentsOnboarding.showPrompt
    && !isAiAgentsStatusChecking(aiAgentsStatus)
    && !isBrowserPreviewAiAgentsStatus(aiAgentsStatus)
    && !hasAnyInstalledAiAgent(aiAgentsStatus)

  if (
    !noteWindowParams
    && onboarding.state.status === 'ready'
    && shouldBlockForAiAgentSetup
    && !showMcpSetupDialog
  ) {
    return (
      <>
        <AiAgentsOnboardingView
          statuses={aiAgentsStatus}
          onContinue={aiAgentsOnboarding.dismissPrompt}
        />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </>
    )
  }

  if (!noteWindowParams && vaultSwitchTarget) {
    const isFailedSwitch = resolvedPath === vaultSwitchTarget.path && !!vault.loadError

    return (
      <>
        <LoadingView
          detail={isFailedSwitch ? vault.loadError ?? 'The notebook did not open cleanly' : `Opening ${vaultSwitchTarget.label}`}
          label={isFailedSwitch ? 'Could not open notebook' : 'Switching notebook'}
        />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </>
    )
  }

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

type OnboardingState = ReturnType<typeof useOnboarding>

/** Welcome screen view - extracted from main App component */
function WelcomeView({
  onboarding,
  isOffline,
  createVaultDialogOpen,
  initialThemePreset,
  onOpenCreateVaultDialog,
  onCloseCreateVaultDialog,
  onCreateVaultFromDialog,
}: {
  onboarding: OnboardingState
  isOffline: boolean
  createVaultDialogOpen: boolean
  initialThemePreset: CreateEmptyVaultRequest['themePreset'] | null | undefined
  onOpenCreateVaultDialog: () => void
  onCloseCreateVaultDialog: () => void
  onCreateVaultFromDialog: (request: CreateEmptyVaultRequest) => Promise<boolean> | boolean
}) {
  const state = onboarding.state as { status: 'welcome' | 'vault-missing'; defaultPath: string; vaultPath?: string }
  return (
    <div className="app-shell">
      <WelcomeScreen
        mode={state.status === 'welcome' ? 'welcome' : 'vault-missing'}
        missingPath={state.status === 'vault-missing' ? state.vaultPath : undefined}
        defaultVaultPath={state.defaultPath}
        onCreateVault={onboarding.handleCreateVault}
        onRetryCreateVault={onboarding.retryCreateVault}
        onCreateEmptyVault={onOpenCreateVaultDialog}
        onOpenFolder={onboarding.handleOpenFolder}
        isOffline={isOffline}
        creatingAction={onboarding.creatingAction}
        error={onboarding.error}
        canRetryTemplate={onboarding.canRetryTemplate}
      />
      <CreateVaultDialog
        initialThemePreset={initialThemePreset}
        open={createVaultDialogOpen}
        onClose={onCloseCreateVaultDialog}
        onCreate={onCreateVaultFromDialog}
      />
    </div>
  )
}

function AiAgentsOnboardingView({
  statuses,
  onContinue,
}: {
  statuses: ReturnType<typeof useAiAgentsStatus>
  onContinue: () => void
}) {
  return (
    <div className="app-shell">
      <AiAgentsOnboardingPrompt statuses={statuses} onContinue={onContinue} />
    </div>
  )
}

/** Loading spinner view - extracted from main App component */
function LoadingView({ detail = 'Opening the notebook', label = 'Loading…' }: { detail?: string; label?: string }) {
  return (
    <div className="app-shell">
      <GrimoireRefreshAnimation detail={detail} label={label} />
    </div>
  )
}

export default App
