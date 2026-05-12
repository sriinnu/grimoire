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
  retro: ['#FFF4D6', '#26351F', '#E45F2B'],
  aurora: ['#F7FBFF', '#EAF3F7', '#D9467D'],
  future: ['#F4F7FB', '#E7EDF6', '#00A884'],
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
      value: 'retro',
      label: t('settings.themePreset.retro'),
      description: t('settings.themePreset.retroDescription'),
      swatches: PRESET_SWATCHES.retro,
    },
    {
      value: 'aurora',
      label: t('settings.themePreset.aurora'),
      description: t('settings.themePreset.auroraDescription'),
      swatches: PRESET_SWATCHES.aurora,
    },
    {
      value: 'future',
      label: t('settings.themePreset.future'),
      description: t('settings.themePreset.futureDescription'),
      swatches: PRESET_SWATCHES.future,
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
