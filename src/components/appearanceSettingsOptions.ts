import type { ThemePreset } from '../lib/appearance'
import type { createTranslator, TranslationKey } from '../lib/i18n'
import type { ThemeEditorDefinition } from '../themes/themeDefinition'
import {
  PRESET_SWATCHES,
  type ThemeCanvasStyle,
  type ThemeCodeBlockStyle,
  type ThemeDensityScale,
  type ThemeGraphStyle,
  type ThemeMotionProfile,
  type ThemePresetCatalogEntry,
  THEME_PRESET_CATALOG,
} from '../themes/themeRegistry'

type Translate = ReturnType<typeof createTranslator>
export type ThemePresetGroupId = 'signature' | 'paper' | 'specialist'
export type ProfileShellStyle = 'archive' | 'map' | 'notebook' | 'terminal'
export type ProfileWritingStyle = ThemeEditorDefinition['headingStyle']

/** Localized appearance preset option rendered by the settings picker. */
export interface PresetOption {
  value: ThemePreset
  label: string
  description: string
  swatches: [string, string, string]
  group: ThemePresetGroupId
  densityScale: ThemeDensityScale
  motionProfile: ThemeMotionProfile
  graphStyle: ThemeGraphStyle
  canvasStyle: ThemeCanvasStyle
  codeBlockStyle: ThemeCodeBlockStyle
  shellStyle: ProfileShellStyle
  writingStyle: ProfileWritingStyle
}

export interface PresetOptionGroup {
  id: ThemePresetGroupId
  label: string
  options: PresetOption[]
}

export { PRESET_SWATCHES }

const PRESET_TRANSLATION_KEYS: Partial<Record<ThemePreset, [TranslationKey, TranslationKey]>> = {
  'morning-notebook': [
    'settings.themePreset.morningNotebook',
    'settings.themePreset.morningNotebookDescription',
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
    presetIds: ['morning-notebook'],
  },
]

function groupForPreset(preset: ThemePreset): ThemePresetGroupId {
  const group = PRESET_GROUPS.find((candidate) => candidate.presetIds.includes(preset))
  return group?.id ?? 'specialist'
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

export function resolveProfileShellStyle(preset: ThemePresetCatalogEntry): ProfileShellStyle {
  if (
    preset.editor.headingStyle === 'terminal'
    || preset.metadataStrip.style === 'terminal'
    || preset.visuals.canvasStyle === 'terminal'
  ) {
    return 'terminal'
  }
  if (preset.visuals.graphStyle === 'constellation') return 'map'
  if (preset.family === 'archive') return 'archive'
  return 'notebook'
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
      densityScale: preset.density.scale,
      motionProfile: preset.motion.profile,
      graphStyle: preset.visuals.graphStyle,
      canvasStyle: preset.visuals.canvasStyle,
      codeBlockStyle: preset.editor.codeBlockStyle,
      shellStyle: resolveProfileShellStyle(preset),
      writingStyle: preset.editor.headingStyle,
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
