import { describe, expect, it } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { THEME_PRESET_CATALOG } from '../themes/themeRegistry'
import { buildPresetGroups, buildPresetOptions } from './appearanceSettingsOptions'

describe('buildPresetOptions', () => {
  it('uses localization for preset copy before JSON metadata', () => {
    const options = buildPresetOptions(createTranslator('zh-Hans'))
    const daylight = options.find((option) => option.value === 'daylight-atelier')
    const jsonDaylight = THEME_PRESET_CATALOG.find((preset) => preset.id === 'daylight-atelier')

    expect(daylight?.label).toBe('Daylight Atelier')
    expect(daylight?.description).toBe('明亮工作室面板、清爽墨色书写、珊瑚与薄荷信号。')
    expect(daylight?.description).not.toBe(jsonDaylight?.description)
  })

  it('keeps JSON swatches available for hot-reloaded preset metadata', () => {
    const options = buildPresetOptions(createTranslator('en'))
    const retro = options.find((option) => option.value === 'retro-terminal')
    const jsonRetro = THEME_PRESET_CATALOG.find((preset) => preset.id === 'retro-terminal')

    expect(retro?.swatches).toEqual(jsonRetro?.swatches)
  })

  it('promotes signature themes before studio and lab presets', () => {
    const groups = buildPresetGroups(createTranslator('en'))

    expect(groups.map((group) => group.id)).toEqual(['signature', 'studio', 'lab'])
    expect(groups[0].options.map((option) => option.value)).toEqual([
      'living-archive',
      'nocturne',
      'constellation',
    ])
    expect(groups[2].options.map((option) => option.value)).toEqual([
      'retro-terminal',
    ])
  })
})
