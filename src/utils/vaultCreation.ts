import type { VaultStorageProviderId, VaultSyncProviderId } from '@/components/status-bar/types'
import { localMachineLabel } from './platform'

export type VaultStorageChoiceId =
  | 'local'
  | 'icloud'
  | 'google-drive'
  | 'synced-folder'
  | 'custom'

export type VaultTemplateKindId =
  | 'blank'
  | 'journal'
  | 'dreams'
  | 'project'
  | 'research'
  | 'personal-os'
  | 'reading-study'
  | 'relationships'
  | 'work-log'
  | 'creative-studio'

export interface VaultStorageChoice {
  id: VaultStorageChoiceId
  label: string
  basePath: string
  storageProvider: VaultStorageProviderId
  detail: string
}

export interface VaultTemplateKind {
  id: VaultTemplateKindId
  label: string
  detail: string
  defaultName: string
}

export interface CreateEmptyVaultRequest {
  targetPath: string
  storageProvider?: VaultStorageProviderId
  syncProvider?: VaultSyncProviderId
  initializeGit?: boolean
  templateKind?: VaultTemplateKindId
}

export interface VaultCreationPlan {
  privacyDetail: string
  storageDetail: string
  syncDetail: string
  targetPath: string
  templateLabel: string
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
    detail: `On ${localMachineLabel()}`,
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

export const VAULT_TEMPLATE_KINDS: VaultTemplateKind[] = [
  {
    id: 'blank',
    label: 'Blank',
    detail: 'Notes first, shape it later',
    defaultName: DEFAULT_VAULT_NAME,
  },
  {
    id: 'journal',
    label: 'Journal',
    detail: 'Daily check-in, evening review, decisions, weekly review',
    defaultName: 'Journal',
  },
  {
    id: 'dreams',
    label: 'Dreams',
    detail: 'Dream capture, recurring symbols, nightmares, lucid dreams',
    defaultName: 'Dreams',
  },
  {
    id: 'project',
    label: 'Project',
    detail: 'Open loops, research, decisions, next actions',
    defaultName: 'Project Vault',
  },
  {
    id: 'research',
    label: 'Research',
    detail: 'Sources, claims, findings, synthesis',
    defaultName: 'Research',
  },
  {
    id: 'personal-os',
    label: 'Personal OS',
    detail: 'Notes, journals, dreams, tasks, memory',
    defaultName: 'Sriinnu',
  },
  {
    id: 'reading-study',
    label: 'Reading',
    detail: 'Books, papers, excerpts, study trails',
    defaultName: 'Reading',
  },
  {
    id: 'relationships',
    label: 'People',
    detail: 'People, conversations, promises, follow-ups',
    defaultName: 'People',
  },
  {
    id: 'work-log',
    label: 'Work Log',
    detail: 'Daily work, blockers, commits, decisions',
    defaultName: 'Work Log',
  },
  {
    id: 'creative-studio',
    label: 'Creative',
    detail: 'Ideas, drafts, references, releases',
    defaultName: 'Creative Studio',
  },
]

/** Returns a storage choice, falling back to local folder creation. */
export function getVaultStorageChoice(id: VaultStorageChoiceId): VaultStorageChoice {
  return VAULT_STORAGE_CHOICES.find((choice) => choice.id === id) ?? VAULT_STORAGE_CHOICES[0]
}

/** Returns a vault template kind, falling back to a blank local vault. */
export function getVaultTemplateKind(id: VaultTemplateKindId): VaultTemplateKind {
  return VAULT_TEMPLATE_KINDS.find((kind) => kind.id === id) ?? VAULT_TEMPLATE_KINDS[0]
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

/** Describes the create-vault result in user language before any disk write. */
export function buildVaultCreationPlan({
  choiceId,
  initializeGit,
  targetPath,
  templateKind,
}: {
  choiceId: VaultStorageChoiceId
  initializeGit: boolean
  targetPath: string
  templateKind: VaultTemplateKindId
}): VaultCreationPlan {
  const choice = getVaultStorageChoice(choiceId)
  const template = getVaultTemplateKind(templateKind)
  const isDesktopSync = choice.storageProvider !== 'local-folder'

  return {
    privacyDetail: 'Private lanes stay local until you explicitly export or sync them.',
    storageDetail: isDesktopSync
      ? `${choice.label} is still a local folder. Grimoire stores no cloud credentials.`
      : `A normal local folder on ${localMachineLabel()}; no account or remote required.`,
    syncDetail: initializeGit
      ? 'Git history starts in this vault, but storage still stays under your chosen folder.'
      : 'Git stays off. The vault opens and saves as plain Markdown without a repo.',
    targetPath: targetPath.trim(),
    templateLabel: template.label,
  }
}
