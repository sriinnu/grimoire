import type { createTranslator } from '../lib/i18n'
import type { DesktopStorageHealthReport } from '../utils/desktopStorageHealth'
import {
  getVaultStorageHealth,
  listVaultStorageProviders,
  type VaultPortabilityStatus,
} from '../lib/vaultPortability'
import { Badge } from './ui/badge'
import { DesktopStorageHealthPanel } from './DesktopStorageHealthPanel'
import { SettingsGroup, SettingsRow } from './settings/primitives/SettingsGroup'

type Translate = ReturnType<typeof createTranslator>

/** Renders the storage-provider and second-brain readiness groups as HIG rows. */
export function PortabilityGroups({
  onDesktopStorageHealthReport,
  t,
  vaultPath,
}: {
  onDesktopStorageHealthReport?: (report: DesktopStorageHealthReport) => void
  t: Translate
  vaultPath: string
}) {
  const healthByProvider = new Map(
    getVaultStorageHealth(vaultPath).map((health) => [health.providerId, health]),
  )

  return (
    <>
      <SettingsGroup
        title={t('settings.portability.storage')}
        footnote={t('settings.portability.storageDescription')}
        testId="settings-storage-health"
      >
        {listVaultStorageProviders().map((provider) => {
          const health = healthByProvider.get(provider.id)
          return (
            <SettingsRow
              key={provider.id}
              label={<PortabilityRowLabel label={provider.label} status={provider.status} t={t} />}
              description={
                health ? (
                  <>
                    {health.message}
                    {health.privacyNote ? (
                      <span className="block pt-0.5">{health.privacyNote}</span>
                    ) : null}
                  </>
                ) : (
                  provider.description
                )
              }
            >
              <span
                aria-hidden="true"
                className="grimoire-storage-health-dot size-1.5 shrink-0 rounded-full"
                data-state={health?.state ?? 'not_selected'}
              />
            </SettingsRow>
          )
        })}
        <SettingsRow fullWidth>
          <DesktopStorageHealthPanel
            onReport={onDesktopStorageHealthReport}
            vaultPath={vaultPath}
            t={t}
          />
        </SettingsRow>
      </SettingsGroup>

      <SettingsGroup
        title={t('settings.portability.brain')}
        footnote={t('settings.portability.brainDescription')}
      >
        {secondBrainItems(t).map((item) => (
          <SettingsRow key={item.id} label={item.label}>
            <Badge
              variant={item.status === 'ready' ? 'secondary' : 'outline'}
              className="rounded-md text-[10px] font-normal"
            >
              {portabilityStatusLabel(item.status, t)}
            </Badge>
          </SettingsRow>
        ))}
      </SettingsGroup>
    </>
  )
}

function secondBrainItems(t: Translate): Array<{ id: string; label: string; status: VaultPortabilityStatus }> {
  return [
    { id: 'journal', label: t('settings.portability.brainJournalCapture'), status: 'ready' },
    { id: 'agent-briefs', label: t('settings.portability.brainAgentBriefs'), status: 'ready' },
    { id: 'memory-graph', label: t('settings.portability.brainMemoryGraph'), status: 'planned' },
    { id: 'crystallization', label: t('settings.portability.brainCrystallizedNotes'), status: 'planned' },
  ]
}

/** Shared row-label cluster: subject name plus a quiet support-status badge. */
export function PortabilityRowLabel({
  label,
  status,
  t,
}: {
  label: string
  status: VaultPortabilityStatus
  t: Translate
}) {
  return (
    <span className="flex flex-wrap items-center gap-1.5">
      <span>{label}</span>
      <Badge variant="outline" className="rounded-md text-[10px] font-normal text-muted-foreground">
        {portabilityStatusLabel(status, t)}
      </Badge>
    </span>
  )
}

/** Maps a portability support status to its localized short label. */
function portabilityStatusLabel(status: VaultPortabilityStatus, t: Translate): string {
  if (status === 'ready') return t('settings.portability.ready')
  if (status === 'preview-backed') return t('settings.portability.supportPreviewBacked')
  if (status === 'folder-proof') return t('settings.portability.supportFolderProofOnly')
  if (status === 'proof-preview') return t('settings.portability.proofPreview')
  return t('settings.portability.planned')
}
