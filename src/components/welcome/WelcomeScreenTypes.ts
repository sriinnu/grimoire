export interface WelcomeScreenProps {
  mode: 'welcome' | 'vault-missing'
  missingPath?: string
  defaultVaultPath: string
  onCreateVault: () => void
  onRetryCreateVault: () => void
  onCreateEmptyVault: () => void
  onOpenFolder: () => void
  isOffline: boolean
  creatingAction: 'template' | 'empty' | null
  error: string | null
  canRetryTemplate: boolean
}

export interface WelcomeAction {
  disabled: boolean
  run: () => void
}
