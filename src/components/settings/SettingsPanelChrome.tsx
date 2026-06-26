import { X } from '@phosphor-icons/react'
import { DialogDescription, DialogTitle } from '../ui/dialog'
import { Button } from '../ui/button'
import { BUILD_INFO, formatBuildStamp, formatBuiltAt } from '../../lib/buildInfo'
import type { SettingsTranslate } from './settingsTypes'

/** Renders the theme-owned Settings title bar. */
export function SettingsHeader({ onClose, t }: { onClose: () => void; t: SettingsTranslate }) {
  return (
    <div className="settings-panel-header flex h-14 shrink-0 items-center justify-between border-b px-6">
      <DialogTitle className="settings-panel-title text-base font-semibold">
        {t('settings.title')}
      </DialogTitle>
      <DialogDescription className="sr-only">
        {t('settings.description')}
      </DialogDescription>
      <Button
        variant="ghost"
        size="icon-sm"
        onClick={onClose}
        title={t('settings.close')}
        aria-label={t('settings.close')}
      >
        <X size={16} />
      </Button>
    </div>
  )
}

/** Renders the Settings action footer with the save shortcut and final actions. */
export function SettingsFooter({
  onClose,
  onSave,
  t,
}: {
  onClose: () => void
  onSave: () => void
  t: SettingsTranslate
}) {
  return (
    <div className="settings-panel-footer flex h-14 shrink-0 items-center justify-between border-t px-6">
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="settings-panel-footer__shortcut text-[11px]">{t('settings.footerShortcut')}</span>
        <span
          className="settings-panel-footer__build text-[10px] text-muted-foreground tabular-nums"
          data-testid="settings-build-stamp"
          title={`Grimoire ${BUILD_INFO.version} · built ${formatBuiltAt() || 'unknown'} · ${BUILD_INFO.sha}`}
        >
          {formatBuildStamp()}
        </span>
      </div>
      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          {t('settings.cancel')}
        </Button>
        <Button onClick={onSave} data-testid="settings-save">
          {t('settings.save')}
        </Button>
      </div>
    </div>
  )
}
