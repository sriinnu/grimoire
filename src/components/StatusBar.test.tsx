import { describe, it, expect, vi, beforeEach } from 'vitest'
import { act, render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { TooltipProvider } from '@/components/ui/tooltip'
import { StatusBar } from './StatusBar'
import { StatusBarPrimarySection } from './status-bar/StatusBarSections'
import type { VaultOption } from './StatusBar'
vi.mock('../utils/url', async () => {
  const actual = await vi.importActual('../utils/url')
  return { ...actual, openExternalUrl: vi.fn().mockResolvedValue(undefined) }
})

const { openExternalUrl } = await import('../utils/url') as typeof import('../utils/url') & { openExternalUrl: ReturnType<typeof vi.fn> }

const vaults: VaultOption[] = [
  { label: 'Main Vault', path: '/Users/srinivas/Grimoire' },
  { label: 'Work Vault', path: '/Users/srinivas/Work' },
]

const installedAiAgentsStatus = {
  claude_code: { status: 'installed' as const, version: '1.0.20' },
  codex: { status: 'installed' as const, version: '0.37.0' },
  chitragupta: { status: 'installed' as const, version: '0.1.16' },
}

const DEFAULT_WINDOW_WIDTH = 1280

function setWindowWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    configurable: true,
    writable: true,
    value: width,
  })
}

function renderDenseStatusBar() {
  return render(
    <StatusBar
      noteCount={100}
      modifiedCount={5}
      vaultPath="/Users/srinivas/Grimoire"
      vaults={vaults}
      onSwitchVault={vi.fn()}
      remoteStatus={{ branch: 'main', ahead: 0, behind: 0, hasRemote: false }}
      onClickPending={vi.fn()}
      onCommitPush={vi.fn()}
      onClickPulse={vi.fn()}
      onTriggerSync={vi.fn()}
      onOpenFeedback={vi.fn()}
      buildNumber="b281"
      onCheckForUpdates={vi.fn()}
      mcpStatus="not_installed"
      claudeCodeStatus="missing"
    />
  )
}

async function expectTooltip(trigger: HTMLElement, ...parts: string[]) {
  act(() => {
    fireEvent.focus(trigger)
  })
  const tooltip = await screen.findByRole('tooltip')
  for (const part of parts) {
    expect(tooltip).toHaveTextContent(part)
  }
  act(() => {
    fireEvent.blur(trigger)
  })
}

async function openStatusOverflowMenu() {
  fireEvent.pointerDown(screen.getByTestId('status-overflow-menu'), { button: 0 })
  return screen.findByTestId('status-overflow-menu-content')
}

