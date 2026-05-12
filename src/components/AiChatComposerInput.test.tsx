import { useState } from 'react'
import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../types'
import { AiChatComposerInput } from './AiChatComposerInput'
import { UNSUPPORTED_INLINE_PASTE_MESSAGE } from './InlineWikilinkInput'

const makeEntry = (overrides: Partial<VaultEntry> = {}): VaultEntry => ({
  path: '/vault/alpha.md',
  filename: 'alpha.md',
  title: 'Alpha',
  isA: 'Project',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: null,
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
  hasH1: false,
  fileKind: 'markdown',
  ...overrides,
})

const entries = [
  makeEntry(),
  makeEntry({ path: '/vault/beta.md', filename: 'beta.md', title: 'Beta', isA: 'Person', aliases: ['BLT'] }),
]

function Controlled({ onSend = vi.fn(), onUnsupportedPaste }: {
  onSend?: (text: string, references: Array<{ title: string; path: string; type: string | null }>) => void
  onUnsupportedPaste?: (message: string) => void
}) {
  const [value, setValue] = useState('')
  return (
    <AiChatComposerInput
      entries={entries}
      value={value}
      onChange={setValue}
      onSend={onSend}
      onUnsupportedPaste={onUnsupportedPaste}
      placeholder="Ask..."
    />
  )
}

function changeInput(value: string) {
  const input = screen.getByTestId('agent-input') as HTMLTextAreaElement
  fireEvent.change(input, { target: { value } })
  input.setSelectionRange(value.length, value.length)
  fireEvent.select(input)
  return input
}

describe('AiChatComposerInput', () => {
  it('uses a stable textarea value without duplicating typed words', () => {
    render(<Controlled />)

    const input = changeInput('hello')
    expect(input).toHaveValue('hello')
    expect(input).toHaveAttribute('rows', '3')

    changeInput('hello world')
    expect(input).toHaveValue('hello world')
    expect(input).not.toHaveValue('hellohello world')
  })

  it('selects wikilink suggestions while keeping markdown text in the textarea', () => {
    render(<Controlled />)

    const input = changeInput('read [[alp')
    expect(screen.getByTestId('wikilink-menu')).toHaveTextContent('Alpha')

    fireEvent.keyDown(input, { key: 'Enter' })
    expect(input).toHaveValue('read [[alpha]]')
  })

  it('submits textarea content with resolved references', () => {
    const onSend = vi.fn()
    render(<Controlled onSend={onSend} />)

    const input = changeInput('summarize [[alpha]]')
    fireEvent.keyDown(input, { key: 'Enter' })

    expect(onSend).toHaveBeenCalledWith('summarize [[alpha]]', [
      { title: 'Alpha', path: '/vault/alpha.md', type: 'Project' },
    ])
  })

  it('rejects image paste without mutating the draft', () => {
    const onUnsupportedPaste = vi.fn()
    render(<Controlled onUnsupportedPaste={onUnsupportedPaste} />)

    const input = changeInput('still works')
    fireEvent.paste(input, {
      clipboardData: {
        files: [new File(['image'], 'paste.png', { type: 'image/png' })],
        items: [{ kind: 'file', type: 'image/png' }],
      },
    })

    expect(onUnsupportedPaste).toHaveBeenCalledWith(UNSUPPORTED_INLINE_PASTE_MESSAGE)
    expect(input).toHaveValue('still works')
  })
})
