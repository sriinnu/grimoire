import type { createTranslator } from '../lib/i18n'
import { Switch } from './ui/switch'

type Translate = ReturnType<typeof createTranslator>

interface NativeSettingsSectionProps {
  t: Translate
  menuBarIconEnabled: boolean
  setMenuBarIconEnabled: (value: boolean) => void
}

/** Renders installation-local controls for native desktop affordances. */
export function NativeSettingsSection({
  t,
  menuBarIconEnabled,
  setMenuBarIconEnabled,
}: NativeSettingsSectionProps) {
  return (
    <>
      <SectionHeading
        title={t('settings.native.title')}
        description={t('settings.native.description')}
      />

      <label
        className="flex items-start justify-between gap-3"
        style={{ cursor: 'pointer' }}
        data-testid="settings-menu-bar-icon-enabled"
      >
        <div className="space-y-1">
          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
            {t('settings.native.menuBarIcon')}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
            {t('settings.native.menuBarIconDescription')}
          </div>
        </div>
        <Switch
          checked={menuBarIconEnabled}
          onCheckedChange={setMenuBarIconEnabled}
          aria-label={t('settings.native.menuBarIcon')}
        />
      </label>
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
