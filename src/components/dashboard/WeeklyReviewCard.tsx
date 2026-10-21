import { CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { WeeklyReview } from '../../utils/dashboardModel'
import './WeeklyReviewCard.css'

const MONTH_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S']

function parseDateKey(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number)
  return new Date(year, month - 1, day)
}

/** "Oct 13–19" for a same-month week, "Sep 29–Oct 5" across a month boundary. */
function formatWeekRange(startKey: string, endKey: string, now: Date): string {
  const start = parseDateKey(startKey)
  const end = parseDateKey(endKey)
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  const endLabel = sameMonth ? `${end.getDate()}` : `${MONTH_SHORT[end.getMonth()]} ${end.getDate()}`
  const yearSuffix = end.getFullYear() === now.getFullYear() ? '' : `, ${end.getFullYear()}`
  return `${MONTH_SHORT[start.getMonth()]} ${start.getDate()}–${endLabel}${yearSuffix}`
}

function dayInitial(dateKey: string): string {
  return WEEKDAY_INITIALS[parseDateKey(dateKey).getDay()]
}

function barHeightPercent(count: number, max: number): number {
  if (count <= 0) return 0
  return Math.max(14, Math.round((count / max) * 100))
}

function WeekStat({
  label,
  display,
  delta,
}: {
  label: string
  display: string
  delta?: number
}) {
  return (
    <span className="weekly-review__stat">
      <span className="weekly-review__stat-label">{label}</span>
      {' '}
      <span className="weekly-review__stat-value">{display}</span>
      {typeof delta === 'number' && delta !== 0 ? (
        <span className="weekly-review__delta" data-direction={delta > 0 ? 'up' : 'down'}>
          {delta > 0 ? `+${delta}` : delta}
        </span>
      ) : null}
    </span>
  )
}

/**
 * "This week in review": a Monday–Sunday activity strip, headline counts with
 * last-week deltas, and the week's top types. Counts only — never titles.
 */
export function WeeklyReviewCard({
  review,
  now = new Date(),
  onStartJournal,
}: {
  review: WeeklyReview
  /** Injectable clock for deterministic tests. */
  now?: Date
  onStartJournal?: () => void
}) {
  const hasWeekActivity = review.entriesCreatedThisWeek > 0 || review.entriesModifiedThisWeek > 0
  const maxDayCount = Math.max(1, ...review.days.map((day) => day.count))

  return (
    <section className="vault-dashboard__panel weekly-review" data-testid="dashboard-weekly-review">
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label weekly-review__overline">
            <CalendarDays size={13} aria-hidden="true" />
            This week
          </div>
          <h2 className="weekly-review__range">{formatWeekRange(review.weekStartKey, review.weekEndKey, now)}</h2>
        </div>
      </div>

      {hasWeekActivity ? (
        <>
          <div className="weekly-review__days" role="list" aria-label="Activity by day this week">
            {review.days.map((day) => (
              <div
                key={day.dateKey}
                className="weekly-review__day"
                role="listitem"
                data-testid={`weekly-review-day-${day.dateKey}`}
                data-today={day.isToday ? 'true' : undefined}
                aria-label={`${day.count} active on ${day.dateKey}`}
              >
                <span className="weekly-review__day-track">
                  <span
                    className="weekly-review__day-bar"
                    style={{ height: `${barHeightPercent(day.count, maxDayCount)}%` }}
                  />
                </span>
                <span className="weekly-review__day-initial" aria-hidden="true">{dayInitial(day.dateKey)}</span>
              </div>
            ))}
          </div>

          <div className="weekly-review__stats">
            <WeekStat
              label="New"
              display={String(review.entriesCreatedThisWeek)}
              delta={review.entriesCreatedThisWeek - review.lastWeek.entriesCreated}
            />
            <WeekStat
              label="Touched"
              display={String(review.entriesModifiedThisWeek)}
              delta={review.entriesModifiedThisWeek - review.lastWeek.entriesModified}
            />
            <WeekStat
              label="Journal days"
              display={String(review.journalDaysActive)}
              delta={review.journalDaysActive - review.lastWeek.journalDaysActive}
            />
            <WeekStat label="Streak" display={`${review.streakDays}d`} />
          </div>

          {review.typeMix.length > 0 ? (
            <div className="weekly-review__mix" aria-label="Top types this week">
              {review.typeMix.map((item) => (
                <span key={item.type} className="weekly-review__chip">
                  {item.type}
                  {' '}
                  {item.count}
                </span>
              ))}
            </div>
          ) : null}
        </>
      ) : (
        <div className="weekly-review__empty">
          <p className="weekly-review__empty-line">A blank week is a fresh page.</p>
          {onStartJournal ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="weekly-review__action"
              data-testid="weekly-review-start-journal"
              onClick={onStartJournal}
            >
              Start today&rsquo;s journal
            </Button>
          ) : null}
        </div>
      )}
    </section>
  )
}
