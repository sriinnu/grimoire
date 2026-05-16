import type { VaultStorageProviderId, VaultSyncProviderId } from '@/components/status-bar/types'

export type VaultStorageChoiceId =
  | 'local'
  | 'icloud'
  | 'google-drive'
  | 'synced-folder'
  | 'custom'

export interface VaultStorageChoice {
  id: VaultStorageChoiceId
  label: string
  basePath: string
  storageProvider: VaultStorageProviderId
  detail: string
}

export interface CreateEmptyVaultRequest {
  targetPath: string
  storageProvider?: VaultStorageProviderId
  syncProvider?: VaultSyncProviderId
  initializeGit?: boolean
}

export const DEFAULT_VAULT_NAME = 'New Vault'

function replaceControlCharacters(value: string): string {
  return Array.from(value, char => (char.charCodeAt(0) < 32 ? '-' : char)).join('')
}

export const VAULT_STORAGE_CHOICES: VaultStorageChoice[] = [
  {
    id: 'local',
    label: 'Local folder',
    basePath: '~/Grimoire/Vaults',
    storageProvider: 'local-folder',
    detail: 'On this Mac',
  },
  {
    id: 'icloud',
    label: 'iCloud Drive',
    basePath: '~/Library/Mobile Documents/com~apple~CloudDocs/Grimoire',
    storageProvider: 'icloud-drive',
    detail: 'Synced by iCloud Drive',
  },
  {
    id: 'google-drive',
    label: 'Google Drive',
    basePath: '~/Library/CloudStorage/GoogleDrive/My Drive/Grimoire',
    storageProvider: 'google-drive-desktop',
    detail: 'Synced by Google Drive Desktop',
  },
  {
    id: 'synced-folder',
    label: 'Other synced folder',
    basePath: '~/Library/CloudStorage/Grimoire',
    storageProvider: 'cloud-folder',
    detail: 'Dropbox, OneDrive, or another local sync client',
  },
  {
    id: 'custom',
    label: 'Custom path',
    basePath: '~/Vaults',
    storageProvider: 'local-folder',
    detail: 'Any empty folder path',
  },
]

/** Returns a storage choice, falling back to local folder creation. */
export function getVaultStorageChoice(id: VaultStorageChoiceId): VaultStorageChoice {
  return VAULT_STORAGE_CHOICES.find((choice) => choice.id === id) ?? VAULT_STORAGE_CHOICES[0]
}

/** Produces a filesystem-safe vault folder name while preserving readable spacing. */
export function sanitizeVaultFolderName(name: string): string {
  const sanitized = replaceControlCharacters(name.trim())
    .replace(/[<>:"/\\|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/-+/g, '-')
    .replace(/^[\s.-]+|[\s.-]+$/g, '')

  return sanitized || DEFAULT_VAULT_NAME
}

/** Builds the concrete local path where the vault folder should be created. */
export function buildVaultTargetPath(choiceId: VaultStorageChoiceId, name: string): string {
  const choice = getVaultStorageChoice(choiceId)
  return `${choice.basePath.replace(/\/+$/g, '')}/${sanitizeVaultFolderName(name)}`
}
