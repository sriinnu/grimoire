import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { queueAiPrompt } from '../utils/aiPromptBridge'
import { GraphModal } from './GraphModal'

vi.mock('../utils/aiPromptBridge', () => ({
  queueAiPrompt: vi.fn(),
  requestOpenAiChat: vi.fn(),
}))

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    aliases: [],
    archived: false,
    belongsTo: [],
    color: null,
    createdAt: null,
    favorite: false,
    favoriteIndex: null,
    fileSize: 0,
    filename: overrides.filename ?? 'note.md',
    hasH1: true,
    icon: null,
    isA: overrides.isA ?? 'Note',
    listPropertiesDisplay: [],
    modifiedAt: null,
    order: null,
    organized: false,
    outgoingLinks: overrides.outgoingLinks ?? [],
    path: `/vault/${overrides.filename ?? 'note.md'}`,
    properties: overrides.properties ?? {},
    relatedTo: [],
    relationships: overrides.relationships ?? {},
    sidebarLabel: null,
    snippet: '',
    sort: null,
    status: null,
    template: null,
    title: overrides.title ?? 'Note',
    view: null,
    visible: null,
    wordCount: 0,
  }
}

describe('GraphModal agent package state', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('withholds agent packages when graph filters hide every node', () => {
    const alpha = entry({ filename: 'alpha.md', title: 'Alpha', outgoingLinks: ['Beta'] })
    const beta = entry({ filename: 'beta.md', title: 'Beta' })

    render(
      <GraphModal
        open={true}
        entries={[alpha, beta]}
        activePath={alpha.path}
        onOpenNote={vi.fn()}
        onClose={vi.fn()}
      />,
    )

    fireEvent.change(screen.getByTestId('graph-filter'), { target: { value: 'zzzz' } })

    expect(screen.getByText('No matching notes')).toBeInTheDocument()
    expect(screen.getByTestId('graph-agent-runway').querySelectorAll('.graph-agent-card[data-state="waiting"]')).toHaveLength(5)
    expect(within(screen.getByTestId('graph-agent-handoff')).getByText('No package')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Ask Council' })).not.toBeInTheDocument()
    expect(queueAiPrompt).not.toHaveBeenCalled()
  })
})
