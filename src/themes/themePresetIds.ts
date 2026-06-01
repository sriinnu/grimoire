export const SUPPORTED_THEME_PRESETS = [
  'constellation',
  'daylight-atelier',
  'prabhat-studio',
  'living-archive',
  'nocturne',
  'retro-terminal',
] as const

export type ThemePreset = typeof SUPPORTED_THEME_PRESETS[number]
