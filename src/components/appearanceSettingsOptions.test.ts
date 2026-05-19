import { describe, expect, it } from 'vitest'
import { createTranslator } from '../lib/i18n'
import { THEME_PRESET_CATALOG } from '../themes/themeRegistry'
import { buildPresetOptions } from './appearanceSettingsOptions'

describe('buildPresetOptions', () => {
  it('uses localization for preset copy before JSON metadata', () => {
    const options = buildPresetOptions(createTranslator('zh-Hans'))
    const research = options.find((option) => option.value === 'research-cockpit')
    const jsonResearch = THEME_PRESET_CATALOG.find((preset) => preset.id === 'research-cockpit')

    expect(research?.label).toBe('Research Cockpit')
    expect(research?.description).toBe('高密度信号、代理侧栏、以执行为中心的工作台。')
    expect(research?.description).not.toBe(jsonResearch?.description)
  })

  it('keeps JSON swatches available for hot-reloaded preset metadata', () => {
    const options = buildPresetOptions(createTranslator('en'))
    const retro = options.find((option) => option.value === 'retro-terminal')
    const jsonRetro = THEME_PRESET_CATALOG.find((preset) => preset.id === 'retro-terminal')

    expect(retro?.swatches).toEqual(jsonRetro?.swatches)
  })
})
