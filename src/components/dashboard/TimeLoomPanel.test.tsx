import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TimeLoomSummary } from '../../lib/timeLoom'
import { buildTimeLoomGraph } from '../../lib/timeLoomGraph'
import { TimeLoomPanel } from './TimeLoomPanel'

const buckets: TimeLoomSummary['buckets'] = [
  {
    dateKey: '2026-05-25',
    label: 'Today',
    total: 4,
    protectedCount: 2,
    statusCounts: [
      { label: 'Open', count: 1 },
      { label: 'Unmarked', count: 3 },
    ],
    typeCounts: [
      { label: 'Mobile', count: 2 },
      { label: 'Dream', count: 1 },
      { label: 'Journal', count: 1 },
    ],
  },
  {
    dateKey: '2026-05-24',
    label: 'Yesterday',
    total: 3,
    protectedCount: 1,
    statusCounts: [
      { label: 'Done', count: 1 },
      { label: 'Unmarked', count: 2 },
    ],
    typeCounts: [
      { label: 'Commit', count: 1 },
      { label: 'Calendar', count: 1 },
      { label: 'Note', count: 1 },
    ],
  },
]

const summary: TimeLoomSummary = {
  activeSpanLabel: '7 marks across 2 days',
  buckets,
  calendarDays: buckets,
  calendarEvents: 1,
  commitEvents: 1,
  graph: buildTimeLoomGraph(buckets),
  memoryReviewEvents: 1,
  mobileEvents: 2,
  patterns: [
    { label: 'Primary thread', detail: '2 mobile captures / 1 planned mark / 1 saved point', tone: 'steady' },
    { label: 'Revisit', detail: '1 upcoming / 1 open marker across 2 days', tone: 'attention' },
    { label: 'Private review', detail: '3 private / 2 mobile / 1 voice', tone: 'private' },
  ],
  protectedEvents: 3,
  taskEvents: 1,
  totalEvents: 7,
  voiceEvents: 1,
}

describe('TimeLoomPanel', () => {
  it('renders a metadata-only temporal map and keeps private source details out', () => {
    render(<TimeLoomPanel crystallizedTodayCount={1} summary={summary} onCaptureJournal={vi.fn()} />)

    const panel = screen.getByTestId('time-loom-panel')
    const map = screen.getByTestId('time-loom-map')
    const graph = screen.getByTestId('time-loom-graph')
    const patterns = screen.getByTestId('time-loom-patterns')
    const nodes = screen.getAllByTestId('time-loom-node')

    expect(panel).toHaveAttribute('data-locality', 'metadata-only')
    expect(panel).toHaveAttribute('data-private-surface', 'time-loom')
    expect(screen.getByTestId('personal-calendar')).toHaveAttribute('data-density', 'compact')
    expect(within(map).getByText('Today')).toBeInTheDocument()
    expect(within(map).getByText('Yesterday')).toBeInTheDocument()
    expect(graph).toHaveAccessibleName('count-only trail graph; private labels withheld')
    expect(within(graph).getByText('Held local')).toBeInTheDocument()
    expect(within(graph).getByText('2 mobile captures')).toBeInTheDocument()
    expect(within(graph).getByText('2 held')).toBeInTheDocument()
    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toHaveTextContent('4')
    expect(nodes[0]).toHaveTextContent('2 mobile captures / 1 dream')
    expect(nodes[0]).toHaveTextContent('2 private')
    expect(nodes[1]).toHaveTextContent('1 saved point / 1 planned mark')
    expect(panel).toHaveTextContent('1 open')
    expect(panel).toHaveTextContent('2 mobile')
    expect(panel).toHaveTextContent('1 memory review')
    expect(panel).toHaveTextContent('1 upcoming')
    expect(panel).toHaveTextContent('mobile captures')
    expect(panel).toHaveTextContent('memory reviews')
    expect(panel).toHaveTextContent('upcoming flags')
    expect(panel).toHaveTextContent('Reviewed today')
    expect(panel).toHaveTextContent('reviewed memory')
    expect(within(patterns).getByText('Primary thread')).toBeInTheDocument()
    expect(within(patterns).getByText('2 mobile captures / 1 planned mark / 1 saved point')).toBeInTheDocument()
    expect(within(patterns).getByText('Revisit')).toBeInTheDocument()
    expect(within(patterns).getByText('Private review')).toBeInTheDocument()
    expect(panel).not.toHaveTextContent('secret-river.md')
    expect(panel).not.toHaveTextContent('private-voice.webm')
    expect(panel).not.toHaveTextContent('private commit message')
  })

  it('keeps the journal capture action wired', () => {
    const onCaptureJournal = vi.fn()
    render(<TimeLoomPanel summary={summary} onCaptureJournal={onCaptureJournal} />)

    fireEvent.click(screen.getByTestId('time-loom-capture'))
    expect(onCaptureJournal).toHaveBeenCalledTimes(1)
  })

  it('uses the personal calendar to capture journal and dream entries for a selected date', () => {
    const onCaptureDream = vi.fn()
    const onCaptureJournal = vi.fn()
    render(
      <TimeLoomPanel
        summary={summary}
        onCaptureDream={onCaptureDream}
        onCaptureJournal={onCaptureJournal}
      />,
    )

    const calendar = screen.getByTestId('personal-calendar')
    const agenda = within(calendar).getByTestId('personal-calendar-agenda')
    fireEvent.click(within(agenda).getByRole('button', { name: 'Journal' }))
    fireEvent.click(within(agenda).getByRole('button', { name: 'Dream' }))

    expect(onCaptureJournal).toHaveBeenCalledWith(expect.any(Date))
    expect(onCaptureDream).toHaveBeenCalledWith(expect.any(Date))
  })

  it('feeds the calendar from full calendar days, not only visible trail rows', () => {
    render(
      <TimeLoomPanel
        summary={{
          ...summary,
          calendarDays: [
            ...summary.calendarDays,
            {
              dateKey: '2026-05-20',
              label: 'May 20',
              total: 2,
              protectedCount: 1,
              statusCounts: [{ label: 'Unmarked', count: 2 }],
              typeCounts: [{ label: 'Journal', count: 1 }, { label: 'Dream', count: 1 }],
            },
          ],
        }}
        onCaptureJournal={vi.fn()}
      />,
    )

    expect(screen.getByRole('gridcell', { name: /May 20, 2 local signals/ })).toHaveAttribute('data-has-events', 'true')
  })
})
