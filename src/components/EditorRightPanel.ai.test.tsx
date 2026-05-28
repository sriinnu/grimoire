import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AiAgentMessage } from '../hooks/useCliAiAgent'
import type { AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import type { VaultEntry } from '../types'
import { EditorRightPanel } from './EditorRightPanel'

vi.mock('../hooks/useCliAiAgent', async () => {
  const React = await import('react')

  return {
    useCliAiAgent: () => {
      const [messages, setMessages] = React.useState<AiAgentMessage[]>([])

      return {
        clearConversation: () => setMessages([]),
        messages,
        sendMessage: (text: string) => {
          setMessages((current) => [
            ...current,
            { actions: [], id: `message-${current.length}`, response: 'Still here.', userMessage: text },
          ])
        },
        status: 'idle',
      }
    },
  }
})

const entry: VaultEntry = {
  aliases: [],
  archived: false,
  belongsTo: [],
  cadence: null,
  color: null,
  createdAt: 1700000000,
  fileSize: 12,
  filename: 'note.md',
  icon: null,
  isA: 'Note',
  modifiedAt: 1700000000,
  order: null,
  outgoingLinks: [],
  owner: null,
  path: '/vault/note.md',
  relatedTo: [],
  relationships: {},
  snippet: '',
  status: null,
  title: 'Note',
  wordCount: 2,
}

const installedAiAgentsStatus: AiAgentsStatus = {
  chitragupta: { status: 'installed', version: '0.1.0' },
  claude_code: { status: 'missing', version: null },
  codex: { status: 'missing', version: null },
}

function renderRightPanel(
  showAIChat: boolean,
  route: {
    defaultAiAgent?: AiAgentId
    defaultAiProvider?: string | null
    defaultAiModel?: string | null
  } = {},
) {
  return (
    <EditorRightPanel
      defaultAiAgent={route.defaultAiAgent}
      defaultAiModel={route.defaultAiModel}
      defaultAiProvider={route.defaultAiProvider}
      entries={[entry]}
      gitHistory={[]}
      inspectorCollapsed
      inspectorContent="hello"
      inspectorEntry={entry}
      inspectorWidth={320}
      onNavigateWikilink={vi.fn()}
      onToggleInspector={vi.fn()}
      onViewCommitDiff={vi.fn()}
      showAIChat={showAIChat}
      vaultPath="/tmp/vault"
    />
  )
}

describe('EditorRightPanel AI chat lifecycle', () => {
  it('keeps AI chat history when the panel is closed and reopened', async () => {
    const { rerender } = render(renderRightPanel(true))

    fireEvent.change(await screen.findByTestId('agent-input'), { target: { value: 'remember this' } })
    fireEvent.click(screen.getByTestId('agent-send'))
    expect(screen.getByText('remember this')).toBeInTheDocument()

    rerender(renderRightPanel(false))
    expect(screen.queryByTestId('ai-panel')).toBeNull()

    rerender(renderRightPanel(true))
    expect(await screen.findByText('remember this')).toBeInTheDocument()
    expect(screen.getByText('Still here.')).toBeInTheDocument()
  })

  it('keeps Chitragupta provider and model route visible in the production AI panel', async () => {
    render(renderRightPanel(true, {
      defaultAiAgent: 'chitragupta',
      defaultAiModel: 'gemini-2.5-pro',
      defaultAiProvider: 'google',
    }))

    expect(await screen.findByText('Chitragupta · provider: google · model: gemini-2.5-pro')).toBeInTheDocument()
  })

  it('passes Chitragupta CLI availability into the inspector memory lane', () => {
    render(
      <EditorRightPanel
        aiAgentsStatus={installedAiAgentsStatus}
        entries={[entry]}
        gitHistory={[]}
        inspectorCollapsed={false}
        inspectorContent="hello"
        inspectorEntry={entry}
        inspectorWidth={320}
        onNavigateWikilink={vi.fn()}
        onToggleInspector={vi.fn()}
        onViewCommitDiff={vi.fn()}
        showAIChat={false}
        vaultPath="/tmp/vault"
      />,
    )

    expect(screen.getByTestId('memory-chitragupta-runtime')).toHaveTextContent('CLI installed')
  })
})
