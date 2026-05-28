import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('theme settings CSS', () => {
  const systemThemesCss = readFileSync(`${process.cwd()}/src/system-themes.css`, 'utf8')
  const settingsCss = readFileSync(`${process.cwd()}/src/theme-settings.css`, 'utf8')
  const coherenceCss = readFileSync(`${process.cwd()}/src/theme-coherence.css`, 'utf8')
  const settingsBody = readFileSync(`${process.cwd()}/src/components/settings/SettingsBody.tsx`, 'utf8')
  const settingsNavigation = readFileSync(`${process.cwd()}/src/components/settings/SettingsNavigation.tsx`, 'utf8')
  const settingsControls = readFileSync(`${process.cwd()}/src/components/settings/SettingsControls.tsx`, 'utf8')
  const settingsChrome = readFileSync(`${process.cwd()}/src/components/settings/SettingsPanelChrome.tsx`, 'utf8')
  const aiAgentSettings = readFileSync(`${process.cwd()}/src/components/settings/AiAgentSettingsSection.tsx`, 'utf8')
  const appearanceSettings = readFileSync(`${process.cwd()}/src/components/AppearanceSettingsSection.tsx`, 'utf8')
  const themePackSettings = readFileSync(`${process.cwd()}/src/components/ThemePackSettingsControls.tsx`, 'utf8')
  const localityFirewallSettings = readFileSync(`${process.cwd()}/src/components/LocalityFirewallSettingsCard.tsx`, 'utf8')
  const nativeSettings = readFileSync(`${process.cwd()}/src/components/NativeSettingsSection.tsx`, 'utf8')
  const portabilityActionDeck = readFileSync(`${process.cwd()}/src/components/PortabilityActionDeck.tsx`, 'utf8')
  const portabilityGroups = readFileSync(`${process.cwd()}/src/components/PortabilityGroups.tsx`, 'utf8')
  const portabilityProofLedger = readFileSync(`${process.cwd()}/src/components/PortabilityProofLedger.tsx`, 'utf8')
  const objectStoragePreviewCard = readFileSync(`${process.cwd()}/src/components/ObjectStoragePreviewCard.tsx`, 'utf8')
  const objectStoragePreflightPanels = readFileSync(`${process.cwd()}/src/components/ObjectStorageLivePreflightPanels.tsx`, 'utf8')
  const objectStorageProviderPanel = readFileSync(`${process.cwd()}/src/components/ObjectStorageProviderPanel.tsx`, 'utf8')
  const objectStoragePrototypeActions = readFileSync(`${process.cwd()}/src/components/ObjectStoragePrototypeActions.tsx`, 'utf8')
  const portabilityActionProgress = readFileSync(`${process.cwd()}/src/components/PortabilityActionProgress.tsx`, 'utf8')

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
    expect(settingsCss).toContain('.settings-theme-mode-button')
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
    for (const source of [
      aiAgentSettings,
      appearanceSettings,
      themePackSettings,
      localityFirewallSettings,
      nativeSettings,
      portabilityActionDeck,
      portabilityGroups,
      portabilityProofLedger,
      objectStoragePreviewCard,
      objectStoragePreflightPanels,
      objectStorageProviderPanel,
      objectStoragePrototypeActions,
      portabilityActionProgress,
    ]) {
      expect(source).not.toMatch(/bg-(muted|background)|hover:bg-|bg-\[/)
    }
    expect(nativeSettings).not.toContain('style={{')
    expect(nativeSettings).toContain('SectionHeading')
    expect(nativeSettings).toContain('settings-material-inner')
  })

  it('keeps portability proof surfaces on semantic theme hooks', () => {
    for (const hook of [
      '.grimoire-portability-card',
      '.grimoire-portability-action-deck',
      '.grimoire-portability-lanes',
      '.grimoire-portability-inline-panel',
      '.grimoire-object-storage-preview',
      '.grimoire-preview-stat',
      '.grimoire-storage-health-dot[data-state="active"]',
      '.grimoire-portability-progress-track',
      '.grimoire-portability-progress-bar',
    ]) {
      expect(coherenceCss).toContain(hook)
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
