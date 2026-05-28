import { UploadSimple } from '@phosphor-icons/react'
import type { PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'
import { PortabilityActionButton } from './PortabilityActionButton'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'

interface PortabilityExportActionsProps {
  t: PortabilityActionDeckTranslate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  onExportMarkdownZip?: () => void
  onExportStaticHtmlArchive?: () => void
  onPreviewJsonSnapshot?: () => void
  onExportJsonSnapshot?: () => void
  onPreviewSqliteSnapshot?: () => void
  onExportSqliteSnapshot?: () => void
}

/** Renders reviewed export actions for portable vault snapshots. */
export function PortabilityExportActions({
  t,
  vaultReady,
  busyAction,
  onExportMarkdownZip,
  onExportStaticHtmlArchive,
  onPreviewJsonSnapshot,
  onExportJsonSnapshot,
  onPreviewSqliteSnapshot,
  onExportSqliteSnapshot,
}: PortabilityExportActionsProps) {
  return (
    <>
      <ExportButton
        label={t('settings.portability.exportMarkdownZip')}
        testId="settings-export-markdown-zip"
        actionId="export-markdown-zip"
        busyAction={busyAction}
        vaultReady={vaultReady}
        onClick={onExportMarkdownZip}
        t={t}
      />
      <ExportButton
        label={t('settings.portability.exportStaticHtml')}
        testId="settings-export-static-html"
        actionId="export-static-html"
        busyAction={busyAction}
        vaultReady={vaultReady}
        onClick={onExportStaticHtmlArchive}
        t={t}
      />
      <ExportButton
        label={t('settings.portability.previewJsonSnapshot')}
        testId="settings-preview-json-snapshot"
        actionId="export-json-preview"
        busyAction={busyAction}
        vaultReady={vaultReady}
        onClick={onPreviewJsonSnapshot}
        t={t}
      />
      <ExportButton
        label={t('settings.portability.exportJsonSnapshot')}
        testId="settings-export-json-snapshot"
        actionId="export-json"
        busyAction={busyAction}
        vaultReady={vaultReady}
        onClick={onExportJsonSnapshot}
        t={t}
      />
      <ExportButton
        label={t('settings.portability.previewSqliteSnapshot')}
        testId="settings-preview-sqlite-snapshot"
        actionId="export-sqlite-preview"
        busyAction={busyAction}
        vaultReady={vaultReady}
        onClick={onPreviewSqliteSnapshot}
        t={t}
      />
      <ExportButton
        label={t('settings.portability.exportSqliteSnapshot')}
        testId="settings-export-sqlite-snapshot"
        actionId="export-sqlite"
        busyAction={busyAction}
        vaultReady={vaultReady}
        onClick={onExportSqliteSnapshot}
        t={t}
      />
    </>
  )
}

interface ExportButtonProps {
  label: string
  testId: string
  actionId: VaultPortabilityActionId
  busyAction: VaultPortabilityActionId | null
  vaultReady: boolean
  onClick?: () => void
  t: PortabilityActionDeckTranslate
}

function ExportButton({ label, testId, actionId, busyAction, vaultReady, onClick, t }: ExportButtonProps) {
  return (
    <PortabilityActionButton
      icon={<UploadSimple size={14} />}
      label={label}
      testId={testId}
      busy={busyAction === actionId}
      busyLabel={t('settings.portability.exporting')}
      disabled={Boolean(busyAction) || !vaultReady || !onClick}
      onClick={onClick}
      t={t}
    />
  )
}
