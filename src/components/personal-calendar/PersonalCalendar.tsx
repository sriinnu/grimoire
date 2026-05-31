import { useMemo, useState } from 'react'
import { CalendarDays, ChevronLeft, ChevronRight, Lock, MoonStar, NotebookPen, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuRadioGroup,
  ContextMenuRadioItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import { cn } from '@/lib/utils'
import {
  buildPersonalCalendarCells,
  findPersonalCalendarDay,
  personalCalendarDateFromKey,
  personalCalendarDateKey,
  personalCalendarDayLabel,
  personalCalendarDayMatchesLane,
  personalCalendarLaneLabel,
  personalCalendarMonthLabel,
  personalCalendarVisibleCounts,
  type PersonalCalendarDay,
  type PersonalCalendarLane,
} from './personalCalendarModel'
import './PersonalCalendar.css'

interface PersonalCalendarProps {
  days: PersonalCalendarDay[]
  density?: 'comfortable' | 'compact'
  initialDate?: Date
  onCaptureDream?: (date: Date) => void
  onCaptureJournal?: (date: Date) => void
  onDateSelect?: (date: Date) => void
  today?: Date
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const LANES: { id: PersonalCalendarLane; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'journal', label: 'Journal' },
  { id: 'dream', label: 'Dreams' },
  { id: 'open', label: 'Open' },
  { id: 'private', label: 'Private' },
]

/** Reusable local-first personal calendar for journal and dream lanes. */
export function PersonalCalendar({
  days,
  density = 'comfortable',
  initialDate,
  onCaptureDream,
  onCaptureJournal,
  onDateSelect,
  today,
}: PersonalCalendarProps) {
  const firstDateKey = days[0]?.dateKey
  const [systemToday] = useState(() => new Date())
  const todayDate = today ?? systemToday
  const resolvedInitialDate = useMemo(
    () => initialDate ?? (firstDateKey ? personalCalendarDateFromKey(firstDateKey) : todayDate),
    [firstDateKey, initialDate, todayDate],
  )
  const [activeMonth, setActiveMonth] = useState(() => new Date(resolvedInitialDate.getFullYear(), resolvedInitialDate.getMonth(), 1))
  const [selectedKey, setSelectedKey] = useState(() => personalCalendarDateKey(resolvedInitialDate))
  const [lane, setLane] = useState<PersonalCalendarLane>('all')
  const dayMap = useMemo(() => new Map(days.map((day) => [day.dateKey, day])), [days])
  const cells = useMemo(() => buildPersonalCalendarCells(activeMonth, todayDate), [activeMonth, todayDate])
  const selectedDate = personalCalendarDateFromKey(selectedKey)
  const selectedDay = findPersonalCalendarDay(days, selectedKey)
  const selectedLaneLabel = personalCalendarLaneLabel(lane)

  function moveMonth(offset: number) {
    setActiveMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function selectDate(date: Date) {
    setSelectedKey(personalCalendarDateKey(date))
    onDateSelect?.(date)
  }

  function selectToday() {
    setActiveMonth(new Date(todayDate.getFullYear(), todayDate.getMonth(), 1))
    selectDate(todayDate)
  }

  function captureJournal(date: Date) {
    selectDate(date)
    onCaptureJournal?.(date)
  }

  function captureDream(date: Date) {
    selectDate(date)
    onCaptureDream?.(date)
  }

  return (
    <section
      className="personal-calendar"
      data-density={density}
      data-testid="personal-calendar"
      data-lane={lane}
      aria-label="Personal calendar"
    >
      <div className="personal-calendar__header">
        <div>
          <div className="personal-calendar__eyebrow"><CalendarDays size={13} /> Personal Calendar</div>
          <h3>{personalCalendarMonthLabel(activeMonth)}</h3>
        </div>
        <div className="personal-calendar__nav" aria-label="Calendar month navigation">
          <Button type="button" variant="outline" size="sm" onClick={selectToday}>
            Today
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Previous month" onClick={() => moveMonth(-1)}>
            <ChevronLeft size={16} />
          </Button>
          <Button type="button" variant="ghost" size="icon" aria-label="Next month" onClick={() => moveMonth(1)}>
            <ChevronRight size={16} />
          </Button>
        </div>
      </div>
      <div className="personal-calendar__lanes" aria-label="Calendar lane filter">
        {LANES.map((item) => (
          <Button
            key={item.id}
            type="button"
            variant={lane === item.id ? 'secondary' : 'ghost'}
            size="sm"
            aria-pressed={lane === item.id}
            className="personal-calendar__lane"
            onClick={() => setLane(item.id)}
          >
            {item.label}
          </Button>
        ))}
      </div>
      <div className="personal-calendar__grid" role="grid" aria-label={personalCalendarMonthLabel(activeMonth)}>
        {WEEKDAYS.map((day) => <span key={day} className="personal-calendar__weekday">{day}</span>)}
        {cells.map((cell) => {
          const day = dayMap.get(cell.dateKey) ?? null
          const hasLane = personalCalendarDayMatchesLane(day, lane)
          const selected = cell.dateKey === selectedKey
          return (
            <ContextMenu key={cell.dateKey}>
              <ContextMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  role="gridcell"
                  aria-label={calendarCellLabel(cell.date, day, hasLane, todayDate)}
                  aria-selected={selected}
                  className={cn('personal-calendar__cell', selected && 'personal-calendar__cell--selected')}
                  data-today={cell.today ? 'true' : 'false'}
                  data-outside-month={cell.outsideMonth ? 'true' : 'false'}
                  data-has-events={day && hasLane ? 'true' : 'false'}
                  data-lane-match={hasLane ? 'true' : 'false'}
                  onClick={() => selectDate(cell.date)}
                >
                  <span>{cell.dayNumber}</span>
                  {day ? <small>{day.total}</small> : null}
                </Button>
              </ContextMenuTrigger>
              <CalendarDayContextMenu
                date={cell.date}
                day={day}
                lane={lane}
                onCaptureDream={onCaptureDream ? captureDream : undefined}
                onCaptureJournal={onCaptureJournal ? captureJournal : undefined}
                onSelectDate={selectDate}
                onSelectLane={setLane}
                today={todayDate}
              />
            </ContextMenu>
          )
        })}
      </div>
      <SelectedDayAgenda
        day={selectedDay}
        date={selectedDate}
        lane={lane}
        laneLabel={selectedLaneLabel}
        onCaptureDream={onCaptureDream}
        onCaptureJournal={onCaptureJournal}
        today={todayDate}
      />
    </section>
  )
}

function CalendarDayContextMenu({
  date,
  day,
  lane,
  onCaptureDream,
  onCaptureJournal,
  onSelectDate,
  onSelectLane,
  today,
}: {
  date: Date
  day: PersonalCalendarDay | null
  lane: PersonalCalendarLane
  onCaptureDream?: (date: Date) => void
  onCaptureJournal?: (date: Date) => void
  onSelectDate: (date: Date) => void
  onSelectLane: (lane: PersonalCalendarLane) => void
  today: Date
}) {
  const label = Number.isNaN(date.getTime()) ? 'Calendar day' : personalCalendarDayLabel(date, today)

  return (
    <ContextMenuContent className="min-w-[190px]" data-testid="personal-calendar-context-menu">
      <ContextMenuLabel className="py-1 text-xs">{label}</ContextMenuLabel>
      <ContextMenuSeparator />
      <ContextMenuLabel className="py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Capture
      </ContextMenuLabel>
      <ContextMenuItem className="py-1 text-xs" onSelect={() => onSelectDate(date)}>
        <CalendarDays className="size-4" /> Select day
      </ContextMenuItem>
      <ContextMenuItem className="py-1 text-xs" disabled={!onCaptureJournal} onSelect={() => onCaptureJournal?.(date)}>
        <NotebookPen className="size-4" /> New journal
      </ContextMenuItem>
      <ContextMenuItem className="py-1 text-xs" disabled={!onCaptureDream} onSelect={() => onCaptureDream?.(date)}>
        <MoonStar className="size-4" /> New dream
      </ContextMenuItem>
      <ContextMenuSeparator />
      <ContextMenuLabel className="py-1 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        Lane filter
      </ContextMenuLabel>
      <ContextMenuRadioGroup value={lane} onValueChange={(value) => onSelectLane(value as PersonalCalendarLane)}>
        {LANES.map((item) => (
          <ContextMenuRadioItem
            className="py-1 text-xs"
            key={item.id}
            data-active-lane={lane === item.id ? 'true' : 'false'}
            value={item.id}
          >
            {calendarLaneMenuLabel(item)}
          </ContextMenuRadioItem>
        ))}
      </ContextMenuRadioGroup>
      {day?.protectedCount ? (
        <>
          <ContextMenuSeparator />
          <ContextMenuLabel className="flex items-center gap-2 py-1 text-xs font-medium text-muted-foreground">
            <Lock className="size-4" /> {day.protectedCount} held local
          </ContextMenuLabel>
        </>
      ) : null}
    </ContextMenuContent>
  )
}

function calendarLaneMenuLabel(item: { id: PersonalCalendarLane; label: string }): string {
  return item.id === 'all' ? 'All lanes' : item.label
}

function calendarCellLabel(date: Date, day: PersonalCalendarDay | null, laneMatch: boolean, today: Date): string {
  const dateLabel = Number.isNaN(date.getTime()) ? 'Calendar day' : personalCalendarDayLabel(date, today)
  if (!day) return `${dateLabel}, no local signals`
  const signalLabel = `${day.total} local signal${day.total === 1 ? '' : 's'}`
  return laneMatch ? `${dateLabel}, ${signalLabel}` : `${dateLabel}, ${signalLabel}, hidden by lane filter`
}

function SelectedDayAgenda({
  day,
  date,
  lane,
  laneLabel,
  onCaptureDream,
  onCaptureJournal,
  today,
}: {
  day: PersonalCalendarDay | null
  date: Date
  lane: PersonalCalendarLane
  laneLabel: string
  onCaptureDream?: (date: Date) => void
  onCaptureJournal?: (date: Date) => void
  today: Date
}) {
  const label = Number.isNaN(date.getTime()) ? 'Selected day' : personalCalendarDayLabel(date, today)
  const counts = personalCalendarVisibleCounts(day, lane)
  const visibleTotal = counts.reduce((sum, count) => sum + count.count, 0)
  const summary = lane === 'all'
    ? day ? `${day.total} local signal${day.total === 1 ? '' : 's'}` : 'Quiet day'
    : visibleTotal > 0 ? `${visibleTotal} ${laneLabel.toLowerCase()} signal${visibleTotal === 1 ? '' : 's'}` : `No ${laneLabel.toLowerCase()} signals`
  const showProtectedCount = !!day?.protectedCount && (lane === 'all' || lane === 'private')

  return (
    <div className="personal-calendar__agenda" data-testid="personal-calendar-agenda" data-lane={lane}>
      <div className="personal-calendar__agenda-head">
        <div>
          <span>{label}</span>
          <strong>{summary}</strong>
        </div>
        {showProtectedCount ? <em><Lock size={12} /> {day.protectedCount} held local</em> : null}
      </div>
      <div className="personal-calendar__agenda-list" aria-label="Selected day counts">
        {counts.length > 0 ? counts.map((count) => (
          <span key={`${count.label}-${count.count}`}>
            {count.label} <strong>{count.count}</strong>
          </span>
        )) : <span>{lane === 'all' ? 'Nothing logged yet.' : `No ${laneLabel.toLowerCase()} entries on this day.`}</span>}
      </div>
      <div className="personal-calendar__actions">
        <Button type="button" variant="outline" size="sm" onClick={() => onCaptureJournal?.(date)}>
          <NotebookPen size={14} /> Journal
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => onCaptureDream?.(date)}>
          <MoonStar size={14} /> Dream
        </Button>
        <span><Sparkles size={13} /> Date-safe capture</span>
      </div>
    </div>
  )
}
