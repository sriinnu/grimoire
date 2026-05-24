import presetCatalogJson from './presets.json'
import {
  parseThemeDefinition,
  type ThemeDefinition,
} from './themeDefinition'
import { SUPPORTED_THEME_PRESETS, type ThemePreset } from './themePresetIds'

export type { ThemeDefinition, ThemeDefinitionMode, ThemeDefinitionParseResult, ThemeTokenMap } from './themeDefinition'
export {
  applyThemeDefinitionToRoot,
  parseThemeDefinition,
  parseThemeDefinitionJson,
  REQUIRED_THEME_TOKEN_KEYS,
  resolveThemeDefinitionMode,
  serializeThemeDefinition,
} from './themeDefinition'

export type ThemePresetCatalogEntry = ThemeDefinition & { id: ThemePreset }

function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === 'string' && SUPPORTED_THEME_PRESETS.includes(value as ThemePreset)
}

function normalizeCatalogEntry(raw: unknown): ThemePresetCatalogEntry {
  const parsed = parseThemeDefinition(raw)
  if (!parsed.ok) {
    throw new Error(parsed.errors.join('\n'))
  }
  if (!isThemePreset(parsed.definition.id)) {
    throw new Error(`Unsupported theme preset id "${parsed.definition.id}".`)
  }
  return parsed.definition as ThemePresetCatalogEntry
}

const rawCatalog = presetCatalogJson as readonly unknown[]
const catalogById = new Map<ThemePreset, ThemePresetCatalogEntry>()

for (const rawPreset of rawCatalog) {
  const preset = normalizeCatalogEntry(rawPreset)
  if (catalogById.has(preset.id)) {
    throw new Error(`Duplicate theme preset metadata for "${preset.id}".`)
  }
  catalogById.set(preset.id, preset)
}

export const THEME_PRESET_CATALOG = SUPPORTED_THEME_PRESETS.map((id) => {
  const preset = catalogById.get(id)
  if (!preset) {
    throw new Error(`Missing JSON metadata for theme preset "${id}".`)
  }
  return preset
})

export const PRESET_SWATCHES = Object.fromEntries(
  THEME_PRESET_CATALOG.map((preset) => [preset.id, preset.swatches]),
) as Record<ThemePreset, [string, string, string]>

export const THEME_PRESET_DEFINITIONS = Object.fromEntries(
  THEME_PRESET_CATALOG.map((preset) => [preset.id, preset]),
) as Record<ThemePreset, ThemePresetCatalogEntry>

/** Returns the validated built-in definition for an appearance preset. */
export function resolveThemePresetDefinition(preset: ThemePreset): ThemePresetCatalogEntry {
  return THEME_PRESET_DEFINITIONS[preset]
}
