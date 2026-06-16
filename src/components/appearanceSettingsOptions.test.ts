import { describe, expect, it } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { THEME_PRESET_CATALOG } from '../themes/themeRegistry'
import { buildPresetGroups, buildPresetOptions } from './appearanceSettingsOptions'

describe('buildPresetOptions', () => {
  it('uses localization for preset copy before JSON metadata', () => {
    const options = buildPresetOptions(createTranslator('zh-Hans'))
    const daylight = options.find((option) => option.value === 'daylight-notebook')
    const jsonDaylight = THEME_PRESET_CATALOG.find((preset) => preset.id === 'daylight-notebook')

    expect(daylight?.label).toBe('Daylight Notebook')
    expect(daylight?.description).toBe('明亮笔记面板、清爽墨色、珊瑚标记与墨蓝动作。')
    expect(daylight?.description).not.toBe(jsonDaylight?.description)
  })

  it('keeps JSON swatches available for hot-reloaded preset metadata', () => {
    const options = buildPresetOptions(createTranslator('en'))
    const retro = options.find((option) => option.value === 'code-notebook')
    const jsonRetro = THEME_PRESET_CATALOG.find((preset) => preset.id === 'code-notebook')

    expect(retro?.swatches).toEqual(jsonRetro?.swatches)
  })

  it('promotes signature themes before paper and map/code presets', () => {
    const groups = buildPresetGroups(createTranslator('en'))

    expect(groups.map((group) => group.id)).toEqual(['signature', 'paper', 'specialist'])
    expect(groups[0].options.map((option) => option.value)).toEqual([
      'morning-notebook',
      'nocturne',
    ])
    expect(groups[1].options.map((option) => option.value)).toEqual([
      'daylight-notebook',
      'living-archive',
    ])
    expect(groups[2].options.map((option) => option.value)).toEqual([
      'constellation',
      'code-notebook',
    ])
  })

  it('models experience profiles as shell and writing contracts', () => {
    const options = buildPresetOptions(createTranslator('en'))

    expect(options.find((option) => option.value === 'morning-notebook')).toMatchObject({
      shellStyle: 'notebook',
      writingStyle: 'system',
    })
    expect(options.find((option) => option.value === 'living-archive')).toMatchObject({
      shellStyle: 'archive',
      writingStyle: 'manuscript',
    })
    expect(options.find((option) => option.value === 'constellation')).toMatchObject({
      shellStyle: 'map',
      writingStyle: 'graph',
    })
    expect(options.find((option) => option.value === 'code-notebook')).toMatchObject({
      shellStyle: 'terminal',
      writingStyle: 'terminal',
    })
  })
})
