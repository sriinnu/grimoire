import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('theme settings CSS', () => {
  const systemThemesCss = readFileSync(`${process.cwd()}/src/system-themes.css`, 'utf8')
  const settingsCss = readFileSync(`${process.cwd()}/src/theme-settings.css`, 'utf8')
  const settingsBody = readFileSync(`${process.cwd()}/src/components/settings/SettingsBody.tsx`, 'utf8')
  const settingsNavigation = readFileSync(`${process.cwd()}/src/components/settings/SettingsNavigation.tsx`, 'utf8')

  it('loads after shared surface coherence and before agent-specific layers', () => {
    const surfaceIndex = systemThemesCss.indexOf("@import './theme-surface-coherence.css';")
    const settingsIndex = systemThemesCss.indexOf("@import './theme-settings.css';")
    const agentIndex = systemThemesCss.indexOf("@import './theme-agent-council.css';")
    expect(surfaceIndex).toBeGreaterThanOrEqual(0)
    expect(settingsIndex).toBeGreaterThanOrEqual(0)
    expect(agentIndex).toBeGreaterThanOrEqual(0)
    expect(surfaceIndex).toBeLessThan(settingsIndex)
    expect(settingsIndex).toBeLessThan(agentIndex)
  })

  it('moves Settings chrome onto theme-owned material tokens', () => {
    for (const token of [
      '--grimoire-settings-rail-material',
      '--grimoire-settings-mobile-rail-material',
      '--grimoire-settings-control-material',
      '--grimoire-settings-active-material',
      '--grimoire-settings-hover-material',
    ]) {
      expect(settingsCss).toContain(token)
    }
    expect(settingsCss).toContain('.settings-navigation-rail')
    expect(settingsCss).toContain('.settings-main-surface')
    expect(settingsCss).toContain('.settings-section-divider')
    expect(settingsCss).toContain('.settings-mobile-navigation__rail')
    expect(settingsCss).toContain('.settings-navigation-item[aria-current="page"]')
    expect(settingsCss).toContain('.settings-section [data-slot="input"]')
  })

  it('keeps Settings markup free of ad-hoc background material utilities', () => {
    expect(settingsBody).not.toContain('bg-[')
    expect(settingsNavigation).not.toContain('bg-[')
    expect(settingsNavigation).not.toContain('hover:bg-')
    expect(settingsNavigation).toContain('settings-navigation-item')
  })

  it('uses performant motion and token colors only', () => {
    expect(settingsCss).toContain('prefers-reduced-motion: no-preference')
    expect(settingsCss).toContain('transform: translateX(1px)')
    expect(settingsCss).toContain('transform: translateY(-1px)')
    expect(settingsCss).not.toContain('background 160ms')
    expect(settingsCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|backdrop-filter/iu)
  })
})
