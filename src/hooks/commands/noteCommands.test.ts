import { describe, expect, it, vi } from 'vitest'
import { buildNoteCommands } from './noteCommands'

function baseConfig() {
  return {
    hasActiveNote: true,
    activeTabPath: '/vault/journal/dream.md',
    isArchived: false,
    onCreateNote: vi.fn(),
    onSave: vi.fn(),
    onDeleteNote: vi.fn(),
    onArchiveNote: vi.fn(),
    onUnarchiveNote: vi.fn(),
  }
}

describe('buildNoteCommands', () => {
  it('adds a Finder reveal command for the active note', () => {
    const onRevealNoteInFinder = vi.fn()

    const commands = buildNoteCommands({
      ...baseConfig(),
      onRevealNoteInFinder,
    })
    const command = commands.find((item) => item.id === 'reveal-note-in-finder')

    expect(command).toMatchObject({
      label: 'Reveal Note in Finder',
      enabled: true,
      group: 'Note',
      keywords: expect.arrayContaining(['finder', 'local', 'markdown']),
    })

    command?.execute()
    expect(onRevealNoteInFinder).toHaveBeenCalledWith('/vault/journal/dream.md')
  })

  it('disables Finder reveal without an active note', () => {
    const commands = buildNoteCommands({
      ...baseConfig(),
      hasActiveNote: false,
      activeTabPath: null,
      onRevealNoteInFinder: vi.fn(),
    })

    expect(commands.find((item) => item.id === 'reveal-note-in-finder')).toMatchObject({
      enabled: false,
    })
  })

  it('adds a Quick Look preview command for the active note', () => {
    const onPreviewNoteWithQuickLook = vi.fn()

    const commands = buildNoteCommands({
      ...baseConfig(),
      onPreviewNoteWithQuickLook,
    })
    const command = commands.find((item) => item.id === 'preview-note-with-quick-look')

    expect(command).toMatchObject({
      label: 'Preview Note with Quick Look',
      enabled: true,
      group: 'Note',
      keywords: expect.arrayContaining(['quicklook', 'preview', 'native']),
    })

    command?.execute()
    expect(onPreviewNoteWithQuickLook).toHaveBeenCalledWith('/vault/journal/dream.md')
  })
})
