import { describe, expect, it, vi } from 'vitest'
import { buildNavigationCommands } from './navigationCommands'

describe('buildNavigationCommands', () => {
  it('adds notebook capture lanes for menu-bar and command-palette entry', () => {
    const onCaptureThought = vi.fn()
    const onCaptureJournal = vi.fn()
    const onCaptureDream = vi.fn()

    const commands = buildNavigationCommands({
      onQuickOpen: vi.fn(),
      onSelect: vi.fn(),
      onCaptureThought,
      onCaptureJournal,
      onCaptureDream,
    })

    expect(commands.find((item) => item.id === 'search-notes')).toMatchObject({
      label: 'Search Pages',
      group: 'Navigation',
      enabled: true,
    })
    expect(commands.find((item) => item.id === 'go-dashboard')).toMatchObject({
      label: 'Go to Notebook',
      group: 'Navigation',
      enabled: true,
    })
    expect(commands.find((item) => item.id === 'capture-thought')).toMatchObject({
      label: 'Catch a Thought',
      group: 'Capture',
      enabled: true,
    })
    expect(commands.find((item) => item.id === 'capture-journal')).toMatchObject({
      label: 'Journal Page',
      group: 'Capture',
      enabled: true,
    })
    expect(commands.find((item) => item.id === 'capture-dream')).toMatchObject({
      label: 'Dream Page',
      group: 'Capture',
      enabled: true,
    })
    expect(commands.find((item) => item.id === 'go-changes')).toMatchObject({
      label: 'Review Edits',
      group: 'Navigation',
      enabled: true,
    })

    commands.find((item) => item.id === 'capture-thought')?.execute()
    commands.find((item) => item.id === 'capture-journal')?.execute()
    commands.find((item) => item.id === 'capture-dream')?.execute()
    expect(onCaptureThought).toHaveBeenCalledTimes(1)
    expect(onCaptureJournal).toHaveBeenCalledTimes(1)
    expect(onCaptureDream).toHaveBeenCalledTimes(1)
  })
})
