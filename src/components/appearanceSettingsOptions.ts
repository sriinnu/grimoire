import type { ThemePreset } from '../lib/appearance'
import type { createTranslator, TranslationKey } from '../lib/i18n'
import {
  PRESET_SWATCHES,
  type ThemePresetCatalogEntry,
  THEME_PRESET_CATALOG,
} from '../themes/themeRegistry'

type Translate = ReturnType<typeof createTranslator>

/** Localized appearance preset option rendered by the settings picker. */
export interface PresetOption {
  value: ThemePreset
  label: string
  description: string
  swatches: [string, string, string]
}

export { PRESET_SWATCHES }

const PRESET_TRANSLATION_KEYS: Partial<Record<ThemePreset, [TranslationKey, TranslationKey]>> = {
  constellation: [
    'settings.themePreset.constellation',
    'settings.themePreset.constellationDescription',
  ],
  'living-archive': [
    'settings.themePreset.livingArchive',
    'settings.themePreset.livingArchiveDescription',
  ],
  'research-cockpit': [
    'settings.themePreset.researchCockpit',
    'settings.themePreset.researchCockpitDescription',
  ],
  nocturne: [
    'settings.themePreset.nocturne',
    'settings.themePreset.nocturneDescription',
  ],
  manuscript: [
    'settings.themePreset.manuscript',
    'settings.themePreset.manuscriptDescription',
  ],
  'retro-terminal': [
    'settings.themePreset.retroTerminal',
    'settings.themePreset.retroTerminalDescription',
  ],
}

function localizePreset(t: Translate, preset: ThemePresetCatalogEntry) {
  const keys = PRESET_TRANSLATION_KEYS[preset.id]
  if (!keys) {
    return {
      label: preset.label,
      description: preset.description,
    }
  }
  return {
    label: t(keys[0]),
    description: t(keys[1]),
  }
}

/** Builds localized appearance preset options for settings controls. */
export function buildPresetOptions(t: Translate): PresetOption[] {
  return THEME_PRESET_CATALOG.map((preset) => {
    const copy = localizePreset(t, preset)
    return {
      value: preset.id,
      label: copy.label,
      description: copy.description,
      swatches: preset.swatches,
    }
  })
}
