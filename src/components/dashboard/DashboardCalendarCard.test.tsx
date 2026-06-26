import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../../types'
import { DashboardCalendarCard } from './DashboardCalendarCard'

function entry(title: string, type: string, dateKey: string): VaultEntry {
  const [year, month, day] = dateKey.split('-').map(Number)
  const ts = Math.floor(new Date(year, month - 1, day, 9).getTime() / 1000)
  return {
    path: `/vault/${title}.md`,
    filename: `${title}.md`,
    title,
    isA: type,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: ts,
    createdAt: ts,
    fileSize: 0,
    snippet: '',
    wordCount: 5,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: false,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
    fileKind: 'markdown',
  }
}

describe('DashboardCalendarCard', () => {
  const now = new Date(2026, 4, 15)

  it('renders the month title, weekday header and a six-week grid', () => {
    render(<DashboardCalendarCard entries={[]} now={now} />)
    expect(screen.getByTestId('dashboard-calendar-month')).toHaveTextContent('May 2026')
    expect(screen.getByText('Sun')).toBeInTheDocument()
    expect(screen.getByText('Sat')).toBeInTheDocument()
    // 42 day cells in a fixed six-week grid.
    expect(screen.getAllByRole('gridcell')).toHaveLength(42)
  })

  it('marks today and renders lane dots for days with entries', () => {
    render(
      <DashboardCalendarCard
        entries={[
          entry('check-in', 'Journal', '2026-05-15'),
          entry('river', 'Dream', '2026-05-15'),
          entry('plan', 'Project', '2026-05-15'),
          entry('extra', 'Note', '2026-05-15'),
        ]}
        now={now}
      />,
    )
    const today = screen.getByTestId('dashboard-calendar-day-2026-05-15')
    expect(today).toHaveAttribute('data-today', 'true')
    expect(today).toHaveAttribute('data-has-entries', 'true')
    // At most three dots are shown even with four entries.
    const dots = today.querySelectorAll('.dashboard-calendar__dot')
    expect(dots).toHaveLength(3)
    expect(dots[0]).toHaveAttribute('data-lane', 'journal')
    expect(dots[1]).toHaveAttribute('data-lane', 'dream')
  })

  it('dims out-of-month cells', () => {
    render(<DashboardCalendarCard entries={[]} now={now} />)
    // May 1 2026 is a Friday; the grid starts on Apr 26.
    expect(screen.getByTestId('dashboard-calendar-day-2026-04-26')).toHaveAttribute('data-outside', 'true')
    expect(screen.getByTestId('dashboard-calendar-day-2026-05-01')).not.toHaveAttribute('data-outside')
  })

  it('navigates between months and returns to today', () => {
    render(<DashboardCalendarCard entries={[]} now={now} />)
    fireEvent.click(screen.getByTestId('dashboard-calendar-next'))
    expect(screen.getByTestId('dashboard-calendar-month')).toHaveTextContent('June 2026')
    fireEvent.click(screen.getByTestId('dashboard-calendar-prev'))
    fireEvent.click(screen.getByTestId('dashboard-calendar-prev'))
    expect(screen.getByTestId('dashboard-calendar-month')).toHaveTextContent('April 2026')
    fireEvent.click(screen.getByTestId('dashboard-calendar-today'))
    expect(screen.getByTestId('dashboard-calendar-month')).toHaveTextContent('May 2026')
  })

  it('keeps a single today cell across the grid', () => {
    render(<DashboardCalendarCard entries={[]} now={now} />)
    const grid = screen.getByRole('grid')
    const todays = within(grid)
      .getAllByRole('gridcell')
      .filter((cell) => cell.getAttribute('data-today') === 'true')
    expect(todays).toHaveLength(1)
  })
})
