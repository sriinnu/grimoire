import { useMemo, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { VaultEntry } from '../../types'
import {
  buildDashboardCalendarMatrix,
  DASHBOARD_CALENDAR_WEEKDAYS,
  dashboardCalendarMonthLabel,
  dashboardCalendarShiftMonth,
  type DashboardCalendarMarker,
} from './DashboardCalendarModel'
import './DashboardCalendarCard.css'

const MAX_DOTS = 3

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function DayDots({ markers }: { markers: DashboardCalendarMarker[] }) {
  if (markers.length === 0) return null
  return (
    <span className="dashboard-calendar__dots" aria-hidden="true">
      {markers.slice(0, MAX_DOTS).map((marker) => (
        <span
          key={marker.lane}
          className="dashboard-calendar__dot"
          data-lane={marker.lane}
        />
      ))}
    </span>
  )
}

interface DashboardCalendarCardProps {
  entries: VaultEntry[]
  /** Injectable clock for deterministic tests. */
  now?: Date
}

/** Month-at-a-glance card: six-week grid with per-day vault activity dots. */
export function DashboardCalendarCard({ entries, now = new Date() }: DashboardCalendarCardProps) {
  const [visibleMonth, setVisibleMonth] = useState<Date>(() => startOfMonth(now))

  const matrix = useMemo(
    () => buildDashboardCalendarMatrix(visibleMonth, entries, now),
    [visibleMonth, entries, now],
  )
  const monthLabel = useMemo(() => dashboardCalendarMonthLabel(visibleMonth), [visibleMonth])

  return (
    <section
      className="vault-dashboard__panel dashboard-calendar"
      data-testid="dashboard-calendar"
    >
      <div className="vault-dashboard__panel-head dashboard-calendar__head">
        <div className="dashboard-calendar__title-block">
          <div className="vault-dashboard__panel-label">
            <CalendarRange size={13} aria-hidden="true" />
            Calendar
          </div>
          <h2 className="dashboard-calendar__month" data-testid="dashboard-calendar-month">
            {monthLabel}
          </h2>
        </div>
        <div className="dashboard-calendar__nav">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="dashboard-calendar__nav-button"
            aria-label="Previous month"
            data-testid="dashboard-calendar-prev"
            onClick={() => setVisibleMonth((month) => dashboardCalendarShiftMonth(month, -1))}
          >
            <ChevronLeft size={16} />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="dashboard-calendar__today"
            data-testid="dashboard-calendar-today"
            onClick={() => setVisibleMonth(startOfMonth(now))}
          >
            Today
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="dashboard-calendar__nav-button"
            aria-label="Next month"
            data-testid="dashboard-calendar-next"
            onClick={() => setVisibleMonth((month) => dashboardCalendarShiftMonth(month, 1))}
          >
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>

      <div className="dashboard-calendar__weekdays" aria-hidden="true">
        {DASHBOARD_CALENDAR_WEEKDAYS.map((weekday) => (
          <span key={weekday} className="dashboard-calendar__weekday">
            {weekday}
          </span>
        ))}
      </div>

      <div className="dashboard-calendar__grid" role="grid" aria-label={`${monthLabel} calendar`}>
        {matrix.map((week, weekIndex) => (
          <div className="dashboard-calendar__week" role="row" key={weekIndex}>
            {week.map((day) => (
              <div
                key={day.dateKey}
                role="gridcell"
                className="dashboard-calendar__day"
                data-testid={`dashboard-calendar-day-${day.dateKey}`}
                data-today={day.today ? 'true' : undefined}
                data-outside={day.outsideMonth ? 'true' : undefined}
                data-has-entries={day.total > 0 ? 'true' : undefined}
                aria-current={day.today ? 'date' : undefined}
              >
                <span className="dashboard-calendar__day-number">{day.dayNumber}</span>
                <DayDots markers={day.markers} />
              </div>
            ))}
          </div>
        ))}
      </div>
    </section>
  )
}
