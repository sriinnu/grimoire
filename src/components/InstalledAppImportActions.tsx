import type { DiscoveredApp } from '../utils/appStoreImport'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import type { PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'
import { isPortabilityActionDisabled } from './PortabilityActionDeckModel'
import { PortabilityImportButton } from './PortabilityActionButton'

interface InstalledAppImportActionsProps {
  t: PortabilityActionDeckTranslate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  installedApps: DiscoveredApp[]
  onPreviewBearDatabase?: () => void
  onImportBearDatabase?: () => void
}

/** Direct imports from app data stores Grimoire discovered on this machine. */
export function InstalledAppImportActions({
  t,
  vaultReady,
  busyAction,
  installedApps,
  onPreviewBearDatabase,
  onImportBearDatabase,
}: InstalledAppImportActionsProps) {
  if (installedApps.length === 0) return null

  return (
    <div
      className="grimoire-portability-installed-apps grid gap-2 rounded-md border border-border p-2.5"
      data-testid="settings-portability-installed-apps"
    >
      <div className="flex flex-col gap-0.5">
        <div className="text-xs font-semibold text-foreground">
          {t('settings.portability.installedApps')}
        </div>
        <div className="max-w-[560px] text-[11px] leading-snug text-muted-foreground">
          {t('settings.portability.installedAppsDescription')}
        </div>
      </div>
      {installedApps.map((app) => (
        <div
          key={app.id}
          className="flex flex-wrap items-center gap-2"
          data-testid={`settings-installed-app-${app.id}`}
        >
          <span className="text-xs font-medium text-foreground">{app.name}</span>
          <span
            className="text-[11px] text-muted-foreground"
            data-testid={`settings-installed-app-status-${app.id}`}
          >
            {statusLine(t, app)}
          </span>
          {app.id === 'bear' && app.store_found && app.support === 'full' ? (
            <span className="flex flex-wrap gap-2">
              <PortabilityImportButton
                label={t('settings.portability.previewBearDatabase')}
                testId="settings-preview-bear-database"
                busy={busyAction === 'bear-db-preview'}
                busyLabel={t('settings.portability.previewing')}
                disabled={isPortabilityActionDisabled(busyAction, vaultReady, onPreviewBearDatabase)}
                onClick={onPreviewBearDatabase}
                t={t}
              />
              <PortabilityImportButton
                label={t('settings.portability.importBearDatabase')}
                testId="settings-import-bear-database"
                busy={busyAction === 'bear-db'}
                disabled={isPortabilityActionDisabled(busyAction, vaultReady, onImportBearDatabase)}
                onClick={onImportBearDatabase}
                t={t}
              />
            </span>
          ) : null}
        </div>
      ))}
    </div>
  )
}

function statusLine(t: PortabilityActionDeckTranslate, app: DiscoveredApp): string {
  if (!app.installed) return t('settings.portability.installedAppNotInstalled')
  if (app.support === 'detected-only') return t('settings.portability.installedAppDetectedOnly')
  if (!app.store_found) return t('settings.portability.installedAppStoreMissing')
  return t('settings.portability.installedAppStoreFound')
}
