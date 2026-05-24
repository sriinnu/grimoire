import type { ThemePreset } from '../lib/appearance'
import type { createTranslator, TranslationKey } from '../lib/i18n'
import {
  PRESET_SWATCHES,
  type ThemePresetCatalogEntry,
  THEME_PRESET_CATALOG,
} from '../themes/themeRegistry'

type Translate = ReturnType<typeof createTranslator>
export type ThemePresetGroupId = 'signature' | 'studio' | 'lab'

/** Localized appearance preset option rendered by the settings picker. */
export interface PresetOption {
  value: ThemePreset
  label: string
  description: string
  swatches: [string, string, string]
  group: ThemePresetGroupId
}

export interface PresetOptionGroup {
  id: ThemePresetGroupId
  label: string
  options: PresetOption[]
}

export { PRESET_SWATCHES }

const PRESET_TRANSLATION_KEYS: Partial<Record<ThemePreset, [TranslationKey, TranslationKey]>> = {
  constellation: [
    'settings.themePreset.constellation',
    'settings.themePreset.constellationDescription',
  ],
  'daylight-atelier': [
    'settings.themePreset.daylightAtelier',
    'settings.themePreset.daylightAtelierDescription',
  ],
  'living-archive': [
    'settings.themePreset.livingArchive',
    'settings.themePreset.livingArchiveDescription',
  ],
  nocturne: [
    'settings.themePreset.nocturne',
    'settings.themePreset.nocturneDescription',
  ],
  'retro-terminal': [
    'settings.themePreset.retroTerminal',
    'settings.themePreset.retroTerminalDescription',
  ],
}

const PRESET_GROUPS: readonly {
  id: ThemePresetGroupId
  labelKey: TranslationKey
  presetIds: readonly ThemePreset[]
}[] = [
  {
    id: 'signature',
    labelKey: 'settings.themePreset.group.signature',
    presetIds: ['living-archive', 'nocturne', 'constellation'],
  },
  {
    id: 'studio',
    labelKey: 'settings.themePreset.group.studio',
    presetIds: ['daylight-atelier'],
  },
  {
    id: 'lab',
    labelKey: 'settings.themePreset.group.lab',
    presetIds: ['retro-terminal'],
  },
]

function groupForPreset(preset: ThemePreset): ThemePresetGroupId {
  const group = PRESET_GROUPS.find((candidate) => candidate.presetIds.includes(preset))
  return group?.id ?? 'lab'
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
      group: groupForPreset(preset.id),
    }
  })
}

/** Builds curated preset groups so signature themes do not compete with lab presets. */
export function buildPresetGroups(t: Translate): PresetOptionGroup[] {
  const optionsByPreset = new Map(buildPresetOptions(t).map((option) => [option.value, option]))
  return PRESET_GROUPS.map((group) => ({
    id: group.id,
    label: t(group.labelKey),
    options: group.presetIds
      .map((preset) => optionsByPreset.get(preset))
      .filter((option): option is PresetOption => Boolean(option)),
  })).filter((group) => group.options.length > 0)
}
