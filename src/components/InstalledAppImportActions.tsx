import type { DiscoveredApp, InstalledAppDatabaseId } from '../utils/appStoreImport'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import type { PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'
import { isPortabilityActionDisabled } from './PortabilityActionDeckModel'
import { PortabilityImportButton } from './PortabilityActionButton'

interface InstalledAppImportActionsProps {
  t: PortabilityActionDeckTranslate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  installedApps: DiscoveredApp[]
  onPreviewAppDatabase?: (appId?: InstalledAppDatabaseId) => void
  onImportAppDatabase?: (appId?: InstalledAppDatabaseId) => void
}

interface DatabaseActionConfig {
  appId: InstalledAppDatabaseId
  previewLabelKey: Parameters<PortabilityActionDeckTranslate>[0]
  importLabelKey: Parameters<PortabilityActionDeckTranslate>[0]
  previewActionId: VaultPortabilityActionId
  importActionId: VaultPortabilityActionId
  previewTestId: string
  importTestId: string
}

const DATABASE_ACTIONS: Record<InstalledAppDatabaseId, DatabaseActionConfig> = {
  bear: {
    appId: 'bear',
    previewLabelKey: 'settings.portability.previewBearDatabase',
    importLabelKey: 'settings.portability.importBearDatabase',
    previewActionId: 'bear-db-preview',
    importActionId: 'bear-db',
    previewTestId: 'settings-preview-bear-database',
    importTestId: 'settings-import-bear-database',
  },
  'day-one': {
    appId: 'day-one',
    previewLabelKey: 'settings.portability.previewDayOneDatabase',
    importLabelKey: 'settings.portability.importDayOneDatabase',
    previewActionId: 'day-one-db-preview',
    importActionId: 'day-one-db',
    previewTestId: 'settings-preview-day-one-database',
    importTestId: 'settings-import-day-one-database',
  },
}

function databaseActionsFor(app: DiscoveredApp): DatabaseActionConfig | null {
  if (!app.store_found || app.support !== 'full') return null
  if (app.id === 'bear' || app.id === 'day-one') return DATABASE_ACTIONS[app.id]
  return null
}

/** Direct imports from app data stores Grimoire discovered on this machine. */
export function InstalledAppImportActions({
  t,
  vaultReady,
  busyAction,
  installedApps,
  onPreviewAppDatabase,
  onImportAppDatabase,
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
      {installedApps.map((app) => {
        const actions = databaseActionsFor(app)
        return (
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
            {actions ? (
              <span className="flex flex-wrap gap-2">
                <PortabilityImportButton
                  label={t(actions.previewLabelKey)}
                  testId={actions.previewTestId}
                  busy={busyAction === actions.previewActionId}
                  busyLabel={t('settings.portability.previewing')}
                  disabled={isPortabilityActionDisabled(busyAction, vaultReady, onPreviewAppDatabase)}
                  onClick={() => onPreviewAppDatabase?.(actions.appId)}
                  t={t}
                />
                <PortabilityImportButton
                  label={t(actions.importLabelKey)}
                  testId={actions.importTestId}
                  busy={busyAction === actions.importActionId}
                  disabled={isPortabilityActionDisabled(busyAction, vaultReady, onImportAppDatabase)}
                  onClick={() => onImportAppDatabase?.(actions.appId)}
                  t={t}
                />
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

function statusLine(t: PortabilityActionDeckTranslate, app: DiscoveredApp): string {
  if (!app.installed) return t('settings.portability.installedAppNotInstalled')
  if (app.support === 'detected-only') return t('settings.portability.installedAppDetectedOnly')
  if (!app.store_found) return t('settings.portability.installedAppStoreMissing')
  return t('settings.portability.installedAppStoreFound')
}
