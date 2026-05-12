export type VaultStorageProviderId =
  | 'local-folder'
  | 'icloud-drive'
  | 'google-drive-desktop'
  | 's3'
  | 'azure-blob'
  | (string & {})

export type VaultSyncProviderId = 'none' | 'git' | (string & {})

export interface VaultOption {
  id?: string | null
  label: string
  path: string
  storageProvider?: VaultStorageProviderId
  syncProvider?: VaultSyncProviderId
  available?: boolean
}
