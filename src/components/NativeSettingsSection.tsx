import type { createTranslator } from '../lib/i18n'
import type { NativeShellMaterial } from '../lib/appearance'
import { LabeledSelect, SettingsSwitchRow } from './settings/SettingsControls'

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

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {t('settings.native.shellMaterialDescription')}
      </p>
    </>
  )
}

function SectionHeading({
  title,
  description,
}: {
  title: string
  description: string
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          color: 'var(--muted-foreground)',
        }}
      >
        {title}
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted-foreground)', lineHeight: 1.55, maxWidth: 420 }}>
        {description}
      </div>
    </div>
  )
}
