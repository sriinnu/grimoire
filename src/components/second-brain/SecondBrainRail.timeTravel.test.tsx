import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { GitCommit, VaultEntry } from '../../types'
import { SecondBrainRail } from './SecondBrainRail'

const NOW = Math.floor(Date.now() / 1000)

function makeCommit(overrides: Partial<GitCommit>): GitCommit {
  return {
    hash: 'abc123',
    shortHash: 'abc123',
    message: 'commit',
    author: 'Srinivas',
    date: NOW,
    ...overrides,
  }
}

const COMMITS: GitCommit[] = [
  makeCommit({ hash: 'aaa111', shortHash: 'aaa111', message: 'Latest pass', date: NOW - 120 }),
  makeCommit({ hash: 'bbb222', shortHash: 'bbb222', message: 'Middle edit', date: NOW - 3 * 86400 }),
  makeCommit({ hash: 'ccc333', shortHash: 'ccc333', message: 'First draft', date: NOW - 6 * 86400 }),
]

function renderRail(gitHistory: GitCommit[], onViewCommitDiff?: (hash: string) => void) {
  return render(
    <SecondBrainRail
      entry={null}
      content={null}
      entries={[] as VaultEntry[]}
      gitHistory={gitHistory}
      onNavigate={vi.fn()}
      onViewCommitDiff={onViewCommitDiff}
      onShowInspector={vi.fn()}
    />,
  )
}

describe('SecondBrainRail time travel', () => {
  it('renders the scrubber with one tick per commit and the default position at "now"', () => {
    renderRail(COMMITS)

    const scrubber = screen.getByTestId('history-scrubber')
    expect(scrubber).toHaveAttribute('role', 'slider')
    expect(scrubber).toHaveAttribute('aria-valuemin', '0')
    expect(scrubber).toHaveAttribute('aria-valuemax', '2')
    expect(scrubber).toHaveAttribute('aria-valuenow', '0')
    expect(scrubber.querySelectorAll('.sb-tt__dot')).toHaveLength(3)

    const readout = screen.getByTestId('history-readout')
    expect(readout).toHaveTextContent('now')
    expect(readout).toHaveTextContent('aaa111')
    expect(readout).toHaveTextContent('Latest pass')
    expect(scrubber.getAttribute('aria-valuetext')).toContain('aaa111')
  })

  it('arrow keys move the position and update the readout', () => {
    renderRail(COMMITS)
    const scrubber = screen.getByTestId('history-scrubber')

    fireEvent.keyDown(scrubber, { key: 'ArrowLeft' })
    expect(scrubber).toHaveAttribute('aria-valuenow', '1')
    expect(screen.getByTestId('history-readout')).toHaveTextContent('3d ago')
    expect(screen.getByTestId('history-readout')).toHaveTextContent('bbb222')

    fireEvent.keyDown(scrubber, { key: 'ArrowLeft' })
    expect(scrubber).toHaveAttribute('aria-valuenow', '2')
    expect(screen.getByTestId('history-readout')).toHaveTextContent('6d ago')

    fireEvent.keyDown(scrubber, { key: 'ArrowRight' })
    expect(scrubber).toHaveAttribute('aria-valuenow', '1')

    fireEvent.keyDown(scrubber, { key: 'Home' })
    expect(scrubber).toHaveAttribute('aria-valuenow', '0')
    expect(screen.getByTestId('history-readout')).toHaveTextContent('now')
  })

  it('clamps at both ends and ignores unrelated keys', () => {
    renderRail(COMMITS)
    const scrubber = screen.getByTestId('history-scrubber')

    fireEvent.keyDown(scrubber, { key: 'ArrowRight' })
    expect(scrubber).toHaveAttribute('aria-valuenow', '0')

    fireEvent.keyDown(scrubber, { key: 'x' })
    expect(scrubber).toHaveAttribute('aria-valuenow', '0')

    fireEvent.keyDown(scrubber, { key: 'End' })
    expect(scrubber).toHaveAttribute('aria-valuenow', '2')

    fireEvent.keyDown(scrubber, { key: 'ArrowDown' })
    expect(scrubber).toHaveAttribute('aria-valuenow', '2')
  })

  it('View this version calls onViewCommitDiff with the positioned commit hash', () => {
    const onViewCommitDiff = vi.fn()
    renderRail(COMMITS, onViewCommitDiff)

    fireEvent.click(screen.getByTestId('history-open-version'))
    expect(onViewCommitDiff).toHaveBeenCalledWith('aaa111')

    fireEvent.keyDown(screen.getByTestId('history-scrubber'), { key: 'ArrowLeft' })
    fireEvent.click(screen.getByTestId('history-open-version'))
    expect(onViewCommitDiff).toHaveBeenLastCalledWith('bbb222')
  })

  it('disables View this version with an explained title when no diff handler exists', () => {
    renderRail(COMMITS)
    const button = screen.getByTestId('history-open-version')
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('title', 'Diff view unavailable')
  })

  it('keeps the plain history list when fewer than two commits exist', () => {
    const { container } = renderRail([COMMITS[0]])

    expect(screen.queryByTestId('history-scrubber')).not.toBeInTheDocument()
    expect(screen.queryByTestId('history-readout')).not.toBeInTheDocument()
    expect(container.querySelector('.sb-historyrow')).toBeTruthy()
    expect(screen.getByText('Latest pass')).toBeInTheDocument()
  })

  it('omits the history card entirely with no commits', () => {
    const { container } = renderRail([])
    expect(container.querySelector('.sb-historyrow')).toBeNull()
    expect(screen.queryByTestId('history-scrubber')).not.toBeInTheDocument()
  })
})
