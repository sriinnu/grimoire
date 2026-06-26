import { Glyph } from './glyphs/Glyph'
import { hasReviewedImportPreview, importRequiresReview } from '../lib/importReviewGate'
import type { ImportAutopsyPreviewState } from '../lib/vaultPortability'
import type { PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'
import { PortabilityActionButton } from './PortabilityActionButton'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'

interface PortabilityCapsuleImportActionsProps {
  t: PortabilityActionDeckTranslate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
  importPreview?: ImportAutopsyPreviewState | null
  onPreviewJsonCapsule?: () => void
  onImportJsonCapsule?: () => void
  onPreviewSqliteCapsule?: () => void
  onImportSqliteCapsule?: () => void
}

/** Renders local-only Grimoire capsule preview/apply actions. */
export function PortabilityCapsuleImportActions({
  t,
  vaultReady,
  busyAction,
  importPreview,
  onPreviewJsonCapsule,
  onImportJsonCapsule,
  onPreviewSqliteCapsule,
  onImportSqliteCapsule,
}: PortabilityCapsuleImportActionsProps) {
  return (
    <>
      <CapsuleButton
        label={t('settings.portability.previewJsonCapsule')}
        testId="settings-preview-json-capsule"
        actionId="json-capsule-preview"
        busyAction={busyAction}
        vaultReady={vaultReady}
        onClick={onPreviewJsonCapsule}
        t={t}
      />
      <CapsuleButton
        label={t('settings.portability.importJsonCapsule')}
        testId="settings-import-json-capsule"
        actionId="json-capsule"
        busyAction={busyAction}
        importPreview={importPreview}
        vaultReady={vaultReady}
        onClick={onImportJsonCapsule}
        t={t}
      />
      <CapsuleButton
        label={t('settings.portability.previewSqliteCapsule')}
        testId="settings-preview-sqlite-capsule"
        actionId="sqlite-capsule-preview"
        busyAction={busyAction}
        vaultReady={vaultReady}
        onClick={onPreviewSqliteCapsule}
        t={t}
      />
      <CapsuleButton
        label={t('settings.portability.importSqliteCapsule')}
        testId="settings-import-sqlite-capsule"
        actionId="sqlite-capsule"
        busyAction={busyAction}
        importPreview={importPreview}
        vaultReady={vaultReady}
        onClick={onImportSqliteCapsule}
        t={t}
      />
    </>
  )
}

interface CapsuleButtonProps {
  label: string
  testId: string
  actionId: VaultPortabilityActionId
  busyAction: VaultPortabilityActionId | null
  importPreview?: ImportAutopsyPreviewState | null
  vaultReady: boolean
  onClick?: () => void
  t: PortabilityActionDeckTranslate
}

function CapsuleButton({ label, testId, actionId, busyAction, importPreview, vaultReady, onClick, t }: CapsuleButtonProps) {
  return (
    <PortabilityActionButton
      icon={<Glyph name="archive" size={14} />}
      label={label}
      testId={testId}
      busy={busyAction === actionId}
      busyLabel={t(actionId.endsWith('-preview') ? 'settings.portability.previewing' : 'settings.portability.importing')}
      disabled={Boolean(busyAction) || !vaultReady || !onClick || importLocked(actionId, importPreview)}
      onClick={onClick}
      t={t}
    />
  )
}

function importLocked(
  actionId: VaultPortabilityActionId,
  preview: ImportAutopsyPreviewState | null | undefined,
): boolean {
  return importRequiresReview(actionId) && !hasReviewedImportPreview(actionId, preview)
}
