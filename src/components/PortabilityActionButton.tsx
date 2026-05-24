import { DownloadSimple } from '@phosphor-icons/react'
import type { ReactNode } from 'react'
import type { createTranslator } from '../lib/i18n'
import { Button } from './ui/button'

type Translate = ReturnType<typeof createTranslator>

interface PortabilityActionButtonProps {
  icon: ReactNode
  label: string
  testId: string
  busy: boolean
  busyLabel?: string
  disabled: boolean
  onClick?: () => void
  t: Translate
}

interface PortabilityImportButtonProps {
  label: string
  testId: string
  busy: boolean
  busyLabel?: string
  disabled: boolean
  onClick?: () => void
  t: Translate
}

/** Shared compact action button for portability import/export controls. */
export function PortabilityActionButton({
  icon,
  label,
  testId,
  busy,
  busyLabel,
  disabled,
  onClick,
  t,
}: PortabilityActionButtonProps) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      data-testid={testId}
      disabled={busy || disabled}
      onClick={onClick}
    >
      {icon}
      {busy ? (busyLabel ?? t('settings.portability.importing')) : label}
    </Button>
  )
}

/** Shared import button with the standard portability download icon. */
export function PortabilityImportButton({
  label,
  testId,
  busy,
  busyLabel,
  disabled,
  onClick,
  t,
}: PortabilityImportButtonProps) {
  return (
    <PortabilityActionButton
      icon={<DownloadSimple size={14} />}
      label={label}
      testId={testId}
      busy={busy}
      busyLabel={busyLabel}
      disabled={disabled}
      onClick={onClick}
      t={t}
    />
  )
}
