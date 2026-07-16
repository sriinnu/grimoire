import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_AGENTS_STATUS_REFRESH_EVENT } from '../hooks/useAiAgentsStatus'
import { AI_AGENTS_STATUS_SCAN_FAILED_DETAIL } from '../lib/aiAgents'
import { AiAgentsOnboardingPrompt } from './AiAgentsOnboardingPrompt'

const openExternalUrl = vi.fn()
const dragRegionMouseDown = vi.fn()
const originalPlatform = navigator.platform
const originalUserAgent = navigator.userAgent

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock('../utils/url', () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
}))
vi.mock('../hooks/useDragRegion', () => ({
  useDragRegion: () => ({ onMouseDown: dragRegionMouseDown }),
}))
vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
}))

describe('AiAgentsOnboardingPrompt', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setPlatform('MacIntel', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 15_7_8)')
  })

  afterEach(() => {
    setPlatform(originalPlatform, originalUserAgent)
  })

  function setPlatform(platform: string, userAgent: string) {
    Object.defineProperty(window.navigator, 'platform', {
      configurable: true,
      value: platform,
    })
    Object.defineProperty(window.navigator, 'userAgent', {
      configurable: true,
      value: userAgent,
    })
  }

  it('shows the ready state when at least one agent is installed', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'installed', version: '1.0.20' },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'installed', version: '0.1.16' },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByText('Local helpers detected')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-scan-summary')).toHaveTextContent('2 detected, 1 unavailable')
    expect(screen.getByTestId('ai-agents-onboarding-scan-receipt')).toHaveTextContent('macOS scan')
    expect(screen.getByTestId('ai-agent-scan-locations')).toHaveTextContent('/Applications')
    expect(screen.getByTestId('ai-agent-next-step')).toHaveTextContent('Continue now')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Chitragupta 0.1.16 local helper route found')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('MCP memory, recall, wiki, graph, and diagnostics are separate readiness checks')
    expect(screen.getByTestId('ai-agents-onboarding-install-codex')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-continue')).toHaveTextContent('Continue')
  })

  it('shows the optional-helper state when no agents are installed', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'missing', version: null },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByText('Local helpers are optional')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-scan-summary')).toHaveTextContent('0 detected, 3 unavailable')
    expect(screen.getByTestId('claude-onboarding-screen')).toBeInTheDocument()
    expect(screen.getByText('Claude Code not detected')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agent-next-step')).toHaveTextContent('Install one helper or continue without it')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Chitragupta CLI was not found in common local paths')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Install or link the CLI, then choose Check again')
    expect(screen.getByTestId('ai-agents-onboarding-install-claude_code')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-install-codex')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-install-chitragupta')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-continue')).toHaveTextContent('Continue without it')
  })

  it('opens the agent install links', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'missing', version: null },
        }}
        onContinue={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('ai-agents-onboarding-install-claude_code'))
    fireEvent.click(screen.getByTestId('ai-agents-onboarding-install-codex'))
    fireEvent.click(screen.getByTestId('ai-agents-onboarding-install-chitragupta'))

    expect(openExternalUrl).toHaveBeenCalledWith('https://docs.anthropic.com/en/docs/claude-code')
    expect(openExternalUrl).toHaveBeenCalledWith('https://developers.openai.com/codex/cli')
    expect(openExternalUrl).toHaveBeenCalledWith('https://github.com/sriinnu/chitragupta')
  })

  it('surfaces native discovery details when a CLI scan fails', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null, detail: 'Claude CLI not found in login shell.' },
          codex: { status: 'missing', version: null, detail: 'Codex CLI not found in PATH.' },
          chitragupta: {
            status: 'missing',
            version: null,
            detail: 'Chitragupta app found, but the local `chitragupta` CLI route was not found.',
          },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByTestId('ai-agent-status-claude_code')).toHaveTextContent('Claude CLI not found in login shell.')
    expect(screen.getByTestId('ai-agent-status-codex')).toHaveTextContent('Codex CLI not found in PATH.')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Chitragupta app found')
  })

  it('treats a failed scan as retry-needed instead of missing installs', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null, detail: AI_AGENTS_STATUS_SCAN_FAILED_DETAIL },
          codex: { status: 'missing', version: null, detail: AI_AGENTS_STATUS_SCAN_FAILED_DETAIL },
          chitragupta: { status: 'missing', version: null, detail: AI_AGENTS_STATUS_SCAN_FAILED_DETAIL },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByText('Local helper check needs retry')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-description')).toHaveTextContent('This is not proof')
    expect(screen.getByTestId('ai-agents-onboarding-scan-summary')).toHaveTextContent('Native helper scan failed')
    expect(screen.getByTestId('ai-agent-status-claude_code')).toHaveTextContent('Retry needed')
    expect(screen.getByTestId('ai-agent-status-claude_code')).not.toHaveTextContent(/\bMissing\b/)
    expect(screen.getByTestId('ai-agent-status-codex')).toHaveTextContent('Retry needed')
    expect(screen.getByTestId('ai-agent-status-codex')).not.toHaveTextContent(/\bMissing\b/)
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Retry needed')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).not.toHaveTextContent(/\bMissing\b/)
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Retry the scan before installing or relinking this CLI')
    expect(screen.getByTestId('ai-agent-next-step')).toHaveTextContent('Retry the scan before treating any local helper as unavailable')
    expect(screen.queryByTestId('claude-onboarding-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ai-agents-onboarding-install-claude_code')).not.toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-continue')).toHaveTextContent('Continue without helpers')
  })

  it('shows scan progress while statuses are still checking', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'checking', version: null },
          codex: { status: 'checking', version: null },
          chitragupta: { status: 'checking', version: null },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByText('Checking local helpers')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-scan-summary')).toHaveTextContent('Scanning PATH')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Checking')
    expect(screen.getByTestId('ai-agents-onboarding-continue').querySelector('button')).toBeDisabled()
    expect(screen.getByTestId('ai-agents-onboarding-refresh')).toBeDisabled()
  })

  it('shows Windows-specific CLI scan locations instead of macOS setup hints', () => {
    setPlatform('Win32', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)')

    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'missing', version: null },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByTestId('ai-agents-onboarding-scan-receipt')).toHaveTextContent('Windows scan')
    expect(screen.getByTestId('ai-agent-scan-locations')).toHaveTextContent('where.exe')
    expect(screen.getByTestId('ai-agent-scan-locations')).toHaveTextContent('Scoop')
    expect(screen.getByTestId('ai-agent-scan-locations')).not.toHaveTextContent('/Applications')
  })

  it('lets users recheck local agent installs without restarting', () => {
    const onRefresh = vi.fn()
    window.addEventListener(AI_AGENTS_STATUS_REFRESH_EVENT, onRefresh)

    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'missing', version: null },
        }}
        onContinue={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByTestId('ai-agents-onboarding-refresh'))

    expect(onRefresh).toHaveBeenCalledOnce()
    window.removeEventListener(AI_AGENTS_STATUS_REFRESH_EVENT, onRefresh)
  })

  it('explains browser preview instead of showing fake installed agents', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: 'Live local helpers run in the native Grimoire app.' },
          codex: { status: 'missing', version: 'Live local helpers run in the native Grimoire app.' },
          chitragupta: { status: 'missing', version: 'Live local helpers run in the native Grimoire app.' },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByText('Notebook preview is ready')).toBeInTheDocument()
    expect(screen.getByText('Open notebook preview')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-description')).toHaveTextContent('Use the notebook here')
    expect(screen.getByTestId('ai-agents-onboarding-scan-receipt')).toHaveTextContent('Private scan')
    expect(screen.getByTestId('ai-agents-onboarding-scan-receipt')).toHaveTextContent('Continue to the notebook here')
    expect(screen.getByTestId('ai-agent-scan-locations')).toHaveTextContent('No private machine paths are inspected')
    expect(screen.getByTestId('ai-agents-onboarding-preview-boundary')).toHaveTextContent('Your notebook works in preview')
    expect(screen.getByTestId('ai-agent-scan-locations')).not.toHaveTextContent('/Applications')
    expect(screen.queryByTestId('ai-agents-onboarding-install-claude_code')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ai-agent-status-claude_code')).not.toBeInTheDocument()
  })

  it('surfaces the daemon state and one-click pairing when Chitragupta is installed', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') {
        return { healthy: true, version: '0.1.16', token_present: false, token_source: 'missing', base_url: 'http://127.0.0.1:3141' }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'installed', version: '0.1.16' },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByTestId('ai-agents-onboarding-chitragupta-pairing')).toBeInTheDocument()
    await waitFor(() =>
      expect(screen.getByTestId('chitragupta-pairing-daemon')).toHaveTextContent('Daemon reachable · v0.1.16'))
    expect(screen.getByTestId('chitragupta-pairing-connect')).toHaveTextContent('Connect automatically')
    expect(screen.getByTestId('ai-agents-onboarding-chitragupta-pairing')).toHaveTextContent('Optional — you can pair later in Settings.')
    // Pairing never blocks the step.
    expect(screen.getByTestId('ai-agents-onboarding-continue').querySelector('button')).toBeEnabled()
  })

  it('shows the daemon-unreachable state without blocking onboarding', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') {
        return { healthy: false, version: null, token_present: false, token_source: 'missing', base_url: 'http://127.0.0.1:3141' }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'installed', version: '0.1.16' },
        }}
        onContinue={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(screen.getByTestId('chitragupta-pairing-daemon')).toHaveTextContent('Daemon not running'))
    expect(screen.getByTestId('chitragupta-pairing-connect')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-continue').querySelector('button')).toBeEnabled()
  })

  it('shows already-paired daemons as connected and hides the connect button', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'get_chitragupta_socket_status') {
        return { healthy: true, version: '0.1.16', token_present: true, token_source: 'keychain', base_url: 'http://127.0.0.1:3141' }
      }
      throw new Error(`unexpected command ${cmd}`)
    })

    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'installed', version: '0.1.16' },
        }}
        onContinue={vi.fn()}
      />,
    )

    await waitFor(() =>
      expect(screen.getByTestId('chitragupta-pairing-connected')).toHaveTextContent('Daemon connected'))
    expect(screen.queryByTestId('chitragupta-pairing-connect')).not.toBeInTheDocument()
  })

  it('never renders the pairing panel when the Chitragupta CLI is missing', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'missing', version: null },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'missing', version: null },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('ai-agents-onboarding-chitragupta-pairing')).not.toBeInTheDocument()
    expect(mockInvoke).not.toHaveBeenCalled()
  })

  it('uses the surrounding surface as a drag region and excludes the card', () => {
    render(
      <AiAgentsOnboardingPrompt
        statuses={{
          claude_code: { status: 'installed', version: '1.0.20' },
          codex: { status: 'missing', version: null },
          chitragupta: { status: 'installed', version: '0.1.16' },
        }}
        onContinue={vi.fn()}
      />,
    )

    const screenContainer = screen.getByTestId('ai-agents-onboarding-screen')
    fireEvent.mouseDown(screenContainer)

    expect(dragRegionMouseDown).toHaveBeenCalledOnce()
    expect(screenContainer.querySelector('[data-no-drag]')).not.toBeNull()
  })
})
