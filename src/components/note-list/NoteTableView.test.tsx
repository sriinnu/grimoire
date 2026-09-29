import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { NoteTableView } from './NoteTableView'
import { cellText, sortRows, tableColumns } from './noteTableModel'

const a = makeEntry({ path: '/v/a.md', filename: 'a.md', title: 'Alpha', isA: 'Project', status: 'Active', modifiedAt: 300, properties: { owner: 'Sriinnu' } })
const b = makeEntry({ path: '/v/b.md', filename: 'b.md', title: 'Beta', isA: 'Note', status: 'Done', modifiedAt: 100, properties: { owner: 'Ada' } })
const c = makeEntry({ path: '/v/c.md', filename: 'c.md', title: 'Gamma', isA: 'Project', status: null, modifiedAt: 200, properties: {} })
const entries = [a, b, c]

function renderTable(onSelect = vi.fn()) {
  render(<NoteTableView entries={entries} allEntries={entries} typeEntryMap={{}} customProperties={['owner', 'status']} selectedPath="/v/b.md" onSelect={onSelect} />)
  return onSelect
}

describe('tableColumns / cellText', () => {
  it('starts with the built-ins and adds custom properties without repeating them', () => {
    expect(tableColumns(['owner', 'status', 'Title']).map((column) => column.key)).toEqual(['title', 'type', 'status', 'modified', 'owner'])
    const owner = tableColumns(['owner'])[4]
    expect(cellText(a, owner, entries, {})).toBe('Sriinnu')
    expect(cellText(c, tableColumns([])[2], entries, {})).toBe('')
  })
})

describe('sortRows', () => {
  it('sorts by text or by time, both directions, with a stable title tiebreak', () => {
    const columns = tableColumns([])
    expect(sortRows(entries, { key: 'title', direction: 'desc' }, columns, entries, {}).map((entry) => entry.title)).toEqual(['Gamma', 'Beta', 'Alpha'])
    expect(sortRows(entries, { key: 'modified', direction: 'asc' }, columns, entries, {}).map((entry) => entry.title)).toEqual(['Beta', 'Gamma', 'Alpha'])
    expect(sortRows(entries, { key: 'type', direction: 'asc' }, columns, entries, {}).map((entry) => entry.title)).toEqual(['Beta', 'Alpha', 'Gamma'])
    expect(sortRows(entries, null, columns, entries, {})).toBe(entries)
  })
})

describe('NoteTableView', () => {
  it('renders one row per page with the custom column, marks the selected row, and opens on click or Enter', () => {
    const onSelect = renderTable()
    const rows = screen.getAllByTestId('note-table-row')
    expect(rows).toHaveLength(3)
    expect(within(rows[0]).getAllByRole('cell').map((cell) => cell.textContent)).toEqual(['Alpha', 'Project', 'Active', expect.any(String), 'Sriinnu'])
    expect(rows[1]).toHaveAttribute('data-selected', 'true')
    fireEvent.click(rows[2])
    expect(onSelect).toHaveBeenCalledWith(c)
    fireEvent.keyDown(rows[0], { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith(a)
  })

  it('sorts by clicking a header and filters across every cell', () => {
    renderTable()
    fireEvent.click(screen.getByTestId('note-table-sort-title'))
    fireEvent.click(screen.getByTestId('note-table-sort-title'))
    expect(screen.getAllByTestId('note-table-row').map((row) => row.firstChild?.textContent)).toEqual(['Gamma', 'Beta', 'Alpha'])
    expect(screen.getByTestId('note-table-sort-title').closest('th')).toHaveAttribute('aria-sort', 'descending')
    fireEvent.change(screen.getByTestId('note-table-filter'), { target: { value: 'ada' } })
    expect(screen.getAllByTestId('note-table-row')).toHaveLength(1)
    expect(screen.getByTestId('note-table-count')).toHaveTextContent('1 of 3 pages')
    fireEvent.change(screen.getByTestId('note-table-filter'), { target: { value: 'zzz' } })
    expect(screen.queryAllByTestId('note-table-row')).toHaveLength(0)
    expect(screen.getByText('No pages match.')).toBeInTheDocument()
  })
})
