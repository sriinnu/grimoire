import { describe, expect, it } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { THEME_PRESET_CATALOG } from '../themes/themeRegistry'
import { buildPresetGroups, buildPresetOptions } from './appearanceSettingsOptions'

describe('buildPresetOptions', () => {
  it('uses localization for preset copy before JSON metadata', () => {
    const options = buildPresetOptions(createTranslator('zh-Hans'))
    const morning = options.find((option) => option.value === 'morning-notebook')
    const jsonMorning = THEME_PRESET_CATALOG.find((preset) => preset.id === 'morning-notebook')

    expect(morning?.label).toBe('Morning Notebook')
    expect(morning?.description).toBe(
      '明亮的个人笔记本：白色纸面、石墨墨色、珊瑚标记与克制的墨蓝操作色。',
    )
    expect(morning?.description).not.toBe(jsonMorning?.description)
  })

  it('keeps JSON swatches available for hot-reloaded preset metadata', () => {
    const options = buildPresetOptions(createTranslator('en'))
    const morning = options.find((option) => option.value === 'morning-notebook')
    const jsonMorning = THEME_PRESET_CATALOG.find((preset) => preset.id === 'morning-notebook')

    expect(morning?.swatches).toEqual(jsonMorning?.swatches)
    // Midnight Aurora identity: deep navy surface, navy card, and teal accent.
    expect(morning?.swatches).toEqual(['#FBFAF7', '#0D1C23', '#26D6C9'])
  })

  it('exposes a single signature group containing only Midnight Aurora', () => {
    const groups = buildPresetGroups(createTranslator('en'))

    expect(groups.map((group) => group.id)).toEqual(['signature'])
    expect(groups[0].options.map((option) => option.value)).toEqual(['morning-notebook'])
  })

  it('models the Midnight Aurora profile as a notebook shell with system writing', () => {
    const options = buildPresetOptions(createTranslator('en'))

    expect(options).toHaveLength(1)
    expect(options.find((option) => option.value === 'morning-notebook')).toMatchObject({
      shellStyle: 'notebook',
      writingStyle: 'system',
      graphStyle: 'ledger',
      canvasStyle: 'paper',
      codeBlockStyle: 'notebook',
      densityScale: 'comfortable',
      motionProfile: 'standard',
    })
  })
})
