import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { AiPanel } from './AiPanel'
import type { VaultEntry } from '../types'

let mockMessages: ReturnType<typeof import('../hooks/useCliAiAgent').useCliAiAgent>['messages'] = []

vi.mock('../hooks/useCliAiAgent', () => ({
  useCliAiAgent: () => ({
    messages: mockMessages,
    status: 'idle',
    sendMessage: vi.fn(),
    clearConversation: vi.fn(),
  }),
}))

vi.mock('../utils/ai-chat', () => ({
  nextMessageId: () => `msg-${Date.now()}`,
}))

function entry(overrides: Partial<VaultEntry> = {}): VaultEntry {
  return {
    path: '/tmp/vault/projects/grimoire.md',
    filename: 'grimoire.md',
    title: 'Grimoire Plan',
    isA: 'Project',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    owner: null,
    cadence: null,
    archived: false,
    modifiedAt: 1700000000,
    createdAt: 1700000000,
    fileSize: 100,
    snippet: '',
    wordCount: 0,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    outgoingLinks: [],
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    properties: {},
    hasH1: false,
    fileKind: 'markdown',
    ...overrides,
  }
}

describe('AiPanel Crystallize workbench', () => {
  beforeEach(() => {
    mockMessages = []
  })

  it('applies reviewed memory and an editable active-note append hunk', async () => {
    const activeEntry = entry()
    const onReplaceContent = vi.fn().mockResolvedValue(undefined)
    const onFileModified = vi.fn()
    const onVaultChanged = vi.fn()
    mockMessages = [{
      userMessage: 'What changed?',
      actions: [],
      response: 'Ship Crystallize as a reviewed Markdown diff loop.',
      id: 'msg-crystallize-workbench',
    }]

    render(
      <AiPanel
        onClose={vi.fn()}
        vaultPath="/tmp/vault"
        activeEntry={activeEntry}
        activeNoteContent={'# Grimoire Plan\n\nExisting plan.'}
        entries={[activeEntry]}
        onReplaceContent={onReplaceContent}
        onFileModified={onFileModified}
        onVaultChanged={onVaultChanged}
      />,
    )

    fireEvent.click(screen.getByTestId('ai-crystallize'))
    expect(screen.getByTestId('crystallize-change-kind-note')).toBeInTheDocument()
    const appendPreview = screen.getByTestId('crystallize-active-note-append-preview') as HTMLTextAreaElement
    fireEvent.change(appendPreview, {
      target: { value: `${appendPreview.value}\n\n- [ ] Review this in tomorrow's vault pass.` },
    })

    fireEvent.click(screen.getByTestId('crystallize-apply'))

    await waitFor(() => expect(onReplaceContent).toHaveBeenCalledOnce())
    expect(onReplaceContent).toHaveBeenCalledWith(
      '/tmp/vault/projects/grimoire.md',
      expect.stringContaining('# Grimoire Plan\n\nExisting plan.\n\n## Crystallized Follow-up'),
    )
    expect(onReplaceContent.mock.calls[0]?.[1]).toContain("tomorrow's vault pass")
    expect(onFileModified).toHaveBeenCalledWith('projects/grimoire.md')
    expect(onVaultChanged).toHaveBeenCalledOnce()
  })
})
