import { Lock, Pin } from 'lucide-react'
import type { VaultEntry } from '../../types'
import { dashboardEntryTitle } from './dashboardEntryLabel'
import './DashboardMemoryPanels.css'

/** Favourite pages as a quiet row of chips; renders nothing without favourites. */
export function DashboardPinnedRow({
  entries,
  onOpenNote,
}: {
  entries: VaultEntry[]
  onOpenNote: (entry: VaultEntry) => void
}) {
  if (entries.length === 0) return null
  return (
    <section className="dashboard-pinned" aria-label="Pinned pages" data-testid="dashboard-pinned">
      <div className="vault-dashboard__panel-label">
        <Pin size={13} aria-hidden="true" />
        Pinned
      </div>
      <div className="dashboard-pinned__chips">
        {entries.map((entry) => {
          const { title, isPrivate } = dashboardEntryTitle(entry)
          return (
            <button
              key={entry.path}
              type="button"
              className="dashboard-pinned__chip"
              onClick={() => onOpenNote(entry)}
              title={isPrivate ? undefined : entry.title}
            >
              {isPrivate ? <Lock size={11} aria-hidden="true" /> : null}
              <span>{title}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
