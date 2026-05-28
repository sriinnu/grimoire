import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../lib/i18n'
import { AiAgentSettingsSection } from './AiAgentSettingsSection'

const installedStatuses = {
  claude_code: { status: 'installed' as const, version: '1.0.20' },
  codex: { status: 'installed' as const, version: '0.37.0' },
  chitragupta: { status: 'installed' as const, version: '0.1.16' },
}

type AiAgentSettingsProps = Parameters<typeof AiAgentSettingsSection>[0]

function createProps(overrides: Partial<AiAgentSettingsProps> = {}): AiAgentSettingsProps {
  return {
    t: createTranslator('en'),
    aiAgentsStatus: installedStatuses,
    defaultAiAgent: 'chitragupta',
    setDefaultAiAgent: vi.fn(),
    aiAgentModels: {},
    setAiAgentModels: vi.fn(),
    aiAgentProviders: {},
    setAiAgentProviders: vi.fn(),
    ...overrides,
  } satisfies AiAgentSettingsProps
}

function renderSection(overrides: Partial<AiAgentSettingsProps> = {}) {
  render(<AiAgentSettingsSection {...createProps(overrides)} />)
}

describe('AiAgentSettingsSection', () => {
  it('separates Chitragupta CLI route truth from MCP memory readiness', () => {
    renderSection()

    expect(screen.getByTestId('settings-ai-agent-route-note')).toHaveTextContent(
      'Provider resolves from the Chitragupta stream',
    )
    expect(screen.getByTestId('settings-ai-agent-route-note')).toHaveTextContent(
      'Model resolves from the Chitragupta stream',
    )
    expect(screen.getByTestId('settings-ai-agent-chitragupta-boundary')).toHaveTextContent(
      'Chitragupta chat uses the local CLI route',
    )
    expect(screen.getByTestId('settings-ai-agent-chitragupta-boundary')).toHaveTextContent(
      'MCP memory, recall, wiki, graph, and diagnostics are separate readiness checks.',
    )
  })

  it('keeps route disclosure scoped to Chitragupta', () => {
    renderSection({
      defaultAiAgent: 'codex',
      aiAgentModels: { codex: 'gpt-5-codex' },
    })

    expect(screen.queryByTestId('settings-ai-agent-route-note')).not.toBeInTheDocument()
    expect(screen.getByTestId('settings-default-ai-model')).toHaveAttribute('placeholder', 'CLI default')
  })
})
