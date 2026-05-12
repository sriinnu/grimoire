import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { StatusBar, type VaultOption } from './StatusBar'

const vaults: VaultOption[] = [
  { label: 'Main Vault', path: '/Users/srinivas/Grimoire' },
]

const installedAiAgentsStatus = {
  chitragupta: { status: 'installed' as const, version: '0.1.16' },
  claude_code: { status: 'installed' as const, version: '1.0.20' },
  codex: { status: 'installed' as const, version: '0.37.0' },
}

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    value: width,
    writable: true,
  })
}

function renderStatusBar() {
  return render(
    <StatusBar
      aiAgentsStatus={installedAiAgentsStatus}
      buildNumber="b281"
      defaultAiAgent="chitragupta"
      modifiedCount={5}
      noteCount={100}
      isGitVault
      onCheckForUpdates={() => undefined}
      onCommitPush={() => undefined}
      onClickPulse={() => undefined}
      onOpenLocalFolder={() => undefined}
      onOpenFeedback={() => undefined}
      onTriggerSync={() => undefined}
      onSwitchVault={() => undefined}
      remoteStatus={{ branch: 'main', ahead: 0, behind: 0, hasRemote: false }}
      vaultPath="/Users/srinivas/Grimoire"
      vaults={vaults}
    />,
  )
}

describe('StatusBar rail layout', () => {
  afterEach(() => {
    document.documentElement.removeAttribute('data-theme')
  })

  it('groups workspace, workflow, agent, and utility controls into rail segments', () => {
    setWindowWidth(1280)
    renderStatusBar()

    expect(screen.getByTestId('status-bar')).toHaveStyle({ overflow: 'visible' })
    expect(screen.getByTestId('status-workspace-group')).toHaveStyle({ overflow: 'visible' })
    expect(screen.getByTestId('status-workspace-group')).toContainElement(screen.getByTestId('status-vault-trigger'))
    expect(screen.getByTestId('status-workflow-group')).toContainElement(screen.getByTestId('status-commit-push'))
    expect(screen.getByTestId('status-spanda-group')).toContainElement(screen.getByTestId('spanda-intent-trigger'))
    expect(screen.getByTestId('status-agent-group')).toContainElement(screen.getByTestId('status-ai-agents'))
    expect(screen.getByTestId('status-utility-group')).toContainElement(screen.getByTestId('status-settings'))
  })

  it('blooms intent commands with storage and agent context', () => {
    setWindowWidth(1280)
    renderStatusBar()

    expect(screen.getByTestId('spanda-rail-intent')).toHaveAttribute('data-spanda-intent-kind', 'commit')

    fireEvent.mouseEnter(screen.getByTestId('spanda-rail-intent'))

    expect(screen.getByTestId('spanda-command-bloom')).toBeInTheDocument()
    expect(screen.getByTestId('spanda-storage-state')).toHaveTextContent('Local Git')
    expect(screen.getByTestId('spanda-agent-state')).toHaveTextContent('Chitra ready')
    expect(within(screen.getByTestId('spanda-command-bloom')).getByRole('button', { name: /Commit/i })).toBeInTheDocument()
  })

  it('keeps Spanda command text readable on dark themes', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    setWindowWidth(1280)
    renderStatusBar()

    expect(screen.getByTestId('spanda-intent-trigger')).toHaveStyle({ color: 'var(--foreground)' })

    fireEvent.mouseEnter(screen.getByTestId('spanda-rail-intent'))

    expect(screen.getByTestId('spanda-command-bloom')).toHaveStyle({
      background: 'var(--popover)',
      color: 'var(--popover-foreground)',
    })
  })

  it('collapses labels before the bottom rail becomes crowded', () => {
    setWindowWidth(1160)
    renderStatusBar()

    expect(screen.getByTestId('status-workspace-group')).toHaveAttribute('data-status-compact', 'true')
    expect(screen.getByTestId('status-workflow-group')).toHaveAttribute('data-status-compact', 'true')
    expect(screen.queryByText('Commit')).not.toBeInTheDocument()
    expect(screen.queryByText('Contribute')).not.toBeInTheDocument()
    expect(screen.queryByText('Chitra')).not.toBeInTheDocument()
  })
})
