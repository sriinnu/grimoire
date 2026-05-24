import { Brain, Cloud, DownloadSimple, FolderOpen, GitBranch, UploadSimple } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { VaultEntry } from '../types'
import type { createTranslator } from '../lib/i18n'
import {
  getVaultStorageHealth,
  listVaultExportTargets,
  listVaultImportSources,
  listVaultStorageProviders,
  type ImportAutopsyPreviewState,
  type PortabilityProgressState,
  type VaultPortabilityActionId,
  type VaultStorageHealth,
  type VaultStorageHealthState,
  type VaultPortabilityStatus,
} from '../lib/vaultPortability'
import type { ObjectStorageSyncReport } from '../utils/objectStorageSync'
import { ImportAutopsyTimeline } from './ImportAutopsyTimeline'
import { LocalityFirewallSettingsCard } from './LocalityFirewallSettingsCard'
import { PortabilityActionDeck } from './PortabilityActionDeck'
import { Badge } from './ui/badge'

type Translate = ReturnType<typeof createTranslator>

interface PortabilitySettingsSectionProps {
  t: Translate
  vaultPath?: string
  entries?: VaultEntry[]
  vaultReady?: boolean
  importBusy?: boolean
  busyAction?: VaultPortabilityActionId | null
  progress?: PortabilityProgressState | null
  importPreview?: ImportAutopsyPreviewState | null
  onCancelProgress?: () => void
  onPreviewMarkdownFolder?: () => void
  onImportMarkdownFolder?: () => void
  onPreviewMarkdownZip?: () => void
  onImportMarkdownZip?: () => void
  onPreviewBear?: () => void
  onImportBear?: () => void
  onPreviewObsidian?: () => void
  onImportObsidian?: () => void
  onPreviewNotion?: () => void
  onImportNotion?: () => void
  onPreviewNotionFolder?: () => void
  onImportNotionFolder?: () => void
  onPreviewSpanda?: () => void
  onImportSpanda?: () => void
  onPreviewAppleJournal?: () => void
  onImportAppleJournal?: () => void
  onPreviewDayOne?: () => void
  onImportDayOne?: () => void
  onPreviewJourney?: () => void
  onImportJourney?: () => void
  onExportMarkdownZip?: () => void
  onExportStaticHtmlArchive?: () => void
  s3MirrorPreviewReady?: boolean
  s3MirrorPullPreviewReady?: boolean
  azureMirrorPreviewReady?: boolean
  azureMirrorPullPreviewReady?: boolean
  s3MirrorPreviewReport?: ObjectStorageSyncReport
  s3MirrorPullPreviewReport?: ObjectStorageSyncReport
  azureMirrorPreviewReport?: ObjectStorageSyncReport
  azureMirrorPullPreviewReport?: ObjectStorageSyncReport
  onPreviewS3MirrorPush?: () => void
  onApplyS3MirrorPush?: () => void
  onPreviewS3MirrorPull?: () => void
  onApplyS3MirrorPull?: () => void
  onPreviewAzureMirrorPush?: () => void
  onApplyAzureMirrorPush?: () => void
  onPreviewAzureMirrorPull?: () => void
  onApplyAzureMirrorPull?: () => void
}

interface PortabilityGroup {
  title: string
  description: string
  icon: ReactNode
  items: readonly { id: string; label: string; status: VaultPortabilityStatus }[]
  storageHealth?: readonly VaultStorageHealth[]
}

