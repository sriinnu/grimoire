import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const { useCodeMirrorMock, viewRefState } = vi.hoisted(() => ({
  useCodeMirrorMock: vi.fn(),
  viewRefState: { current: null as null | ReturnType<typeof createMockView> },
}))

vi.mock('../hooks/useCodeMirror', () => ({
  useCodeMirror: useCodeMirrorMock,
}))

import { RawEditorView } from './RawEditorView'
import type { VaultEntry } from '../types'

function createMockView(docText = 'alpha beta alpha') {
  let currentDoc = docText
  return {
    state: {
      doc: { toString: () => currentDoc },
      selection: { main: { head: 0 } },
    },
    coordsAtPos: vi.fn(() => ({ bottom: 24, left: 32 })),
    dispatch: vi.fn(),
    focus: vi.fn(),
    setDocText: (nextDoc: string) => { currentDoc = nextDoc },
  }
}

function entry(title: string): VaultEntry {
  return {
    aliases: [],
    archived: false,
    belongsTo: [],
    color: null,
    createdAt: null,
    favorite: false,
    favoriteIndex: null,
    fileKind: 'markdown',
    fileSize: 0,
    filename: `${title}.md`,
    hasH1: true,
    icon: null,
    isA: 'Note',
    listPropertiesDisplay: [],
    modifiedAt: null,
    order: null,
    organized: false,
    outgoingLinks: [],
    path: `/vault/${title}.md`,
    properties: {},
    relationships: {},
    relatedTo: [],
    sidebarLabel: null,
    snippet: '',
    sort: null,
    status: null,
    template: null,
    title,
    view: null,
    visible: true,
    wordCount: 0,
  }
}

describe('RawEditorView find command', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    viewRefState.current = createMockView()
    useCodeMirrorMock.mockReturnValue(viewRefState)
  })

  it('opens find/replace from the CodeMirror find callback and replaces the active match', () => {
    render(
      <RawEditorView
        content="alpha beta alpha"
        path="/vault/a.md"
        entries={[entry('Alpha')]}
        onContentChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    const callbacks = useCodeMirrorMock.mock.calls[0]![2] as { onFind: () => boolean }
    act(() => {
      expect(callbacks.onFind()).toBe(true)
    })

    fireEvent.change(screen.getByLabelText('Find in note'), { target: { value: 'alpha' } })
    expect(screen.getByTestId('raw-editor-find-count')).toHaveTextContent('1/2')

    fireEvent.click(screen.getByLabelText('Next match'))
    expect(screen.getByTestId('raw-editor-find-count')).toHaveTextContent('2/2')

    fireEvent.change(screen.getByLabelText('Replace with'), { target: { value: 'omega' } })
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    expect(viewRefState.current?.dispatch).toHaveBeenCalledWith({
      changes: { from: 11, to: 16, insert: 'omega' },
      selection: { anchor: 16 },
    })
  })

  it('recomputes match offsets from the live CodeMirror document before replacing', () => {
    render(
      <RawEditorView
        content="alpha beta alpha"
        path="/vault/a.md"
        entries={[entry('Alpha')]}
        onContentChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    const callbacks = useCodeMirrorMock.mock.calls[0]![2] as { onFind: () => boolean }
    act(() => {
      callbacks.onFind()
    })

    fireEvent.change(screen.getByLabelText('Find in note'), { target: { value: 'alpha' } })
    fireEvent.click(screen.getByLabelText('Next match'))
    viewRefState.current?.setDocText('omega alpha')
    fireEvent.change(screen.getByLabelText('Replace with'), { target: { value: 'done' } })
    fireEvent.click(screen.getByRole('button', { name: 'Replace' }))

    expect(viewRefState.current?.dispatch).toHaveBeenLastCalledWith({
      changes: { from: 6, to: 11, insert: 'done' },
      selection: { anchor: 10 },
    })
  })

  it('clears raw-editor autocomplete when find opens and keeps find keys local', () => {
    render(
      <RawEditorView
        content="[[Al"
        path="/vault/a.md"
        entries={[entry('Alpha')]}
        onContentChange={vi.fn()}
        onSave={vi.fn()}
      />,
    )

    const callbacks = useCodeMirrorMock.mock.calls[0]![2] as {
      onCursorActivity: (view: NonNullable<typeof viewRefState.current>) => void
      onFind: () => boolean
    }
    viewRefState.current?.setDocText('[[Al')
    if (viewRefState.current) viewRefState.current.state.selection.main.head = '[[Al'.length
    act(() => {
      if (viewRefState.current) callbacks.onCursorActivity(viewRefState.current)
    })
    expect(screen.getByTestId('raw-editor-wikilink-dropdown')).toBeInTheDocument()

    act(() => {
      callbacks.onFind()
    })

    expect(screen.queryByTestId('raw-editor-wikilink-dropdown')).not.toBeInTheDocument()
    fireEvent.keyDown(screen.getByLabelText('Find in note'), { key: 'Enter' })
    expect(viewRefState.current?.dispatch).not.toHaveBeenCalled()
  })
})
