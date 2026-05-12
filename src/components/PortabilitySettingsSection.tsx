import { Brain, Cloud, DownloadSimple, FolderOpen, GitBranch, UploadSimple } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { createTranslator } from '../lib/i18n'
import {
  getVaultStorageHealth,
  listVaultExportTargets,
  listVaultImportSources,
  listVaultStorageProviders,
  type VaultStorageHealth,
  type VaultStorageHealthState,
  type VaultPortabilityStatus,
} from '../lib/vaultPortability'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

type Translate = ReturnType<typeof createTranslator>

interface PortabilitySettingsSectionProps {
  t: Translate
  vaultPath?: string
  vaultReady?: boolean
  importBusy?: boolean
  onImportMarkdownFolder?: () => void
  onImportMarkdownZip?: () => void
  onImportBear?: () => void
  onImportDayOne?: () => void
  onImportJourney?: () => void
  onExportMarkdownZip?: () => void
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
  vaultReady = true,
  importBusy = false,
  onImportMarkdownFolder,
  onImportMarkdownZip,
  onImportBear,
  onImportDayOne,
  onImportJourney,
  onExportMarkdownZip,
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
        {groups.map((group) => (
          <PortabilityGroupCard key={group.title} group={group} t={t} />
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <ImportButton
          label={t('settings.portability.importMarkdownFolder')}
          testId="settings-import-markdown-folder"
          busy={importBusy}
          disabled={!vaultReady || !onImportMarkdownFolder}
          onClick={onImportMarkdownFolder}
          t={t}
        />
        <ImportButton
          label={t('settings.portability.importMarkdownZip')}
          testId="settings-import-markdown-zip"
          busy={importBusy}
          disabled={!vaultReady || !onImportMarkdownZip}
          onClick={onImportMarkdownZip}
          t={t}
        />
        <ImportButton
          label={t('settings.portability.importBear')}
          testId="settings-import-bear"
          busy={importBusy}
          disabled={!vaultReady || !onImportBear}
          onClick={onImportBear}
          t={t}
        />
        <ImportButton
          label={t('settings.portability.importDayOne')}
          testId="settings-import-day-one"
          busy={importBusy}
          disabled={!vaultReady || !onImportDayOne}
          onClick={onImportDayOne}
          t={t}
        />
        <ImportButton
          label={t('settings.portability.importJourney')}
          testId="settings-import-journey"
          busy={importBusy}
          disabled={!vaultReady || !onImportJourney}
          onClick={onImportJourney}
          t={t}
        />
        <PortabilityActionButton
          icon={<UploadSimple size={14} />}
          label={t('settings.portability.exportMarkdownZip')}
          testId="settings-export-markdown-zip"
          busy={importBusy}
          busyLabel={t('settings.portability.exporting')}
          disabled={!vaultReady || !onExportMarkdownZip}
          onClick={onExportMarkdownZip}
          t={t}
        />
      </div>
    </>
  )
}

function ImportButton({
  label,
  testId,
  busy,
  disabled,
  onClick,
  t,
}: {
  label: string
  testId: string
  busy: boolean
  disabled: boolean
  onClick?: () => void
  t: Translate
}) {
  return (
    <PortabilityActionButton
      icon={<DownloadSimple size={14} />}
      label={label}
      testId={testId}
      busy={busy}
      disabled={disabled}
      onClick={onClick}
      t={t}
    />
  )
}

function PortabilityActionButton({
  icon,
  label,
  testId,
  busy,
  busyLabel,
  disabled,
  onClick,
  t,
}: {
  icon: ReactNode
  label: string
  testId: string
  busy: boolean
  busyLabel?: string
  disabled: boolean
  onClick?: () => void
  t: Translate
}) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-testid={testId}
      disabled={busy || disabled}
      onClick={onClick}
    >
      {icon}
      {busy ? (busyLabel ?? t('settings.portability.importing')) : label}
    </Button>
  )
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
  if (state === 'active') return 'bg-emerald-500'
  if (state === 'available') return 'bg-blue-500'
  if (state === 'planned') return 'bg-muted-foreground/45'
  return 'bg-amber-500'
}
