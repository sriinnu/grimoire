// Grimoire ships one curated identity — Warm Paper, with light (parchment) and
// dark (candlelit) modes. The preset axis collapsed to a single soul on purpose:
// one theme done deep beats six done shallow. The light/dark choice lives on the
// `data-theme` axis, not here.
export const SUPPORTED_THEME_PRESETS = [
  'morning-notebook',
] as const

export type ThemePreset = typeof SUPPORTED_THEME_PRESETS[number]
