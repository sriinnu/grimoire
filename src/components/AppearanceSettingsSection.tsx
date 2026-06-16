import { useEffect, type CSSProperties, type ReactNode } from 'react'
import { Moon, Palette, Sun, TextAa } from '@phosphor-icons/react'
import type { EditorFont, EditorLineHeight, ThemePreset } from '../lib/appearance'
import type { createTranslator } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
import {
  resolveThemeDefinitionMode,
  resolveThemeDefinitionPreferredMode,
  resolveThemePresetDefinition,
} from '../themes/themeRegistry'
import { AppearanceProfileCard } from './AppearanceProfileCard'
import { AppearanceProfilePreview } from './AppearanceProfilePreview'
import { SidebarAppearancePreview } from './SidebarAppearancePreview'
import { ThemePackSettingsControls } from './ThemePackSettingsControls'
import { buildPresetGroups } from './appearanceSettingsOptions'
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

const CURATED_EDITOR_FONT_OPTIONS: Array<{ value: EditorFont; labelKey: Parameters<Translate>[0] }> = [
  { value: 'literary', labelKey: 'settings.editorFont.literary' },
  { value: 'editorial', labelKey: 'settings.editorFont.editorial' },
  { value: 'manuscript', labelKey: 'settings.editorFont.manuscript' },
  { value: 'system', labelKey: 'settings.editorFont.system' },
  { value: 'readable', labelKey: 'settings.editorFont.readable' },
  { value: 'humanist', labelKey: 'settings.editorFont.humanist' },
  { value: 'mono', labelKey: 'settings.editorFont.mono' },
]

interface AppearanceSettingsSectionProps {
  t: Translate
  themeMode: ThemeMode
  setThemeMode: (value: ThemeMode) => void
  themePreset: ThemePreset
  setThemePreset: (value: ThemePreset) => void
  editorFont: EditorFont
  setEditorFont: (value: EditorFont) => void
  editorLineHeight: EditorLineHeight
  setEditorLineHeight: (value: EditorLineHeight) => void
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
  editorLineHeight,
  setEditorLineHeight,
}: AppearanceSettingsSectionProps) {
  const presetGroups = buildPresetGroups(t)
  const selectedThemeDefinition = resolveThemePresetDefinition(themePreset)
  const resolvedThemeMode = resolveThemeDefinitionMode(selectedThemeDefinition, themeMode)
  const availableThemeModes = {
    dark: Boolean(selectedThemeDefinition.modes.dark),
    light: Boolean(selectedThemeDefinition.modes.light),
  }

  useEffect(() => {
    if (resolvedThemeMode !== themeMode) setThemeMode(resolvedThemeMode)
  }, [resolvedThemeMode, setThemeMode, themeMode])

  const handleThemePresetSelect = (value: ThemePreset) => {
    setThemePreset(value)
    const nextMode = resolveThemeDefinitionPreferredMode(resolveThemePresetDefinition(value))
    if (nextMode !== themeMode) setThemeMode(nextMode)
  }

  return (
    <>
      <SectionHeading
        title={t('settings.appearance.title')}
        description={t('settings.appearance.description')}
      />

      <div className="space-y-2">
        <ControlLabel icon={<Sun size={14} />} label={t('settings.theme.label')} />
        <ThemeModeControl
          availableModes={availableThemeModes}
          value={resolvedThemeMode}
          onChange={setThemeMode}
          t={t}
        />
      </div>

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
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: 0,
                  textTransform: 'uppercase',
                }}
              >
                {group.label}
              </div>
              <div
                className="grid gap-2"
                style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))' }}
              >
                {group.options.map((preset) => (
                  <AppearanceProfileCard
                    key={preset.value}
                    option={preset}
                    selected={themePreset === preset.value}
                    onSelect={handleThemePresetSelect}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <ThemePackSettingsControls t={t} themePreset={themePreset} />

      <SidebarAppearancePreview t={t} themeMode={resolvedThemeMode} themePreset={themePreset} />

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
            {CURATED_EDITOR_FONT_OPTIONS.map((option) => (
              <SelectItem key={option.value} value={option.value}>
                {t(option.labelKey)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <ControlLabel icon={<TextAa size={14} />} label={t('settings.editorLineHeight.label')} />
        <Select value={editorLineHeight} onValueChange={(value) => setEditorLineHeight(value as EditorLineHeight)}>
          <SelectTrigger
            aria-label={t('settings.editorLineHeight.label')}
            className="w-full bg-transparent"
            data-testid="settings-editor-line-height"
            data-value={editorLineHeight}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent position="popper" data-anchor-strategy="popper">
            <SelectItem value="compact">{t('settings.editorLineHeight.compact')}</SelectItem>
            <SelectItem value="comfortable">{t('settings.editorLineHeight.comfortable')}</SelectItem>
            <SelectItem value="spacious">{t('settings.editorLineHeight.spacious')}</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <AppearanceProfilePreview
        t={t}
        themeMode={resolvedThemeMode}
        themePreset={themePreset}
        editorFont={editorFont}
        editorLineHeight={editorLineHeight}
      />
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
  availableModes,
  value,
  onChange,
  t,
}: {
  availableModes: Record<ThemeMode, boolean>
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
      <ThemeModeButton
        disabled={!availableModes.light}
        label={t('settings.theme.light')}
        selected={value === 'light'}
        value="light"
        onSelect={onChange}
      >
        <Sun size={14} />
      </ThemeModeButton>
      <ThemeModeButton
        disabled={!availableModes.dark}
        label={t('settings.theme.dark')}
        selected={value === 'dark'}
        value="dark"
        onSelect={onChange}
      >
        <Moon size={14} />
      </ThemeModeButton>
    </div>
  )
}

function ThemeModeButton({
  children,
  disabled = false,
  label,
  selected,
  value,
  onSelect,
}: {
  children: ReactNode
  disabled?: boolean
  label: string
  selected: boolean
  value: ThemeMode
  onSelect: (value: ThemeMode) => void
}) {
  const buttonStyle: CSSProperties | undefined = selected
    ? {
        background: 'var(--grimoire-settings-active-material, var(--surface-panel))',
        borderColor: 'color-mix(in srgb, var(--primary) 36%, var(--grimoire-hairline))',
        color: 'var(--text-primary)',
      }
    : disabled
      ? {
          background: 'transparent',
          borderColor: 'transparent',
          color: 'var(--muted-foreground)',
          opacity: 0.45,
        }
      : undefined

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      role="radio"
      aria-checked={selected}
      aria-label={label}
      data-testid={`settings-theme-${value}`}
      disabled={disabled}
      style={buttonStyle}
      className={
        selected
          ? 'settings-theme-mode-button h-7 flex-1 border text-foreground shadow-xs'
          : disabled
            ? 'h-7 flex-1 text-muted-foreground opacity-45'
            : 'h-7 flex-1 text-muted-foreground hover:text-foreground'
      }
      onClick={() => onSelect(value)}
    >
      {children}
      {label}
    </Button>
  )
}
