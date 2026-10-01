import { useMemo, useState, type KeyboardEvent } from 'react'
import type { VaultEntry } from '../../types'
import { TABLE_ROW_CAP, cellText, sortRows, tableColumns, type NoteTableSort } from './noteTableModel'
import './NoteTableView.css'

/**
 * The same notes as the list, as a table: one row per page, one column per
 * property the list already shows, sortable by any column, with a quick
 * filter across every cell. Built on the entries in memory; nothing here
 * reads files.
 */
export function NoteTableView({
  entries,
  allEntries,
  typeEntryMap,
  customProperties,
  selectedPath,
  onSelect,
}: {
  entries: VaultEntry[]
  allEntries: VaultEntry[]
  typeEntryMap: Record<string, VaultEntry>
  customProperties: readonly string[]
  selectedPath: string | null
  onSelect: (entry: VaultEntry) => void
}) {
  const [sort, setSort] = useState<NoteTableSort | null>(null)
  const [filter, setFilter] = useState('')
  const columns = useMemo(() => tableColumns(customProperties), [customProperties])

  const rows = useMemo(() => {
    const needle = filter.trim().toLowerCase()
    const matching = needle
      ? entries.filter((entry) => columns.some((column) => cellText(entry, column, allEntries, typeEntryMap).toLowerCase().includes(needle)))
      : entries
    return sortRows(matching, sort, columns, allEntries, typeEntryMap)
  }, [entries, filter, sort, columns, allEntries, typeEntryMap])

  const visible = rows.slice(0, TABLE_ROW_CAP)

  const toggleSort = (key: string) => {
    setSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' }
      if (current.direction === 'asc') return { key, direction: 'desc' }
      return null
    })
  }

  const handleRowKey = (event: KeyboardEvent<HTMLTableRowElement>, entry: VaultEntry) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect(entry)
    }
  }

  return (
    <div className="note-table" data-testid="note-table">
      <div className="note-table__tools">
        <input
          type="search"
          className="note-table__filter"
          placeholder="Filter rows"
          aria-label="Filter rows"
          value={filter}
          onChange={(event) => setFilter(event.target.value)}
          data-testid="note-table-filter"
        />
        <span className="note-table__count" data-testid="note-table-count">
          {rows.length === entries.length ? `${entries.length} pages` : `${rows.length} of ${entries.length} pages`}
        </span>
      </div>
      <div className="note-table__scroll">
        <table className="note-table__grid">
          <thead>
            <tr>
              {columns.map((column) => {
                const active = sort?.key === column.key
                return (
                  <th key={column.key} scope="col" aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="note-table__sort" onClick={() => toggleSort(column.key)} data-testid={`note-table-sort-${column.key}`}>
                      {column.label}
                      {active ? <span aria-hidden="true">{sort.direction === 'asc' ? ' ↑' : ' ↓'}</span> : null}
                    </button>
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((entry) => (
              <tr
                key={entry.path}
                tabIndex={0}
                className="note-table__row"
                data-testid="note-table-row"
                data-selected={entry.path === selectedPath ? 'true' : undefined}
                onClick={() => onSelect(entry)}
                onKeyDown={(event) => handleRowKey(event, entry)}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.key === 'title' ? 'note-table__title' : undefined}>
                    {cellText(entry, column, allEntries, typeEntryMap)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length > TABLE_ROW_CAP ? (
          <p className="note-table__more">Showing the first {TABLE_ROW_CAP}. Narrow the filter to see the rest.</p>
        ) : null}
        {rows.length === 0 ? <p className="note-table__more">No pages match.</p> : null}
      </div>
    </div>
  )
}