describe('StatusBar', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setWindowWidth(DEFAULT_WINDOW_WIDTH)
  })

  it('does not display the bottom-bar note count readout', () => {
    render(<StatusBar noteCount={9200} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)
    expect(screen.queryByText('9,200 notes')).not.toBeInTheDocument()
  })

  it('presents the starter demo vault as the notebook in bottom chrome', () => {
    const demoVaults = [{ label: 'demo-vault-v2', path: '/repo/demo-vault-v2' }]
    render(<StatusBar noteCount={100} vaultPath="/repo/demo-vault-v2" vaults={demoVaults} onSwitchVault={vi.fn()} />)
    expect(screen.getByTestId('status-vault-trigger')).toHaveTextContent('Notebook')
    expect(screen.queryByText('demo-vault-v2')).not.toBeInTheDocument()
  })

  it('keeps the build number out of the utility overflow when provided', async () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} buildNumber="b223" onCheckForUpdates={vi.fn()} />)
    expect(screen.queryByText('b223')).not.toBeInTheDocument()

    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-build-number')).toHaveTextContent('Updates')
    expect(within(menu).queryByText('b223')).not.toBeInTheDocument()
  })

  it('keeps the updates action human-readable when no build number is provided', async () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onCheckForUpdates={vi.fn()} />)
    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-build-number')).toHaveTextContent('Updates')
    expect(within(menu).queryByText('b?')).not.toBeInTheDocument()
  })

  it('calls onCheckForUpdates from the utility overflow', async () => {
    const onCheckForUpdates = vi.fn()
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} buildNumber="b281" onCheckForUpdates={onCheckForUpdates} />)
    await openStatusOverflowMenu()
    fireEvent.click(screen.getByTestId('status-build-number'))
    expect(onCheckForUpdates).toHaveBeenCalledOnce()
  })

  it('shows a utility overflow tooltip on focus', async () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} buildNumber="b281" onCheckForUpdates={vi.fn()} />)
    await expectTooltip(screen.getByRole('button', { name: 'More notebook controls' }), 'More notebook controls')
  })

  it('does not display branch name', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)
    expect(screen.queryByText('main')).not.toBeInTheDocument()
  })

  it('shows feedback inside the utility overflow when callback is provided', async () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onOpenFeedback={vi.fn()} />)
    expect(screen.queryByTestId('status-feedback')).not.toBeInTheDocument()

    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-feedback')).toHaveTextContent('Send feedback')
  })

  it('calls onOpenFeedback from the utility overflow', async () => {
    const onOpenFeedback = vi.fn()
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onOpenFeedback={onOpenFeedback} />)
    await openStatusOverflowMenu()
    fireEvent.click(screen.getByTestId('status-feedback'))
    expect(onOpenFeedback).toHaveBeenCalledOnce()
  })

  it('shows a theme toggle instead of the notifications placeholder', async () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        themeMode="light"
        onToggleThemeMode={vi.fn()}
      />,
    )

    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-theme-mode')).toHaveTextContent('Switch to dark mode')
    expect(screen.queryByLabelText('Notifications are coming soon')).not.toBeInTheDocument()
  })

  it('calls onToggleThemeMode from the bottom bar', async () => {
    const onToggleThemeMode = vi.fn()
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        themeMode="dark"
        onToggleThemeMode={onToggleThemeMode}
      />,
    )

    await openStatusOverflowMenu()
    fireEvent.click(screen.getByTestId('status-theme-mode'))
    expect(onToggleThemeMode).toHaveBeenCalledOnce()
  })

  it('displays active vault name', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)
    expect(screen.getByText('Main Vault')).toBeInTheDocument()
  })

  it('shows notebook fallback when vault path does not match', () => {
    render(<StatusBar noteCount={100} vaultPath="/unknown/path" vaults={vaults} onSwitchVault={vi.fn()} />)
    expect(screen.getByText('Notebook')).toBeInTheDocument()
  })

  it('opens vault menu on click and shows all vault options', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)

    // Click the vault button to open menu
    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))

    expect(screen.getByText('Work Vault')).toBeInTheDocument()
  })

  it('calls onSwitchVault when selecting a different vault', async () => {
    const onSwitchVault = vi.fn()
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={onSwitchVault} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    fireEvent.click(screen.getByTestId('vault-menu-item-Work Vault'))

    await waitFor(() => expect(onSwitchVault).toHaveBeenCalledWith('/Users/srinivas/Work'))
  })

  it('closes the vault menu without switching when selecting the active vault', () => {
    const onSwitchVault = vi.fn()
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={onSwitchVault} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    fireEvent.click(screen.getByTestId('vault-menu-item-Main Vault'))

    expect(onSwitchVault).not.toHaveBeenCalled()
    expect(screen.queryByTestId('vault-menu-item-Work Vault')).not.toBeInTheDocument()
  })

  it('closes vault menu when clicking outside', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    expect(screen.getByText('Work Vault')).toBeInTheDocument()

    // Click outside the menu
    fireEvent.mouseDown(document.body)

    expect(screen.queryByText('Work Vault')).not.toBeInTheDocument()
  })

  it('toggles vault menu open and closed', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)

    const vaultButton = screen.getByRole('button', { name: 'Switch notebook' })
    fireEvent.click(vaultButton)
    expect(screen.getByText('Work Vault')).toBeInTheDocument()

    // Click again to close
    fireEvent.click(vaultButton)
    expect(screen.queryByText('Work Vault')).not.toBeInTheDocument()
  })

  it('shows "Open notebook folder" option in vault menu', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onOpenLocalFolder={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    expect(screen.getByText('Open notebook folder')).toBeInTheDocument()
  })

  it('calls onOpenLocalFolder when clicking "Open notebook folder"', async () => {
    const onOpenLocalFolder = vi.fn()
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onOpenLocalFolder={onOpenLocalFolder} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    fireEvent.click(screen.getByText('Open notebook folder'))
    await waitFor(() => expect(onOpenLocalFolder).toHaveBeenCalledOnce())
  })

  it('shows a disabled vault picker state while a local folder open is pending', () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        openingVault={{ label: 'Choose vault folder', path: '' }}
        onSwitchVault={vi.fn()}
        onOpenLocalFolder={vi.fn()}
      />
    )

    const trigger = screen.getByRole('button', { name: 'Choose vault folder' })
    expect(trigger).toBeDisabled()
    expect(trigger).toHaveAttribute('aria-busy', 'true')
    expect(trigger).toHaveTextContent('Choose vault folder')

    fireEvent.click(trigger)
    expect(screen.queryByText('Open notebook folder')).not.toBeInTheDocument()
  })

  it('shows "Create empty notebook" option in vault menu', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onCreateEmptyVault={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    expect(screen.getByText('Create empty notebook')).toBeInTheDocument()
  })

  it('calls onCreateEmptyVault when clicking "Create empty notebook"', async () => {
    const onCreateEmptyVault = vi.fn()
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onCreateEmptyVault={onCreateEmptyVault} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    fireEvent.click(screen.getByText('Create empty notebook'))
    await waitFor(() => expect(onCreateEmptyVault).toHaveBeenCalledOnce())
  })

  it('shows add-vault options in vault menu', () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        onCreateEmptyVault={vi.fn()}
        onOpenLocalFolder={vi.fn()}
        onCloneVault={vi.fn()}
      />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    expect(screen.getByText('Create empty notebook')).toBeInTheDocument()
    expect(screen.getByText('Open notebook folder')).toBeInTheDocument()
    expect(screen.getByText('Clone Git repo')).toBeInTheDocument()
  })

  it('shows the Getting Started clone action in the vault menu when provided', () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        onCloneGettingStarted={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    expect(screen.getByText('Clone Getting Started Notebook')).toBeInTheDocument()
  })

  it('calls onCloneGettingStarted when clicking the vault menu action', async () => {
    const onCloneGettingStarted = vi.fn()
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        onCloneGettingStarted={onCloneGettingStarted}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    fireEvent.click(screen.getByText('Clone Getting Started Notebook'))
    await waitFor(() => expect(onCloneGettingStarted).toHaveBeenCalledOnce())
  })

  it('exposes an in-row, hover-revealed remove action for non-active vaults', () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        onRemoveVault={vi.fn()}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))

    const item = screen.getByTestId('vault-menu-item-Work Vault')
    const removeAction = screen.getByTestId('vault-menu-remove-Work Vault')

    expect(item.className).toContain('hover:bg-[var(--hover)]')
    expect(item.className).toContain('pr-7')
    expect(removeAction.className).toContain('absolute')
    expect(removeAction.className).toContain('right-1')
    expect(removeAction.className).toContain('group-hover:opacity-100')
    expect(removeAction.className).toContain('group-focus-within:opacity-100')
    expect(removeAction.className).toContain('pointer-events-none')
    expect(screen.getByRole('button', { name: 'Remove Work Vault from list' })).toBeInTheDocument()
  })

  it('calls onRemoveVault when clicking the remove action in the vault menu', async () => {
    const onRemoveVault = vi.fn()
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        onRemoveVault={onRemoveVault}
      />
    )

    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    fireEvent.click(screen.getByRole('button', { name: 'Remove Work Vault from list' }))

    await waitFor(() => expect(onRemoveVault).toHaveBeenCalledWith('/Users/srinivas/Work'))
  })

  it('shows a quiet changes summary when modifiedCount is > 0', () => {
    render(<StatusBar noteCount={100} modifiedCount={3} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)
    expect(screen.getByTestId('status-save-signal')).toHaveTextContent('Edits waiting')
    expect(screen.getByTestId('status-bar')).toHaveAccessibleName('Notebook status, edits waiting')
    expect(screen.queryByTestId('status-modified-count')).not.toBeInTheDocument()
  })

  it('keeps the bottom bar compact and moves workflow commands into overflow at medium widths', async () => {
    setWindowWidth(980)
    renderDenseStatusBar()

    expect(screen.getByTestId('status-bar')).toHaveStyle({
      flexWrap: 'nowrap',
      height: '30px',
    })
    expect(screen.getByTestId('status-overflow-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('status-feedback')).not.toBeInTheDocument()
    expect(screen.queryByText('Commit')).not.toBeInTheDocument()
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument()
    expect(screen.queryByText('Contribute')).not.toBeInTheDocument()

    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-commit-push')).toBeInTheDocument()
    expect(within(menu).getByTestId('status-pulse')).toBeInTheDocument()
  })

  it('keeps only notebook summary labels visible at very narrow widths', async () => {
    setWindowWidth(880)
    renderDenseStatusBar()

    expect(screen.getByTestId('status-bar')).toHaveStyle({
      flexWrap: 'nowrap',
      height: '30px',
    })
    expect(screen.getByTestId('status-overflow-menu')).toBeInTheDocument()
    expect(screen.queryByTestId('status-feedback')).not.toBeInTheDocument()
    expect(screen.queryByTestId('status-build-number')).not.toBeInTheDocument()
    expect(screen.queryByText('Commit')).not.toBeInTheDocument()
    expect(screen.queryByText('Timeline')).not.toBeInTheDocument()
    expect(screen.queryByText('Contribute')).not.toBeInTheDocument()
    expect(screen.queryByText('No remote')).not.toBeInTheDocument()
    expect(screen.queryByText('MCP')).not.toBeInTheDocument()
    expect(screen.queryByText('b281')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude Code missing')).not.toBeInTheDocument()

    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-commit-push')).toBeInTheDocument()
    expect(within(menu).getByTestId('status-build-number')).toHaveTextContent('Updates')
    expect(within(menu).queryByText('b281')).not.toBeInTheDocument()
  })

  it('stacks the footer rails on mobile and iPad-width windows instead of overflowing one line', () => {
    setWindowWidth(680)
    renderDenseStatusBar()

    expect(screen.getByTestId('status-bar')).toHaveStyle({
      flexWrap: 'wrap',
      height: 'auto',
    })
    expect(screen.getByTestId('status-workspace-group')).toHaveAttribute('data-status-compact', 'true')
    expect(screen.getByTestId('status-workflow-group')).toBeInTheDocument()
    expect(screen.getByTestId('status-utility-group')).toBeInTheDocument()
  })

  it('keeps the active AI agent out of the compact status rail', () => {
    setWindowWidth(880)
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        aiAgentsStatus={installedAiAgentsStatus}
        defaultAiAgent="claude_code"
      />
    )

    expect(screen.queryByTestId('status-ai-agents')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude')).not.toBeInTheDocument()
  })

  it('does not show Changes badge when modifiedCount is 0', () => {
    render(<StatusBar noteCount={100} modifiedCount={0} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)
    expect(screen.queryByTestId('status-modified-count')).not.toBeInTheDocument()
    expect(screen.getByTestId('status-save-signal')).toHaveTextContent('Saved here')
  })

  it('does not show Changes badge when modifiedCount is not provided', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)
    expect(screen.queryByTestId('status-modified-count')).not.toBeInTheDocument()
    expect(screen.getByTestId('status-save-signal')).toHaveTextContent('Saved here')
  })

  it('closes menu after clicking "Open notebook folder"', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onOpenLocalFolder={vi.fn()} />
    )
    fireEvent.click(screen.getByRole('button', { name: 'Switch notebook' }))
    fireEvent.click(screen.getByText('Open notebook folder'))
    // Menu should close after clicking an action
    expect(screen.queryByText('Open notebook folder')).not.toBeInTheDocument()
  })

  it('calls onClickPending when clicking the pending count', () => {
    const onClickPending = vi.fn()
    render(
      <StatusBar noteCount={100} modifiedCount={5} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onClickPending={onClickPending} />
    )
    fireEvent.click(screen.getByTestId('status-save-signal'))
    expect(onClickPending).toHaveBeenCalledOnce()
  })

  it('pending changes tooltip is available on keyboard focus', async () => {
    render(
      <StatusBar noteCount={100} modifiedCount={3} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onClickPending={vi.fn()} />
    )
    await expectTooltip(screen.getByRole('button', { name: 'Review 3 local edits' }), 'Review 3 local edits')
  })

  it('keeps MCP warning out of the default status rail', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} mcpStatus="not_installed" />
    )
    expect(screen.queryByTestId('status-mcp')).not.toBeInTheDocument()
  })

  it('hides MCP badge when status is installed', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} mcpStatus="installed" />
    )
    expect(screen.queryByTestId('status-mcp')).not.toBeInTheDocument()
  })

  it('hides MCP badge when status is checking', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} mcpStatus="checking" />
    )
    expect(screen.queryByTestId('status-mcp')).not.toBeInTheDocument()
  })

  it('hides MCP badge when no mcpStatus prop provided', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />
    )
    expect(screen.queryByTestId('status-mcp')).not.toBeInTheDocument()
  })

  it('calls onInstallMcp when clicking MCP badge with not_installed status', () => {
    const onInstallMcp = vi.fn()
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} mcpStatus="not_installed" onInstallMcp={onInstallMcp} />
    )
    expect(screen.queryByTestId('status-mcp')).not.toBeInTheDocument()
    expect(onInstallMcp).not.toHaveBeenCalled()
  })

  it('shows Pull required label when syncStatus is pull_required', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} syncStatus="pull_required" />
    )
    expect(screen.getByText('Pull required')).toBeInTheDocument()
  })

  it('shows an offline chip when offline', () => {
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} isOffline={true} />
    )
    expect(screen.getByTestId('status-save-signal')).toHaveTextContent('Offline')
  })

  it('shows a local notebook signal when the active git vault has no remote', () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        remoteStatus={{ branch: 'main', ahead: 0, behind: 0, hasRemote: false }}
      />
    )
    expect(screen.getByTestId('status-local-signal')).toHaveTextContent('Local')
    expect(screen.queryByTestId('status-no-remote')).not.toBeInTheDocument()
  })

  it('shows a local-only notebook signal instead of no-remote for non-git vaults', () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        isGitVault={false}
      />
    )
    expect(screen.getByTestId('status-local-signal')).toHaveTextContent('Only here')
    expect(screen.queryByTestId('status-no-remote')).not.toBeInTheDocument()
  })

  it('opens the add-remote flow when clicking the local signal for a no-remote git vault', () => {
    const onAddRemote = vi.fn()
    render(
      <TooltipProvider>
        <StatusBarPrimarySection
          modifiedCount={0}
          vaultPath="/Users/srinivas/Grimoire"
          vaults={vaults}
          onSwitchVault={vi.fn()}
          onAddRemote={onAddRemote}
          syncStatus="idle"
          lastSyncTime={null}
          conflictCount={0}
          remoteStatus={{ branch: 'main', ahead: 0, behind: 0, hasRemote: false }}
        />
      </TooltipProvider>
    )

    fireEvent.click(screen.getByTestId('status-local-signal'))
    expect(onAddRemote).toHaveBeenCalledOnce()
  })

  it('calls onPullAndPush from the overflow sync action when pull is required', async () => {
    const onPullAndPush = vi.fn()
    render(
      <StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} syncStatus="pull_required" onPullAndPush={onPullAndPush} />
    )
    await openStatusOverflowMenu()
    fireEvent.click(screen.getByTestId('status-sync'))
    expect(onPullAndPush).toHaveBeenCalledOnce()
  })

  it('keeps git sync details out of the rail and exposes sync from overflow', async () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        onTriggerSync={vi.fn()}
        syncStatus="idle"
        remoteStatus={{ branch: 'main', ahead: 2, behind: 1, hasRemote: true }}
      />
    )
    expect(screen.queryByTestId('status-sync')).not.toBeInTheDocument()
    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-sync')).toHaveTextContent('Refresh notebook')
    expect(screen.queryByTestId('git-status-popup')).not.toBeInTheDocument()
  })

  it('shows Timeline in the status overflow', async () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} isGitVault onClickPulse={vi.fn()} />)
    expect(screen.queryByTestId('status-pulse')).not.toBeInTheDocument()
    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-pulse')).toHaveTextContent('Timeline')
  })

  it('calls onClickPulse when clicking Timeline in the status overflow', async () => {
    const onClickPulse = vi.fn()
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} isGitVault onClickPulse={onClickPulse} />)
    await openStatusOverflowMenu()
    fireEvent.click(screen.getByTestId('status-pulse'))
    expect(onClickPulse).toHaveBeenCalledOnce()
  })

  it('does not call Timeline overflow action when isGitVault is false', async () => {
    const onClickPulse = vi.fn()
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} isGitVault={false} onClickPulse={onClickPulse} />)
    const menu = await openStatusOverflowMenu()
    expect(within(menu).queryByTestId('status-pulse')).not.toBeInTheDocument()
    expect(onClickPulse).not.toHaveBeenCalled()
  })

  it('shows checkpoint saving in the status overflow', async () => {
    const onCommitPush = vi.fn()
    render(<StatusBar noteCount={100} modifiedCount={5} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onCommitPush={onCommitPush} />)
    expect(screen.queryByTestId('status-commit-push')).not.toBeInTheDocument()
    await openStatusOverflowMenu()
    fireEvent.click(screen.getByTestId('status-commit-push'))
    expect(onCommitPush).toHaveBeenCalledOnce()
  })

  it('uses a local-only overflow label for checkpoints when no remote is configured', async () => {
    render(
      <StatusBar
        noteCount={100}
        modifiedCount={5}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        onCommitPush={vi.fn()}
        remoteStatus={{ branch: 'main', ahead: 0, behind: 0, hasRemote: false }}
      />
    )
    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-commit-push')).toHaveTextContent('Save local snapshot')
  })

  it('shows checkpoint saving in overflow even when no modified files', async () => {
    render(<StatusBar noteCount={100} modifiedCount={0} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} onCommitPush={vi.fn()} />)
    const menu = await openStatusOverflowMenu()
    expect(within(menu).getByTestId('status-commit-push')).toBeInTheDocument()
  })

  it('hides checkpoint saving from overflow when no onCommitPush callback', async () => {
    render(<StatusBar noteCount={100} modifiedCount={5} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)
    const menu = await openStatusOverflowMenu()
    expect(within(menu).queryByTestId('status-commit-push')).not.toBeInTheDocument()
  })

  it('keeps Claude Code installed status out of the default status rail', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} claudeCodeStatus="installed" claudeCodeVersion="1.0.20" />)
    expect(screen.queryByTestId('status-claude-code')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude Code')).not.toBeInTheDocument()
  })

  it('keeps Claude Code missing status out of the default status rail', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} claudeCodeStatus="missing" />)
    expect(screen.queryByTestId('status-claude-code')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude Code missing')).not.toBeInTheDocument()
  })

  it('does not open install URL from the quiet rail when Claude Code is missing', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} claudeCodeStatus="missing" />)
    expect(openExternalUrl).not.toHaveBeenCalled()
  })

  it('hides Claude Code badge when status is checking', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} claudeCodeStatus="checking" />)
    expect(screen.queryByTestId('status-claude-code')).not.toBeInTheDocument()
  })

  it('hides Claude Code badge when no claudeCodeStatus prop provided', () => {
    render(<StatusBar noteCount={100} vaultPath="/Users/srinivas/Grimoire" vaults={vaults} onSwitchVault={vi.fn()} />)
    expect(screen.queryByTestId('status-claude-code')).not.toBeInTheDocument()
  })

  it('keeps the active AI agent out of the default bottom bar', () => {
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        aiAgentsStatus={installedAiAgentsStatus}
        defaultAiAgent="claude_code"
        onSetDefaultAiAgent={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('status-ai-agents')).not.toBeInTheDocument()
    expect(screen.queryByText('Claude')).not.toBeInTheDocument()
  })

  it('does not switch AI agents from the quiet status rail', () => {
    const onSetDefaultAiAgent = vi.fn()
    render(
      <StatusBar
        noteCount={100}
        vaultPath="/Users/srinivas/Grimoire"
        vaults={vaults}
        onSwitchVault={vi.fn()}
        aiAgentsStatus={installedAiAgentsStatus}
        defaultAiAgent="claude_code"
        onSetDefaultAiAgent={onSetDefaultAiAgent}
      />,
    )

    expect(screen.queryByTestId('status-ai-agents')).not.toBeInTheDocument()
    expect(onSetDefaultAiAgent).not.toHaveBeenCalled()
  })

})
