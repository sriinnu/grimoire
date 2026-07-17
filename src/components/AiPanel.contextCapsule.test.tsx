import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { AiPanel } from './AiPanel'

vi.mock('../hooks/useCliAiAgent', () => ({
  useCliAiAgent: () => ({
    messages: [],
    status: 'idle',
    sendMessage: vi.fn(),
    clearConversation: vi.fn(),
  }),
}))

vi.mock('../utils/ai-chat', () => ({
  nextMessageId: () => 'msg-context-capsule',
}))

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/vault/project/grimoire.md',
    filename: 'grimoire.md',
    title: 'Grimoire',
    isA: 'Project',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: null,
    createdAt: null,
    fileSize: 0,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('AiPanel Context Capsule', () => {
  it('shows an inspectable capsule for allowed active context', () => {
    const active = entry({ outgoingLinks: ['Research'] })
    const linked = entry({
      path: '/vault/research.md',
      filename: 'research.md',
      title: 'Research',
      isA: 'Note',
    })

    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/tmp/vault"
        activeEntry={active}
        entries={[active, linked]}
        openTabs={[active, linked]}
        noteList={[
          { path: active.path, title: active.title, type: 'Project' },
          { path: linked.path, title: linked.title, type: 'Note' },
        ]}
      />,
    )

    fireEvent.click(screen.getByTestId('ai-context-inspector'))
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('Context Inspector')
    expect(screen.getByTestId('context-manifest-sources')).toHaveTextContent('Grimoire')
    expect(screen.getByTestId('context-manifest-sources')).toHaveTextContent('Research')
  })

  it('withholds protected active context without leaking title', () => {
    const hidden = entry({
      path: '/vault/dreams/river.md',
      title: 'River Dream',
      isA: 'Dream',
    })

    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/tmp/vault"
        activeEntry={hidden}
        entries={[hidden]}
      />,
    )

    fireEvent.click(screen.getByTestId('ai-context-inspector'))
    expect(screen.getByTestId('context-capsule-dialog')).toHaveTextContent('Protected local context')
    expect(screen.queryByText('River Dream')).toBeNull()
  })
})
