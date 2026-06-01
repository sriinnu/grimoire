import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('theme settings CSS', () => {
  const systemThemesCss = readFileSync(`${process.cwd()}/src/system-themes.css`, 'utf8')
  const settingsCss = readFileSync(`${process.cwd()}/src/theme-settings.css`, 'utf8')
  const settingsWorkflowCss = readFileSync(`${process.cwd()}/src/theme-settings-workflow.css`, 'utf8')
  const settingsSyncCss = readFileSync(`${process.cwd()}/src/theme-settings-sync.css`, 'utf8')
  const settingsPrivacyCss = readFileSync(`${process.cwd()}/src/theme-settings-privacy.css`, 'utf8')
  const coherenceCss = readFileSync(`${process.cwd()}/src/theme-coherence.css`, 'utf8')
  const settingsBody = readFileSync(`${process.cwd()}/src/components/settings/SettingsBody.tsx`, 'utf8')
  const settingsNavigation = readFileSync(`${process.cwd()}/src/components/settings/SettingsNavigation.tsx`, 'utf8')
  const settingsControls = readFileSync(`${process.cwd()}/src/components/settings/SettingsControls.tsx`, 'utf8')
  const workflowSettings = readFileSync(`${process.cwd()}/src/components/settings/WorkflowSettingsSection.tsx`, 'utf8')
  const syncAndGitSettings = readFileSync(`${process.cwd()}/src/components/settings/SyncAndGitSettingsSection.tsx`, 'utf8')
  const settingsChrome = readFileSync(`${process.cwd()}/src/components/settings/SettingsPanelChrome.tsx`, 'utf8')
  const aiAgentSettings = readFileSync(`${process.cwd()}/src/components/settings/AiAgentSettingsSection.tsx`, 'utf8')
  const appearanceSettings = readFileSync(`${process.cwd()}/src/components/AppearanceSettingsSection.tsx`, 'utf8')
  const themePackSettings = readFileSync(`${process.cwd()}/src/components/ThemePackSettingsControls.tsx`, 'utf8')
  const localityFirewallSettings = readFileSync(`${process.cwd()}/src/components/LocalityFirewallSettingsCard.tsx`, 'utf8')
  const nativeSettings = readFileSync(`${process.cwd()}/src/components/NativeSettingsSection.tsx`, 'utf8')
  const desktopStorageHealthPanel = readFileSync(`${process.cwd()}/src/components/DesktopStorageHealthPanel.tsx`, 'utf8')
  const importAutopsyTimeline = readFileSync(`${process.cwd()}/src/components/ImportAutopsyTimeline.tsx`, 'utf8')
  const portabilityActionDeck = readFileSync(`${process.cwd()}/src/components/PortabilityActionDeck.tsx`, 'utf8')
  const portabilityExportActions = readFileSync(`${process.cwd()}/src/components/PortabilityExportActions.tsx`, 'utf8')
  const portabilityGroups = readFileSync(`${process.cwd()}/src/components/PortabilityGroups.tsx`, 'utf8')
  const portabilityLocalContract = readFileSync(`${process.cwd()}/src/components/PortabilityLocalContract.tsx`, 'utf8')
  const portabilityProofLedger = readFileSync(`${process.cwd()}/src/components/PortabilityProofLedger.tsx`, 'utf8')
  const objectStoragePreviewCard = readFileSync(`${process.cwd()}/src/components/ObjectStoragePreviewCard.tsx`, 'utf8')
  const objectStoragePreflightPanels = readFileSync(`${process.cwd()}/src/components/ObjectStorageLivePreflightPanels.tsx`, 'utf8')
  const objectStorageProviderPanel = readFileSync(`${process.cwd()}/src/components/ObjectStorageProviderPanel.tsx`, 'utf8')
  const objectStoragePrototypeActions = readFileSync(`${process.cwd()}/src/components/ObjectStoragePrototypeActions.tsx`, 'utf8')
  const portabilityActionProgress = readFileSync(`${process.cwd()}/src/components/PortabilityActionProgress.tsx`, 'utf8')

  it('loads after shared surface coherence and before agent-specific layers', () => {
    const surfaceIndex = systemThemesCss.indexOf("@import './theme-surface-coherence.css';")
    const settingsIndex = systemThemesCss.indexOf("@import './theme-settings.css';")
    const settingsWorkflowIndex = systemThemesCss.indexOf("@import './theme-settings-workflow.css';")
    const settingsSyncIndex = systemThemesCss.indexOf("@import './theme-settings-sync.css';")
    const settingsPrivacyIndex = systemThemesCss.indexOf("@import './theme-settings-privacy.css';")
    const agentIndex = systemThemesCss.indexOf("@import './theme-agent-council.css';")
    expect(surfaceIndex).toBeGreaterThanOrEqual(0)
    expect(settingsIndex).toBeGreaterThanOrEqual(0)
    expect(settingsWorkflowIndex).toBeGreaterThanOrEqual(0)
    expect(settingsSyncIndex).toBeGreaterThanOrEqual(0)
    expect(settingsPrivacyIndex).toBeGreaterThanOrEqual(0)
    expect(agentIndex).toBeGreaterThanOrEqual(0)
    expect(surfaceIndex).toBeLessThan(settingsIndex)
    expect(settingsIndex).toBeLessThan(settingsWorkflowIndex)
    expect(settingsWorkflowIndex).toBeLessThan(settingsSyncIndex)
    expect(settingsSyncIndex).toBeLessThan(settingsPrivacyIndex)
    expect(settingsPrivacyIndex).toBeLessThan(agentIndex)
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
    expect(settingsWorkflowCss).toContain('.settings-workflow-runway')
    expect(settingsWorkflowCss).toContain('.settings-workflow-runway__step')
    expect(settingsWorkflowCss).toContain('.settings-workflow-runway__status')
    expect(settingsSyncCss).toContain('.settings-sync-runway')
    expect(settingsSyncCss).toContain('.settings-sync-runway__step')
    expect(settingsPrivacyCss).toContain('.settings-privacy-runway')
    expect(settingsPrivacyCss).toContain('.settings-privacy-runway__step')
    expect(settingsCss).toContain('.settings-theme-mode-button')
    expect(settingsCss).toContain('.settings-navigation-rail')
    expect(settingsCss).toContain('.settings-main-surface')
    expect(settingsCss).toContain('padding: 22px clamp(18px, 3vw, 32px) 26px')
    expect(settingsCss).toContain('.settings-content-stack')
    expect(settingsCss).toContain('width: min(100%, 880px)')
    expect(settingsCss).toContain('.settings-section:first-child')
    expect(settingsCss).toContain('.settings-field-control')
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
      workflowSettings,
      syncAndGitSettings,
      appearanceSettings,
      themePackSettings,
      localityFirewallSettings,
      nativeSettings,
      desktopStorageHealthPanel,
      importAutopsyTimeline,
      portabilityActionDeck,
      portabilityExportActions,
      portabilityGroups,
      portabilityLocalContract,
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
      '.grimoire-portability-contract__item',
      '.grimoire-portability-action-deck',
      '.grimoire-portability-lanes',
      '.grimoire-portability-inline-panel',
      '.grimoire-object-storage-preview',
      '.grimoire-import-autopsy__bucket',
      '.grimoire-import-autopsy__manifest',
      '.grimoire-import-autopsy__manifest-row',
      '.grimoire-preview-stat',
      '.grimoire-storage-health-dot[data-state="active"]',
      '.settings-desktop-storage-row',
      '.settings-proof-chip',
      '.grimoire-portability-progress-track',
      '.grimoire-portability-progress-bar',
    ]) {
      expect(coherenceCss).toContain(hook)
    }
  })

  it('keeps the portability action deck as a bounded wallet-style stack', () => {
    expect(coherenceCss).toContain('.grimoire-portability-action-deck::before')
    expect(coherenceCss).toContain('.grimoire-portability-action-deck::after')
    expect(coherenceCss).toContain('contain: paint')
    expect(coherenceCss).toContain('isolation: isolate')
    expect(coherenceCss).toContain('.grimoire-portability-action-deck:focus-within::before')
    expect(coherenceCss).not.toMatch(/grimoire-portability-action-deck[\\s\\S]*animation:[^;{}]*infinite/u)
  })

  it('uses performant motion and token colors only', () => {
    expect(settingsCss).toContain('prefers-reduced-motion: no-preference')
    expect(settingsCss).toContain('transform: translateX(1px)')
    expect(settingsCss).toContain('transform: translateY(-1px)')
    expect(settingsCss).not.toContain('background 160ms')
    expect(settingsCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|backdrop-filter/iu)
    expect(settingsWorkflowCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|backdrop-filter/iu)
    expect(settingsSyncCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|backdrop-filter/iu)
    expect(settingsPrivacyCss).not.toMatch(/#[0-9a-f]{3,8}|rgba\(|backdrop-filter/iu)
  })
})
