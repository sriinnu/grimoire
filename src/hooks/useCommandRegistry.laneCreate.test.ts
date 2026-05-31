import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { formatShortcutDisplay } from './appCommandCatalog'
import { useCommandRegistry, type CommandAction } from './useCommandRegistry'

function makeConfig(overrides: Record<string, unknown> = {}) {
  return {
    activeTabPath: '/vault/test.md',
    entries: [],
    modifiedCount: 0,
    onQuickOpen: vi.fn(),
    onCreateNote: vi.fn(),
    onCreateNoteOfType: vi.fn(),
    onSave: vi.fn(),
    onOpenSettings: vi.fn(),
    onDeleteNote: vi.fn(),
    onArchiveNote: vi.fn(),
    onUnarchiveNote: vi.fn(),
    onToggleOrganized: vi.fn(),
    onCommitPush: vi.fn(),
    onResolveConflicts: vi.fn(),
    onSetViewMode: vi.fn(),
    onToggleInspector: vi.fn(),
    onOpenVault: vi.fn(),
    activeNoteModified: false,
    onZoomIn: vi.fn(),
    onZoomOut: vi.fn(),
    onZoomReset: vi.fn(),
    zoomLevel: 100,
    onSelect: vi.fn(),
    onGoBack: vi.fn(),
    onGoForward: vi.fn(),
    canGoBack: false,
    canGoForward: false,
    onCheckForUpdates: vi.fn(),
    ...overrides,
  }
}

function findCommand(commands: CommandAction[], id: string): CommandAction {
  const command = commands.find((item) => item.id === id)
  if (!command) throw new Error(`Missing command ${id}`)
  return command
}

describe('useCommandRegistry lane create command', () => {
  it('retargets Cmd+N to the active journal lane', () => {
    const onCreateNote = vi.fn()
    const onCreateNoteOfType = vi.fn()
    const { result } = renderHook(() => useCommandRegistry(makeConfig({
      selection: { kind: 'sectionGroup', type: 'Journal' },
      onCreateNote,
      onCreateNoteOfType,
    })))
    const command = findCommand(result.current, 'create-note')

    expect(command).toMatchObject({
      label: 'Create journal entry',
      shortcut: formatShortcutDisplay({ display: '⌘N' }),
      keywords: expect.arrayContaining(['journal']),
    })

    command.execute()
    expect(onCreateNoteOfType).toHaveBeenCalledWith('Journal')
    expect(onCreateNote).not.toHaveBeenCalled()
  })

  it('retargets Cmd+N to the active dream lane', () => {
    const onCreateNoteOfType = vi.fn()
    const { result } = renderHook(() => useCommandRegistry(makeConfig({
      selection: { kind: 'sectionGroup', type: 'Dream' },
      onCreateNoteOfType,
    })))
    const command = findCommand(result.current, 'create-note')

    expect(command.label).toBe('Create dream entry')
    command.execute()
    expect(onCreateNoteOfType).toHaveBeenCalledWith('Dream')
  })
})
