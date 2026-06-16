import { fireEvent, render, screen, within } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { DAILY_THREAD_CRYSTALLIZE_PROMPT } from '../../lib/timeLoomGuidance'
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

function renderDashboard(overrides: Partial<ComponentProps<typeof VaultDashboard>> = {}) {
  const onOpenNote = vi.fn()
  const yesterday = Math.floor(Date.now() / 1000) - 24 * 60 * 60
  const memory = entry('Private Memory Ledger', 'Memory', {
    path: '/vault/memory/private-ledger.md',
    properties: { locality: 'local', egress: 'blocked' },
    status: 'Review',
  })
  render(
    <VaultDashboard
      conflictCount={0}
      entries={[
        entry('Reference Note', 'Note'),
        entry('Secret River Dream', 'Dream', {
          path: '/vault/dreams/secret-river.md',
          createdAt: yesterday,
          modifiedAt: yesterday,
        }),
        memory,
      ]}
      isGitVault={false}
      modifiedCount={0}
      onCapture={vi.fn()}
      onOpenCreateVault={vi.fn()}
      onOpenNote={onOpenNote}
      syncStatus="idle"
      vaultPath="/vault"
      {...overrides}
    />,
  )
  return { memory, onOpenNote }
}

function getFlowStep(flow: HTMLElement, label: string): HTMLElement {
  const button = within(flow).getAllByRole('button').find((candidate) => (
    candidate.querySelector('strong')?.textContent === label
  ))
  expect(button).toBeDefined()
  return button as HTMLElement
}

