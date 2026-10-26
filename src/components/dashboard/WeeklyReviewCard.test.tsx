import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { VaultDashboard } from './VaultDashboard'

function entry(title: string, type = 'Note', overrides: Partial<VaultEntry> = {}): VaultEntry {
  const slug = title.toLowerCase().replace(/\s+/g, '-')
  return {
    path: `/vault/${slug}.md`,
    filename: `${slug}.md`,
    title,
    isA: type,
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: Math.floor(Date.now() / 1000),
    createdAt: Math.floor(Date.now() / 1000),
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
    ...overrides,
  }
}

function renderDashboard(entries: VaultEntry[]) {
  render(
    <VaultDashboard
      conflictCount={0}
      entries={entries}
      isGitVault={false}
      modifiedCount={0}
      onCapture={vi.fn()}
      onOpenCreateVault={vi.fn()}
      onOpenNote={vi.fn()}
      syncStatus="idle"
      vaultPath="/vault"
    />,
  )
}

function localTodayKey(now = new Date()): string {
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${now.getFullYear()}-${month}-${day}`
}

const DAY_SECONDS = 24 * 60 * 60
let nowSeconds = 0

beforeEach(() => {
  // Anchor both the fixtures and the component's internal clock to a fixed
  // mid-week date — relative "yesterday" fixtures straddle week boundaries
  // and the cross-month range label breaks naive assertions otherwise.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-21T12:00:00'))
  nowSeconds = Math.floor(Date.now() / 1000)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('VaultDashboard weekly review', () => {
  it('shows this-week numbers, a day strip with today highlighted, and type chips', () => {
    renderDashboard([
      entry('Morning Note', 'Note', { createdAt: nowSeconds, modifiedAt: nowSeconds }),
      entry('Evening Journal', 'Journal', { createdAt: nowSeconds - DAY_SECONDS, modifiedAt: nowSeconds - DAY_SECONDS }),
      entry('Old Dream', 'Dream', { createdAt: nowSeconds - 10 * DAY_SECONDS, modifiedAt: nowSeconds - 10 * DAY_SECONDS }),
    ])

    const card = screen.getByTestId('dashboard-weekly-review')
    expect(within(card).getByText('This week')).toBeInTheDocument()
    expect(card).toHaveTextContent(/[A-Z][a-z]{2} \d{1,2}–\d{1,2}/)
    expect(card).toHaveTextContent('New 2')
    expect(card).toHaveTextContent('Touched 2')
    expect(card).toHaveTextContent('Journal days 1')
    expect(card).toHaveTextContent('Streak 2d')
    expect(within(card).getByTestId(`weekly-review-day-${localTodayKey()}`)).toHaveAttribute('data-today', 'true')
    expect(within(card).getByText('Note 1')).toBeInTheDocument()
    expect(within(card).getByText('Journal 1')).toBeInTheDocument()
    expect(card).not.toHaveTextContent('Old Dream')
  })

  it('renders a calm empty state that seeds a journal prompt', () => {
    renderDashboard([])

    const card = screen.getByTestId('dashboard-weekly-review')
    expect(card).toHaveTextContent('A blank week is a fresh page.')
    expect(card).not.toHaveTextContent('Streak')

    fireEvent.click(within(card).getByTestId('weekly-review-start-journal'))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/journal ')
  })

  it('keeps private note titles out of the weekly band', () => {
    renderDashboard([
      entry('Secret River Dream', 'Dream', {
        path: '/vault/dreams/secret-river.md',
        createdAt: nowSeconds,
        modifiedAt: nowSeconds,
        properties: { locality: 'local' },
      }),
    ])

    const card = screen.getByTestId('dashboard-weekly-review')
    expect(card).toHaveTextContent('New 1')
    expect(card).not.toHaveTextContent('Secret River Dream')
    expect(card).not.toHaveTextContent('/vault/dreams')
  })
})