/** Renders the local-first import, export, storage, and second-brain roadmap surface. */
export function PortabilitySettingsSection({
  t,
  vaultPath = '',
  entries = [],
  vaultReady = true,
  importBusy = false,
  busyAction = importBusy ? 'markdown-folder' : null,
  progress = null,
  importPreview = null,
  onCancelProgress,
  onPreviewMarkdownFolder,
  onImportMarkdownFolder,
  onPreviewMarkdownZip,
  onImportMarkdownZip,
  onPreviewBear,
  onImportBear,
  onPreviewObsidian,
  onImportObsidian,
  onPreviewNotion,
  onImportNotion,
  onPreviewNotionFolder,
  onImportNotionFolder,
  onPreviewSpanda,
  onImportSpanda,
  onPreviewAppleJournal,
  onImportAppleJournal,
  onPreviewDayOne,
  onImportDayOne,
  onPreviewJourney,
  onImportJourney,
  onExportMarkdownZip,
  onExportStaticHtmlArchive,
  s3MirrorPreviewReady,
  s3MirrorPullPreviewReady,
  azureMirrorPreviewReady,
  azureMirrorPullPreviewReady,
  s3MirrorPreviewReport,
  s3MirrorPullPreviewReport,
  azureMirrorPreviewReport,
  azureMirrorPullPreviewReport,
  onPreviewS3MirrorPush,
  onApplyS3MirrorPush,
  onPreviewS3MirrorPull,
  onApplyS3MirrorPull,
  onPreviewAzureMirrorPush,
  onApplyAzureMirrorPush,
  onPreviewAzureMirrorPull,
  onApplyAzureMirrorPull,
}: PortabilitySettingsSectionProps) {
  const groups = buildPortabilityGroups(t, vaultPath)

  return (
    <>
      <div className="flex flex-col gap-1.5">
        <div className="text-[11px] font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {t('settings.portability.title')}
        </div>
        <div className="max-w-[420px] text-xs leading-relaxed text-muted-foreground">
          {t('settings.portability.description')}
        </div>
      </div>

      <div className="grid gap-2" data-testid="settings-portability-section">
        <LocalityFirewallSettingsCard entries={entries} />
        {groups.map((group) => (
          <PortabilityGroupCard key={group.title} group={group} t={t} />
        ))}
      </div>

      <PortabilityActionDeck
        t={t}
        vaultReady={vaultReady}
        busyAction={busyAction}
        progress={progress}
        onCancelProgress={onCancelProgress}
        s3MirrorPreviewReady={s3MirrorPreviewReady}
        s3MirrorPullPreviewReady={s3MirrorPullPreviewReady}
        azureMirrorPreviewReady={azureMirrorPreviewReady}
        azureMirrorPullPreviewReady={azureMirrorPullPreviewReady}
        s3MirrorPreviewReport={s3MirrorPreviewReport}
        s3MirrorPullPreviewReport={s3MirrorPullPreviewReport}
        azureMirrorPreviewReport={azureMirrorPreviewReport}
        azureMirrorPullPreviewReport={azureMirrorPullPreviewReport}
        onPreviewMarkdownFolder={onPreviewMarkdownFolder}
        onImportMarkdownFolder={onImportMarkdownFolder}
        onPreviewMarkdownZip={onPreviewMarkdownZip}
        onImportMarkdownZip={onImportMarkdownZip}
        onPreviewBear={onPreviewBear}
        onImportBear={onImportBear}
        onPreviewObsidian={onPreviewObsidian}
        onImportObsidian={onImportObsidian}
        onPreviewNotion={onPreviewNotion}
        onImportNotion={onImportNotion}
        onPreviewNotionFolder={onPreviewNotionFolder}
        onImportNotionFolder={onImportNotionFolder}
        onPreviewSpanda={onPreviewSpanda}
        onImportSpanda={onImportSpanda}
        onPreviewAppleJournal={onPreviewAppleJournal}
        onImportAppleJournal={onImportAppleJournal}
        onPreviewDayOne={onPreviewDayOne}
        onImportDayOne={onImportDayOne}
        onPreviewJourney={onPreviewJourney}
        onImportJourney={onImportJourney}
        onExportMarkdownZip={onExportMarkdownZip}
        onExportStaticHtmlArchive={onExportStaticHtmlArchive}
        onPreviewS3MirrorPush={onPreviewS3MirrorPush}
        onApplyS3MirrorPush={onApplyS3MirrorPush}
        onPreviewS3MirrorPull={onPreviewS3MirrorPull}
        onApplyS3MirrorPull={onApplyS3MirrorPull}
        onPreviewAzureMirrorPush={onPreviewAzureMirrorPush}
        onApplyAzureMirrorPush={onApplyAzureMirrorPush}
        onPreviewAzureMirrorPull={onPreviewAzureMirrorPull}
        onApplyAzureMirrorPull={onApplyAzureMirrorPull}
      />

      <ImportAutopsyTimeline
        preview={importPreview}
        vaultPath={vaultPath}
        isRefreshing={isImportPreviewAction(busyAction)}
      />

    </>
  )
}

