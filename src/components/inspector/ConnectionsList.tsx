import { useCallback, useMemo, useState } from 'react'
import { APP_STORAGE_KEYS } from '../../constants/appStorage'
import type { VaultEntry } from '../../types'
import { getTypeColor } from '../../utils/typeColors'
import { NoteTitleIcon } from '../NoteTitleIcon'
import { TypeIconMark } from '../TypeIconMark'
import { getTypeIcon } from '../note-item/typeIcon'
import {
  CONNECTION_GLYPHS,
  countConnections,
  filterConnections,
  type ConnectionFilter,
  type ConnectionRow,
} from './connectionsModel'

const FILTERS: ReadonlyArray<{ id: ConnectionFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'out', label: 'Links out' },
  { id: 'in', label: 'Linked here' },
]

function readFilter(): ConnectionFilter {
  try {
    const stored = localStorage.getItem(APP_STORAGE_KEYS.connectionsFilter)
    return stored === 'out' || stored === 'in' ? stored : 'all'
  } catch {
    return 'all'
  }
}

function writeFilter(filter: ConnectionFilter): void {
  try {
    localStorage.setItem(APP_STORAGE_KEYS.connectionsFilter, filter)
  } catch {
    // Storage may be unavailable; the in-memory choice still applies.
  }
}

function ConnectionRowButton({
  row,
  typeEntryMap,
  onNavigate,
}: {
  row: ConnectionRow
  typeEntryMap: Record<string, VaultEntry>
  onNavigate: (target: string) => void
}) {
  const { glyph, label: directionLabel } = CONNECTION_GLYPHS[row.direction]
  const entry = row.entry
  const typeEntry = typeEntryMap[entry?.isA ?? '']
  const color = entry ? getTypeColor(entry.isA, typeEntry?.color) : undefined
  return (
    <button
      type="button"
      className="connection-row"
      data-testid="connection-row"
      data-direction={row.direction}
      data-missing={entry ? undefined : 'true'}
      onClick={() => onNavigate(row.target)}
      title={entry?.archived ? 'Archived' : undefined}
    >
      <span className="connection-row__glyph" aria-label={directionLabel}>{glyph}</span>
      {entry ? <NoteTitleIcon icon={entry.icon} size={16} /> : null}
      <span className="connection-row__title" style={color ? { color } : undefined}>{row.title}</span>
      {row.labels.length > 0 ? (
        <span className="connection-row__labels">{row.labels.join(' · ')}</span>
      ) : null}
      {!entry ? <span className="connection-row__labels">No page yet</span> : null}
      {entry ? (
        <TypeIconMark
          className="connection-row__type"
          color={color ?? 'currentColor'}
          fallbackIcon={getTypeIcon(entry.isA, typeEntry?.icon)}
          iconValue={typeEntry?.icon ?? null}
          size={14}
        />
      ) : null}
    </button>
  )
}

/** Every connection in one list, with a segmented filter that is remembered. */
export function ConnectionsList({
  rows,
  typeEntryMap,
  onNavigate,
}: {
  rows: ConnectionRow[]
  typeEntryMap: Record<string, VaultEntry>
  onNavigate: (target: string) => void
}) {
  const [filter, setFilter] = useState<ConnectionFilter>(readFilter)
  const counts = useMemo(() => countConnections(rows), [rows])
  const visible = useMemo(() => filterConnections(rows, filter), [rows, filter])
  const choose = useCallback((next: ConnectionFilter) => {
    setFilter(next)
    writeFilter(next)
  }, [])

  if (rows.length === 0) return null

  return (
    <div className="connections" data-testid="connections-list">
      <div className="connections__filters" role="radiogroup" aria-label="Show connections">
        {FILTERS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={filter === id}
            className="connections__filter"
            data-testid={`connections-filter-${id}`}
            onClick={() => choose(id)}
          >
            {label}
            <span className="connections__filter-count">{counts[id]}</span>
          </button>
        ))}
      </div>
      {visible.length === 0 ? (
        <p className="inspector-section__empty">{filter === 'out' ? 'No links out yet' : 'Nothing links here yet'}</p>
      ) : (
        <div className="connections__rows">
          {visible.map((row) => (
            <ConnectionRowButton key={row.key} row={row} typeEntryMap={typeEntryMap} onNavigate={onNavigate} />
          ))}
        </div>
      )}
    </div>
  )
}
