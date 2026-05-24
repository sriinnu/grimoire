import type { createTranslator } from '../lib/i18n'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import { PortabilityImportButton } from './PortabilityActionButton'

type Translate = ReturnType<typeof createTranslator>

interface JournalImportAutopsyActionsProps {
  t: Translate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  onPreviewAppleJournal?: () => void
  onImportAppleJournal?: () => void
  onPreviewDayOne?: () => void
  onImportDayOne?: () => void
  onPreviewJourney?: () => void
  onImportJourney?: () => void
}

interface JournalImportAction {
  label: string
  testId: string
  actionId: VaultPortabilityActionId
  onClick?: () => void
  busyLabel?: string
}

/** Renders journal Import Autopsy and import actions. */
export function JournalImportAutopsyActions({
  t,
  vaultReady,
  busyAction,
  onPreviewAppleJournal,
  onImportAppleJournal,
  onPreviewDayOne,
  onImportDayOne,
  onPreviewJourney,
  onImportJourney,
}: JournalImportAutopsyActionsProps) {
  const previewing = t('settings.portability.previewing')
  const actions: JournalImportAction[] = [
    { label: t('settings.portability.previewAppleJournal'), testId: 'settings-preview-apple-journal', actionId: 'apple-journal-preview', onClick: onPreviewAppleJournal, busyLabel: previewing },
    { label: t('settings.portability.importAppleJournal'), testId: 'settings-import-apple-journal', actionId: 'apple-journal', onClick: onImportAppleJournal },
    { label: t('settings.portability.previewDayOne'), testId: 'settings-preview-day-one', actionId: 'day-one-preview', onClick: onPreviewDayOne, busyLabel: previewing },
    { label: t('settings.portability.importDayOne'), testId: 'settings-import-day-one', actionId: 'day-one', onClick: onImportDayOne },
    { label: t('settings.portability.previewJourney'), testId: 'settings-preview-journey', actionId: 'journey-preview', onClick: onPreviewJourney, busyLabel: previewing },
    { label: t('settings.portability.importJourney'), testId: 'settings-import-journey', actionId: 'journey', onClick: onImportJourney },
  ]

  return actions.map((action) => (
    <PortabilityImportButton
      key={action.actionId}
      label={action.label}
      testId={action.testId}
      busy={busyAction === action.actionId}
      busyLabel={action.busyLabel}
      disabled={Boolean(busyAction) || !vaultReady || !action.onClick}
      onClick={action.onClick}
      t={t}
    />
  ))
}
