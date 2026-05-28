import type { ReactNode } from 'react'
import { Check, Moon, Palette, Sun, TextAa } from '@phosphor-icons/react'
import type { EditorFont, ThemePreset } from '../lib/appearance'
import { resolveFontRoles } from '../lib/fontConfig'
import type { createTranslator } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
import { SidebarAppearancePreview } from './SidebarAppearancePreview'
import { ThemePackSettingsControls } from './ThemePackSettingsControls'
import { buildPresetGroups, type PresetOption } from './appearanceSettingsOptions'
import { SectionHeading } from './settings/SettingsControls'
import { Button } from './ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

type Translate = ReturnType<typeof createTranslator>

interface AppearanceSettingsSectionProps {
  t: Translate
  themeMode: ThemeMode
  setThemeMode: (value: ThemeMode) => void
  themePreset: ThemePreset
  setThemePreset: (value: ThemePreset) => void
  editorFont: EditorFont
  setEditorFont: (value: EditorFont) => void
}

/** Renders Grimoire's visual appearance controls and a compact live reading sample. */
export function AppearanceSettingsSection({
  t,
  themeMode,
  setThemeMode,
  themePreset,
  setThemePreset,
  editorFont,
  setEditorFont,
}: AppearanceSettingsSectionProps) {
  const presetGroups = buildPresetGroups(t)

  return (
    <>
      <SectionHeading
        title={t('settings.appearance.title')}
        description={t('settings.appearance.description')}
      />

      <ThemeModeControl value={themeMode} onChange={setThemeMode} t={t} />

      <div className="space-y-2">
        <ControlLabel icon={<Palette size={14} />} label={t('settings.themePreset.label')} />
        <div
          className="space-y-3"
          role="radiogroup"
          aria-label={t('settings.themePreset.label')}
        >
          {presetGroups.map((group) => (
            <div key={group.id} className="space-y-1.5" data-testid={`settings-theme-preset-group-${group.id}`}>
              <div
                style={{
                  color: 'var(--muted-foreground)',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                }}
              >
                {group.label}
              </div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))' }}
              >
                {group.options.map((preset) => (
                  <ThemePresetCard
                    key={preset.value}
                    option={preset}
                    selected={themePreset === preset.value}
                    onSelect={setThemePreset}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ThemePackSettingsControls t={t} themePreset={themePreset} />

      <SidebarAppearancePreview t={t} themeMode={themeMode} themePreset={themePreset} />

      <div className="space-y-2">
        <ControlLabel icon={<TextAa size={14} />} label={t('settings.editorFont.label')} />
        <Select value={editorFont} onValueChange={(value) => setEditorFont(value as EditorFont)}>
          <SelectTrigger
            className="w-full bg-transparent"
            data-testid="settings-editor-font"
            data-value={editorFont}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" data-anchor-strategy="popper">
            <SelectItem value="system">{t('settings.editorFont.system')}</SelectItem>
            <SelectItem value="serif">{t('settings.editorFont.serif')}</SelectItem>
            <SelectItem value="mono">{t('settings.editorFont.mono')}</SelectItem>
            <SelectItem value="readable">{t('settings.editorFont.readable')}</SelectItem>
            <SelectItem value="literary">{t('settings.editorFont.literary')}</SelectItem>
            <SelectItem value="compact">{t('settings.editorFont.compact')}</SelectItem>
            <SelectItem value="handwritten">{t('settings.editorFont.handwritten')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AppearancePreview t={t} themeMode={themeMode} themePreset={themePreset} editorFont={editorFont} />
    </>
  )
}

function ControlLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600, color: 'var(--foreground)' }}>
      {icon}
      {label}
    </div>
  )
}

function ThemeModeControl({
  value,
  onChange,
  t,
}: {
  value: ThemeMode
  onChange: (value: ThemeMode) => void
  t: Translate
}) {
  return (
    <div
      className="settings-material-inner inline-flex w-full rounded-md border p-1"
      role="radiogroup"
      aria-label={t('settings.theme.label')}
      data-testid="settings-theme-mode"
    >
      <ThemeModeButton label={t('settings.theme.light')} selected={value === 'light'} value="light" onSelect={onChange}>
        <Sun size={14} />
      </ThemeModeButton>
      <ThemeModeButton label={t('settings.theme.dark')} selected={value === 'dark'} value="dark" onSelect={onChange}>
        <Moon size={14} />
      </ThemeModeButton>
    </div>
  )
}

function ThemeModeButton({
  children,
  label,
  selected,
  value,
  onSelect,
}: {
  children: ReactNode
  label: string
  selected: boolean
  value: ThemeMode
  onSelect: (value: ThemeMode) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      data-testid={`settings-theme-${value}`}
      className={
        selected
          ? 'settings-theme-mode-button h-7 flex-1 border text-foreground shadow-xs'
          : 'h-7 flex-1 text-muted-foreground hover:text-foreground'
      }
      onClick={() => onSelect(value)}
    >
      {children}
      {label}
    </Button>
  )
}

function ThemePresetCard({
  option,
  selected,
  onSelect,
}: {
  option: PresetOption
  selected: boolean
  onSelect: (value: ThemePreset) => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      role="radio"
      aria-checked={selected}
      data-testid={`settings-theme-preset-${option.value}`}
      data-group={option.group}
      data-selected={selected ? 'true' : 'false'}
      className={
        selected
          ? 'settings-theme-preset-card h-auto min-w-0 justify-start whitespace-normal rounded-md border p-3 text-left shadow-xs'
          : 'settings-theme-preset-card h-auto min-w-0 justify-start whitespace-normal rounded-md border p-3 text-left'
      }
      onClick={() => onSelect(option.value)}
    >
      <span className="flex min-w-0 w-full flex-col gap-2">
        <span className="flex items-center justify-between gap-2">
          <span className="flex min-w-0 items-center gap-1.5 break-words" style={{ fontSize: 12, fontWeight: 600 }}>
            {option.label}
          </span>
          {selected ? <Check size={14} weight="bold" /> : null}
        </span>
        <span className="flex gap-1">
          {option.swatches.map((swatch) => (
            <span
              key={swatch}
              className="h-4 flex-1 rounded-sm border border-border"
              style={{ background: swatch }}
            />
          ))}
        </span>
        <span className="min-w-0 break-words" style={{ color: 'var(--muted-foreground)', fontSize: 11, lineHeight: 1.35 }}>
          {option.description}
        </span>
      </span>
    </Button>
  )
}

function AppearancePreview({
  t,
  themeMode,
  themePreset,
  editorFont,
}: {
  t: Translate
  themeMode: ThemeMode
  themePreset: ThemePreset
  editorFont: EditorFont
}) {
  const fontRoles = resolveFontRoles({ themePreset, editorFont })

  return (
    <div
      className="settings-appearance-preview rounded-md border border-border"
      data-testid="settings-appearance-preview"
      data-theme-preview={themeMode}
      data-theme-preset-preview={themePreset}
    >
      <div className="settings-appearance-preview__sample" style={{ fontFamily: fontRoles.editor }}>
        <div style={{ fontFamily: fontRoles.display, fontSize: 19, fontWeight: 650, lineHeight: 1.2 }}>
          {t('settings.appearance.previewTitle')}
        </div>
        <div className="settings-appearance-preview__body">
          {t('settings.appearance.previewBody')}
        </div>
      </div>
    </div>
  )
}
