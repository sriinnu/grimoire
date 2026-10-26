import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'

const { primaryRenderSpy, secondaryRenderSpy } = vi.hoisted(() => ({
  primaryRenderSpy: vi.fn(),
  secondaryRenderSpy: vi.fn(),
}))

// Render probes: the sections are the wide subtree under StatusBar. Counting
// their renders measures whether the React.memo boundary actually bails.
vi.mock('./status-bar/StatusBarSections', () => ({
  StatusBarPrimarySection: (props: Record<string, unknown>) => {
    primaryRenderSpy(props)
    return null
  },
}))

vi.mock('./status-bar/StatusBarSecondarySection', () => ({
  StatusBarSecondarySection: (props: Record<string, unknown>) => {
    secondaryRenderSpy(props)
    return null
  },
}))

import { StatusBar } from './StatusBar'

const stableProps = {
  noteCount: 100,
  modifiedCount: 5,
  vaultPath: '/Users/srinivas/Grimoire',
  vaults: [{ label: 'Main Vault', path: '/Users/srinivas/Grimoire' }],
  onSwitchVault: vi.fn(),
  remoteStatus: { branch: 'main', ahead: 0, behind: 0, hasRemote: false } as const,
  onClickPending: vi.fn(),
  onCommitPush: vi.fn(),
  onClickPulse: vi.fn(),
  onTriggerSync: vi.fn(),
  onOpenFeedback: vi.fn(),
  buildNumber: 'b281',
  onCheckForUpdates: vi.fn(),
  mcpStatus: 'not_installed' as const,
  claudeCodeStatus: 'missing' as const,
}

function renderBar(noteCount = 100) {
  return <StatusBar {...stableProps} noteCount={noteCount} />
}

describe('StatusBar memo boundary', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('bails out of the render tree when prop values are unchanged', () => {
    const { rerender } = render(renderBar())
    // The mount ticker fires one state commit right after mount; let it settle,
    // then measure only subsequent renders.
    primaryRenderSpy.mockClear()
    secondaryRenderSpy.mockClear()

    // Freshly-created JSX elements, but referentially stable prop values —
    // exactly what AppRuntime's useStableFunctionProps + useMemo guarantee.
    rerender(renderBar())

    expect(primaryRenderSpy).not.toHaveBeenCalled()
    expect(secondaryRenderSpy).not.toHaveBeenCalled()

    // Positive control: a real prop change renders again.
    rerender(renderBar(101))
    expect(primaryRenderSpy).toHaveBeenCalled()
  })
})
