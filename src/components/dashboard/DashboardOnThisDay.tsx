import { History, Lock } from 'lucide-react'
import type { VaultEntry } from '../../types'
import type { LocalDay, OnThisDayItem } from '../../utils/onThisDay'
import { dashboardEntryTitle } from './dashboardEntryLabel'
import './DashboardMemoryPanels.css'

function formatDay({ year, month, day }: LocalDay): string {
  return new Date(year, month - 1, day).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Pages from this day in earlier years (or a week/month back); hidden when empty. */
export function DashboardOnThisDay({
  items,
  onOpenNote,
}: {
  items: OnThisDayItem[]
  onOpenNote: (entry: VaultEntry) => void
}) {
  if (items.length === 0) return null
  const pastYears = items[0].kind === 'years'
  return (
    <section className="vault-dashboard__panel vault-dashboard__panel--wide dashboard-on-this-day" data-testid="dashboard-on-this-day">
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label">
            <History size={13} aria-hidden="true" />
            On this day
          </div>
          <h2>{pastYears ? 'From this date in other years.' : 'From a little while back.'}</h2>
        </div>
      </div>
      <div className="dashboard-on-this-day__list">
        {items.map((item) => {
          const { title, isPrivate } = dashboardEntryTitle(item.entry)
          return (
            <button
              key={item.entry.path}
              type="button"
              className="dashboard-on-this-day__item"
              onClick={() => onOpenNote(item.entry)}
            >
              <span className="dashboard-on-this-day__when">{item.label}</span>
              <span className="dashboard-on-this-day__title">
                {isPrivate ? <Lock size={11} aria-hidden="true" /> : null}
                <span>{title}</span>
              </span>
              <span className="dashboard-on-this-day__date">{formatDay(item.day)}</span>
            </button>
          )
        })}
      </div>
    </section>
  )
}
