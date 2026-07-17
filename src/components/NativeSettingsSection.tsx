import type { createTranslator } from '../lib/i18n'
import type { NativeShellMaterial } from '../lib/appearance'
import { desktopPlatformLabel, isMac } from '../utils/platform'
import {
  SettingsGroup,
  SettingsRow,
  SettingsSectionTitle,
} from './settings/primitives/SettingsGroup'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'
import { Switch } from './ui/switch'

type Translate = ReturnType<typeof createTranslator>

interface NativeSettingsSectionProps {
  t: Translate
  menuBarIconEnabled: boolean
  setMenuBarIconEnabled: (value: boolean) => void
  nativeShellMaterial: NativeShellMaterial
  setNativeShellMaterial: (value: NativeShellMaterial) => void
}

/** Renders installation-local native desktop controls as System Settings-style groups. */
export function NativeSettingsSection({
  t,
  menuBarIconEnabled,
  setMenuBarIconEnabled,
  nativeShellMaterial,
  setNativeShellMaterial,
}: NativeSettingsSectionProps) {
  const platform = desktopPlatformLabel()
  const menuBarSupported = isMac()
  const menuBarLabel = menuBarSupported
    ? t('settings.native.menuBarIcon')
    : t('settings.native.menuBarIconUnavailable', { platform })

  return (
    <div className="settings-hig-stack">
      <SettingsSectionTitle>{t('settings.native.title', { platform })}</SettingsSectionTitle>

      <SettingsGroup
        title={t('settings.native.windowGroup')}
        footnote={
          <>
            <div>{t('settings.native.description', { platform })}</div>
            <div data-testid="settings-native-locality-note">
              {t('settings.native.shellMaterialDescription')}
            </div>
          </>
        }
      >
        <SettingsRow
          label={menuBarLabel}
          description={menuBarSupported
            ? t('settings.native.menuBarIconDescription')
            : t('settings.native.menuBarIconUnavailableDescription', { platform })}
          testId="settings-menu-bar-icon-enabled"
        >
          <Switch
            checked={menuBarSupported && menuBarIconEnabled}
            onCheckedChange={(value) => {
              if (menuBarSupported) setMenuBarIconEnabled(value)
            }}
            aria-label={menuBarLabel}
            disabled={!menuBarSupported}
          />
        </SettingsRow>
        <SettingsRow label={t('settings.native.shellMaterial')}>
          <Select
            value={nativeShellMaterial}
            onValueChange={(value) => setNativeShellMaterial(value as NativeShellMaterial)}
          >
            <SelectTrigger
              className="w-48 bg-transparent"
              aria-label={t('settings.native.shellMaterial')}
              data-testid="settings-native-shell-material"
              data-value={nativeShellMaterial}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent position="popper" data-anchor-strategy="popper">
              <SelectItem value="standard">{t('settings.native.shellMaterialStandard')}</SelectItem>
              <SelectItem value="unified">{t('settings.native.shellMaterialUnified')}</SelectItem>
              <SelectItem value="glass-preview">{t('settings.native.shellMaterialGlassPreview')}</SelectItem>
            </SelectContent>
          </Select>
        </SettingsRow>
      </SettingsGroup>
    </div>
  )
}
