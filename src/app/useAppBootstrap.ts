import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { NoteListMultiSelectionCommands } from '../components/note-list/multiSelectionCommands'
import { useAiAgentsOnboarding } from '../hooks/useAiAgentsOnboarding'
import { useAiAgentsStatus } from '../hooks/useAiAgentsStatus'
import { useDialogs } from '../hooks/useDialogs'
import { useGettingStartedClone } from '../hooks/useGettingStartedClone'
import { useLayoutPanels } from '../hooks/useLayoutPanels'
import { useNetworkStatus } from '../hooks/useNetworkStatus'
import { useOnboarding } from '../hooks/useOnboarding'
import { useSettings } from '../hooks/useSettings'
import { useVaultSwitcher } from '../hooks/useVaultSwitcher'
import type { InboxPeriod, SidebarSelection, VaultEntry } from '../types'
import type { CaptureKind, DashboardCaptureRequest } from '../utils/dashboardCapture'
import { pushNeighborhoodHistory } from '../utils/neighborhoodHistory'
import type { NoteListFilter } from '../utils/noteListHelpers'
import { DASHBOARD_SELECTION } from '../utils/organizationWorkflow'
import { resolveThemeDefinitionPreferredMode, resolveThemePresetDefinition } from '../themes/themeRegistry'
import type { CreateEmptyVaultRequest } from '../utils/vaultCreation'
import { getNoteWindowParams, isNoteWindow } from '../utils/windowMode'
import { OPEN_AI_CHAT_EVENT } from '../utils/aiPromptBridge'
import { DEFAULT_SELECTION, type VaultSwitchTransition } from './appRuntimeSupport'
import type { DeferredAppActions } from './useDeferredAppActions'

export function useAppBootstrap(deferred: DeferredAppActions) {
  const noteWindowParams = useMemo(() => isNoteWindow() ? getNoteWindowParams() : null, [])
  const [selection, setSelection] = useState<SidebarSelection>(DEFAULT_SELECTION)
  const [pendingDashboardCaptureRequest, setPendingDashboardCaptureRequest] = useState<DashboardCaptureRequest | null>(null)
  const [noteListFilter, setNoteListFilter] = useState<NoteListFilter>('open')
  const selectionRef = useRef<SidebarSelection>(DEFAULT_SELECTION)
  const neighborhoodHistoryRef = useRef<SidebarSelection[]>([])
  const inboxPeriod: InboxPeriod = 'all'
  const handleSetSelection = useCallback((sel: SidebarSelection, options?: { preserveNeighborhoodHistory?: boolean }) => {
    if (!options?.preserveNeighborhoodHistory && sel.kind !== 'entity') neighborhoodHistoryRef.current = []
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
    setPendingDashboardCaptureRequest((previous) => ({ kind, nonce: (previous?.nonce ?? 0) + 1 }))
    handleSetSelection(DASHBOARD_SELECTION)
  }, [handleSetSelection])
  const clearPendingDashboardCapture = useCallback(() => setPendingDashboardCaptureRequest(null), [])
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
    const handleOpenAiChat = () => { if (!showAIChat) toggleAIChat() }
    window.addEventListener(OPEN_AI_CHAT_EVENT, handleOpenAiChat)
    return () => window.removeEventListener(OPEN_AI_CHAT_EVENT, handleOpenAiChat)
  }, [showAIChat, toggleAIChat])

  const [vaultSwitchTarget, setVaultSwitchTarget] = useState<VaultSwitchTransition | null>(null)
  const [vaultFolderPickerPending, setVaultFolderPickerPending] = useState(false)
  const handleVaultOpening = useCallback((target: VaultSwitchTransition) => setVaultSwitchTarget(target), [])
  const vaultSwitcher = useVaultSwitcher({
    onSwitch: () => {
      if (noteWindowParams) return
      handleSetSelection(DEFAULT_SELECTION)
      deferred.closeAllTabs.current()
    },
    onToast: setToastMessage,
    onVaultOpening: handleVaultOpening,
  })
  const { allVaults, registerVaultSelection, selectedVaultPath, syncVaultSelection, switchVault } = vaultSwitcher
  const { settings, loaded: settingsLoaded, saveSettings } = useSettings()

  const rememberVaultChoice = useCallback((vaultPath: string) => {
    if (!vaultPath) return
    if (allVaults.some((vault) => vault.path === vaultPath)) switchVault(vaultPath)
    else syncVaultSelection(vaultPath, vaultPath.split('/').filter(Boolean).pop() || 'Local Notebook')
  }, [allVaults, switchVault, syncVaultSelection])
  const handleGettingStartedVaultReady = useCallback((vaultPath: string) => {
    rememberVaultChoice(vaultPath)
    setToastMessage(`Getting Started notebook cloned and opened at ${vaultPath}`)
  }, [rememberVaultChoice])
  const handleOnboardingVaultReady = useCallback((vaultPath: string, source: 'template' | 'empty' | 'existing') => {
    rememberVaultChoice(vaultPath)
    if (source === 'template') setToastMessage(`Getting Started notebook cloned and opened at ${vaultPath}`)
  }, [rememberVaultChoice])
  const cloneGettingStartedVault = useGettingStartedClone({
    onError: setToastMessage,
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

  return {
    noteWindowParams, selection, setSelection, pendingDashboardCaptureRequest, noteListFilter, setNoteListFilter,
    selectionRef, neighborhoodHistoryRef, inboxPeriod, handleSetSelection, handleEnterNeighborhood,
    openDashboardCapture, clearPendingDashboardCapture, layout, setInspectorCollapsed, visibleNotesRef,
    multiSelectionCommandRef, toastMessage, setToastMessage, dialogs, showAIChat, toggleAIChat,
    showFeedback, showMcpSetupDialog, setShowMcpSetupDialog, showGraphModal, showWeatherSnapshotDialog,
    showAudioRecordingDialog, mcpDialogAction, setMcpDialogAction, openFeedback, closeFeedback, openGraphModal,
    closeGraphModal, openWeatherSnapshotDialog, closeWeatherSnapshotDialog, openAudioRecordingDialog,
    closeAudioRecordingDialog, networkStatus, vaultSwitchTarget, setVaultSwitchTarget, vaultFolderPickerPending,
    setVaultFolderPickerPending, vaultSwitcher, settings, settingsLoaded, saveSettings, selectedVaultPath,
    cloneGettingStartedVault, onboarding, showCreateVaultDialog, openCreateVaultDialog, closeCreateVaultDialog,
    handleCreateVaultFromDialog, aiAgentsStatus, aiAgentsOnboarding,
  }
}

export type AppBootstrap = ReturnType<typeof useAppBootstrap>
