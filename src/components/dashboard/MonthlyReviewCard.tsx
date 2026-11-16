import type { CSSProperties } from 'react'
import { CalendarRange } from 'lucide-react'
import type { MonthlyReview } from '../../utils/dashboardModel'
import './MonthlyReviewCard.css'

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
]

function MonthStat({
  label,
  display,
  delta,
}: {
  label: string
  display: string
  delta?: number
}) {
  return (
    <span className="monthly-review__stat">
      <span className="monthly-review__stat-label">{label}</span>
      {' '}
      <span className="monthly-review__stat-value">{display}</span>
      {typeof delta === 'number' && delta !== 0 ? (
        <span className="monthly-review__delta" data-direction={delta > 0 ? 'up' : 'down'}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </span>
  )
}

function heatFillPercent(count: number, max: number): number {
  if (count <= 0) return 0
  return Math.max(18, Math.round((count / max) * 85))
}

/**
 * "This month in review": a calendar-month heat strip, headline counts with
 * previous-month deltas, and the month's top types. Counts only — never titles.
 */
export function MonthlyReviewCard({
  review,
  now = new Date(),
}: {
  review: MonthlyReview
  /** Injectable clock for deterministic tests. */
  now?: Date
}) {
  const hasMonthActivity = review.entriesCreatedThisMonth > 0 || review.entriesModifiedThisMonth > 0
  const maxDayCount = Math.max(1, ...review.days.map((day) => day.count))
  const monthName = `${MONTH_NAMES[review.month - 1]}${review.year === now.getFullYear() ? '' : ` ${review.year}`}`
  const leadingBlanks = (new Date(review.year, review.month - 1, 1).getDay() + 6) % 7

  return (
    <section className="vault-dashboard__panel monthly-review" data-testid="dashboard-monthly-review">
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label monthly-review__overline">
            <CalendarRange size={13} aria-hidden="true" />
            This month
          </div>
          <h2 className="monthly-review__month">{monthName}</h2>
        </div>
      </div>

      {hasMonthActivity ? (
        <>
          <div className="monthly-review__grid" role="list" aria-label="Activity by day this month">
            {Array.from({ length: leadingBlanks }, (_, index) => (
              <span key={`pad-${index}`} className="monthly-review__pad" aria-hidden="true" />
            ))}
            {review.days.map((day) => {
              const fill = heatFillPercent(day.count, maxDayCount)
              const style = fill > 0
                ? { background: `color-mix(in srgb, var(--accent-teal) ${fill}%, transparent)` } as CSSProperties
                : undefined
              return (
                <span
                  key={day.dateKey}
                  role="listitem"
                  className="monthly-review__cell"
                  data-testid={`monthly-review-day-${day.dateKey}`}
                  data-today={day.isToday ? 'true' : undefined}
                  data-activity={day.count > 0 ? 'true' : 'false'}
                  style={style}
                  title={`${day.count} active on ${day.dateKey}`}
                  aria-label={`${day.count} active on ${day.dateKey}`}
                />
              )
            })}
          </div>

          <div className="monthly-review__stats">
            <MonthStat
              label="New"
              display={String(review.entriesCreatedThisMonth)}
              delta={review.entriesCreatedThisMonth - review.lastMonth.entriesCreated}
            />
            <MonthStat
              label="Touched"
              display={String(review.entriesModifiedThisMonth)}
              delta={review.entriesModifiedThisMonth - review.lastMonth.entriesModified}
            />
            <MonthStat
              label="Journal days"
              display={String(review.journalDaysActive)}
              delta={review.journalDaysActive - review.lastMonth.journalDaysActive}
            />
            <MonthStat
              label="Active days"
              display={String(review.activeDays)}
              delta={review.activeDays - review.lastMonth.activeDays}
            />
          </div>

          {review.typeMix.length > 0 ? (
            <div className="monthly-review__mix" aria-label="Top types this month">
              {review.typeMix.map((item) => (
                <span key={item.type} className="monthly-review__chip">
                  {item.type}
                  {' '}
                  {item.count}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="monthly-review__empty">
          <p className="monthly-review__empty-line">A quiet month.</p>
        </div>
      )}
    </section>
  )
}