function isImportPreviewAction(action: VaultPortabilityActionId | null): boolean {
  return Boolean(action?.endsWith('-preview') && !action.startsWith('storage-'))
}

function buildPortabilityGroups(t: Translate, vaultPath: string): PortabilityGroup[] {
  return [
    {
      title: t('settings.portability.import'),
      description: t('settings.portability.importDescription'),
      icon: <DownloadSimple size={15} />,
      items: listVaultImportSources(),
    },
    {
      title: t('settings.portability.export'),
      description: t('settings.portability.exportDescription'),
      icon: <UploadSimple size={15} />,
      items: listVaultExportTargets(),
    },
    {
      title: t('settings.portability.storage'),
      description: t('settings.portability.storageDescription'),
      icon: <Cloud size={15} />,
      items: listVaultStorageProviders(),
      storageHealth: getVaultStorageHealth(vaultPath),
    },
    {
      title: t('settings.portability.brain'),
      description: t('settings.portability.brainDescription'),
      icon: <Brain size={15} />,
      items: [
        { id: 'journal', label: 'Journal capture', status: 'ready' },
        { id: 'agent-briefs', label: 'Agent work briefs', status: 'ready' },
        { id: 'memory-graph', label: 'Memory graph', status: 'planned' },
        { id: 'crystallization', label: 'Crystallized notes', status: 'planned' },
      ],
    },
  ]
}

function PortabilityGroupCard({ group, t }: { group: PortabilityGroup; t: Translate }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 p-3">
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-0.5 text-muted-foreground">{group.icon}</span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">{group.title}</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">{group.description}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.items.map((item) => (
          <Badge
            key={item.id}
            variant={item.status === 'ready' ? 'secondary' : 'outline'}
            className="max-w-full gap-1 rounded-md text-[11px]"
          >
            {renderItemIcon(item.id)}
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="text-muted-foreground">{statusLabel(item.status, t)}</span>
          </Badge>
        ))}
      </div>
      {group.storageHealth ? <StorageHealthRows health={group.storageHealth} t={t} /> : null}
    </div>
  )
}

function StorageHealthRows({ health, t }: { health: readonly VaultStorageHealth[]; t: Translate }) {
  return (
    <div className="mt-2 grid gap-1" data-testid="settings-storage-health">
      {health.map((item) => (
        <div key={item.providerId} className="flex min-w-0 items-start gap-1.5 text-[11px] leading-snug">
          <span className={`mt-1 size-1.5 shrink-0 rounded-full ${healthDotClass(item.state)}`} />
          <span className="min-w-0 flex-1 text-muted-foreground">
            <span className="font-medium text-foreground">{storageHealthLabel(item.state, t)}</span>
            <span> · {item.message}</span>
            {item.privacyNote ? (
              <span className="block pt-0.5 text-[10px] leading-snug">{item.privacyNote}</span>
            ) : null}
          </span>
        </div>
      ))}
    </div>
  )
}

function renderItemIcon(id: string): ReactNode {
  if (id === 'git' || id === 'git-remote') return <GitBranch size={12} />
  if (id.includes('folder') || id.includes('drive')) return <FolderOpen size={12} />
  return null
}

function statusLabel(status: VaultPortabilityStatus, t: Translate): string {
  return status === 'ready' ? t('settings.portability.ready') : t('settings.portability.planned')
}

function storageHealthLabel(state: VaultStorageHealthState, t: Translate): string {
  if (state === 'active') return t('settings.portability.active')
  if (state === 'available') return t('settings.portability.available')
  if (state === 'planned') return t('settings.portability.planned')
  return t('settings.portability.notSelected')
}

function healthDotClass(state: VaultStorageHealthState): string {
  if (state === 'active') return 'bg-[var(--accent-green)]'
  if (state === 'available') return 'bg-[var(--accent-blue)]'
  if (state === 'planned') return 'bg-muted-foreground/45'
  return 'bg-[var(--accent-orange)]'
}
