import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AI_AGENTS_STATUS_REFRESH_EVENT } from '../hooks/useAiAgentsStatus'
import { AI_AGENTS_STATUS_SCAN_FAILED_DETAIL } from '../lib/aiAgents'
import { AiAgentsOnboardingPrompt } from './AiAgentsOnboardingPrompt'

const openExternalUrl = vi.fn()
const dragRegionMouseDown = vi.fn()
const originalPlatform = navigator.platform
const originalUserAgent = navigator.userAgent

vi.mock('../utils/url', () => ({
  openExternalUrl: (...args: unknown[]) => openExternalUrl(...args),
}))
vi.mock('../hooks/useDragRegion', () => ({
  useDragRegion: () => ({ onMouseDown: dragRegionMouseDown }),
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

    expect(screen.getByText('AI CLI routes detected')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-scan-summary')).toHaveTextContent('2 detected, 1 missing')
    expect(screen.getByTestId('ai-agents-onboarding-scan-receipt')).toHaveTextContent('macOS scan')
    expect(screen.getByTestId('ai-agent-scan-locations')).toHaveTextContent('/Applications')
    expect(screen.getByTestId('ai-agent-next-step')).toHaveTextContent('Continue now')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Chitragupta 0.1.16 CLI chat route found')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('MCP memory, recall, wiki, graph, and diagnostics are separate readiness checks')
    expect(screen.getByTestId('ai-agents-onboarding-install-codex')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-continue')).toHaveTextContent('Continue')
  })

  it('shows the missing state when no agents are installed', () => {
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

    expect(screen.getByText('No AI agents detected')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-scan-summary')).toHaveTextContent('0 detected, 3 missing')
    expect(screen.getByTestId('claude-onboarding-screen')).toBeInTheDocument()
    expect(screen.getByText('Claude Code not detected')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agent-next-step')).toHaveTextContent('Install one CLI or continue without live AI')
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

    expect(screen.getByText('AI scan needs retry')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-description')).toHaveTextContent('This is not proof')
    expect(screen.getByTestId('ai-agents-onboarding-scan-summary')).toHaveTextContent('Native CLI scan failed')
    expect(screen.getByTestId('ai-agent-status-claude_code')).toHaveTextContent('Retry needed')
    expect(screen.getByTestId('ai-agent-status-claude_code')).not.toHaveTextContent(/\bMissing\b/)
    expect(screen.getByTestId('ai-agent-status-codex')).toHaveTextContent('Retry needed')
    expect(screen.getByTestId('ai-agent-status-codex')).not.toHaveTextContent(/\bMissing\b/)
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Retry needed')
    expect(screen.getByTestId('ai-agent-status-chitragupta')).not.toHaveTextContent(/\bMissing\b/)
    expect(screen.getByTestId('ai-agent-status-chitragupta')).toHaveTextContent('Retry the scan before installing or relinking this CLI')
    expect(screen.getByTestId('ai-agent-next-step')).toHaveTextContent('Retry the scan before treating any CLI as missing')
    expect(screen.queryByTestId('claude-onboarding-screen')).not.toBeInTheDocument()
    expect(screen.queryByTestId('ai-agents-onboarding-install-claude_code')).not.toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-continue')).toHaveTextContent('Continue without live AI')
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

    expect(screen.getByText('Checking AI agents')).toBeInTheDocument()
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
          claude_code: { status: 'missing', version: 'Open the native Grimoire app for live AI.' },
          codex: { status: 'missing', version: 'Open the native Grimoire app for live AI.' },
          chitragupta: { status: 'missing', version: 'Open the native Grimoire app for live AI.' },
        }}
        onContinue={vi.fn()}
      />,
    )

    expect(screen.getByText('Open native app for live AI')).toBeInTheDocument()
    expect(screen.getByText('Continue in preview')).toBeInTheDocument()
    expect(screen.getByTestId('ai-agents-onboarding-scan-receipt')).toHaveTextContent('Native app scan')
    expect(screen.getByTestId('ai-agents-onboarding-scan-receipt')).toHaveTextContent('Native app required')
    expect(screen.getByTestId('ai-agent-scan-locations')).not.toHaveTextContent('/Applications')
    expect(screen.queryByTestId('ai-agents-onboarding-install-claude_code')).not.toBeInTheDocument()
    expect(screen.getByTestId('ai-agent-status-claude_code')).not.toHaveTextContent('Install or link')
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
