export const SUPPORTED_THEME_PRESETS = [
  'constellation',
  'daylight-notebook',
  'morning-notebook',
  'living-archive',
  'nocturne',
  'code-notebook',
] as const

export type ThemePreset = typeof SUPPORTED_THEME_PRESETS[number]
