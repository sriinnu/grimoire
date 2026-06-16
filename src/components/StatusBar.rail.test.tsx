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
      onClickPending={() => undefined}
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

  it('groups workspace, notebook state, and utility controls into rail segments', () => {
    setWindowWidth(1280)
    renderStatusBar()

    expect(screen.getByTestId('status-bar')).toHaveStyle({ overflow: 'visible' })
    expect(screen.getByTestId('status-workspace-group')).toHaveStyle({ overflow: 'visible' })
    expect(screen.getByTestId('status-workspace-group')).toContainElement(screen.getByTestId('status-vault-trigger'))
    expect(screen.getByTestId('status-workflow-group')).toContainElement(screen.getByTestId('status-local-signal'))
    expect(screen.getByTestId('status-workflow-group')).toContainElement(screen.getByTestId('status-save-signal'))
    expect(screen.getByTestId('status-workflow-group')).toContainElement(screen.getByTestId('status-private-signal'))
    expect(screen.queryByTestId('status-spanda-group')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-agent-group')).not.toBeInTheDocument()
    expect(screen.getByTestId('status-utility-group')).toContainElement(screen.getByTestId('status-overflow-menu'))
  })

  it('keeps workflow commands in the overflow instead of blooming over the rail', async () => {
    setWindowWidth(1280)
    renderStatusBar()

    expect(screen.queryByTestId('spanda-rail-intent')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-commit-push')).not.toBeInTheDocument()

    fireEvent.pointerDown(screen.getByTestId('status-overflow-menu'), { button: 0 })
    const menu = await screen.findByTestId('status-overflow-menu-content')
    expect(within(menu).getByTestId('status-modified-count')).toHaveTextContent('5')
    expect(within(menu).getByTestId('status-commit-push')).toHaveTextContent('Save local snapshot')
    expect(within(menu).getByTestId('status-sync')).toHaveTextContent('Refresh notebook')
    expect(within(menu).getByTestId('status-pulse')).toHaveTextContent('Timeline')
  })

  it('keeps notebook state readable on dark themes', () => {
    document.documentElement.setAttribute('data-theme', 'dark')
    setWindowWidth(1280)
    renderStatusBar()

    expect(screen.getByTestId('status-local-signal')).toHaveTextContent('Local')
    expect(screen.getByTestId('status-save-signal')).toHaveTextContent('Edits waiting')
    expect(screen.getByTestId('status-private-signal')).toHaveTextContent('Private')
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
