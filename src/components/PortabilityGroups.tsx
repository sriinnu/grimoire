import { Brain, Cloud, DownloadSimple, FolderOpen, GitBranch, UploadSimple } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { createTranslator } from '../lib/i18n'
import {
  getVaultStorageHealth,
  listVaultExportTargets,
  listVaultImportSources,
  listVaultStorageProviders,
  type VaultPortabilityStatus,
  type VaultStorageHealth,
  type VaultStorageHealthState,
} from '../lib/vaultPortability'
import { Badge } from './ui/badge'
import { DesktopStorageHealthPanel } from './DesktopStorageHealthPanel'

type Translate = ReturnType<typeof createTranslator>

interface PortabilityGroup {
  title: string
  description: string
  icon: ReactNode
  items: readonly { id: string; label: string; status: VaultPortabilityStatus }[]
  storageHealth?: readonly VaultStorageHealth[]
}

/** Renders the compact portability capability cards above the action deck. */
export function PortabilityGroups({ t, vaultPath }: { t: Translate; vaultPath: string }) {
  return (
    <>
      {buildPortabilityGroups(t, vaultPath).map((group) => (
        <PortabilityGroupCard key={group.title} group={group} t={t} vaultPath={vaultPath} />
      ))}
    </>
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

function PortabilityGroupCard({ group, t, vaultPath }: { group: PortabilityGroup; t: Translate; vaultPath: string }) {
  return (
    <div className="grimoire-portability-card rounded-md border border-border p-3">
      <div className="mb-2 flex items-start gap-2">
        <span className="mt-0.5 text-muted-foreground">{group.icon}</span>
        <span className="min-w-0">
          <span className="block text-xs font-semibold text-foreground">{group.title}</span>
          <span className="block text-[11px] leading-snug text-muted-foreground">{group.description}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {group.items.map((item) => (
          <Badge key={item.id} variant={item.status === 'ready' ? 'secondary' : 'outline'} className="max-w-full gap-1 rounded-md text-[11px]">
            {renderItemIcon(item.id)}
            <span className="min-w-0 truncate">{item.label}</span>
            <span className="text-muted-foreground">{statusLabel(item.status, t)}</span>
          </Badge>
        ))}
      </div>
      {group.storageHealth ? (
        <>
          <StorageHealthRows health={group.storageHealth} t={t} />
          <DesktopStorageHealthPanel vaultPath={vaultPath} t={t} />
        </>
      ) : null}
    </div>
  )
}

function StorageHealthRows({ health, t }: { health: readonly VaultStorageHealth[]; t: Translate }) {
  return (
    <div className="mt-2 grid gap-1" data-testid="settings-storage-health">
      {health.map((item) => (
        <div key={item.providerId} className="flex min-w-0 items-start gap-1.5 text-[11px] leading-snug">
          <span className="grimoire-storage-health-dot mt-1 size-1.5 shrink-0 rounded-full" data-state={item.state} />
          <span className="min-w-0 flex-1 text-muted-foreground">
            <span className="font-medium text-foreground">{storageHealthLabel(item.state, t)}</span>
            <span> · {item.message}</span>
            {item.privacyNote ? <span className="block pt-0.5 text-[10px] leading-snug">{item.privacyNote}</span> : null}
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
