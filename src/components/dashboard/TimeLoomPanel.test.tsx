import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TimeLoomSummary } from '../../lib/timeLoom'
import { TimeLoomPanel } from './TimeLoomPanel'

const summary: TimeLoomSummary = {
  activeSpanLabel: '7 events across 2 active days',
  buckets: [
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
  ],
  calendarEvents: 1,
  commitEvents: 1,
  memoryReviewEvents: 1,
  mobileEvents: 2,
  patterns: [
    { label: 'Primary thread', detail: 'Mobile 2 / Calendar 1 / Commit 1', tone: 'steady' },
    { label: 'Open loops', detail: '1 task due / 1 open marker across 2 active days', tone: 'attention' },
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
    const patterns = screen.getByTestId('time-loom-patterns')
    const nodes = screen.getAllByTestId('time-loom-node')

    expect(panel).toHaveAttribute('data-locality', 'metadata-only')
    expect(panel).toHaveAttribute('data-private-surface', 'time-loom')
    expect(within(map).getByText('Today')).toBeInTheDocument()
    expect(within(map).getByText('Yesterday')).toBeInTheDocument()
    expect(nodes).toHaveLength(2)
    expect(nodes[0]).toHaveTextContent('4')
    expect(nodes[0]).toHaveTextContent('Mobile 2 / Dream 1')
    expect(nodes[0]).toHaveTextContent('2 private')
    expect(nodes[1]).toHaveTextContent('Commit 1 / Calendar 1')
    expect(panel).toHaveTextContent('Open 1')
    expect(panel).toHaveTextContent('2 mobile')
    expect(panel).toHaveTextContent('1 memory review')
    expect(panel).toHaveTextContent('1 task due')
    expect(panel).toHaveTextContent('mobile captures')
    expect(panel).toHaveTextContent('memory review flags')
    expect(panel).toHaveTextContent('due tasks')
    expect(panel).toHaveTextContent('Crystallized today')
    expect(panel).toHaveTextContent('reviewed memory')
    expect(within(patterns).getByText('Primary thread')).toBeInTheDocument()
    expect(within(patterns).getByText('Mobile 2 / Calendar 1 / Commit 1')).toBeInTheDocument()
    expect(within(patterns).getByText('Open loops')).toBeInTheDocument()
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
})
