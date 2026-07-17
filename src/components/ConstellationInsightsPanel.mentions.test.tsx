import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConstellationInsightsPanel } from './ConstellationInsightsPanel'
import type { VaultEntry } from '../types'

const { mockInvoke } = vi.hoisted(() => ({ mockInvoke: vi.fn() }))

vi.mock('../mock-tauri', () => ({
  isTauri: () => false,
  mockInvoke,
}))

const entry: VaultEntry = {
  path: '/vault/project/grimoire.md',
  filename: 'grimoire.md',
  title: 'Grimoire',
  isA: 'Project',
  aliases: [],
  belongsTo: [],
  relatedTo: [],
  status: null,
  owner: null,
  cadence: null,
  archived: false,
  modifiedAt: 1707900000,
  createdAt: null,
  fileSize: 1024,
  snippet: '',
  wordCount: 0,
  relationships: {},
  icon: null,
  color: null,
  order: null,
  template: null, sort: null,
  outgoingLinks: [],
}

const mention = {
  path: '/vault/journal/monday.md',
  title: 'Monday Journal',
  line: 4,
  context: 'Shipped grimoire fixes before lunch.',
  matchedText: 'grimoire',
}

function renderPanel(overrides: Partial<Parameters<typeof ConstellationInsightsPanel>[0]> = {}) {
  return render(
    <ConstellationInsightsPanel
      entry={entry}
      entries={[entry]}
      content={'# Grimoire\n\nBody text.'}
      vaultPath="/vault"
      onNavigate={() => {}}
      {...overrides}
    />,
  )
}

describe('ConstellationInsightsPanel unlinked mentions', () => {
  beforeEach(() => {
    mockInvoke.mockReset()
  })

  it('renders mention rows with source title, marked context, and count', async () => {
    mockInvoke.mockImplementation(async (cmd: string) => (cmd === 'find_note_mentions' ? [mention] : null))

    renderPanel()

    expect(await screen.findByText('Monday Journal', {}, { timeout: 2000 })).toBeInTheDocument()
    const section = screen.getByTestId('unlinked-mentions-section')
    expect(section).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Unlinked mentions' })).toBeInTheDocument()
    expect(screen.getByText('grimoire', { selector: 'mark' })).toBeInTheDocument()
    expect(mockInvoke).toHaveBeenCalledWith('find_note_mentions', {
      vaultPath: '/vault',
      notePath: entry.path,
      title: 'Grimoire',
      aliases: [],
    })
  })

  it('caps visible rows at five with a "+N more" line', async () => {
    const mentions = Array.from({ length: 7 }, (_, index) => ({
      ...mention,
      path: `/vault/journal/day-${index}.md`,
      title: `Journal ${index}`,
    }))
    mockInvoke.mockImplementation(async (cmd: string) => (cmd === 'find_note_mentions' ? mentions : null))

    renderPanel()

    expect(await screen.findByText('Journal 0', {}, { timeout: 2000 })).toBeInTheDocument()
    expect(screen.getByText('Journal 4')).toBeInTheDocument()
    expect(screen.queryByText('Journal 5')).toBeNull()
    expect(screen.getByText('+2 more')).toBeInTheDocument()
  })

  it('links a mention, notifies the refresh path, and re-scans', async () => {
    const onFileModified = vi.fn()
    let scans = 0
    mockInvoke.mockImplementation(async (cmd: string) => {
      if (cmd === 'find_note_mentions') {
        scans += 1
        return scans === 1 ? [mention] : []
      }
      return null
    })

    renderPanel({ onFileModified })

    const linkButton = await screen.findByRole(
      'button',
      { name: 'Link mention in Monday Journal' },
      { timeout: 2000 },
    )
    fireEvent.click(linkButton)

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('link_unlinked_mention', {
        vaultPath: '/vault',
        sourcePath: mention.path,
        targetTitle: 'Grimoire',
        matchedText: 'grimoire',
        line: 4,
      })
    })
    expect(onFileModified).toHaveBeenCalledWith('journal/monday.md')
    await waitFor(() => {
      expect(screen.queryByTestId('unlinked-mentions-section')).toBeNull()
    })
    expect(scans).toBe(2)
  })

  it('renders nothing when the scan command is unavailable', async () => {
    mockInvoke.mockRejectedValue(new Error('No mock handler for command: find_note_mentions'))

    renderPanel()

    await waitFor(() => expect(mockInvoke).toHaveBeenCalled(), { timeout: 2000 })
    expect(screen.queryByTestId('unlinked-mentions-section')).toBeNull()
  })

  it('skips scanning entirely without a vault path', async () => {
    renderPanel({ vaultPath: undefined })

    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(mockInvoke).not.toHaveBeenCalled()
    expect(screen.queryByTestId('unlinked-mentions-section')).toBeNull()
  })
})
