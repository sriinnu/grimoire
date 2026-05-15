import type { ThemePreset } from '../lib/appearance'
import type { createTranslator } from '../lib/i18n'

type Translate = ReturnType<typeof createTranslator>

/** Localized appearance preset option rendered by the settings picker. */
export interface PresetOption {
  value: ThemePreset
  label: string
  description: string
  swatches: [string, string, string]
}

export const PRESET_SWATCHES: Record<ThemePreset, [string, string, string]> = {
  classic: ['#FFFFFF', '#F7F6F3', '#155DFF'],
  manuscript: ['#FBFAF7', '#244D5A', '#C69A48'],
  graphite: ['#F7F8FA', '#E9EDF2', '#315D9D'],
  studio: ['#FEFEFD', '#EEF2F6', '#2F66D0'],
  folio: ['#F9FAF6', '#EEF0E8', '#7C4D8D'],
  nocturne: ['#141513', '#20251F', '#8FD6B8'],
  aether: ['#F7FBF7', '#111816', '#4FF6C8'],
  ion: ['#F8FAFD', '#101820', '#2563EB'],
  moss: ['#F7FAF5', '#13231D', '#D48645'],
  lumen: ['#FAFAF7', '#E8EDF0', '#FF5E52'],
  lotus: ['#FFF8FA', '#EEF7F1', '#9B4D88'],
  ember: ['#191411', '#2A1F1A', '#F6BF4F'],
}

/** Builds localized appearance preset options for settings controls. */
export function buildPresetOptions(t: Translate): PresetOption[] {
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
    {
      value: 'studio',
      label: t('settings.themePreset.studio'),
      description: t('settings.themePreset.studioDescription'),
      swatches: PRESET_SWATCHES.studio,
    },
    {
      value: 'folio',
      label: t('settings.themePreset.folio'),
      description: t('settings.themePreset.folioDescription'),
      swatches: PRESET_SWATCHES.folio,
    },
    {
      value: 'nocturne',
      label: t('settings.themePreset.nocturne'),
      description: t('settings.themePreset.nocturneDescription'),
      swatches: PRESET_SWATCHES.nocturne,
    },
    {
      value: 'aether',
      label: t('settings.themePreset.aether'),
      description: t('settings.themePreset.aetherDescription'),
      swatches: PRESET_SWATCHES.aether,
    },
    {
      value: 'ion',
      label: t('settings.themePreset.ion'),
      description: t('settings.themePreset.ionDescription'),
      swatches: PRESET_SWATCHES.ion,
    },
    {
      value: 'moss',
      label: t('settings.themePreset.moss'),
      description: t('settings.themePreset.mossDescription'),
      swatches: PRESET_SWATCHES.moss,
    },
    {
      value: 'lumen',
      label: t('settings.themePreset.lumen'),
      description: t('settings.themePreset.lumenDescription'),
      swatches: PRESET_SWATCHES.lumen,
    },
    {
      value: 'lotus',
      label: t('settings.themePreset.lotus'),
      description: t('settings.themePreset.lotusDescription'),
      swatches: PRESET_SWATCHES.lotus,
    },
    {
      value: 'ember',
      label: t('settings.themePreset.ember'),
      description: t('settings.themePreset.emberDescription'),
      swatches: PRESET_SWATCHES.ember,
    },
  ]
}
