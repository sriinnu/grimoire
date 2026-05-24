import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteItem } from './NoteItem'
import { makeEntry } from '../test-utils/noteListTestUtils'

const projectEntry = makeEntry({
  path: '/Users/srinivas/Grimoire/project/26q1-grimoire-app.md',
  filename: '26q1-grimoire-app.md',
  title: 'Build Grimoire App',
  isA: 'Project',
})

function renderContextRow(entry = makeEntry(), onClickNote = vi.fn()) {
  return render(
    <NoteItem
      entry={entry}
      isSelected={false}
      typeEntryMap={{}}
      allEntries={[entry, projectEntry]}
      onClickNote={onClickNote}
    />,
  )
}

describe('NoteItem project context', () => {
  it('shows resolved belongsTo project ownership next to the folder context', () => {
    const entry = makeEntry({
      path: '/Users/srinivas/Grimoire/projects/astral/todo.md',
      filename: 'todo.md',
      title: 'Todo',
      belongsTo: ['[[project/26q1-grimoire-app]]'],
    })

    renderContextRow(entry)

    expect(screen.getByTestId('note-location-chip')).toHaveTextContent('projects / astral')
    expect(screen.getByTestId('note-project-chip')).toHaveTextContent('Build Grimoire App')
    expect(screen.queryByText('project/26q1-grimoire-app')).toBeNull()
  })

  it('shows project relationship properties without duplicating list-property chips', () => {
    const entry = makeEntry({
      relationships: { Project: ['[[project/26q1-grimoire-app]]'] },
    })

    render(
      <NoteItem
        entry={entry}
        isSelected={false}
        typeEntryMap={{ Project: makeEntry({ title: 'Project', isA: 'Type' }) }}
        allEntries={[entry, projectEntry]}
        displayPropsOverride={['Project']}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('note-project-chip')).toBeNull()
    expect(screen.getByTestId('property-chip-project-0')).toHaveTextContent('Build Grimoire App')
  })

  it('shows project relationship properties when they are not already displayed', () => {
    const entry = makeEntry({
      relationships: { Project: ['[[project/26q1-grimoire-app]]'] },
    })

    renderContextRow(entry)

    expect(screen.getByTestId('note-project-chip')).toHaveTextContent('Build Grimoire App')
  })

  it('falls back to flat belongsTo refs when the project note is not in the current list', () => {
    const entry = makeEntry({
      belongsTo: ['[[26q1-grimoire-app]]'],
    })

    render(
      <NoteItem
        entry={entry}
        isSelected={false}
        typeEntryMap={{}}
        allEntries={[entry]}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getByTestId('note-project-chip')).toHaveTextContent('26q1 Grimoire App')
  })

  it('keeps explicit wikilink aliases for project chips', () => {
    const entry = makeEntry({
      belongsTo: ['[[project/26q1-grimoire-app|Launch Work]]'],
    })

    renderContextRow(entry)

    expect(screen.getByTestId('note-project-chip')).toHaveTextContent('Launch Work')
  })

  it('opens resolved project chips on Cmd-click without opening the current note on plain click', () => {
    const onClickNote = vi.fn()
    const entry = makeEntry({
      belongsTo: ['[[project/26q1-grimoire-app]]'],
    })

    renderContextRow(entry, onClickNote)

    const chip = screen.getByTestId('note-project-chip')
    fireEvent.click(chip)
    expect(onClickNote).not.toHaveBeenCalled()

    fireEvent.click(chip, { metaKey: true })
    expect(onClickNote).toHaveBeenCalledWith(projectEntry, expect.any(Object))
  })

  it('does not show unrelated relationship targets as projects', () => {
    const person = makeEntry({
      path: '/Users/srinivas/Grimoire/person/karthik.md',
      filename: 'karthik.md',
      title: 'Karthik',
      isA: 'Person',
    })
    const entry = makeEntry({
      belongsTo: ['[[person/karthik]]'],
    })

    render(
      <NoteItem
        entry={entry}
        isSelected={false}
        typeEntryMap={{}}
        allEntries={[entry, person]}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('note-project-chip')).toBeNull()
  })
})
