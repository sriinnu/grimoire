import type { ReactNode } from 'react'
import { Check, Moon, Palette, Sun, TextAa } from '@phosphor-icons/react'
import type { EditorFont, ThemePreset } from '../lib/appearance'
import type { createTranslator } from '../lib/i18n'
import type { ThemeMode } from '../lib/themeMode'
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

interface PresetOption {
  value: ThemePreset
  label: string
  description: string
  swatches: [string, string, string]
}

const PRESET_SWATCHES: Record<ThemePreset, [string, string, string]> = {
  classic: ['#FFFFFF', '#F7F6F3', '#155DFF'],
  manuscript: ['#FBFAF7', '#EAF3EF', '#2C6F68'],
  graphite: ['#F7F8FA', '#E9EDF2', '#315D9D'],
}

const FONT_PREVIEW: Record<EditorFont, string> = {
  system: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  serif: "ui-serif, 'New York', 'Iowan Old Style', Georgia, serif",
  mono: "'SF Mono', 'IBM Plex Mono', Menlo, ui-monospace, monospace",
  readable: "'Atkinson Hyperlegible', 'Avenir Next', 'Inter', sans-serif",
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
  const presets = buildPresetOptions(t)

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
          className="grid gap-2"
          style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(132px, 1fr))' }}
          role="radiogroup"
          aria-label={t('settings.themePreset.label')}
        >
          {presets.map((preset) => (
            <ThemePresetCard
              key={preset.value}
              option={preset}
              selected={themePreset === preset.value}
              onSelect={setThemePreset}
            />
          ))}
        </div>
      </div>

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
          </SelectContent>
        </Select>
      </div>

      <AppearancePreview t={t} themePreset={themePreset} editorFont={editorFont} />
    </>
  )
}

function buildPresetOptions(t: Translate): PresetOption[] {
  return [
    {
      value: 'classic',
      label: t('settings.themePreset.classic'),
      description: t('settings.themePreset.classicDescription'),
      swatches: PRESET_SWATCHES.classic,
    },
    {
      value: 'manuscript',
      label: t('settings.themePreset.manuscript'),
      description: t('settings.themePreset.manuscriptDescription'),
      swatches: PRESET_SWATCHES.manuscript,
    },
    {
      value: 'graphite',
      label: t('settings.themePreset.graphite'),
      description: t('settings.themePreset.graphiteDescription'),
      swatches: PRESET_SWATCHES.graphite,
    },
  ]
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
          letterSpacing: '0.08em',
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
      className="inline-flex w-full rounded-md border border-border bg-muted p-1"
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
          ? 'h-7 flex-1 border border-border bg-background text-foreground shadow-xs hover:bg-background'
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
      className={
        selected
          ? 'h-auto justify-start rounded-md border border-primary bg-background p-3 text-left shadow-xs'
          : 'h-auto justify-start rounded-md border border-border bg-transparent p-3 text-left hover:bg-muted'
      }
      onClick={() => onSelect(option.value)}
    >
      <span className="flex w-full flex-col gap-2">
        <span className="flex items-center justify-between gap-2">
          <span className="flex items-center gap-1.5" style={{ fontSize: 12, fontWeight: 600 }}>
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
        <span style={{ color: 'var(--muted-foreground)', fontSize: 11, lineHeight: 1.35 }}>
          {option.description}
        </span>
      </span>
    </Button>
  )
}

function AppearancePreview({
  t,
  themePreset,
  editorFont,
}: {
  t: Translate
  themePreset: ThemePreset
  editorFont: EditorFont
}) {
  return (
    <div
      className="rounded-md border border-border"
      data-testid="settings-appearance-preview"
      data-theme-preset-preview={themePreset}
      style={{
        background: 'var(--surface-editor)',
        padding: 14,
      }}
    >
      <div style={{ fontFamily: FONT_PREVIEW[editorFont], color: 'var(--foreground)' }}>
        <div style={{ fontSize: 15, fontWeight: 650, lineHeight: 1.2 }}>
          {t('settings.appearance.previewTitle')}
        </div>
        <div style={{ color: 'var(--muted-foreground)', fontSize: 12, lineHeight: 1.55, marginTop: 6 }}>
          {t('settings.appearance.previewBody')}
        </div>
      </div>
    </div>
  )
}