describe('VaultDashboard notebook rhythm', () => {
  it('shows a metadata-only assistant brief above the notebook rhythm', () => {
    const { memory, onOpenNote } = renderDashboard()
    const brief = screen.getByTestId('dashboard-assistant-brief')

    expect(brief).toHaveTextContent('Today')
    expect(brief).toHaveTextContent('Review memory')
    expect(brief).toHaveTextContent('Journal open')
    expect(brief).toHaveTextContent('Dream open')
    expect(brief).toHaveTextContent('1 memory review')
    expect(screen.getByTestId('dashboard-one-next-action')).toHaveTextContent('1 memory ready for review.')
    expect(Number(brief.dataset.privateHeld)).toBeGreaterThan(0)
    expect(brief).not.toHaveTextContent('Secret River Dream')
    expect(brief).not.toHaveTextContent('Private Memory Ledger')
    expect(brief).not.toHaveTextContent('/vault/')

    fireEvent.click(within(brief).getByRole('button', { name: /Review/ }))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ path: memory.path }))
  })

  it('wires the daily loop without exposing private labels in the rail', async () => {
    const { memory, onOpenNote } = renderDashboard()
    const flow = screen.getByTestId('dashboard-daily-flow')
    const input = screen.getByTestId('dashboard-capture-input')

    expect(flow).toHaveTextContent('One page at a time.')
    expect(flow).toHaveTextContent('Next: Review memory')
    expect(flow).toHaveTextContent('0 of 4 held')
    expect(screen.getByTestId('dashboard-daily-flow-meter')).toHaveAttribute('data-progress', '0')
    expect(flow).toHaveTextContent('Dream open')
    expect(flow).toHaveTextContent('1 memory review')
    expect(flow).toHaveTextContent('mobile clear')
    expect(flow).toHaveTextContent('Pages to revisit')
    expect(flow).toHaveTextContent('Remember next')
    expect(flow).not.toHaveTextContent('3 pages waiting')
    expect(flow).not.toHaveTextContent('Secret River Dream')
    expect(flow).not.toHaveTextContent('Private Memory Ledger')
    expect(within(flow).getByRole('button', { name: /Gather/ })).toHaveAttribute('data-state', 'next')
    expect(within(flow).getByRole('button', { name: /Gather/ })).toHaveAttribute('aria-current', 'step')

    fireEvent.click(within(flow).getByRole('button', { name: /Notice/ }))
    expect(input).toHaveValue('/journal ')
    expect(within(flow).getByRole('button', { name: /Notice/ })).toHaveAttribute('aria-current', 'step')
    expect(within(flow).getByRole('button', { name: /Notice/ })).toHaveAttribute('data-selected', 'true')
    expect(within(flow).getByRole('button', { name: /Gather/ })).toHaveAttribute('data-selected', 'false')

    fireEvent.change(input, { target: { value: '' } })
    fireEvent.click(getFlowStep(flow, 'Remember'))
    expect(input).toHaveValue('/ask ')
    expect(await screen.findByTestId('dashboard-ask-context-preview')).toHaveTextContent(
      'Only listed public notes can be sent.',
    )

    fireEvent.click(within(flow).getByRole('button', { name: /Gather/ }))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ path: memory.path }))
  })

  it('uses clear daily-flow states instead of zero-review noise', () => {
    renderDashboard({ entries: [entry('Reference Note', 'Note')] })
    const flow = screen.getByTestId('dashboard-daily-flow')

    expect(flow).toHaveTextContent('Next: Notice')
    expect(flow).toHaveTextContent('memory clear')
    expect(flow).toHaveTextContent('mobile clear')
    expect(flow).toHaveTextContent('Pages to revisit')
    expect(flow).not.toHaveTextContent('1 page waiting')
    expect(flow).not.toHaveTextContent('0 memory reviews')
    expect(flow).not.toHaveTextContent('0 mobile reviews')
  })

  it('keeps the selected daily-flow step in sync with typed slash commands', () => {
    renderDashboard()
    const flow = screen.getByTestId('dashboard-daily-flow')
    const input = screen.getByTestId('dashboard-capture-input')

    expect(within(flow).getByRole('button', { name: /Gather/ })).toHaveAttribute('aria-current', 'step')

    fireEvent.change(input, { target: { value: '/note hello what are we doing today' } })
    expect(within(flow).getByRole('button', { name: /Write/ })).toHaveAttribute('aria-current', 'step')
    expect(within(flow).getByRole('button', { name: /Write/ })).toHaveAttribute('data-selected', 'true')
    expect(within(flow).getByRole('button', { name: /Gather/ })).toHaveAttribute('data-selected', 'false')

    fireEvent.change(input, { target: { value: '/ask crystallize this' } })
    const reviewStep = getFlowStep(flow, 'Remember')
    expect(reviewStep).toHaveAttribute('aria-current', 'step')
    expect(reviewStep).toHaveAttribute('data-selected', 'true')
  })

  it('lists every public note that can travel in the ask preview', async () => {
    const publicNotes = Array.from({ length: 5 }, (_, index) => (
      entry(`Public ${index + 1}`, 'Note', { modifiedAt: 50 - index })
    ))
    renderDashboard({ entries: publicNotes })

    fireEvent.click(within(screen.getByTestId('dashboard-daily-flow')).getByRole('button', { name: /Remember/ }))
    const preview = await screen.findByTestId('dashboard-ask-context-preview')

    for (const note of publicNotes) {
      expect(preview).toHaveTextContent(note.title)
    }
    expect(preview).not.toHaveTextContent('+2')
    expect(preview).toHaveTextContent('Only listed public notes can be sent.')
  })

  it('seeds a source-safe Crystallize prompt from Return when the notebook is calm', () => {
    renderDashboard({
      entries: [
        entry('Journal today', 'Journal'),
        entry('Dream today', 'Dream'),
        entry('Latest Thread', 'Note'),
      ],
    })
    const panel = screen.getByText('Return').closest('.vault-dashboard__panel') as HTMLElement

    expect(panel).toHaveTextContent('Crystallize')
    fireEvent.click(within(panel).getByRole('button', { name: 'Crystallize' }))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue(
      '/ask Crystallize the latest page into reviewed Markdown memory.',
    )
  })

  it('seeds the Daily Thread Crystallize action into the source-safe ask path', async () => {
    const twoDaysAgo = Math.floor(Date.now() / 1000) - 2 * 24 * 60 * 60
    renderDashboard({
      entries: [
        entry('Reference Note', 'Note'),
        entry('Old Dream Private', 'Dream', {
          path: '/vault/dreams/old-dream-private.md',
          createdAt: twoDaysAgo,
          modifiedAt: twoDaysAgo,
        }),
      ],
    })

    const rail = await screen.findByTestId('daily-thread-rail')
    expect(rail).toHaveTextContent('Crystallize the day')
    expect(rail).not.toHaveTextContent('Old Dream Private')

    fireEvent.click(within(rail).getByRole('button', { name: /Crystallize/ }))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue(DAILY_THREAD_CRYSTALLIZE_PROMPT)
    const preview = await screen.findByTestId('dashboard-ask-context-preview')
    expect(preview).toHaveTextContent('Daily Thread Crystallize')
    expect(preview).toHaveTextContent('Review-before-write Markdown memory; public references only.')
    expect(preview).toHaveTextContent('Only listed public notes can be sent.')
  })

  it('seeds a local capture from the assistant brief action', () => {
    renderDashboard({ entries: [entry('Reference Note', 'Note')] })
    const brief = screen.getByTestId('dashboard-assistant-brief')

    expect(brief).toHaveTextContent('Journal check-in')
    fireEvent.click(within(brief).getByRole('button', { name: /Journal/ }))
    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/journal ')
  })

  it('accepts a native menu-bar capture intent without writing a note', () => {
    const onCapture = vi.fn()
    const onPendingCaptureConsumed = vi.fn()
    renderDashboard({
      onCapture,
      onPendingCaptureConsumed,
      pendingCaptureRequest: { kind: 'dream', nonce: 1 },
    })

    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/dream ')
    expect(onPendingCaptureConsumed).toHaveBeenCalled()
    expect(onCapture).not.toHaveBeenCalled()
  })

  it('replays repeated same-kind native capture requests when the nonce changes', () => {
    const onPendingCaptureConsumed = vi.fn()
    const { rerender } = render(
      <VaultDashboard
        conflictCount={0}
        entries={[entry('Reference Note', 'Note')]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        onPendingCaptureConsumed={onPendingCaptureConsumed}
        pendingCaptureRequest={{ kind: 'journal', nonce: 1 }}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/journal ')
    fireEvent.change(screen.getByTestId('dashboard-capture-input'), { target: { value: '' } })

    rerender(
      <VaultDashboard
        conflictCount={0}
        entries={[entry('Reference Note', 'Note')]}
        isGitVault={false}
        modifiedCount={0}
        onCapture={vi.fn()}
        onOpenCreateVault={vi.fn()}
        onOpenNote={vi.fn()}
        onPendingCaptureConsumed={onPendingCaptureConsumed}
        pendingCaptureRequest={{ kind: 'journal', nonce: 2 }}
        syncStatus="idle"
        vaultPath="/vault"
      />,
    )

    expect(screen.getByTestId('dashboard-capture-input')).toHaveValue('/journal ')
    expect(onPendingCaptureConsumed).toHaveBeenCalledTimes(2)
  })

  it('routes pending mobile capture review through Return without naming it in the rail', () => {
    const mobileDraft = entry('Private iPhone Journal', 'Journal', {
      path: '/vault/journals/mobile/private-iphone-journal.md',
      snippet: 'private mobile body extract',
      properties: { created_from: 'mobile-capture', mobile_review: 'pending' },
    })
    const { onOpenNote } = renderDashboard({ entries: [mobileDraft] })
    const flow = screen.getByTestId('dashboard-daily-flow')
    const panel = screen.getByText('Return').closest('.vault-dashboard__panel') as HTMLElement

    expect(flow).toHaveTextContent('1 mobile review')
    expect(flow).not.toHaveTextContent('Private iPhone Journal')
    expect(panel).toHaveTextContent('Review mobile')
    expect(panel).not.toHaveTextContent('Private iPhone Journal')
    expect(panel).not.toHaveTextContent('/vault/journals/mobile')
    expect(panel).not.toHaveTextContent('private mobile body extract')

    fireEvent.click(within(flow).getByRole('button', { name: /Gather/ }))
    expect(onOpenNote).toHaveBeenCalledWith(expect.objectContaining({ path: mobileDraft.path }))
  })

  it('shows when the Crystallize loop already landed today', () => {
    renderDashboard({
      entries: [
        entry('Journal today', 'Journal'),
        entry('Dream today', 'Dream'),
        entry('Crystallized private answer', 'Memory', {
          properties: {
            crystallized: true,
            reviewed_at: new Date().toISOString(),
          },
        }),
      ],
    })
    const flow = screen.getByTestId('dashboard-daily-flow')
    const panel = screen.getByText('Return').closest('.vault-dashboard__panel') as HTMLElement

    expect(flow).toHaveTextContent('3 of 4 held')
    expect(screen.getByTestId('dashboard-daily-flow-meter')).toHaveAttribute('data-progress', '3')
    expect(flow).toHaveTextContent('Remembered today')
    expect(within(flow).getByRole('button', { name: /Remember/ })).toHaveTextContent('Touched today.')
    expect(panel).toHaveTextContent('Memory landed')
    expect(panel).toHaveTextContent('1 reviewed Markdown memory landed today.')
  })
})
