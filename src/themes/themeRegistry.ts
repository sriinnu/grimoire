import presetCatalogJson from './presets.json'
import { SUPPORTED_THEME_PRESETS, type ThemePreset } from './themePresetIds'

type PresetSwatches = [string, string, string]

export interface ThemePresetCatalogEntry {
  id: ThemePreset
  label: string
  description: string
  swatches: PresetSwatches
}

interface RawThemePresetCatalogEntry {
  id?: unknown
  label?: unknown
  description?: unknown
  swatches?: unknown
}

function isThemePreset(value: unknown): value is ThemePreset {
  return typeof value === 'string' && SUPPORTED_THEME_PRESETS.includes(value as ThemePreset)
}

function normalizeSwatches(value: unknown, id: ThemePreset): PresetSwatches {
  if (
    !Array.isArray(value)
    || value.length !== 3
    || !value.every((swatch) => typeof swatch === 'string')
  ) {
    throw new Error(`Theme preset "${id}" must define exactly three swatches.`)
  }
  return value as PresetSwatches
}

function normalizeCatalogEntry(raw: RawThemePresetCatalogEntry): ThemePresetCatalogEntry {
  if (!isThemePreset(raw.id)) {
    throw new Error(`Unsupported theme preset id "${String(raw.id)}".`)
  }
  if (typeof raw.label !== 'string' || typeof raw.description !== 'string') {
    throw new Error(`Theme preset "${raw.id}" is missing label or description.`)
  }
  return {
    id: raw.id,
    label: raw.label,
    description: raw.description,
    swatches: normalizeSwatches(raw.swatches, raw.id),
  }
}

const rawCatalog = presetCatalogJson as readonly RawThemePresetCatalogEntry[]
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
) as Record<ThemePreset, PresetSwatches>
