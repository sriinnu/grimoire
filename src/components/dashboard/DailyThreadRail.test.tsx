import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { TimeLoomGuidance } from '../../lib/timeLoomGuidance'
import { DailyThreadRail } from './DailyThreadRail'

const guidance: TimeLoomGuidance = {
  actionKind: 'dream',
  actionLabel: 'Catch a dream',
  nextDetail: 'The dream lane is empty; keep it private from the first line.',
  nextLabel: 'Open the dream lane',
  sourceLanes: [
    { id: 'dream', label: 'Dreams', count: 0, detail: 'quiet', state: 'quiet' },
    { id: 'journal', label: 'Journal', count: 2, detail: 'local reflection', state: 'private' },
    { id: 'mobile', label: 'Mobile', count: 1, detail: 'capture inbox', state: 'active' },
    { id: 'voice', label: 'Voice', count: 0, detail: 'quiet', state: 'quiet' },
    { id: 'calendar', label: 'Calendar', count: 0, detail: 'quiet', state: 'quiet' },
    { id: 'private', label: 'Held local', count: 2, detail: 'titles withheld', state: 'private' },
  ],
}

describe('DailyThreadRail', () => {
  it('renders source-safe next action lanes and routes dream actions', () => {
    const onCaptureDream = vi.fn()
    const onCaptureJournal = vi.fn()
    const onStartAsk = vi.fn()

    render(
      <DailyThreadRail
        guidance={guidance}
        onCaptureDream={onCaptureDream}
        onCaptureJournal={onCaptureJournal}
        onStartAsk={onStartAsk}
      />,
    )

    const rail = screen.getByTestId('daily-thread-rail')
    expect(rail).toHaveAttribute('data-locality', 'metadata-only')
    expect(rail).toHaveAttribute('data-private-surface', 'daily-thread')
    expect(rail).toHaveTextContent('Open the dream lane')
    expect(rail).toHaveTextContent('The dream lane is empty')
    expect(within(rail).getByLabelText('Daily Thread source-safe lanes')).toHaveTextContent('Held local')
    expect(within(rail).getByText('Held local').closest('[data-state]')).toHaveAttribute('data-state', 'private')
    expect(rail).not.toHaveTextContent('/vault')
    expect(rail).not.toHaveTextContent('Secret')

    fireEvent.click(screen.getByRole('button', { name: /Catch a dream/ }))
    expect(onCaptureDream).toHaveBeenCalledTimes(1)
    expect(onCaptureJournal).not.toHaveBeenCalled()
    expect(onStartAsk).not.toHaveBeenCalled()
  })

  it('routes Crystallize guidance into the ask path with its prompt seed', () => {
    const onStartAsk = vi.fn()
    const promptSeed = '/ask Prepare a Crystallize-ready Markdown memory proposal.'

    render(
      <DailyThreadRail
        guidance={{
          ...guidance,
          actionKind: 'ask',
          actionLabel: 'Crystallize',
          nextLabel: 'Crystallize the day',
          promptSeed,
        }}
        onCaptureDream={vi.fn()}
        onCaptureJournal={vi.fn()}
        onStartAsk={onStartAsk}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: /Crystallize/ }))
    expect(onStartAsk).toHaveBeenCalledWith(promptSeed)
  })
})
