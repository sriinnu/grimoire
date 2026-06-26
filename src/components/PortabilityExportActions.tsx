import { Glyph } from './glyphs/Glyph'
import { hasReviewedExportPreview, exportRequiresReview, type PortabilityExportPreviewState } from '../lib/exportReviewGate'
import type { PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'
import { PortabilityActionButton } from './PortabilityActionButton'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'
import { Badge } from './ui/badge'

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
  exportPreview?: PortabilityExportPreviewState | null
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
  exportPreview,
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
        exportPreview={exportPreview}
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
        exportPreview={exportPreview}
        vaultReady={vaultReady}
        onClick={onExportSqliteSnapshot}
        t={t}
      />
      <ExportPreviewSummary exportPreview={exportPreview} t={t} />
    </>
  )
}

interface ExportButtonProps {
  label: string
  testId: string
  actionId: VaultPortabilityActionId
  busyAction: VaultPortabilityActionId | null
  exportPreview?: PortabilityExportPreviewState | null
  vaultReady: boolean
  onClick?: () => void
  t: PortabilityActionDeckTranslate
}

function ExportButton({ label, testId, actionId, busyAction, exportPreview, vaultReady, onClick, t }: ExportButtonProps) {
  return (
    <PortabilityActionButton
      icon={<Glyph name="upload" size={14} />}
      label={label}
      testId={testId}
      busy={busyAction === actionId}
      busyLabel={t(actionId.endsWith('-preview') ? 'settings.portability.previewing' : 'settings.portability.exporting')}
      disabled={Boolean(busyAction) || !vaultReady || !onClick || exportLocked(actionId, exportPreview)}
      onClick={onClick}
      t={t}
    />
  )
}

function exportLocked(
  actionId: VaultPortabilityActionId,
  preview: PortabilityExportPreviewState | null | undefined,
): boolean {
  return exportRequiresReview(actionId) && !hasReviewedExportPreview(actionId, preview)
}

function ExportPreviewSummary({
  exportPreview,
  t,
}: { exportPreview?: PortabilityExportPreviewState | null; t: PortabilityActionDeckTranslate }) {
  if (!exportPreview) return null
  const { result } = exportPreview
  const proofValue = (proved: boolean) => (
    proved ? t('settings.portability.proofYes') : t('settings.portability.proofNeedsReview')
  )
  return (
    <div
      className="grimoire-portability-inline-panel grid w-full gap-1.5 rounded-md border border-border px-2.5 py-2 text-[11px]"
      data-testid="settings-export-preview-summary"
    >
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant="secondary" className="rounded-md">{t('settings.portability.exportPreviewReviewed')}</Badge>
        <span className="font-medium text-foreground">
          {t(exportPreview.format === 'json'
            ? 'settings.portability.exportPreviewFormatJson'
            : 'settings.portability.exportPreviewFormatSqlite')}
        </span>
      </div>
      <div className="text-muted-foreground">
        {t('settings.portability.exportPreviewCounts', {
          assets: result.assets_exportable,
          files: result.files_exportable,
          notes: result.notes_exportable,
          withheld: result.skipped_files,
        })}
      </div>
      <div className="text-muted-foreground">
        {t('settings.portability.exportPreviewProof', {
          paths: proofValue(result.locality_proof.absolute_source_paths_redacted),
          source: proofValue(result.locality_proof.markdown_source_of_truth),
        })}
      </div>
    </div>
  )
}
