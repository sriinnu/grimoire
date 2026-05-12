import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { AiAgentMessage } from '../hooks/useCliAiAgent'
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

function renderRightPanel(showAIChat: boolean) {
  return (
    <EditorRightPanel
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
  it('keeps AI chat history when the panel is closed and reopened', () => {
    const { rerender } = render(renderRightPanel(true))

    fireEvent.change(screen.getByTestId('agent-input'), { target: { value: 'remember this' } })
    fireEvent.click(screen.getByTestId('agent-send'))
    expect(screen.getByText('remember this')).toBeInTheDocument()

    rerender(renderRightPanel(false))
    expect(screen.queryByTestId('ai-panel')).toBeNull()

    rerender(renderRightPanel(true))
    expect(screen.getByText('remember this')).toBeInTheDocument()
    expect(screen.getByText('Still here.')).toBeInTheDocument()
  })
})
