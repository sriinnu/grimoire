import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { DashboardOnThisDay } from './DashboardOnThisDay'
import { DashboardPinnedRow } from './DashboardPinnedRow'
import { VaultDashboard } from './VaultDashboard'

function localSeconds(year: number, month: number, day: number): number {
  return Math.floor(new Date(year, month - 1, day, 12).getTime() / 1000)
}

function page(title: string, overrides: Partial<VaultEntry> = {}): VaultEntry {
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  return makeEntry({ path: `/vault/${slug}.md`, filename: `${slug}.md`, title, isA: 'Note', ...overrides })
}

describe('DashboardPinnedRow', () => {
  it('renders nothing without favourites', () => {
    const { container } = render(<DashboardPinnedRow entries={[]} onOpenNote={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('opens a pinned page and keeps private titles off the chip', () => {
    const onOpenNote = vi.fn()
    const roadmap = page('Roadmap')
    const dream = page('Falling Dream', { isA: 'Dream' })
    render(<DashboardPinnedRow entries={[roadmap, dream]} onOpenNote={onOpenNote} />)

    const row = screen.getByTestId('dashboard-pinned')
    expect(row).toHaveTextContent('Pinned')
    expect(row).not.toHaveTextContent('Falling Dream')
    fireEvent.click(within(row).getByRole('button', { name: 'Private dream' }))
    expect(onOpenNote).toHaveBeenCalledWith(dream)
    fireEvent.click(within(row).getByRole('button', { name: 'Roadmap' }))
    expect(onOpenNote).toHaveBeenCalledWith(roadmap)
  })
})

describe('DashboardOnThisDay', () => {
  it('renders nothing when there is nothing to remember', () => {
    const { container } = render(<DashboardOnThisDay items={[]} onOpenNote={vi.fn()} />)
    expect(container).toBeEmptyDOMElement()
  })

  it('labels each page with how long ago it was and opens it', () => {
    const onOpenNote = vi.fn()
    const essay = page('First essay')
    render(
      <DashboardOnThisDay
        items={[{ entry: essay, kind: 'years', label: '2 years ago', day: { year: 2024, month: 9, day: 26 } }]}
        onOpenNote={onOpenNote}
      />,
    )
    const button = screen.getByRole('button', { name: /First essay/ })
    expect(button).toHaveTextContent('2 years ago')
    fireEvent.click(button)
    expect(onOpenNote).toHaveBeenCalledWith(essay)
  })
})

describe('VaultDashboard memory sections', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] })
    vi.setSystemTime(new Date(2026, 8, 26, 10))
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  function renderDashboard(entries: VaultEntry[], onOpenNote = vi.fn()) {
    render(
      <VaultDashboard
        conflictCount={0}
        entries={entries}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={onOpenNote}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )
    return onOpenNote
  }

  it('hides both sections when there are no favourites or anniversaries', () => {
    renderDashboard([page('Fresh note', { createdAt: localSeconds(2026, 9, 26) })])
    expect(screen.queryByTestId('dashboard-pinned')).not.toBeInTheDocument()
    expect(screen.queryByTestId('dashboard-on-this-day')).not.toBeInTheDocument()
  })

  it('shows pinned favourites in order and last year’s journal without its title', () => {
    const journal = page('Journal 2025-09-26 - the long walk home', { isA: 'Journal', createdAt: localSeconds(2026, 1, 2) })
    const onOpenNote = renderDashboard([
      journal,
      page('Second pin', { favorite: true, favoriteIndex: 1 }),
      page('First pin', { favorite: true, favoriteIndex: 0 }),
    ])

    const chips = within(screen.getByTestId('dashboard-pinned')).getAllByRole('button')
    expect(chips.map((chip) => chip.textContent)).toEqual(['First pin', 'Second pin'])

    const onThisDay = screen.getByTestId('dashboard-on-this-day')
    expect(onThisDay).toHaveTextContent('1 year ago')
    expect(onThisDay).not.toHaveTextContent('the long walk home')
    fireEvent.click(within(onThisDay).getByRole('button', { name: /Private journal/ }))
    expect(onOpenNote).toHaveBeenCalledWith(journal)
  })
})
