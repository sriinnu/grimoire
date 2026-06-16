import type { VaultStorageProviderId, VaultSyncProviderId } from '@/components/status-bar/types'
import { resolveThemePresetDefinition } from '@/themes/themeRegistry'
import type { ThemePreset } from '@/themes/themePresetIds'
import { type DesktopPlatform, getDesktopPlatform, localMachineLabel } from './platform'

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
  themePreset?: ThemePreset
}

export interface VaultCreationPlan {
  experienceDetail: string
  experienceLabel: string
  privacyDetail: string
  storageDetail: string
  syncDetail: string
  targetPath: string
  templateLabel: string
}

export const DEFAULT_VAULT_NAME = 'New Notebook'

const WINDOWS_RESERVED_DEVICE_NAMES = new Set([
  'CON',
  'PRN',
  'AUX',
  'NUL',
  'COM1',
  'COM2',
  'COM3',
  'COM4',
  'COM5',
  'COM6',
  'COM7',
  'COM8',
  'COM9',
  'LPT1',
  'LPT2',
  'LPT3',
  'LPT4',
  'LPT5',
  'LPT6',
  'LPT7',
  'LPT8',
  'LPT9',
])

const DEFAULT_CREATION_THEME_PRESET: ThemePreset = 'morning-notebook'

const CANVAS_LABELS = {
  blueprint: 'Blueprint canvas',
  paper: 'Paper canvas',
  terminal: 'Terminal canvas',
} as const

const GRAPH_LABELS = {
  constellation: 'Constellation graph',
  ledger: 'Ledger graph',
  terminal: 'Terminal graph',
} as const

const DENSITY_LABELS = {
  compact: 'compact density',
  comfortable: 'comfortable density',
  spacious: 'spacious density',
} as const

function replaceControlCharacters(value: string): string {
  return Array.from(value, char => (char.charCodeAt(0) < 32 ? '-' : char)).join('')
}

function avoidWindowsReservedFolderName(value: string): string {
  const stem = value.split('.')[0]?.toUpperCase() ?? value.toUpperCase()
  return WINDOWS_RESERVED_DEVICE_NAMES.has(stem) ? `${value} Notebook` : value
}

const PLATFORM_STORAGE_BASE_PATHS: Record<DesktopPlatform, Record<VaultStorageChoiceId, string>> = {
  macos: {
    local: '~/Grimoire/Notebooks',
    icloud: '~/Library/Mobile Documents/com~apple~CloudDocs/Grimoire',
    'google-drive': '~/Library/CloudStorage/GoogleDrive/My Drive/Grimoire',
    'synced-folder': '~/Library/CloudStorage/Grimoire',
    custom: '~/Notebooks',
  },
  windows: {
    local: '~/Documents/Grimoire/Notebooks',
    icloud: '~/iCloudDrive/Grimoire',
    'google-drive': '~/My Drive/Grimoire',
    'synced-folder': '~/OneDrive/Grimoire',
    custom: '~/Documents/Notebooks',
  },
  linux: {
    local: '~/Documents/Grimoire/Notebooks',
    icloud: '~/Documents/Grimoire/iCloud Drive',
    'google-drive': '~/Documents/Grimoire/Google Drive',
    'synced-folder': '~/Documents/Grimoire/Synced',
    custom: '~/Documents/Notebooks',
  },
  unknown: {
    local: '~/Grimoire/Notebooks',
    icloud: '~/Grimoire/iCloud Drive',
    'google-drive': '~/Grimoire/Google Drive',
    'synced-folder': '~/Grimoire/Synced',
    custom: '~/Notebooks',
  },
}

const STORAGE_CHOICE_DETAILS: Record<VaultStorageChoiceId, Omit<VaultStorageChoice, 'basePath' | 'detail'>> = {
  local: {
    id: 'local',
    label: 'Local folder',
    storageProvider: 'local-folder',
  },
  icloud: {
    id: 'icloud',
    label: 'iCloud Drive',
    storageProvider: 'icloud-drive',
  },
  'google-drive': {
    id: 'google-drive',
    label: 'Google Drive',
    storageProvider: 'google-drive-desktop',
  },
  'synced-folder': {
    id: 'synced-folder',
    label: 'Other synced folder',
    storageProvider: 'cloud-folder',
  },
  custom: {
    id: 'custom',
    label: 'Custom path',
    storageProvider: 'local-folder',
  },
}

