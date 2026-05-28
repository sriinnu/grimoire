import {
  listVaultExportTargets,
  listVaultImportSources,
  listVaultStorageProviders,
  type VaultPortabilityStatus,
} from './vaultPortability'

export type PortabilityProofLevel =
  | 'fixture-regression'
  | 'local-regression'
  | 'provider-managed-local-folder'
  | 'local-mirror-fixture'
  | 'live-read-only-plus-local-mirror'
  | 'live-provider-proof-runner'

export type PortabilitySupportStatus = VaultPortabilityStatus | 'fixture' | 'available'

export interface PortabilityProofRow {
  id: 'imports' | 'exports' | 'desktop-sync' | 'object-storage' | 'provider-proof-runner'
  label: string
  supportStatus: PortabilitySupportStatus
  proofLevel: PortabilityProofLevel
  detail: string
  evidence: string
  remainingProof: string
}

/** Builds the user-facing proof matrix for import, export, and sync support. */
export function listPortabilityProofRows(): readonly PortabilityProofRow[] {
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
      remainingProof: 'Run the live provider proof runner and then the Settings lanes against real failure states before calling provider sync proven.',
    },
    {
      id: 'provider-proof-runner',
      label: 'Provider proof runner',
      supportStatus: 'available',
      proofLevel: 'live-provider-proof-runner',
      detail: 'Opt-in S3/Azure provider preview/apply/pull proof with redacted evidence',
      evidence: 'Run `pnpm test:object-storage-live -- --report .tmp/object-storage-live-proof.json`; the report stores only gate/config set-missing state plus pass/fail/missing-config status.',
      remainingProof: 'Needs real S3/Azure credentials, generated proof prefixes, permission failures, auth failures, conflict states, and retry/error paths captured before Settings can say provider-proven.',
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
