import { useMemo, type ReactNode } from 'react'
import {
  LazyTelemetryConsentDialog as TelemetryConsentDialog,
} from '../components/AppLazySurfaces'
import { Toast } from '../components/Toast'
import {
  hasAnyInstalledAiAgent,
  isAiAgentsStatusChecking,
  isBrowserPreviewAiAgentsStatus,
} from '../lib/aiAgents'
import { AiAgentsOnboardingView, LoadingView, WelcomeView } from './AppGateViews'
import type { VaultFoundation } from './useVaultFoundation'

export function useAppStartupGate(foundation: VaultFoundation): ReactNode | null {
  const {
    aiAgentsOnboarding,
    aiAgentsStatus,
    closeCreateVaultDialog,
    handleCreateVaultFromDialog,
    networkStatus,
    noteWindowParams,
    onboarding,
    openCreateVaultDialog,
    resolvedPath,
    saveSettings,
    selectedVaultPath,
    settings,
    settingsLoaded,
    showCreateVaultDialog,
    showMcpSetupDialog,
    setToastMessage,
    toastMessage,
    vault,
    vaultSwitcher,
    vaultSwitchTarget,
  } = foundation

  const shouldResumeFreshStartOnboarding = useMemo(() => {
    if (onboarding.state.status !== 'ready' || !vaultSwitcher.loaded) return false
    return selectedVaultPath === null
      && vaultSwitcher.allVaults.length === 1
      && vaultSwitcher.allVaults[0]?.path === vaultSwitcher.vaultPath
      && onboarding.state.vaultPath === vaultSwitcher.vaultPath
  }, [onboarding.state, selectedVaultPath, vaultSwitcher.allVaults, vaultSwitcher.loaded, vaultSwitcher.vaultPath])

  if (!noteWindowParams && onboarding.state.status === 'loading') return <LoadingView />

  if (!noteWindowParams && settingsLoaded && settings.telemetry_consent === null) {
    return (
      <TelemetryConsentDialog
        onAccept={() => saveSettings({
          ...settings,
          telemetry_consent: true,
          crash_reporting_enabled: true,
          analytics_enabled: false,
          anonymous_id: crypto.randomUUID(),
        })}
        onDecline={() => saveSettings({
          ...settings,
          telemetry_consent: false,
          crash_reporting_enabled: false,
          analytics_enabled: false,
          anonymous_id: null,
        })}
      />
    )
  }

  if (!noteWindowParams && (
    onboarding.state.status === 'welcome'
    || onboarding.state.status === 'vault-missing'
    || shouldResumeFreshStartOnboarding
  )) {
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
        <AiAgentsOnboardingView statuses={aiAgentsStatus} onContinue={aiAgentsOnboarding.dismissPrompt} />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </>
    )
  }

  if (!noteWindowParams && vaultSwitchTarget) {
    const failed = resolvedPath === vaultSwitchTarget.path && !!vault.loadError
    return (
      <>
        <LoadingView
          detail={failed ? vault.loadError ?? 'The notebook did not open cleanly' : `Opening ${vaultSwitchTarget.label}`}
          label={failed ? 'Could not open notebook' : 'Switching notebook'}
        />
        <Toast message={toastMessage} onDismiss={() => setToastMessage(null)} />
      </>
    )
  }

  return null
}
