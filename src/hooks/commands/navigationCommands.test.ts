import { describe, expect, it, vi } from 'vitest'
import { buildNavigationCommands } from './navigationCommands'

describe('buildNavigationCommands', () => {
  it('adds dashboard capture lanes for menu-bar and command-palette entry', () => {
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

    expect(commands.find((item) => item.id === 'capture-thought')).toMatchObject({
      label: 'Capture Thought',
      group: 'Capture',
      enabled: true,
    })
    expect(commands.find((item) => item.id === 'capture-journal')).toMatchObject({
      label: 'Journal Entry',
      group: 'Capture',
      enabled: true,
    })
    expect(commands.find((item) => item.id === 'capture-dream')).toMatchObject({
      label: 'Dream Entry',
      group: 'Capture',
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
