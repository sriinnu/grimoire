import {
  LazyAiAgentsOnboardingPrompt as AiAgentsOnboardingPrompt,
  LazyCreateVaultDialog as CreateVaultDialog,
  LazyWelcomeScreen as WelcomeScreen,
} from '../components/AppLazySurfaces'
import { GrimoireRefreshAnimation } from '../components/GrimoireRefreshAnimation'
import type { useAiAgentsStatus } from '../hooks/useAiAgentsStatus'
import type { useOnboarding } from '../hooks/useOnboarding'
import type { CreateEmptyVaultRequest } from '../utils/vaultCreation'

type OnboardingState = ReturnType<typeof useOnboarding>

export function WelcomeView({
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

export function AiAgentsOnboardingView({
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

export function LoadingView({
  detail = 'Opening the notebook',
  label = 'Loading…',
}: {
  detail?: string
  label?: string
}) {
  return (
    <div className="app-shell">
      <GrimoireRefreshAnimation detail={detail} label={label} />
    </div>
  )
}
