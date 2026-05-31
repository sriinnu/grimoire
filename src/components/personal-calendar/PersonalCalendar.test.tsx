import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { PersonalCalendar } from './PersonalCalendar'
import type { PersonalCalendarDay } from './personalCalendarModel'

const days: PersonalCalendarDay[] = [
  {
    dateKey: '2026-05-29',
    label: 'Today',
    protectedCount: 2,
    statusCounts: [{ label: 'Open', count: 1 }],
    total: 3,
    typeCounts: [{ label: 'Journal', count: 1 }, { label: 'Dream', count: 1 }],
  },
]
const pinnedToday = new Date(2026, 4, 29)

describe('PersonalCalendar', () => {
  it('renders a fixed local calendar grid and selected day agenda', () => {
    render(<PersonalCalendar days={days} initialDate={new Date(2026, 4, 29)} today={pinnedToday} />)

    const calendar = screen.getByTestId('personal-calendar')
    expect(calendar).toHaveAttribute('data-density', 'comfortable')
    expect(calendar).toHaveTextContent('May 2026')
    expect(screen.getAllByRole('gridcell')).toHaveLength(42)
    const agenda = screen.getByTestId('personal-calendar-agenda')
    expect(agenda).toHaveTextContent('Today')
    expect(agenda).toHaveTextContent('3 local signals')
    expect(agenda).toHaveTextContent('2 held local')
    expect(within(agenda).getAllByText(/Journal/).length).toBeGreaterThan(0)
    expect(within(agenda).getAllByText(/Dream/).length).toBeGreaterThan(0)
  })

  it('captures journal and dream entries for the selected local date', () => {
    const onCaptureJournal = vi.fn()
    const onCaptureDream = vi.fn()
    render(
      <PersonalCalendar
        days={days}
        initialDate={new Date(2026, 4, 29)}
        onCaptureDream={onCaptureDream}
        onCaptureJournal={onCaptureJournal}
        today={pinnedToday}
      />,
    )

    const agenda = screen.getByTestId('personal-calendar-agenda')
    fireEvent.click(within(agenda).getByRole('button', { name: 'Journal' }))
    fireEvent.click(within(agenda).getByRole('button', { name: 'Dream' }))

    expect(onCaptureJournal).toHaveBeenCalledWith(new Date(2026, 4, 29))
    expect(onCaptureDream).toHaveBeenCalledWith(new Date(2026, 4, 29))
  })

  it('opens a date-scoped context menu on right-click', () => {
    const onCaptureJournal = vi.fn()
    const onCaptureDream = vi.fn()
    render(
      <PersonalCalendar
        days={days}
        initialDate={new Date(2026, 4, 29)}
        onCaptureDream={onCaptureDream}
        onCaptureJournal={onCaptureJournal}
        today={pinnedToday}
      />,
    )

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: /Today, 3 local signals/ }))

    const menu = screen.getByTestId('personal-calendar-context-menu')
    fireEvent.click(within(menu).getByRole('menuitem', { name: 'New journal' }))
    fireEvent.contextMenu(screen.getByRole('gridcell', { name: /Today, 3 local signals/ }))
    fireEvent.click(within(screen.getByTestId('personal-calendar-context-menu')).getByRole('menuitem', { name: 'New dream' }))

    expect(onCaptureJournal).toHaveBeenCalledWith(new Date(2026, 4, 29))
    expect(onCaptureDream).toHaveBeenCalledWith(new Date(2026, 4, 29))
  })

  it('lets the context menu switch calendar lanes without leaking private details', () => {
    render(<PersonalCalendar days={days} initialDate={new Date(2026, 4, 29)} today={pinnedToday} />)

    fireEvent.contextMenu(screen.getByRole('gridcell', { name: /Today, 3 local signals/ }))
    const menu = screen.getByTestId('personal-calendar-context-menu')
    fireEvent.click(within(menu).getByRole('menuitemradio', { name: 'Private' }))

    const agenda = screen.getByTestId('personal-calendar-agenda')
    expect(agenda).toHaveAttribute('data-lane', 'private')
    expect(agenda).toHaveTextContent('2 private signals')
    expect(agenda).toHaveTextContent('2 held local')
    expect(agenda).not.toHaveTextContent('Journal 1')
    expect(agenda).not.toHaveTextContent('Dream 1')
  })

  it('lets dashboard hosts request a compact calendar rhythm', () => {
    render(<PersonalCalendar days={days} density="compact" initialDate={new Date(2026, 4, 29)} today={pinnedToday} />)

    expect(screen.getByTestId('personal-calendar')).toHaveAttribute('data-density', 'compact')
  })

  it('moves months without changing the grid height', () => {
    render(<PersonalCalendar days={days} initialDate={new Date(2026, 4, 29)} today={pinnedToday} />)

    fireEvent.click(screen.getByRole('button', { name: 'Next month' }))

    expect(screen.getByTestId('personal-calendar')).toHaveTextContent('June 2026')
    expect(screen.getAllByRole('gridcell')).toHaveLength(42)
  })

  it('uses lane filters for the selected-day agenda, not only calendar dots', () => {
    render(<PersonalCalendar days={days} initialDate={new Date(2026, 4, 29)} today={pinnedToday} />)

    fireEvent.click(screen.getByRole('button', { name: 'Dreams' }))

    const agenda = screen.getByTestId('personal-calendar-agenda')
    expect(agenda).toHaveAttribute('data-lane', 'dream')
    expect(agenda).toHaveTextContent('1 dream signal')
    expect(agenda).toHaveTextContent('Dream 1')
    expect(agenda).not.toHaveTextContent('Journal 1')
    expect(agenda).not.toHaveTextContent('Open 1')
    expect(agenda).not.toHaveTextContent('2 held local')
  })

  it('can jump back to today and notify the host with the selected date', () => {
    const onDateSelect = vi.fn()
    render(
      <PersonalCalendar
        days={days}
        initialDate={new Date(2026, 4, 29)}
        onDateSelect={onDateSelect}
        today={new Date(2026, 5, 2)}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Today' }))

    expect(screen.getByTestId('personal-calendar')).toHaveTextContent('June 2026')
    expect(screen.getByTestId('personal-calendar-agenda')).toHaveTextContent('Today')
    expect(onDateSelect).toHaveBeenCalledWith(new Date(2026, 5, 2))
  })

  it('keeps the today marker tied to the actual calendar day, not the selected entry date', () => {
    render(
      <PersonalCalendar
        days={days}
        initialDate={new Date(2026, 4, 29)}
        today={new Date(2026, 4, 30)}
      />,
    )

    expect(screen.getByRole('gridcell', { name: /Today, no local signals/ })).toHaveAttribute('data-today', 'true')
    expect(screen.getByRole('gridcell', { name: /Yesterday, 3 local signals/ })).toHaveAttribute('data-today', 'false')
  })
})
