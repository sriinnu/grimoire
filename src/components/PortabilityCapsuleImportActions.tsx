import { Archive } from '@phosphor-icons/react'
import type { PortabilityActionDeckTranslate } from './PortabilityActionDeck.types'
import { PortabilityActionButton } from './PortabilityActionButton'
import type { VaultPortabilityActionId } from '../lib/vaultPortability'

interface PortabilityCapsuleImportActionsProps {
  t: PortabilityActionDeckTranslate
  vaultReady: boolean
  busyAction: VaultPortabilityActionId | null
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
  vaultReady: boolean
  onClick?: () => void
  t: PortabilityActionDeckTranslate
}

function CapsuleButton({ label, testId, actionId, busyAction, vaultReady, onClick, t }: CapsuleButtonProps) {
  return (
    <PortabilityActionButton
      icon={<Archive size={14} />}
      label={label}
      testId={testId}
      busy={busyAction === actionId}
      busyLabel={t('settings.portability.previewing')}
      disabled={Boolean(busyAction) || !vaultReady || !onClick}
      onClick={onClick}
      t={t}
    />
  )
}
