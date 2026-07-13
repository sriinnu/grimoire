import './DashboardStatRow.css'

export interface DashboardStat {
  /** Stable identifier used for the test id. */
  id: string
  /** Big numeral. */
  value: number | string
  /** Short label below the value. */
  label: string
  /** Tertiary delta / context line. */
  delta: string
}

interface DashboardStatRowProps {
  stats: DashboardStat[]
}

/** Four-up big-number band directly under the hero/capture. */
export function DashboardStatRow({ stats }: DashboardStatRowProps) {
  return (
    <section className="dashboard-stat-row" data-testid="dashboard-stat-row">
      {stats.map((stat) => (
        <div key={stat.id} className="dashboard-stat" data-testid={`dashboard-stat-${stat.id}`}>
          <span className="dashboard-stat__value">{stat.value}</span>
          <span className="dashboard-stat__label">{stat.label}</span>
          <span className="dashboard-stat__delta">{stat.delta}</span>
        </div>
      ))}
    </section>
  )
}
