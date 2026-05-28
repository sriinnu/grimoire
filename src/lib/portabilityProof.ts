import {
  listVaultExportTargets,
  listVaultImportSources,
  listVaultStorageProviders,
  type VaultPortabilityStatus,
} from './vaultPortability'
import {
  objectStorageReportProofs,
  type ObjectStorageLiveProofReport as ObjectStorageLiveProofReportType,
} from './objectStorageLiveProofReport'

export {
  parseObjectStorageLiveProofReport,
} from './objectStorageLiveProofReport'
export type {
  ObjectStorageLiveProofProviderId,
  ObjectStorageLiveProofProviderReport,
  ObjectStorageLiveProofReport,
} from './objectStorageLiveProofReport'

export type PortabilityProofLevel =
  | 'fixture-regression'
  | 'local-regression'
  | 'provider-managed-local-folder'
  | 'local-mirror-fixture'
  | 'live-read-only-plus-local-mirror'
  | 'live-provider-proof-runner'

export type PortabilitySupportStatus = VaultPortabilityStatus | 'fixture' | 'available'

/** Command users can run to capture a redacted S3/Azure live provider proof report. */
export const OBJECT_STORAGE_LIVE_PROOF_COMMAND =
  'pnpm test:object-storage-live -- --report .tmp/object-storage-live-proof.json'
export const OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND =
  'pnpm test:object-storage-live -- --dry-run --report .tmp/object-storage-live-proof.json'

export interface PortabilityProofCommand {
  id: 'dry-run' | 'live-proof'
  label: string
  command: string
  detail: string
}

export interface PortabilityProviderRequirement {
  id: 's3' | 'azure'
  label: string
  gate: string
  required: readonly string[]
  optional: readonly string[]
  proofNeed: string
}

/** Redacted live-provider proof that is safe to render in Settings. */
export interface PortabilityLiveProof {
  id: 'azure-provider-proof' | 'azure-read-only' | 'provider-report-summary' | 's3-provider-proof' | 's3-read-only'
  label: string
  status: string
  detail: string
}

interface S3LivePreflightProof {
  bucket_configured: boolean
  checked_at: string
  configured: boolean
  head_bucket_checked: boolean
  list_prefix_checked: boolean
  prefix_configured: boolean
  region_configured: boolean
  status: string
}

interface AzureLivePreflightProof {
  account_configured: boolean
  checked_at: string
  configured: boolean
  container_checked: boolean
  container_configured: boolean
  list_prefix_checked: boolean
  prefix_configured: boolean
  status: string
}

/** Latest transient provider reports that can strengthen the proof ledger without storing provider details. */
export interface PortabilityProofState {
  azureLivePreflightReport?: AzureLivePreflightProof | null
  objectStorageLiveProofReport?: ObjectStorageLiveProofReportType | null
  s3LivePreflightReport?: S3LivePreflightProof | null
}

export interface PortabilityProofRow {
  id: 'imports' | 'exports' | 'desktop-sync' | 'object-storage' | 'provider-proof-runner'
  label: string
  supportStatus: PortabilitySupportStatus
  proofLevel: PortabilityProofLevel
  detail: string
  evidence: string
  liveProofs?: readonly PortabilityLiveProof[]
  remainingProof: string
  commands?: readonly PortabilityProofCommand[]
  providerRequirements?: readonly PortabilityProviderRequirement[]
}

