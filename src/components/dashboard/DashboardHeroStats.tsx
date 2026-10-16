import type { DashboardVaultStats } from '../../utils/dashboardModel'

const SPARK_WIDTH = 56
const SPARK_HEIGHT = 18

function StatSparkline({
  id,
  series,
  label,
}: {
  id: string
  series: number[]
  label: string
}) {
  const max = Math.max(1, ...series)
  const step = series.length > 1 ? SPARK_WIDTH / (series.length - 1) : SPARK_WIDTH
  const points = series
    .map((value, index) => {
      const x = index * step
      const y = SPARK_HEIGHT - (value / max) * (SPARK_HEIGHT - 4) - 2
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  return (
    <svg
      className="dashboard-hero-stat__spark"
      viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`}
      preserveAspectRatio="none"
      role="img"
      aria-label={label}
      data-testid={`dashboard-hero-stat-spark-${id}`}
    >
      <polyline points={points} fill="none" />
    </svg>
  )
}

/**
 * Four-up sparkline band under the hero: real counts (never note titles) with
 * a 14-day teal sparkline per card.
 */
export function DashboardHeroStats({ stats }: { stats: DashboardVaultStats }) {
  const cards = [
    {
      id: 'pages',
      label: (count: number) => (count === 1 ? 'Page' : 'Pages'),
      value: stats.pages,
      series: stats.pagesSeries,
      sparkLabel: 'Pages touched over the last 14 days',
    },
    {
      id: 'journals',
      label: (count: number) => (count === 1 ? 'Journal' : 'Journals'),
      value: stats.journals,
      series: stats.journalsSeries,
      sparkLabel: 'Journals touched over the last 14 days',
    },
    {
      id: 'dreams',
      label: (count: number) => (count === 1 ? 'Dream' : 'Dreams'),
      value: stats.dreams,
      series: stats.dreamsSeries,
      sparkLabel: 'Dreams touched over the last 14 days',
    },
    {
      id: 'links',
      label: (count: number) => (count === 1 ? 'Link' : 'Links'),
      value: stats.links,
      series: stats.linksSeries,
      sparkLabel: 'Outgoing links recorded over the last 14 days',
    },
  ]

  return (
    <section className="dashboard-hero-stats" data-testid="dashboard-hero-stats" aria-label="Notebook stats">
      {cards.map((card) => (
        <div key={card.id} className="dashboard-hero-stat" data-testid={`dashboard-hero-stat-${card.id}`}>
          <div className="dashboard-hero-stat__body">
            <span className="dashboard-hero-stat__value">{card.value}</span>
            <span className="dashboard-hero-stat__label">{card.label(card.value)}</span>
          </div>
          <StatSparkline id={card.id} series={card.series} label={card.sparkLabel} />
        </div>
      ))}
    </section>
  )
}
