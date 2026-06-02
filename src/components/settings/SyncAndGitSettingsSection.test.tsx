import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../lib/i18n'
import { SyncAndGitSettingsSection } from './SyncAndGitSettingsSection'
import type { SettingsBodyProps } from './settingsTypes'

type SyncProps = Parameters<typeof SyncAndGitSettingsSection>[0]

function setUserAgent(userAgent: string) {
  Object.defineProperty(window.navigator, 'userAgent', {
    configurable: true,
    value: userAgent,
  })
}

function setPlatform(platform: string) {
  Object.defineProperty(window.navigator, 'platform', {
    configurable: true,
    value: platform,
  })
}

function renderSection(overrides: Partial<SyncProps> = {}) {
  const props = {
    t: createTranslator('en'),
    pullInterval: 5,
    setPullInterval: vi.fn(),
    releaseChannel: 'stable',
    setReleaseChannel: vi.fn(),
    isGitVault: false,
    hasGitMetadata: false,
    gitCapabilityUpdating: false,
    onSetGitEnabled: vi.fn(),
    autoGitEnabled: false,
    setAutoGitEnabled: vi.fn(),
    autoGitIdleThresholdSeconds: 90,
    setAutoGitIdleThresholdSeconds: vi.fn(),
    autoGitInactiveThresholdSeconds: 30,
    setAutoGitInactiveThresholdSeconds: vi.fn(),
    ...overrides,
  } satisfies Pick<
    SettingsBodyProps,
    | 't'
    | 'pullInterval'
    | 'setPullInterval'
    | 'releaseChannel'
    | 'setReleaseChannel'
    | 'isGitVault'
    | 'hasGitMetadata'
    | 'gitCapabilityUpdating'
    | 'onSetGitEnabled'
    | 'autoGitEnabled'
    | 'setAutoGitEnabled'
    | 'autoGitIdleThresholdSeconds'
    | 'setAutoGitIdleThresholdSeconds'
    | 'autoGitInactiveThresholdSeconds'
    | 'setAutoGitInactiveThresholdSeconds'
  >

  render(<SyncAndGitSettingsSection {...props} />)
}

describe('SyncAndGitSettingsSection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')
    setPlatform('MacIntel')
  })

  it('shows macOS-specific release truth without claiming feeds already exist', () => {
    renderSection()

    const truth = screen.getByTestId('settings-release-truth')
    expect(truth).toHaveTextContent('Release and platform truth')
    expect(truth).toHaveTextContent('Current platform')
    expect(truth).toHaveTextContent('macOS')
    expect(truth).toHaveTextContent('macOS source development and local native launch have current local proof.')
    expect(truth).toHaveTextContent('Stable/Alpha only selects a feed preference')
    expect(screen.getByTestId('settings-sync-runway')).toHaveTextContent('Preference only')
    expect(screen.queryByText(/Alpha follows every push/i)).not.toBeInTheDocument()
  })

  it('names Windows source proof limits instead of showing macOS-only copy', () => {
    setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64)')
    setPlatform('Win32')

    renderSection({ releaseChannel: 'alpha' })

    const truth = screen.getByTestId('settings-release-truth')
    expect(truth).toHaveTextContent('Windows')
    expect(truth).toHaveTextContent('Windows source builds are guarded')
    expect(truth).toHaveTextContent('fresh Windows launch proof is still required before public support')
    expect(truth).toHaveTextContent('Alpha')
    expect(truth).not.toHaveTextContent('macOS source development')
  })
})