/** Builds the user-facing proof matrix for import, export, and sync support. */
export function listPortabilityProofRows(proofState: PortabilityProofState = {}): readonly PortabilityProofRow[] {
  const importSources = listVaultImportSources()
  const exportTargets = listVaultExportTargets()
  const storageProviders = listVaultStorageProviders()
  const readyImports = importSources.filter(source => source.status === 'ready')
  const readyExports = exportTargets.filter(target => target.status === 'ready')
  const filesystemStorage = storageProviders.filter(provider => provider.status === 'ready')
  const objectStorageLabels = storageProviders
    .filter(provider => provider.kind === 'object-storage')
    .map(provider => provider.label)
    .join(', ')

  return [
    {
      id: 'imports',
      label: 'Importers',
      supportStatus: 'ready',
      proofLevel: 'fixture-regression',
      detail: `${readyImports.length} no-write preview adapters`,
      evidence: readyImports.map(source => source.label).join(', '),
      remainingProof: 'Manual runs with fresh real-world exports are still needed before claiming every app import works across current Bear, Day One, Apple Journal, Obsidian, Notion, Journey, and Markdown ZIP variants.',
    },
    {
      id: 'exports',
      label: 'Exports',
      supportStatus: 'ready',
      proofLevel: 'local-regression',
      detail: `${readyExports.length} portable exits`,
      evidence: 'Vault folder, Git remote, Markdown ZIP, static HTML, JSON snapshot, and SQLite snapshot; local-only lanes withheld; JSON/SQLite capsules have local import regressions.',
      remainingProof: 'Manual round-trip checks with external readers and large attachment-heavy vaults still open.',
    },
    {
      id: 'desktop-sync',
      label: 'Desktop sync',
      supportStatus: 'ready',
      proofLevel: 'provider-managed-local-folder',
      detail: `${filesystemStorage.length} provider-managed local working copies`,
      evidence: 'Local folder, Git, iCloud Drive, and Google Drive Desktop are normal folders; Settings can run local read proof for iCloud/GDrive without storing cloud credentials.',
      remainingProof: 'Provider quota, offline recovery, auth expiry, and conflicted-file behavior need live provider testing.',
    },
    {
      id: 'object-storage',
      label: 'Object storage',
      supportStatus: 'fixture',
      proofLevel: 'live-read-only-plus-local-mirror',
      detail: `${objectStorageLabels} provider preview/apply contracts plus read-only preflights`,
      evidence: 'S3 has a read-only HeadBucket/ListObjectsV2 preflight, Azure has a read-only CLI container/list preflight, Settings provider preview/apply lanes require exact preview signatures, conflict checks, and content-hash metadata; local mirrors remain adapter fixtures.',
      liveProofs: objectStorageLiveProofs(proofState),
      remainingProof: 'Run the live provider proof runner and then the Settings lanes against real failure states before calling provider sync proven.',
    },
    {
      id: 'provider-proof-runner',
      label: 'Provider proof runner',
      supportStatus: 'available',
      proofLevel: 'live-provider-proof-runner',
      detail: 'Opt-in S3/Azure provider preview/apply/pull proof with redacted evidence',
      evidence: `Dry-run first with \`${OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND}\`, then run \`${OBJECT_STORAGE_LIVE_PROOF_COMMAND}\`; reports store only gate/config set-missing state plus pass/fail/missing-config status.`,
      remainingProof: 'Needs real S3/Azure credentials, generated proof prefixes, permission failures, auth failures, conflict states, and retry/error paths captured before Settings can say provider-proven.',
      liveProofs: objectStorageReportProofs(proofState.objectStorageLiveProofReport),
      commands: [
        {
          id: 'dry-run',
          label: 'Copy dry run',
          command: OBJECT_STORAGE_LIVE_PROOF_DRY_RUN_COMMAND,
          detail: 'No provider writes; shows enabled gates and set/missing env state.',
        },
        {
          id: 'live-proof',
          label: 'Copy live proof',
          command: OBJECT_STORAGE_LIVE_PROOF_COMMAND,
          detail: 'Runs opt-in provider preview/apply/pull and writes a redacted report.',
        },
      ],
      providerRequirements: [
        {
          id: 's3',
          label: 'S3',
          gate: 'GRIMOIRE_S3_LIVE_WRITE_PROOF',
          required: ['GRIMOIRE_S3_BUCKET'],
          optional: ['GRIMOIRE_S3_REGION', 'GRIMOIRE_S3_PREFIX'],
          proofNeed: 'permission, auth, conflict, retry, and cleanup states',
        },
        {
          id: 'azure',
          label: 'Azure Blob',
          gate: 'GRIMOIRE_AZURE_LIVE_WRITE_PROOF',
          required: ['GRIMOIRE_AZURE_STORAGE_ACCOUNT', 'GRIMOIRE_AZURE_CONTAINER'],
          optional: ['GRIMOIRE_AZURE_PREFIX'],
          proofNeed: 'CLI login, permission, conflict, retry, and cleanup states',
        },
      ],
    },
  ]
}

/** Converts proof levels into compact labels for Settings badges. */
export function portabilityProofLevelLabel(level: PortabilityProofLevel): string {
  switch (level) {
    case 'fixture-regression':
      return 'fixture/regression'
    case 'local-regression':
      return 'local regression'
    case 'provider-managed-local-folder':
      return 'desktop folder'
    case 'local-mirror-fixture':
      return 'local mirror'
    case 'live-read-only-plus-local-mirror':
      return 'preflight + preview'
    case 'live-provider-proof-runner':
      return 'live proof runner'
  }
}

function objectStorageLiveProofs({
  azureLivePreflightReport,
  s3LivePreflightReport,
}: PortabilityProofState): readonly PortabilityLiveProof[] {
  return [
    s3LivePreflightReport ? s3LiveProof(s3LivePreflightReport) : null,
    azureLivePreflightReport ? azureLiveProof(azureLivePreflightReport) : null,
  ].filter(isPortabilityLiveProof)
}

function s3LiveProof(report: S3LivePreflightProof): PortabilityLiveProof {
  return {
    id: 's3-read-only',
    label: 'S3 read-only preflight',
    status: proofStatusLabel(report.status),
    detail: [
      proofFlag(report.configured, 'config set', 'config missing'),
      proofFlag(report.bucket_configured, 'bucket set', 'bucket missing'),
      proofFlag(report.region_configured, 'region set', 'region default'),
      proofFlag(report.prefix_configured, 'prefix set', 'prefix optional'),
      proofFlag(report.head_bucket_checked, 'HeadBucket checked', 'HeadBucket not checked'),
      proofFlag(report.list_prefix_checked, 'prefix list checked', 'prefix list not checked'),
      `checked ${proofTimestamp(report.checked_at)}`,
    ].join('; '),
  }
}

function azureLiveProof(report: AzureLivePreflightProof): PortabilityLiveProof {
  return {
    id: 'azure-read-only',
    label: 'Azure read-only preflight',
    status: proofStatusLabel(report.status),
    detail: [
      proofFlag(report.configured, 'config set', 'config missing'),
      proofFlag(report.account_configured, 'account set', 'account missing'),
      proofFlag(report.container_configured, 'container set', 'container missing'),
      proofFlag(report.prefix_configured, 'prefix set', 'prefix optional'),
      proofFlag(report.container_checked, 'container checked', 'container not checked'),
      proofFlag(report.list_prefix_checked, 'prefix list checked', 'prefix list not checked'),
      `checked ${proofTimestamp(report.checked_at)}`,
    ].join('; '),
  }
}

function proofFlag(enabled: boolean, enabledLabel: string, disabledLabel: string): string {
  return enabled ? enabledLabel : disabledLabel
}

function proofStatusLabel(status: string): string {
  return status.replace(/[^a-z0-9_-]/gi, '').replaceAll('_', ' ')
}

function proofTimestamp(value: string): string {
  const trimmed = value.trim()
  return /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(trimmed) ? trimmed : 'redacted-time'
}

function isPortabilityLiveProof(proof: PortabilityLiveProof | null): proof is PortabilityLiveProof {
  return proof !== null
}
