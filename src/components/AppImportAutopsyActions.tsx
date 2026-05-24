import type { createTranslator } from '../lib/i18n'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import { PortabilityImportButton } from './PortabilityActionButton'

type Translate = ReturnType<typeof createTranslator>

interface AppImportAutopsyActionsProps {
  t: Translate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  onPreviewObsidian?: () => void
  onImportObsidian?: () => void
  onPreviewNotion?: () => void
  onImportNotion?: () => void
  onPreviewNotionFolder?: () => void
  onImportNotionFolder?: () => void
  onPreviewSpanda?: () => void
  onImportSpanda?: () => void
}

interface AppImportAction {
  label: string
  testId: string
  actionId: VaultPortabilityActionId
  onClick?: () => void
  busyLabel?: string
}

/** Renders app-specific Import Autopsy and import actions. */
export function AppImportAutopsyActions({
  t,
  vaultReady,
  busyAction,
  onPreviewObsidian,
  onImportObsidian,
  onPreviewNotion,
  onImportNotion,
  onPreviewNotionFolder,
  onImportNotionFolder,
  onPreviewSpanda,
  onImportSpanda,
}: AppImportAutopsyActionsProps) {
  const previewing = t('settings.portability.previewing')
  const actions: AppImportAction[] = [
    { label: t('settings.portability.previewObsidian'), testId: 'settings-preview-obsidian', actionId: 'obsidian-preview', onClick: onPreviewObsidian, busyLabel: previewing },
    { label: t('settings.portability.importObsidian'), testId: 'settings-import-obsidian', actionId: 'obsidian', onClick: onImportObsidian },
    { label: t('settings.portability.previewNotion'), testId: 'settings-preview-notion', actionId: 'notion-markdown-preview', onClick: onPreviewNotion, busyLabel: previewing },
    { label: t('settings.portability.importNotion'), testId: 'settings-import-notion', actionId: 'notion-markdown', onClick: onImportNotion },
    { label: t('settings.portability.previewNotionFolder'), testId: 'settings-preview-notion-folder', actionId: 'notion-folder-preview', onClick: onPreviewNotionFolder, busyLabel: previewing },
    { label: t('settings.portability.importNotionFolder'), testId: 'settings-import-notion-folder', actionId: 'notion-folder', onClick: onImportNotionFolder },
    { label: t('settings.portability.previewSpanda'), testId: 'settings-preview-spanda', actionId: 'spanda-preview', onClick: onPreviewSpanda, busyLabel: previewing },
    { label: t('settings.portability.importSpanda'), testId: 'settings-import-spanda', actionId: 'spanda', onClick: onImportSpanda },
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
