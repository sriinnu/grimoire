import type { createTranslator } from '../lib/i18n'
import type { NativeShellMaterial } from '../lib/appearance'
import { LabeledSelect, SectionHeading, SettingsSwitchRow } from './settings/SettingsControls'

type Translate = ReturnType<typeof createTranslator>

interface NativeSettingsSectionProps {
  t: Translate
  menuBarIconEnabled: boolean
  setMenuBarIconEnabled: (value: boolean) => void
  nativeShellMaterial: NativeShellMaterial
  setNativeShellMaterial: (value: NativeShellMaterial) => void
}

/** Renders installation-local controls for native desktop affordances. */
export function NativeSettingsSection({
  t,
  menuBarIconEnabled,
  setMenuBarIconEnabled,
  nativeShellMaterial,
  setNativeShellMaterial,
}: NativeSettingsSectionProps) {
  return (
    <>
      <SectionHeading
        title={t('settings.native.title')}
        description={t('settings.native.description')}
      />

      <SettingsSwitchRow
        label={t('settings.native.menuBarIcon')}
        description={t('settings.native.menuBarIconDescription')}
        checked={menuBarIconEnabled}
        onChange={setMenuBarIconEnabled}
        testId="settings-menu-bar-icon-enabled"
      />

      <LabeledSelect
        label={t('settings.native.shellMaterial')}
        value={nativeShellMaterial}
        onValueChange={(value) => setNativeShellMaterial(value as NativeShellMaterial)}
        options={[
          { value: 'standard', label: t('settings.native.shellMaterialStandard') },
          { value: 'unified', label: t('settings.native.shellMaterialUnified') },
          { value: 'glass-preview', label: t('settings.native.shellMaterialGlassPreview') },
        ]}
        testId="settings-native-shell-material"
      />

      <div
        className="settings-material-inner rounded-md border px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
        data-testid="settings-native-locality-note"
      >
        {t('settings.native.shellMaterialDescription')}
      </div>
    </>
  )
}
