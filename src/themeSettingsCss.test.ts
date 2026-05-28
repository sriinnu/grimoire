import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('theme settings CSS', () => {
  const systemThemesCss = readFileSync(`${process.cwd()}/src/system-themes.css`, 'utf8')
  const settingsCss = readFileSync(`${process.cwd()}/src/theme-settings.css`, 'utf8')
  const settingsBody = readFileSync(`${process.cwd()}/src/components/settings/SettingsBody.tsx`, 'utf8')
  const settingsNavigation = readFileSync(`${process.cwd()}/src/components/settings/SettingsNavigation.tsx`, 'utf8')
  const settingsControls = readFileSync(`${process.cwd()}/src/components/settings/SettingsControls.tsx`, 'utf8')
  const settingsChrome = readFileSync(`${process.cwd()}/src/components/settings/SettingsPanelChrome.tsx`, 'utf8')
  const aiAgentSettings = readFileSync(`${process.cwd()}/src/components/settings/AiAgentSettingsSection.tsx`, 'utf8')
  const themePackSettings = readFileSync(`${process.cwd()}/src/components/ThemePackSettingsControls.tsx`, 'utf8')
  const localityFirewallSettings = readFileSync(`${process.cwd()}/src/components/LocalityFirewallSettingsCard.tsx`, 'utf8')

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
      '--grimoire-settings-control-row-material',
      '--grimoire-settings-header-material',
      '--grimoire-settings-footer-material',
      '--grimoire-settings-local-card-material',
      '--grimoire-settings-active-material',
      '--grimoire-settings-hover-material',
    ]) {
      expect(settingsCss).toContain(token)
    }
    expect(settingsCss).toContain('.settings-panel-header')
    expect(settingsCss).toContain('.settings-panel-footer')
    expect(settingsCss).toContain('.settings-control-row')
    expect(settingsCss).toContain('.settings-local-card')
    expect(settingsCss).toContain('.settings-material-card')
    expect(settingsCss).toContain('.settings-material-inner')
    expect(settingsCss).toContain('.settings-material-chip')
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
    expect(settingsControls).not.toContain('style={{')
    expect(settingsChrome).toContain('settings-panel-header')
    expect(settingsChrome).toContain('settings-panel-footer')
    expect(settingsNavigation).toContain('settings-navigation-item')
    for (const source of [aiAgentSettings, themePackSettings, localityFirewallSettings]) {
      expect(source).not.toMatch(/bg-(muted|background)|hover:bg-|bg-\[/)
    }
  })

  it('uses performant motion and token colors only', () => {
    expect(settingsCss).toContain('prefers-reduced-motion: no-preference')
    expect(settingsCss).toContain('transform: translateX(1px)')
    expect(settingsCss).toContain('transform: translateY(-1px)')
    expect(settingsCss).not.toContain('background 160ms')
    expect(settingsCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|backdrop-filter/iu)
  })
})
