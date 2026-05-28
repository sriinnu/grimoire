import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { AiCrystallizeLoopCard } from './AiCrystallizeLoopCard'

describe('AiCrystallizeLoopCard', () => {
  it('offers review when a public AI response can become Markdown memory', () => {
    const onCrystallize = vi.fn()

    render(
      <AiCrystallizeLoopCard
        activeContextProtected={false}
        blockedReason={null}
        canCrystallize
        hasContext
        hasLatestResponse
        linkedCount={2}
        onCrystallize={onCrystallize}
        proposalSummary={{
          hunkCount: 4,
          ledgerFieldCount: 7,
          sourceCount: 2,
          targetFolder: 'memory/crystallized',
          taskCount: 0,
        }}
      />,
    )

    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('Context ready')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('2 linked')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('Review packet')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('4 hunks')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('7 ledger fields')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('2 sources')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('memory/crystallized')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('Review diff')
    expect(screen.getByTestId('crystallize-loop-trail')).toHaveTextContent('Context')
    expect(screen.getByTestId('crystallize-loop-trail')).toHaveTextContent('Council')
    expect(screen.getByTestId('crystallize-loop-trail')).toHaveTextContent('Answer')
    expect(screen.getByTestId('crystallize-loop-trail')).toHaveTextContent('Review')
    fireEvent.click(screen.getByTestId('crystallize-loop-action'))
    expect(onCrystallize).toHaveBeenCalledOnce()
  })

  it('keeps local-only active context from opening a durable write path', () => {
    const onCrystallize = vi.fn()

    render(
      <AiCrystallizeLoopCard
        activeContextProtected
        blockedReason="Local-only context is protected."
        canCrystallize={false}
        hasContext
        hasLatestResponse
        linkedCount={3}
        onCrystallize={onCrystallize}
        proposalSummary={null}
      />,
    )

    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('Protected context stays local')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('Local-only gate')
    expect(screen.getByTestId('crystallize-loop-trail')).toHaveTextContent('Firewall')
    expect(screen.getByTestId('crystallize-loop-action')).toBeDisabled()
    expect(onCrystallize).not.toHaveBeenCalled()
  })

  it('shows the waiting state before there is an assistant response', () => {
    render(
      <AiCrystallizeLoopCard
        activeContextProtected={false}
        blockedReason="Send an AI message first."
        canCrystallize={false}
        hasContext={false}
        hasLatestResponse={false}
        linkedCount={0}
        onCrystallize={vi.fn()}
        proposalSummary={null}
      />,
    )

    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('No context')
    expect(screen.getByTestId('crystallize-loop-card')).toHaveTextContent('Ask first')
    expect(screen.getByTestId('crystallize-loop-trail')).toHaveTextContent('Capture')
    expect(screen.getByTestId('crystallize-loop-action')).toHaveTextContent('Waiting')
  })

  it('uses polished singular labels in the review packet', () => {
    render(
      <AiCrystallizeLoopCard
        activeContextProtected={false}
        blockedReason={null}
        canCrystallize
        hasContext
        hasLatestResponse
        linkedCount={1}
        onCrystallize={vi.fn()}
        proposalSummary={{
          hunkCount: 1,
          ledgerFieldCount: 1,
          sourceCount: 1,
          targetFolder: 'memory/crystallized',
          taskCount: 1,
        }}
      />,
    )

    const packet = screen.getByTestId('crystallize-review-packet')
    expect(packet).toHaveTextContent('1 hunk')
    expect(packet).toHaveTextContent('1 source')
    expect(packet).toHaveTextContent('1 ledger field')
    expect(packet).toHaveTextContent('1 task hunk')
    expect(packet).not.toHaveTextContent('1 sources')
  })
})
