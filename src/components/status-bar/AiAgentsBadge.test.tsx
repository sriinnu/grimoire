import { act, fireEvent, render as rtlRender, screen } from '@testing-library/react'
import type { ReactElement } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AI_AGENTS_STATUS_REFRESH_EVENT } from '../../hooks/useAiAgentsStatus'
import { AI_AGENTS_STATUS_SCAN_FAILED_DETAIL } from '../../lib/aiAgents'
import { AiAgentsBadge } from './AiAgentsBadge'

vi.mock('../../utils/url', async () => {
  const actual = await vi.importActual('../../utils/url')
  return { ...actual, openExternalUrl: vi.fn().mockResolvedValue(undefined) }
})

const installedStatuses = {
  claude_code: { status: 'installed' as const, version: '1.0.20' },
  codex: { status: 'installed' as const, version: '0.37.0' },
  chitragupta: { status: 'installed' as const, version: '0.1.16' },
}

function render(ui: ReactElement) {
  return rtlRender(ui, { wrapper: TooltipProvider })
}

describe('AiAgentsBadge', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the vault guidance summary and restore action', async () => {
    const onRestoreGuidance = vi.fn()

    render(
      <AiAgentsBadge
        statuses={installedStatuses}
        guidanceStatus={{
          agentsState: 'missing',
          claudeState: 'managed',
          canRestore: true,
        }}
        defaultAgent="claude_code"
        onSetDefaultAgent={vi.fn()}
        onRestoreGuidance={onRestoreGuidance}
      />,
    )

    act(() => {
      const trigger = screen.getByTestId('status-ai-agents')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    })

    expect(screen.getByTestId('status-ai-guidance-summary')).toHaveTextContent('Grimoire guidance missing or broken')
    act(() => {
      fireEvent.click(screen.getByTestId('status-ai-guidance-restore'))
    })
    expect(onRestoreGuidance).toHaveBeenCalledOnce()
  })

  it('supports opening the menu and restoring guidance from the keyboard', () => {
    const onRestoreGuidance = vi.fn()

    render(
      <AiAgentsBadge
        statuses={installedStatuses}
        guidanceStatus={{
          agentsState: 'managed',
          claudeState: 'broken',
          canRestore: true,
        }}
        defaultAgent="claude_code"
        onSetDefaultAgent={vi.fn()}
        onRestoreGuidance={onRestoreGuidance}
      />,
    )

    act(() => {
      const trigger = screen.getByTestId('status-ai-agents')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    })

    const restoreItem = screen.getByTestId('status-ai-guidance-restore')
    act(() => {
      restoreItem.focus()
      fireEvent.keyDown(restoreItem, { key: 'Enter' })
    })

    expect(onRestoreGuidance).toHaveBeenCalledOnce()
  })

  it('marks browser preview AI as native-app only', () => {
    render(
      <AiAgentsBadge
        statuses={{
          claude_code: { status: 'missing', version: 'Open the native Grimoire app for live AI.' },
          codex: { status: 'missing', version: 'Open the native Grimoire app for live AI.' },
          chitragupta: { status: 'missing', version: 'Open the native Grimoire app for live AI.' },
        }}
        defaultAgent="claude_code"
        onSetDefaultAgent={vi.fn()}
      />,
    )

    act(() => {
      const trigger = screen.getByTestId('status-ai-agents')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    })

    expect(screen.getByText('Open native Grimoire for live AI')).toBeInTheDocument()
    expect(screen.queryByText('Install Claude Code')).not.toBeInTheDocument()
  })

  it('dispatches a local agent status refresh from the menu', () => {
    const onRefresh = vi.fn()
    window.addEventListener(AI_AGENTS_STATUS_REFRESH_EVENT, onRefresh)

    render(
      <AiAgentsBadge
        statuses={installedStatuses}
        defaultAgent="claude_code"
        onSetDefaultAgent={vi.fn()}
      />,
    )

    act(() => {
      const trigger = screen.getByTestId('status-ai-agents')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    })
    act(() => {
      fireEvent.click(screen.getByTestId('status-ai-agents-refresh'))
    })

    expect(onRefresh).toHaveBeenCalledOnce()
    window.removeEventListener(AI_AGENTS_STATUS_REFRESH_EVENT, onRefresh)
  })

  it('treats scan failure as retry-needed instead of missing installs', () => {
    render(
      <AiAgentsBadge
        statuses={{
          claude_code: { status: 'missing', version: null, detail: AI_AGENTS_STATUS_SCAN_FAILED_DETAIL },
          codex: { status: 'missing', version: null, detail: AI_AGENTS_STATUS_SCAN_FAILED_DETAIL },
          chitragupta: { status: 'missing', version: null, detail: AI_AGENTS_STATUS_SCAN_FAILED_DETAIL },
        }}
        defaultAgent="claude_code"
        onSetDefaultAgent={vi.fn()}
      />,
    )

    act(() => {
      const trigger = screen.getByTestId('status-ai-agents')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    })

    expect(screen.getByText('AI agent scan needs retry')).toBeInTheDocument()
    expect(screen.getByText('Local CLI scan failed. Check again after Grimoire finishes launching.')).toBeInTheDocument()
    expect(screen.getByTestId('status-ai-agents-refresh')).toBeInTheDocument()
    expect(screen.queryByText('Install Claude Code')).not.toBeInTheDocument()
  })

  it('separates Chitragupta CLI chat health from MCP memory readiness', () => {
    render(
      <AiAgentsBadge
        statuses={installedStatuses}
        defaultAgent="chitragupta"
        onSetDefaultAgent={vi.fn()}
      />,
    )

    act(() => {
      const trigger = screen.getByTestId('status-ai-agents')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    })

    expect(screen.getByTestId('status-ai-agents-chitragupta-boundary')).toHaveTextContent(
      'Chitragupta chat uses the local CLI route',
    )
    expect(screen.getByTestId('status-ai-agents-chitragupta-boundary')).toHaveTextContent(
      'MCP memory, recall, wiki, graph, and diagnostics are separate readiness checks.',
    )
  })

  it('shows configured route truth for the selected private agent lane', () => {
    render(
      <AiAgentsBadge
        statuses={installedStatuses}
        defaultAgent="chitragupta"
        defaultAgentProvider="google"
        defaultAgentModel="gemini-2.5-pro"
        onSetDefaultAgent={vi.fn()}
      />,
    )

    act(() => {
      const trigger = screen.getByTestId('status-ai-agents')
      trigger.focus()
      fireEvent.keyDown(trigger, { key: 'ArrowDown' })
    })

    expect(screen.getByTestId('status-ai-agents-route-truth')).toHaveTextContent(
      'Route: provider: google · model: gemini-2.5-pro',
    )
  })
})
