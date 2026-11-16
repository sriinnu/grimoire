import { render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
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
  // Anchor fixtures and the component's internal clock to a fixed mid-week,
  // mid-month date so week/month windows and anniversary fixtures are stable.
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-21T12:00:00'))
  nowSeconds = Math.floor(Date.now() / 1000)
})

afterEach(() => {
  vi.useRealTimers()
})

describe('VaultDashboard mood strip', () => {
  it('renders one dot per day this week, colored by journal mood', () => {
    renderDashboard([
      entry('Monday Journal', 'Journal', {
        title: 'Journal 2026-10-19',
        createdAt: nowSeconds - 2 * DAY_SECONDS,
        properties: { mood: 'great' },
      }),
      entry('Yesterday Journal', 'Journal', {
        title: 'Journal 2026-10-20',
        createdAt: nowSeconds - DAY_SECONDS,
        properties: { mood: 'LOW' },
      }),
    ])

    const strip = screen.getByTestId('dashboard-mood-strip')
    const dots = within(strip).getAllByRole('listitem')
    expect(dots).toHaveLength(7)
    expect(within(strip).getByTestId(`mood-dot-${localTodayKey()}`)).toHaveAttribute('data-today', 'true')
    expect(within(strip).getByTestId('mood-dot-2026-10-19')).toHaveAttribute('data-tone', 'great')
    expect(within(strip).getByTestId('mood-dot-2026-10-20')).toHaveAttribute('data-tone', 'low')
    expect(within(strip).getByTestId(`mood-dot-${localTodayKey()}`)).toHaveAttribute('data-tone', 'none')
    expect(strip).toHaveTextContent('Great')
    expect(strip).toHaveTextContent('Rough')
  })

  it('keeps private journal titles out of the mood strip', () => {
    renderDashboard([
      entry('Secret River Journal', 'Journal', {
        title: 'Journal 2026-10-19',
        path: '/vault/journals/secret-river.md',
        createdAt: nowSeconds - 2 * DAY_SECONDS,
        properties: { locality: 'local', mood: 'rough' },
      }),
    ])

    const strip = screen.getByTestId('dashboard-mood-strip')
    expect(within(strip).getByTestId('mood-dot-2026-10-19')).toHaveAttribute('data-tone', 'rough')
    expect(strip).not.toHaveTextContent('Secret River Journal')
    expect(strip).not.toHaveTextContent('/vault/')
  })
})

describe('VaultDashboard monthly review', () => {
  it('shows the month heat strip, four stats, and type chips', () => {
    renderDashboard([
      entry('October Note', 'Note', { createdAt: nowSeconds - 3 * DAY_SECONDS, modifiedAt: nowSeconds - 3 * DAY_SECONDS }),
      entry('October Journal', 'Journal', { createdAt: nowSeconds - 3 * DAY_SECONDS, modifiedAt: nowSeconds - 3 * DAY_SECONDS }),
      entry('September Note', 'Note', { createdAt: nowSeconds - 30 * DAY_SECONDS, modifiedAt: nowSeconds - 30 * DAY_SECONDS }),
      entry('Touched Today Note', 'Note', { createdAt: nowSeconds - 40 * DAY_SECONDS, modifiedAt: nowSeconds }),
    ])

    const card = screen.getByTestId('dashboard-monthly-review')
    expect(within(card).getByText('This month')).toBeInTheDocument()
    expect(within(card).getByText('October')).toBeInTheDocument()
    expect(within(card).getByTestId(`monthly-review-day-${localTodayKey()}`)).toHaveAttribute('data-today', 'true')
    // 31 October days; leading pads align the Monday-first grid (Oct 1 2026 is a Thursday).
    expect(within(card).getAllByRole('listitem')).toHaveLength(31)
    expect(card).toHaveTextContent('New 2')
    expect(card).toHaveTextContent('Touched 3')
    expect(card).toHaveTextContent('Journal days 1')
    expect(card).toHaveTextContent('Active days 2')
    expect(card).toHaveTextContent('Note 1')
    expect(card).toHaveTextContent('Journal 1')
    expect(card).not.toHaveTextContent('October Note')
  })

  it('renders a calm empty state for a quiet month', () => {
    renderDashboard([])

    const card = screen.getByTestId('dashboard-monthly-review')
    expect(card).toHaveTextContent('A quiet month.')
  })

  it('keeps private note titles out of the monthly band', () => {
    renderDashboard([
      entry('Secret River Dream', 'Dream', {
        path: '/vault/dreams/secret-river.md',
        createdAt: nowSeconds - DAY_SECONDS,
        properties: { locality: 'local' },
      }),
    ])

    const card = screen.getByTestId('dashboard-monthly-review')
    expect(card).toHaveTextContent('New 1')
    expect(card).not.toHaveTextContent('Secret River Dream')
    expect(card).not.toHaveTextContent('/vault/')
  })
})

describe('VaultDashboard on-this-day reasons', () => {
  it('shows a counts-only reason line for resurfaced pages', () => {
    const anniversary = entry('Anniversary Page', 'Note', {
      createdAt: nowSeconds - 365 * DAY_SECONDS,
      modifiedAt: nowSeconds - 150 * DAY_SECONDS,
    })
    renderDashboard([
      anniversary,
      entry('Linker Page', 'Note', {
        createdAt: nowSeconds,
        outgoingLinks: ['Anniversary Page'],
      }),
    ])

    const panel = screen.getByTestId('dashboard-on-this-day')
    expect(panel).toHaveTextContent('1 year ago')
    expect(panel).toHaveTextContent('last touched 180 days ago')
    expect(panel).toHaveTextContent('1 backlink')
  })

  it('never leaks protected titles through the reason line', () => {
    renderDashboard([
      entry('Secret River Dream', 'Dream', {
        path: '/vault/dreams/secret-river.md',
        createdAt: nowSeconds - 365 * DAY_SECONDS,
        properties: { locality: 'local' },
      }),
    ])

    const panel = screen.getByTestId('dashboard-on-this-day')
    expect(panel).toHaveTextContent('Private dream')
    expect(panel).toHaveTextContent('backlink')
    expect(panel).not.toHaveTextContent('Secret River Dream')
  })
})
