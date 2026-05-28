import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SettingsMobileNavigation, SettingsNavigation } from './SettingsNavigation'
import { resolveActiveSettingsSection } from './SettingsNavigationModel'
import type { SettingsBodyProps } from './settingsTypes'

const labels: Record<string, string> = {
  'settings.title': 'Settings',
  'settings.vault.title': 'Current vault',
  'settings.vault.noVault': 'No vault selected',
  'settings.vault.state.localFiles': 'Local files',
  'settings.vault.state.localGit': 'Local files + Git',
  'settings.sync.title': 'Sync & Updates',
  'settings.portability.title': 'Portability',
  'settings.appearance.title': 'Appearance',
  'settings.workflow.title': 'Workflow',
  'settings.aiAgents.title': 'AI Agents',
  'settings.language.title': 'Language',
  'settings.native.title': 'Native',
  'settings.privacy.title': 'Privacy',
}

const t: SettingsBodyProps['t'] = (key) => labels[key] ?? key

describe('SettingsNavigation', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
    vi.restoreAllMocks()
  })

  it('keeps the active compact navigation item visible as sections change', () => {
    const scrollIntoView = vi.fn()
    vi.spyOn(HTMLElement.prototype, 'scrollIntoView').mockImplementation(scrollIntoView)

    const { rerender } = render(
      <SettingsMobileNavigation
        t={t}
        activeSectionId="settings-portability"
        onSectionChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('settings-mobile-nav-settings-portability')).toHaveAttribute('aria-current', 'page')
    scrollIntoView.mockClear()

    rerender(
      <SettingsMobileNavigation
        t={t}
        activeSectionId="settings-privacy"
        onSectionChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('settings-mobile-nav-settings-privacy')).toHaveAttribute('aria-current', 'page')
    expect(scrollIntoView).toHaveBeenCalledWith({ block: 'nearest', inline: 'center' })
  })

  it('resolves the section nearest the top of the main Settings surface', () => {
    const container = document.createElement('div')
    document.body.appendChild(container)
    Object.defineProperty(container, 'getBoundingClientRect', {
      configurable: true,
      value: () => ({ top: 100, bottom: 600, left: 0, right: 600, width: 600, height: 500, x: 0, y: 100, toJSON: () => ({}) }),
    })

    for (const [id, top] of [
      ['settings-portability', -200],
      ['settings-sync', 80],
      ['settings-appearance', 118],
      ['settings-workflow', 190],
    ] as const) {
      const section = document.createElement('section')
      section.id = id
      document.body.appendChild(section)
      Object.defineProperty(section, 'getBoundingClientRect', {
        configurable: true,
        value: () => ({ top, bottom: top + 80, left: 0, right: 600, width: 600, height: 80, x: 0, y: top, toJSON: () => ({}) }),
      })
    }

    expect(resolveActiveSettingsSection(container)).toBe('settings-appearance')
  })

  it('frames the vault rail as local files first, with Git as an optional layer', () => {
    const { rerender } = render(
      <SettingsNavigation
        t={t}
        vaultPath="/Users/sriinnu/Grimoire"
        isGitVault={false}
        activeSectionId="settings-portability"
        onSectionChange={vi.fn()}
      />,
    )

    expect(screen.getByTestId('settings-nav-settings-portability')).toHaveAttribute('aria-current', 'page')
    expect(screen.getByText('Local files')).toBeInTheDocument()
    expect(screen.queryByText('Local only')).not.toBeInTheDocument()

    rerender(
      <SettingsNavigation
        t={t}
        vaultPath="/Users/sriinnu/Grimoire"
        isGitVault={true}
        activeSectionId="settings-portability"
        onSectionChange={vi.fn()}
      />,
    )

    expect(screen.getByText('Local files + Git')).toBeInTheDocument()
    expect(screen.queryByText('Git on')).not.toBeInTheDocument()
  })
})
