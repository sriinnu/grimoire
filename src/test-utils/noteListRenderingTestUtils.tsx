import { useState } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { expect } from 'vitest'
import { NoteList } from '../components/NoteList'
import type { ViewFile } from '../types'
import {
  allSelection,
  buildNoteListProps,
  makeEntry,
  makeTypeDefinition,
  renderNoteList,
} from './noteListTestUtils'

const noop = () => undefined
type NoteListRenderOptions = NonNullable<Parameters<typeof renderNoteList>[0]>

/** Builds a Book type definition with one matching note for note-list rendering specs. */
export function makeBookTypeEntries(
  displayProps: string[] = [],
  entryOverrides: Parameters<typeof makeEntry>[0] = {},
) {
  return [
    makeTypeDefinition('Book', displayProps),
    makeEntry({
      path: '/vault/book.md',
      filename: 'book.md',
      title: 'Book Note',
      isA: 'Book',
      createdAt: 1700000000,
      ...entryOverrides,
    }),
  ]
}

/** Creates a saved view fixture for NoteList rendering tests. */
export function makeViewDefinition(overrides: Partial<ViewFile> = {}): ViewFile {
  return {
    filename: 'active-books.yml',
    definition: {
      name: 'Active Books',
      icon: null,
      color: null,
      sort: null,
      filters: { all: [{ field: 'type', op: 'equals', value: 'Book' }] },
      ...overrides.definition,
    },
    ...overrides,
  }
}

/** Renders a NoteList whose view definition can be edited by the component under test. */
export function renderManagedViewNoteList({
  entries,
  view = makeViewDefinition(),
}: {
  entries: NoteListRenderOptions['entries']
  view?: ViewFile
}) {
  const built = buildNoteListProps({
    entries,
    selection: { kind: 'view', filename: view.filename },
    views: [view],
  })

  function ManagedViewNoteList() {
    const [views, setViews] = useState([view])

    return (
      <NoteList
        {...built.props}
        views={views}
        onUpdateViewDefinition={(filename, patch) => {
          setViews((currentViews) => currentViews.map((currentView) => (
            currentView.filename === filename
              ? { ...currentView, definition: { ...currentView.definition, ...patch } }
              : currentView
          )))
        }}
      />
    )
  }

  return {
    ...render(<ManagedViewNoteList />),
    ...built,
  }
}

/** Renders the shared Book-list fixture with optional list-property overrides. */
export function renderBookNoteList({
  displayProps = ['Priority'],
  entryOverrides = {},
  selection = allSelection,
  allNotesNoteListProperties,
  onUpdateAllNotesNoteListProperties = noop,
  inboxNoteListProperties,
  onUpdateInboxNoteListProperties = noop,
}: {
  displayProps?: string[]
  entryOverrides?: Parameters<typeof makeEntry>[0]
  selection?: NoteListRenderOptions['selection']
  allNotesNoteListProperties?: string[] | null
  onUpdateAllNotesNoteListProperties?: () => void
  inboxNoteListProperties?: string[] | null
  onUpdateInboxNoteListProperties?: () => void
} = {}) {
  return renderNoteList({
    entries: makeBookTypeEntries(displayProps, entryOverrides),
    selection,
    allNotesNoteListProperties,
    onUpdateAllNotesNoteListProperties,
    inboxNoteListProperties,
    onUpdateInboxNoteListProperties,
  })
}

/** Enters a NoteList search query and waits for the debounce spinner to settle. */
export async function searchNoteList(query: string) {
  const searchInput = screen.queryByPlaceholderText('Search notes...')
  if (!searchInput) fireEvent.click(screen.getByTitle('Search notes'))
  fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: query } })
  await waitFor(() => {
    expect(screen.getByTestId('note-list-search-loading')).toBeInTheDocument()
  })
  await waitFor(() => {
    expect(screen.queryByTestId('note-list-search-loading')).not.toBeInTheDocument()
  })
}

/** Verifies a visible-property search match and a hidden-property miss. */
export async function expectOnlySearchMatch(title: string, matchingQuery: string, hiddenQuery: string) {
  await searchNoteList(matchingQuery)
  expect(screen.getByText(title)).toBeInTheDocument()

  await searchNoteList(hiddenQuery)
  expect(screen.queryByText(title)).not.toBeInTheDocument()
  expect(screen.getByText('No matching notes')).toBeInTheDocument()
}
