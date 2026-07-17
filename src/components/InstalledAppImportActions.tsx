import type { DiscoveredApp, InstalledAppDatabaseId } from '../utils/appStoreImport'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import type { PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'
import { isPortabilityActionDisabled } from './PortabilityActionDeckModel'
import { PortabilityImportButton } from './PortabilityActionButton'
import { SettingsActionRow, SettingsGroup } from './settings/primitives/SettingsGroup'

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
    <SettingsGroup
      title={t('settings.portability.installedApps')}
      footnote={t('settings.portability.installedAppsDescription')}
      testId="settings-portability-installed-apps"
    >
      {installedApps.map((app) => {
        const actions = databaseActionsFor(app)
        return (
          <SettingsActionRow
            key={app.id}
            testId={`settings-installed-app-${app.id}`}
            label={app.name}
            description={
              <span data-testid={`settings-installed-app-status-${app.id}`}>
                {statusLine(t, app)}
              </span>
            }
            actions={actions ? (
              <>
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
              </>
            ) : null}
          />
        )
      })}
    </SettingsGroup>
  )
}

function statusLine(t: PortabilityActionDeckTranslate, app: DiscoveredApp): string {
  if (!app.installed) return t('settings.portability.installedAppNotInstalled')
  if (app.support === 'detected-only') return t('settings.portability.installedAppDetectedOnly')
  if (!app.store_found) return t('settings.portability.installedAppStoreMissing')
  return t('settings.portability.installedAppStoreFound')
}
