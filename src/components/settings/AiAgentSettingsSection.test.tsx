import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createTranslator } from '../../lib/i18n'
import { AiAgentSettingsSection } from './AiAgentSettingsSection'

const aiProviderKeyMocks = vi.hoisted(() => ({
  saveProviderApiKey: vi.fn(async () => []),
  clearProviderApiKey: vi.fn(async () => []),
}))

vi.mock('../../hooks/useAiProviderKeys', () => ({
  useAiProviderKeys: () => ({
    statuses: [
      {
        provider_id: 'anthropic',
        label: 'Anthropic',
        env_var: 'ANTHROPIC_API_KEY',
        configured: true,
        source: 'keychain',
      },
      {
        provider_id: 'openai',
        label: 'OpenAI',
        env_var: 'OPENAI_API_KEY',
        configured: true,
        source: 'environment',
      },
      {
        provider_id: 'deepseek',
        label: 'DeepSeek',
        env_var: 'DEEPSEEK_API_KEY',
        configured: false,
        source: 'missing',
      },
    ],
    loading: false,
    error: null,
    refresh: vi.fn(),
    saveProviderApiKey: aiProviderKeyMocks.saveProviderApiKey,
    clearProviderApiKey: aiProviderKeyMocks.clearProviderApiKey,
  }),
}))

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
    expect(screen.getByTestId('settings-ai-agent-chitragupta-transport')).toHaveTextContent(
      'If the MCP transport closes',
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

  it('localizes Chitragupta MCP contract copy for Sanskrit settings', () => {
    renderSection({ t: createTranslator('sa') })

    const contract = screen.getByTestId('settings-ai-agent-chitragupta-contract')
    expect(contract).toHaveTextContent('MCP-स्मृति-संविद्')
    expect(contract).toHaveTextContent('स्मृत्यन्वेषणम्')
    expect(screen.getByTestId('settings-ai-agent-chitragupta-boundary')).toHaveTextContent('स्थानीयं CLI-मार्गं')
    expect(screen.getByTestId('settings-ai-agent-chitragupta-transport')).toHaveTextContent('MCP-transport पिहिते')
    expect(contract).not.toHaveTextContent('MCP memory contract')
    expect(screen.getByTestId('settings-ai-agent-chitragupta-transport')).not.toHaveTextContent('If the MCP transport closes')
  })

  it('shows provider API-key status without rendering secret values', async () => {
    renderSection()

    expect(screen.getByTestId('settings-ai-provider-keys')).toHaveTextContent('Provider API keys')
    expect(screen.getByTestId('settings-ai-provider-key-anthropic')).toHaveTextContent('ANTHROPIC_API_KEY')
    expect(screen.getByTestId('settings-ai-provider-key-source-anthropic')).toHaveTextContent('Keychain')
    expect(screen.getByTestId('settings-ai-provider-key-source-openai')).toHaveTextContent('Environment')
    expect(screen.getByTestId('settings-ai-provider-key-source-deepseek')).toHaveTextContent('Missing')
    expect(screen.queryByText('unit-test-provider-token')).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId('settings-ai-provider-key-input-deepseek'), {
      target: { value: 'unit-test-provider-token' },
    })
    fireEvent.click(screen.getByTestId('settings-ai-provider-key-save-deepseek'))

    await waitFor(() => {
      expect(aiProviderKeyMocks.saveProviderApiKey).toHaveBeenCalledWith('deepseek', 'unit-test-provider-token')
    })
    expect(screen.queryByText('unit-test-provider-token')).not.toBeInTheDocument()
  })
})
