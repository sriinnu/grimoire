import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GitCommit, VaultEntry } from '../../types'
import { mockHandlers } from '../../mock-tauri/mock-handlers'
import { setCurrentVaultPath } from '../../utils/currentVaultPath'
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

function makeEntry(path: string): VaultEntry {
  return {
    path,
    filename: path.split('/').pop() ?? 'note.md',
    title: 'Note',
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: NOW,
    createdAt: NOW - 6 * 86400,
    fileSize: 128,
    snippet: '',
    wordCount: 10,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: true,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {},
    hasH1: true,
  }
}

function renderRail(gitHistory: GitCommit[], onViewCommitDiff?: (hash: string) => void, entry: VaultEntry | null = null) {
  return render(
    <SecondBrainRail
      entry={entry}
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
  beforeEach(() => {
    setCurrentVaultPath('/Users/mock/Grimoire')
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })
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

  it('renders a live preview of the note content at a past commit', async () => {
    renderRail(COMMITS, undefined, makeEntry('/Users/mock/Grimoire/notes/strategy.md'))

    fireEvent.keyDown(screen.getByTestId('history-scrubber'), { key: 'ArrowLeft' })

    const preview = await screen.findByTestId('history-version-preview')
    expect(preview).toHaveAttribute('aria-live', 'polite')
    // Mock content is keyed by commit hash; wait for the fetch to resolve.
    expect(await screen.findByText(/read at commit bbb222/)).toBeInTheDocument()
    // Frontmatter from the mock is stripped before rendering.
    expect(preview).not.toHaveTextContent('title: strategy')
  })

  it('shows no preview while positioned at "now" (position 0)', () => {
    renderRail(COMMITS, undefined, makeEntry('/Users/mock/Grimoire/notes/strategy.md'))

    expect(screen.getByTestId('history-readout')).toHaveTextContent('now')
    expect(screen.queryByTestId('history-version-preview')).not.toBeInTheDocument()
  })

  it('shows a quiet message when the note did not exist at the positioned commit', async () => {
    vi.spyOn(mockHandlers, 'get_file_content_at_commit').mockImplementation(() => {
      throw new Error("fatal: path 'notes/strategy.md' does not exist in 'bbb222'")
    })
    renderRail(COMMITS, undefined, makeEntry('/Users/mock/Grimoire/notes/strategy.md'))

    fireEvent.keyDown(screen.getByTestId('history-scrubber'), { key: 'ArrowLeft' })

    expect(await screen.findByText(/didn't exist at this commit/)).toBeInTheDocument()
    expect(screen.getByTestId('history-version-preview')).toHaveAttribute('aria-live', 'polite')
  })
})
