import { act, fireEvent, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import {
  makeEntry,
  mockEntries,
  renderNoteList,
} from '../test-utils/noteListTestUtils'
import { expectOnlySearchMatch, renderBookNoteList, searchNoteList } from '../test-utils/noteListRenderingTestUtils'

describe('NoteList rendering', () => {
  it('shows an empty state when there are no entries', () => {
    renderNoteList({ entries: [] })
    expect(screen.getByText('No notes found')).toBeInTheDocument()
  })

  it('renders all entries in the all-notes view', () => {
    renderNoteList()
    expect(screen.getByText('Build Grimoire App')).toBeInTheDocument()
    expect(screen.getByText('Facebook Ads Strategy')).toBeInTheDocument()
    expect(screen.getByText('Karthik Reddy')).toBeInTheDocument()
  })

  it('filters section groups by type', () => {
    renderNoteList({ selection: { kind: 'sectionGroup', type: 'Person' } })
    expect(screen.getByText('Karthik Reddy')).toBeInTheDocument()
    expect(screen.queryByText('Build Grimoire App')).not.toBeInTheDocument()
  })

  it('lazy-loads project intelligence only for folder selections', async () => {
    renderNoteList({
      selection: { kind: 'folder', path: 'project' },
      entries: [
        makeEntry({
          path: '/vault/project/README.md',
          filename: 'README.md',
          title: 'README',
          snippet: '- [ ] Wire project board',
        }),
      ],
    })

    expect(await screen.findByTestId('project-workspace-strip')).toBeInTheDocument()
    const chrome = await screen.findByTestId('project-workspace-chrome')
    expect(chrome).toHaveClass('project-workspace-chrome')
    expect(chrome.querySelector('.project-workspace-chrome__overview')).toBeInTheDocument()
    expect(chrome.querySelector('.project-workspace-chrome__metrics')).toBeInTheDocument()
    expect(chrome.querySelector('.project-workspace-chrome__actions')).toBeInTheDocument()
    expect(chrome.querySelector('.project-workspace-chrome__search')).toBeInTheDocument()
    expect(chrome.querySelector('.project-workspace-chrome__search-actions')).toBeInTheDocument()
  })

  it('renders folder filters as a footer instead of overlaying note cards', () => {
    renderNoteList({
      selection: { kind: 'folder', path: 'project' },
      entries: [
        makeEntry({
          path: '/vault/project/README.md',
          filename: 'README.md',
          title: 'README',
        }),
      ],
    })

    const filters = screen.getByTestId('note-list-bottom-filters')
    expect(filters).toHaveClass('shrink-0')
    expect(filters.querySelector('.note-list-filter-shelf')).toBeInTheDocument()
    expect(filters.querySelector('.note-list-filter-shelf')).toHaveClass('note-list-filter-shelf')
    expect(screen.getByTestId('note-list-file-scope-group')).toHaveClass('note-list-filter-group')
    expect(screen.getByTestId('note-list-state-filter-group')).toHaveClass('note-list-filter-group')
    expect(filters).not.toHaveClass('absolute')
  })

  it('supports event sections', () => {
    renderNoteList({ selection: { kind: 'sectionGroup', type: 'Event' } })
    expect(screen.getByText('Kickoff Meeting')).toBeInTheDocument()
    expect(screen.queryByText('Build Grimoire App')).not.toBeInTheDocument()
  })

  it('supports project sections', () => {
    renderNoteList({ selection: { kind: 'sectionGroup', type: 'Project' } })
    expect(screen.getByText('Build Grimoire App')).toBeInTheDocument()
    expect(screen.queryByText('Karthik Reddy')).not.toBeInTheDocument()
  })

  it('passes the selected type when creating a note from a type section', () => {
    const { onCreateNote } = renderNoteList({ selection: { kind: 'sectionGroup', type: 'Project' } })
    fireEvent.click(screen.getByTitle('Create new note'))
    expect(onCreateNote).toHaveBeenCalledWith('Project')
  })

  it('creates an untyped note from all notes', () => {
    const { onCreateNote } = renderNoteList()
    fireEvent.click(screen.getByTitle('Create new note'))
    expect(onCreateNote).toHaveBeenCalledWith(undefined)
  })

  it('pins the current entity and shows grouped children', () => {
    renderNoteList({ selection: { kind: 'entity', entry: mockEntries[0] } })
    expect(screen.getAllByText('Build Grimoire App').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Facebook Ads Strategy')).toBeInTheDocument()
    expect(screen.queryByText('Karthik Reddy')).not.toBeInTheDocument()
    expect(screen.getByText('Children')).toBeInTheDocument()
    expect(screen.getByText('Related to')).toBeInTheDocument()
  })

  it('shows referenced-by groups for topic entities', () => {
    renderNoteList({ selection: { kind: 'entity', entry: mockEntries[4] } })
    expect(screen.getByText('Build Grimoire App')).toBeInTheDocument()
    expect(screen.getByText('Referenced by')).toBeInTheDocument()
  })

  it('toggles the search input from the header action', () => {
    renderNoteList()
    expect(screen.queryByPlaceholderText('Search notes...')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('Search notes'))
    expect(screen.getByPlaceholderText('Search notes...')).toBeInTheDocument()
  })

  it('filters by a case-insensitive search query', async () => {
    renderNoteList()
    await searchNoteList('facebook')
    expect(screen.getByText('Facebook Ads Strategy')).toBeInTheDocument()
    expect(screen.queryByText('Build Grimoire App')).not.toBeInTheDocument()
  })

  it('filters by snippet text when the title does not match', async () => {
    renderNoteList({
      entries: [
        makeEntry({ path: '/vault/a.md', filename: 'a.md', title: 'Alpha Note', snippet: 'Routine body copy.' }),
        makeEntry({ path: '/vault/b.md', filename: 'b.md', title: 'Beta Note', snippet: 'Nebula-only snippet token.' }),
      ],
    })

    await searchNoteList('nebula-only')

    expect(screen.getByText('Beta Note')).toBeInTheDocument()
    expect(screen.queryByText('Alpha Note')).not.toBeInTheDocument()
  })

  it('filters by visible property values and ignores hidden properties', async () => {
    renderBookNoteList({
      entryOverrides: {
        title: 'Property Search Note',
        properties: { Priority: 'Boarding Window', Owner: 'Hidden Owner Value' },
      },
      allNotesNoteListProperties: null,
    })

    await expectOnlySearchMatch('Property Search Note', 'boarding window', 'hidden owner value')
  })

  it('uses the active all-notes columns when filtering by visible property values', async () => {
    renderBookNoteList({
      entryOverrides: {
        title: 'Override Search Note',
        properties: { Priority: 'Hidden Priority', Owner: 'Visible Owner Value' },
      },
      allNotesNoteListProperties: ['Owner'],
    })

    await expectOnlySearchMatch('Override Search Note', 'visible owner value', 'hidden priority')
  })

  it('sorts entries by last modified descending by default', () => {
    renderNoteList({
      entries: [
        { ...mockEntries[0], modifiedAt: 1000, title: 'Oldest' },
        { ...mockEntries[1], modifiedAt: 3000, title: 'Newest', path: '/p2' },
        { ...mockEntries[2], modifiedAt: 2000, title: 'Middle', path: '/p3' },
      ],
    })

    const titles = screen.getAllByTestId('note-title').map((element) => element.textContent)
    expect(titles).toEqual(['Newest', 'Middle', 'Oldest'])
  })

  it('shows status as a compact signal chip inside note rows', () => {
    renderNoteList()
    expect(screen.getByText('Active')).toHaveAttribute('data-note-chip', 'true')
  })

  it('shows search and create actions in the header instead of a count badge', () => {
    renderNoteList()
    expect(screen.getByTitle('Search notes')).toBeInTheDocument()
    expect(screen.getByTitle('Create new note')).toBeInTheDocument()
  })

  it('uses breadcrumbs-like button styling for note-list header actions', () => {
    renderBookNoteList({
      entryOverrides: { properties: { Priority: 'High' } },
      selection: { kind: 'filter', filter: 'inbox' },
      inboxNoteListProperties: null,
    })

    const buttons = [
      screen.getByTitle('Search notes'),
      screen.getByTitle('Customize Inbox columns'),
      screen.getByTitle('Create new note'),
    ]

    for (const button of buttons) {
      expect(button).toHaveAttribute('data-variant', 'ghost')
      expect(button).toHaveClass(
        '!h-auto',
        '!w-auto',
        '!min-w-0',
        '!rounded-none',
        '!p-0',
        '!text-muted-foreground',
        'hover:!bg-transparent',
        'hover:!text-foreground',
      )
      expect(button).not.toHaveAttribute('tabindex', '-1')
    }
  })

  it('keeps the note-list search input full width and shows only an inline spinner while loading', () => {
    vi.useFakeTimers()
    try {
      renderNoteList({
        entries: [
          makeEntry({ path: '/vault/a.md', filename: 'a.md', title: 'Alpha Strategy' }),
          makeEntry({ path: '/vault/b.md', filename: 'b.md', title: 'Beta Note' }),
        ],
      })

      fireEvent.click(screen.getByTitle('Search notes'))
      fireEvent.change(screen.getByPlaceholderText('Search notes...'), { target: { value: 'strategy' } })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      expect(searchInput).toHaveClass('pr-8')
      expect(searchInput.parentElement).toHaveClass('relative', 'flex-1')
      expect(screen.getByTestId('note-list-search-loading')).toBeInTheDocument()
      expect(screen.queryByText('Searching...')).not.toBeInTheDocument()

      act(() => {
        vi.advanceTimersByTime(180)
      })

      expect(screen.queryByTestId('note-list-search-loading')).not.toBeInTheDocument()
    } finally {
      vi.useRealTimers()
    }
  })
})