function platformStorageBasePaths(platform: DesktopPlatform): Record<VaultStorageChoiceId, string> {
  return PLATFORM_STORAGE_BASE_PATHS[platform] ?? PLATFORM_STORAGE_BASE_PATHS.unknown
}

function storageChoiceDetail(choiceId: VaultStorageChoiceId, platform: DesktopPlatform): string {
  if (choiceId === 'local') return `On ${localMachineLabel(platform)}`
  if (choiceId === 'icloud') return platform === 'linux' ? 'Use a local iCloud-synced folder' : 'Synced by iCloud Drive'
  if (choiceId === 'google-drive') return 'Synced by Google Drive Desktop'
  if (choiceId === 'synced-folder') {
    return platform === 'windows'
      ? 'OneDrive, Dropbox, or another local sync client'
      : 'Dropbox, OneDrive, or another local sync client'
  }
  return 'Any empty folder path'
}

/** Returns platform-aware local-first storage choices for new notebook creation. */
export function buildVaultStorageChoices(platform: DesktopPlatform = getDesktopPlatform()): VaultStorageChoice[] {
  const basePaths = platformStorageBasePaths(platform)
  return (Object.keys(STORAGE_CHOICE_DETAILS) as VaultStorageChoiceId[]).map((id) => ({
    ...STORAGE_CHOICE_DETAILS[id],
    basePath: basePaths[id],
    detail: storageChoiceDetail(id, platform),
  }))
}

export const VAULT_STORAGE_CHOICES: VaultStorageChoice[] = buildVaultStorageChoices()

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
    defaultName: 'Project Notebook',
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
    defaultName: 'Creative Notebook',
  },
]

/** Returns a storage choice, falling back to local folder creation. */
export function getVaultStorageChoice(
  id: VaultStorageChoiceId,
  platform: DesktopPlatform = getDesktopPlatform(),
): VaultStorageChoice {
  const choices = buildVaultStorageChoices(platform)
  return choices.find((choice) => choice.id === id) ?? choices[0]
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

  return sanitized ? avoidWindowsReservedFolderName(sanitized) : DEFAULT_VAULT_NAME
}

/** Builds the concrete local path where the vault folder should be created. */
export function buildVaultTargetPath(
  choiceId: VaultStorageChoiceId,
  name: string,
  platform: DesktopPlatform = getDesktopPlatform(),
): string {
  const choice = getVaultStorageChoice(choiceId, platform)
  return `${choice.basePath.replace(/\/+$/g, '')}/${sanitizeVaultFolderName(name)}`
}

/** Describes the create-vault result in user language before any disk write. */
export function buildVaultCreationPlan({
  choiceId,
  initializeGit,
  platform = getDesktopPlatform(),
  targetPath,
  templateKind,
  themePreset = DEFAULT_CREATION_THEME_PRESET,
}: {
  choiceId: VaultStorageChoiceId
  initializeGit: boolean
  platform?: DesktopPlatform
  targetPath: string
  templateKind: VaultTemplateKindId
  themePreset?: ThemePreset
}): VaultCreationPlan {
  const choice = getVaultStorageChoice(choiceId, platform)
  const template = getVaultTemplateKind(templateKind)
  const profile = resolveThemePresetDefinition(themePreset)
  const isDesktopSync = choice.storageProvider !== 'local-folder'

  return {
    experienceDetail: `${CANVAS_LABELS[profile.visuals.canvasStyle]}, ${GRAPH_LABELS[profile.visuals.graphStyle]}, ${DENSITY_LABELS[profile.density.scale]}.`,
    experienceLabel: profile.label,
    privacyDetail: 'Private lanes stay local until you explicitly export or sync them.',
    storageDetail: isDesktopSync
      ? `${choice.label} is still a local folder. Grimoire stores no cloud credentials.`
      : `A normal local folder on ${localMachineLabel(platform)}; no account or remote required.`,
    syncDetail: initializeGit
      ? 'Git history starts in this vault, but storage still stays under your chosen folder.'
      : 'Git stays off. The vault opens and saves as plain Markdown without a repo.',
    targetPath: targetPath.trim(),
    templateLabel: template.label,
  }
}
