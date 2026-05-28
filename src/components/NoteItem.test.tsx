import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { NoteItem } from './NoteItem'
import { makeEntry } from '../test-utils/noteListTestUtils'

const NOW_SECONDS = 1_744_286_400

describe('NoteItem', () => {
  it('renders binary files as non-clickable muted rows', () => {
    const binaryEntry = makeEntry({
      path: '/vault/archive.zip',
      filename: 'archive.zip',
      title: 'archive.zip',
      fileKind: 'binary',
    })
    const onClickNote = vi.fn()

    render(<NoteItem entry={binaryEntry} isSelected={false} typeEntryMap={{}} onClickNote={onClickNote} />)

    const item = screen.getByTestId('binary-file-item')
    expect(item.className).toContain('opacity-50')
    expect(item).toHaveAttribute('title', 'Cannot open this file type')

    fireEvent.click(item)
    expect(onClickNote).not.toHaveBeenCalled()
  })

  it('renders image files as clickable preview rows', () => {
    const imageEntry = makeEntry({
      path: '/vault/logo.svg',
      filename: 'logo.svg',
      title: 'logo.svg',
      fileKind: 'binary',
    })
    const onClickNote = vi.fn()
    const { container } = render(
      <NoteItem entry={imageEntry} isSelected={false} typeEntryMap={{}} onClickNote={onClickNote} />,
    )

    expect(screen.queryByTestId('binary-file-item')).toBeNull()

    const item = container.querySelector('[data-note-path="/vault/logo.svg"]')!
    expect(item.className).toContain('cursor-pointer')

    fireEvent.click(item)
    expect(onClickNote).toHaveBeenCalledWith(imageEntry, expect.any(Object))
  })

  it('renders text files as clickable rows', () => {
    const textEntry = makeEntry({
      path: '/vault/config.yml',
      filename: 'config.yml',
      title: 'config.yml',
      fileKind: 'text',
    })
    const onClickNote = vi.fn()

    render(<NoteItem entry={textEntry} isSelected={false} typeEntryMap={{}} onClickNote={onClickNote} />)

    const item = screen.getByText('config.yml').closest('div')!
    fireEvent.click(item)
    expect(onClickNote).toHaveBeenCalled()
  })

  it('shows the vault-relative folder on note rows', () => {
    const entry = makeEntry({
      path: '/Users/srinivas/Grimoire/projects/astral/todo.md',
      filename: 'todo.md',
      title: 'Todo',
    })

    render(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} />)

    expect(screen.getByTestId('note-location-chip')).toHaveTextContent('projects / astral')
  })

  it('shows the title with filename metadata when a change status is present', () => {
    const entry = {
      ...makeEntry({ filename: 'my-note.md', title: 'My Note Title' }),
      __changeAddedLines: 42,
      __changeDeletedLines: 7,
    }

    render(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} changeStatus="modified" />)

    expect(screen.getByText('My Note Title')).toBeInTheDocument()
    expect(screen.getByText('my-note.md')).toBeInTheDocument()
    expect(screen.getByTestId('change-note-filename')).toHaveClass('truncate', 'text-[12px]', 'leading-[1.5]', 'text-muted-foreground')
    expect(screen.getByTestId('change-stat-added')).toHaveTextContent('+42')
    expect(screen.getByTestId('change-stat-deleted')).toHaveTextContent('-7')
  })

  it('renders the correct symbol for modified files', () => {
    const entry = makeEntry({ filename: 'note.md' })

    render(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} changeStatus="modified" />)

    expect(screen.getByTestId('change-status-icon').textContent).toBe('·')
  })

  it('renders the correct symbol for added files', () => {
    const entry = makeEntry({ filename: 'new-note.md' })

    render(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} changeStatus="added" />)

    expect(screen.getByTestId('change-status-icon').textContent).toBe('+')
  })

  it('shows a neutral fallback when line stats are unavailable', () => {
    const entry = makeEntry({ filename: 'binary-note.md', title: 'Binary Note' })

    render(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} changeStatus="modified" />)

    expect(screen.getByTestId('change-stat-fallback')).toHaveTextContent('Diff unavailable')
  })

  it('renders the regular title when no change status is set', () => {
    const entry = makeEntry({ filename: 'note.md', title: 'My Note' })

    render(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} />)

    expect(screen.getByText('My Note')).toBeInTheDocument()
    expect(screen.queryByText('note.md')).not.toBeInTheDocument()
    expect(screen.queryByTestId('change-status-icon')).not.toBeInTheDocument()
  })

  it('adds more breathing room between note sections', () => {
    const entry = makeEntry({
      title: 'Spaced note',
      snippet: 'Body preview',
      createdAt: NOW_SECONDS - 86400 * 3,
      modifiedAt: NOW_SECONDS - 86400,
      properties: { Status: 'Active' },
    })

    render(
      <NoteItem
        entry={entry}
        isSelected={false}
        typeEntryMap={{}}
        displayPropsOverride={['Status']}
        onClickNote={vi.fn()}
      />,
    )

    expect(screen.getByTestId('note-content-stack').className).toContain('space-y-2')
  })

  it('leaves selected row background to theme CSS while exposing a type accent', () => {
    const entry = makeEntry({ title: 'Selected note', isA: 'Project' })
    const projectType = makeEntry({ title: 'Project', isA: 'Type', color: 'green' })
    const { container } = render(
      <NoteItem
        entry={entry}
        isSelected={true}
        typeEntryMap={{ Project: projectType }}
        onClickNote={vi.fn()}
      />,
    )

    const item = container.querySelector('[data-selected="true"]') as HTMLElement

    expect(item.style.backgroundColor).toBe('')
    expect(item.style.getPropertyValue('--note-type-color')).toBe('var(--accent-green)')
    expect(item.style.borderLeftColor).toBe('')
    expect(item.className).not.toContain('border-l-[3px]')
  })

  it('shows created date on the right side of the date row when available', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_SECONDS * 1000))
    const entry = makeEntry({
      title: 'Dated note',
      createdAt: NOW_SECONDS - 86400 * 5,
      modifiedAt: NOW_SECONDS - 86400 * 2,
    })

    render(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} />)

    const dateRow = screen.getByTestId('note-date-row')
    expect(dateRow.className).toContain('grid')
    expect(dateRow).toHaveTextContent('2d ago')
    expect(dateRow).toHaveTextContent('Created 5d ago')
  })

  it('leaves the right side empty when no creation date exists', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date(NOW_SECONDS * 1000))
    const entry = makeEntry({
      title: 'Modified note',
      createdAt: null,
      modifiedAt: NOW_SECONDS - 3600,
    })

    render(<NoteItem entry={entry} isSelected={false} typeEntryMap={{}} onClickNote={vi.fn()} />)

    expect(screen.getByTestId('note-date-row')).toHaveTextContent('1h ago')
    expect(screen.queryByText(/Created /)).not.toBeInTheDocument()
  })
})
