import { act, renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import type { FolderNode, SidebarSelection } from '../types'
import { useNoteRetargetingUi } from './useNoteRetargetingUi'

const folders: FolderNode[] = [
  { name: 'areas', path: 'areas', children: [] },
  { name: 'journal', path: 'journal', children: [] },
]

const selection: SidebarSelection = { kind: 'filter', filter: 'all' }

function renderRetargetingUi() {
  const entry = makeEntry({
    path: '/vault/projects/plan.md',
    filename: 'plan.md',
    title: 'Plan',
  })
  const moveNoteToFolder = vi.fn().mockResolvedValue({ new_path: '/vault/journal/plan.md' })
  const hook = renderHook(() => useNoteRetargetingUi({
    activeEntry: entry,
    activeNoteBlocked: false,
    entries: [entry],
    folders,
    selection,
    setSelection: vi.fn(),
    setToastMessage: vi.fn(),
    vaultPath: '/vault',
    updateFrontmatter: vi.fn(),
    moveNoteToFolder,
  }))
  return { hook, moveNoteToFolder }
}

describe('useNoteRetargetingUi locality confirmation', () => {
  it('moves without confirmation when locality does not change', async () => {
    const { hook, moveNoteToFolder } = renderRetargetingUi()

    act(() => {
      hook.result.current.openMoveNoteToFolderDialogForPath('/vault/projects/plan.md')
    })
    expect(hook.result.current.dialogState).toEqual({ kind: 'folder', notePath: '/vault/projects/plan.md' })

    await act(async () => {
      await hook.result.current.selectFolder('areas')
    })
    expect(moveNoteToFolder).toHaveBeenCalledWith(
      '/vault/projects/plan.md',
      'areas',
      '/vault',
      expect.any(Function),
    )
  })

  it('interposes a locality confirmation before moving into a protected folder', async () => {
    const { hook, moveNoteToFolder } = renderRetargetingUi()

    act(() => {
      hook.result.current.openMoveNoteToFolderDialogForPath('/vault/projects/plan.md')
    })
    await act(async () => {
      await hook.result.current.selectFolder('journal')
    })

    expect(moveNoteToFolder).not.toHaveBeenCalled()
    expect(hook.result.current.dialogState).toEqual({
      kind: 'folder-locality',
      notePath: '/vault/projects/plan.md',
      folderPath: 'journal',
      effect: 'protects',
    })

    await act(async () => {
      await hook.result.current.confirmFolderMove()
    })
    expect(moveNoteToFolder).toHaveBeenCalledWith(
      '/vault/projects/plan.md',
      'journal',
      '/vault',
      expect.any(Function),
    )
    expect(hook.result.current.dialogState).toBeNull()
  })

  it('closing the confirmation cancels the move', async () => {
    const { hook, moveNoteToFolder } = renderRetargetingUi()

    act(() => {
      hook.result.current.openMoveNoteToFolderDialogForPath('/vault/projects/plan.md')
    })
    await act(async () => {
      await hook.result.current.selectFolder('journal')
    })
    act(() => {
      hook.result.current.closeDialog()
    })

    expect(moveNoteToFolder).not.toHaveBeenCalled()
    expect(hook.result.current.dialogState).toBeNull()
  })
})
