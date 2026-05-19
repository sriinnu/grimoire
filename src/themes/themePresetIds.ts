export const SUPPORTED_THEME_PRESETS = [
  'constellation',
  'living-archive',
  'research-cockpit',
  'nocturne',
  'manuscript',
  'retro-terminal',
] as const

export type ThemePreset = typeof SUPPORTED_THEME_PRESETS[number]
