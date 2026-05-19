import { describe, expect, it } from 'vitest'
import { THEME_PRESET_CATALOG } from './themeRegistry'
import { SUPPORTED_THEME_PRESETS } from './themePresetIds'

describe('theme registry', () => {
  it('loads plug-in preset metadata in the supported preset order', () => {
    expect(THEME_PRESET_CATALOG.map((preset) => preset.id)).toEqual([
      ...SUPPORTED_THEME_PRESETS,
    ])
  })

  it('ships only Grimoire-native themes in the settings catalog', () => {
    const presetIds = THEME_PRESET_CATALOG.map((preset) => preset.id)

    expect(presetIds).toContain('retro-terminal')
    expect(presetIds).not.toContain('classic')
    expect(presetIds).not.toContain('aether')
    expect(presetIds).not.toContain('ion')
    expect(presetIds).not.toContain('moss')
  })

  it('keeps every JSON preset self-contained for hot reload previews', () => {
    for (const preset of THEME_PRESET_CATALOG) {
      expect(preset.label.trim()).not.toBe('')
      expect(preset.description.trim()).not.toBe('')
      expect(preset.swatches).toHaveLength(3)
    }
  })
})
