import { getVaultStorageProvider } from './vaultPortability'

/** Stable ids for object-storage providers that need a sync adapter. */
export type ObjectStorageProviderId = 's3' | 'azure-blob'

/** A storage setting that must stay in local app settings or keychain. */
export interface ObjectStorageCredentialSetting {
  key: string
  label: string
  secret: boolean
  required: boolean
}

/** The product contract for syncing object storage through a local working copy. */
export interface ObjectStorageAdapterDesign {
  providerId: ObjectStorageProviderId
  remoteLabel: string
  adapterPhase: 'local-mirror-prototype'
  prototypeMode: 'local-mirror-fixture'
  syncModel: 'local-working-copy-mirror'
  writePolicy: 'never-edit-remote-directly'
  credentialLocation: 'local-machine-settings-or-keychain'
  conflictPolicy: 'write-markdown-conflict-artifacts'
  localityPolicy: 'exclude-local-only-by-default'
  requiredSettings: readonly ObjectStorageCredentialSetting[]
  plannedCommands: readonly string[]
  privacyNotes: readonly string[]
}

const PLANNED_COMMANDS = [
  'storage_health_check',
  'storage_pull_preview',
  'storage_push_preview',
  'storage_sync_apply',
  'storage_disconnect',
] as const

const PRIVACY_NOTES = [
  'Vault files remain the editable source of truth on local disk.',
  'Credentials stay in local machine settings or keychain, never in the vault.',
  'Local-only lanes are excluded from remote sync previews unless the user explicitly changes policy.',
  'Conflicts are written as visible Markdown-safe artifacts beside the local working copy.',
] as const

const OBJECT_STORAGE_ADAPTER_DESIGNS = [
  {
    providerId: 's3',
    remoteLabel: 'Amazon S3 bucket',
    adapterPhase: 'local-mirror-prototype',
    prototypeMode: 'local-mirror-fixture',
    syncModel: 'local-working-copy-mirror',
    writePolicy: 'never-edit-remote-directly',
    credentialLocation: 'local-machine-settings-or-keychain',
    conflictPolicy: 'write-markdown-conflict-artifacts',
    localityPolicy: 'exclude-local-only-by-default',
    requiredSettings: [
      { key: 'bucket', label: 'Bucket', secret: false, required: true },
      { key: 'region', label: 'Region', secret: false, required: true },
      { key: 'prefix', label: 'Vault prefix', secret: false, required: true },
      { key: 'credentialRef', label: 'Local credential reference', secret: true, required: true },
      { key: 'endpoint', label: 'S3-compatible endpoint', secret: false, required: false },
    ],
    plannedCommands: PLANNED_COMMANDS,
    privacyNotes: PRIVACY_NOTES,
  },
  {
    providerId: 'azure-blob',
    remoteLabel: 'Azure Blob container',
    adapterPhase: 'local-mirror-prototype',
    prototypeMode: 'local-mirror-fixture',
    syncModel: 'local-working-copy-mirror',
    writePolicy: 'never-edit-remote-directly',
    credentialLocation: 'local-machine-settings-or-keychain',
    conflictPolicy: 'write-markdown-conflict-artifacts',
    localityPolicy: 'exclude-local-only-by-default',
    requiredSettings: [
      { key: 'accountUrl', label: 'Account URL', secret: false, required: true },
      { key: 'container', label: 'Container', secret: false, required: true },
      { key: 'prefix', label: 'Vault prefix', secret: false, required: true },
      { key: 'credentialRef', label: 'Local credential reference', secret: true, required: true },
    ],
    plannedCommands: PLANNED_COMMANDS,
    privacyNotes: PRIVACY_NOTES,
  },
] as const satisfies readonly ObjectStorageAdapterDesign[]

/** Lists planned object-storage adapter designs without marking them ready. */
export function listObjectStorageAdapterDesigns(): readonly ObjectStorageAdapterDesign[] {
  return OBJECT_STORAGE_ADAPTER_DESIGNS
}

/** Returns one object-storage adapter design by provider id. */
export function getObjectStorageAdapterDesign(
  providerId: ObjectStorageProviderId,
): ObjectStorageAdapterDesign | null {
  return OBJECT_STORAGE_ADAPTER_DESIGNS.find(design => design.providerId === providerId) ?? null
}

/** Returns true when the provider registry and adapter contract agree it is still planned. */
export function hasPlannedObjectStorageAdapter(providerId: ObjectStorageProviderId): boolean {
  const provider = getVaultStorageProvider(providerId)
  const design = getObjectStorageAdapterDesign(providerId)

  return Boolean(
    provider
      && design
      && provider.kind === 'object-storage'
      && provider.status === 'planned'
      && provider.requiresLocalWorkingCopy,
  )
}
