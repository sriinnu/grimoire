import { act, fireEvent, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { openNoteListPropertiesPicker } from './note-list/noteListPropertiesEvents'
import {
  allSelection,
  makeEntry,
  makeTypeDefinition,
  renderNoteList,
} from '../test-utils/noteListTestUtils'
import {
  makeBookTypeEntries,
  makeViewDefinition,
  renderBookNoteList,
  renderManagedViewNoteList,
} from '../test-utils/noteListRenderingTestUtils'

describe('NoteList list properties', () => {
  it('shows the inbox customize-columns action and falls back to type-defined chips', async () => {
    renderBookNoteList({
      entryOverrides: { properties: { Priority: 'High', Owner: 'Sriinu' } },
      selection: { kind: 'filter', filter: 'inbox' },
      inboxNoteListProperties: null,
    })

    expect(await screen.findByTitle('Customize Inbox columns')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.queryByText('Sriinu')).not.toBeInTheDocument()
  })

  it('shows the all-notes customize-columns action and falls back to type-defined chips', async () => {
    renderBookNoteList({
      entryOverrides: { properties: { Priority: 'High', Owner: 'Sriinu' } },
      allNotesNoteListProperties: null,
    })

    expect(await screen.findByTitle('Customize All Notes columns')).toBeInTheDocument()
    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.queryByText('Sriinu')).not.toBeInTheDocument()
  })

  it('opens the all-notes column picker as a searchable combobox and saves new columns', async () => {
    const onUpdateAllNotesNoteListProperties = vi.fn()
    const archivedOwnerEntry = makeEntry({
      path: '/vault/book-archive.md',
      filename: 'book-archive.md',
      title: 'Archived Book',
      isA: 'Book',
      archived: true,
      properties: { Owner: 'Sriinu' },
    })

    renderNoteList({
      entries: [
        ...makeBookTypeEntries(['Priority'], { properties: { Priority: 'High' } }),
        archivedOwnerEntry,
      ],
      selection: allSelection,
      allNotesNoteListProperties: null,
      onUpdateAllNotesNoteListProperties,
    })

    act(() => {
      openNoteListPropertiesPicker('all')
    })

    expect(await screen.findByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByTestId('list-properties-popover')).toHaveClass('overflow-hidden')
    expect(screen.getByTestId('list-properties-scroll-area')).toBeInTheDocument()
    expect(screen.getByTestId('list-properties-scroll-area')).toHaveClass('overflow-y-auto')
    expect(screen.getByRole('checkbox', { name: 'Priority' })).toBeChecked()
    expect(screen.getByRole('checkbox', { name: 'Owner' })).toBeInTheDocument()

    const combobox = screen.getByRole('combobox', { name: 'Search note-list properties' })
    await waitFor(() => expect(combobox).toHaveFocus())

    fireEvent.change(combobox, { target: { value: 'Owner' } })
    expect(screen.getByRole('checkbox', { name: 'Owner' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'Priority' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner' }))
    expect(onUpdateAllNotesNoteListProperties).toHaveBeenCalledWith(['Priority', 'Owner'])

    fireEvent.keyDown(combobox, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByTestId('list-properties-popover')).not.toBeInTheDocument())
  })

  it('opens the inbox column picker from the global event and saves new columns', async () => {
    const onUpdateInboxNoteListProperties = vi.fn()

    renderNoteList({
      entries: makeBookTypeEntries(['Priority'], { properties: { Priority: 'High', Owner: 'Sriinu' } }),
      selection: { kind: 'filter', filter: 'inbox' },
      inboxNoteListProperties: null,
      onUpdateInboxNoteListProperties,
    })

    act(() => {
      openNoteListPropertiesPicker('inbox')
    })

    expect(await screen.findByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Search note-list properties' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Priority' })).toBeChecked()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner' }))
    expect(onUpdateInboxNoteListProperties).toHaveBeenCalledWith(['Priority', 'Owner'])
  })

  it('opens the view column picker from the global event and applies the saved columns', async () => {
    renderManagedViewNoteList({
      entries: makeBookTypeEntries(['Priority'], { properties: { Priority: 'High', Owner: 'Sriinu' } }),
    })

    expect(screen.getByText('High')).toBeInTheDocument()
    expect(screen.queryByText('Sriinu')).not.toBeInTheDocument()

    act(() => {
      openNoteListPropertiesPicker('view')
    })

    expect(await screen.findByTestId('list-properties-popover')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('checkbox', { name: 'Owner' }))

    expect(screen.getByText('Sriinu')).toBeInTheDocument()
  })

  it('shows an empty-state picker for views with no matching properties', async () => {
    renderManagedViewNoteList({
      entries: makeBookTypeEntries(),
      view: makeViewDefinition({
        filename: 'empty-view.yml',
        definition: {
          name: 'Empty View',
          filters: { all: [{ field: 'type', op: 'equals', value: 'Project' }] },
        },
      }),
    })

    act(() => {
      openNoteListPropertiesPicker('view')
    })

    expect(await screen.findByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByText('No properties match this search.')).toBeInTheDocument()
  })

  it('shows status in the type column picker when at least one note has it set', async () => {
    renderNoteList({
      entries: makeBookTypeEntries([], { status: 'Active' }),
      selection: { kind: 'sectionGroup', type: 'Book' },
      onUpdateTypeSort: () => undefined,
    })

    act(() => {
      openNoteListPropertiesPicker('type')
    })

    expect(await screen.findByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Search note-list properties' })).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'status' })).toBeInTheDocument()
  })

  it('keeps blank statuses out of the type column picker', async () => {
    renderNoteList({
      entries: makeBookTypeEntries([], { status: '', properties: { Owner: 'Sriinu' } }),
      selection: { kind: 'sectionGroup', type: 'Book' },
      onUpdateTypeSort: () => undefined,
    })

    act(() => {
      openNoteListPropertiesPicker('type')
    })

    expect(await screen.findByTestId('list-properties-popover')).toBeInTheDocument()
    expect(screen.getByRole('checkbox', { name: 'Owner' })).toBeInTheDocument()
    expect(screen.queryByRole('checkbox', { name: 'status' })).not.toBeInTheDocument()
  })

  it('renders status as a note-list chip when a type displays it', () => {
    renderNoteList({
      entries: makeBookTypeEntries(['status'], { status: 'Active' }),
      selection: { kind: 'sectionGroup', type: 'Book' },
    })

    const chip = screen.getByTestId('property-chip-status-0')
    expect(chip).toHaveTextContent('• Active')
    expect(chip).toHaveStyle({ backgroundColor: 'var(--accent-green-light)', color: 'var(--accent-green)' })
  })

  it('auto-detects status-like property values in note-list chips', () => {
    renderNoteList({
      entries: makeBookTypeEntries(['Phase'], { properties: { Phase: 'Draft' } }),
      selection: { kind: 'sectionGroup', type: 'Book' },
    })

    const chip = screen.getByTestId('property-chip-phase-0')
    expect(chip).toHaveTextContent('• Draft')
    expect(chip).toHaveStyle({ backgroundColor: 'var(--accent-yellow-light)', color: 'var(--accent-yellow)' })
  })

  it('keeps unknown status values on neutral note-list chip styling', () => {
    renderNoteList({
      entries: makeBookTypeEntries(['status'], { status: 'Needs Review' }),
      selection: { kind: 'sectionGroup', type: 'Book' },
    })

    const chip = screen.getByTestId('property-chip-status-0')
    expect(chip).toHaveTextContent('• Needs Review')
    expect(chip.getAttribute('style')).toBeNull()
  })

  it('uses inbox overrides when configured', () => {
    renderNoteList({
      entries: makeBookTypeEntries(['Priority'], { properties: { Priority: 'High', Owner: 'Sriinu' } }),
      selection: { kind: 'filter', filter: 'inbox' },
      inboxNoteListProperties: ['Owner'],
      onUpdateInboxNoteListProperties: () => undefined,
    })

    expect(screen.getByText('Sriinu')).toBeInTheDocument()
    expect(screen.queryByText('High')).not.toBeInTheDocument()
  })

  it('Cmd+clicks relationship chips through the note list without triggering the row click', async () => {
    const projectType = makeTypeDefinition('Project')
    const taskType = makeTypeDefinition('Task', ['Belongs to'])
    const projectEntry = makeEntry({
      path: '/vault/project/build-app.md',
      filename: 'build-app.md',
      title: 'Build App',
      isA: 'Project',
      createdAt: 1700000000,
    })
    const taskEntry = makeEntry({
      path: '/vault/task/write-tests.md',
      filename: 'write-tests.md',
      title: 'Write tests',
      isA: 'Task',
      relationships: { 'Belongs to': ['[[project/build-app]]'] },
      createdAt: 1700000001,
    })

    const { onReplaceActiveTab, onEnterNeighborhood } = renderNoteList({
      entries: [projectType, taskType, projectEntry, taskEntry],
      selection: { kind: 'sectionGroup', type: 'Task' },
    })

    const chip = screen.getByTestId('property-chip-belongs-to-0')

    fireEvent.click(chip)
    expect(onReplaceActiveTab).not.toHaveBeenCalled()
    expect(onEnterNeighborhood).not.toHaveBeenCalled()

    fireEvent.click(chip, { metaKey: true })
    await waitFor(() => {
      expect(onReplaceActiveTab).toHaveBeenCalledWith(projectEntry)
      expect(onEnterNeighborhood).toHaveBeenCalledWith(projectEntry)
    })
  })
})
