import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import type { FolderNode } from '../../types'
import { MoveFolderDialog } from './MoveFolderDialog'
import { buildMoveFolderOptions, summarizeFolderMoveLocality } from './moveFolderOptions'

const folders: FolderNode[] = [
  {
    name: 'projects',
    path: 'projects',
    children: [
      { name: 'grimoire', path: 'projects/grimoire', children: [] },
    ],
  },
  { name: 'areas', path: 'areas', children: [] },
  { name: 'journal', path: 'journal', children: [] },
]

function renderDialog(overrides: Partial<Parameters<typeof MoveFolderDialog>[0]> = {}) {
  const onMove = vi.fn().mockResolvedValue(true)
  const onClose = vi.fn()
  render(
    <MoveFolderDialog
      movingFolderPath="projects"
      folders={folders}
      entries={[]}
      vaultPath="/vault"
      onClose={onClose}
      onMove={onMove}
      {...overrides}
    />,
  )
  return { onMove, onClose }
}

describe('buildMoveFolderOptions', () => {
  it('excludes the moving folder and its descendants and offers the vault root', () => {
    const options = buildMoveFolderOptions(folders, 'projects')
    const ids = options.map((option) => option.id)

    expect(ids).toEqual(['.', 'areas', 'journal'])
    expect(options[0].label).toBe('Vault root')
    expect(options[0].current).toBe(true)
  })

  it('marks the current parent folder', () => {
    const options = buildMoveFolderOptions(folders, 'projects/grimoire')

    expect(options.find((option) => option.id === 'projects')?.current).toBe(true)
    expect(options.find((option) => option.id === '.')?.current).toBe(false)
    expect(options.map((option) => option.id)).not.toContain('projects/grimoire')
  })
})

describe('summarizeFolderMoveLocality', () => {
  it('counts notes that gain and lose local-only protection', () => {
    const entries = [
      makeEntry({ path: '/vault/projects/plan.md' }),
      makeEntry({ path: '/vault/projects/notes/idea.md' }),
      makeEntry({ path: '/vault/areas/other.md' }),
    ]

    const intoJournal = summarizeFolderMoveLocality({
      entries,
      vaultPath: '/vault',
      folderPath: 'projects',
      destinationPath: 'journal',
    })
    expect(intoJournal).toEqual({ protects: 2, exposes: 0 })

    const toRoot = summarizeFolderMoveLocality({
      entries: [makeEntry({ path: '/vault/journal/archive/idea.md' })],
      vaultPath: '/vault',
      folderPath: 'journal/archive',
      destinationPath: '.',
    })
    expect(toRoot).toEqual({ protects: 0, exposes: 1 })
  })

  it('ignores notes whose protection is path-independent', () => {
    const summary = summarizeFolderMoveLocality({
      entries: [makeEntry({ path: '/vault/projects/dream.md', properties: { private: true } })],
      vaultPath: '/vault',
      folderPath: 'projects',
      destinationPath: 'journal',
    })

    expect(summary).toEqual({ protects: 0, exposes: 0 })
  })
})

describe('MoveFolderDialog', () => {
  it('lists destinations, filters them, and moves on selection', async () => {
    const { onMove } = renderDialog()

    expect(await screen.findByTestId('move-folder-option:.')).toBeInTheDocument()
    expect(screen.getByTestId('move-folder-option:areas')).toBeInTheDocument()
    expect(screen.queryByTestId('move-folder-option:projects')).not.toBeInTheDocument()
    expect(screen.queryByTestId('move-folder-option:projects/grimoire')).not.toBeInTheDocument()

    fireEvent.change(screen.getByTestId('move-folder-search'), { target: { value: 'are' } })
    expect(screen.queryByTestId('move-folder-option:journal')).not.toBeInTheDocument()

    fireEvent.click(screen.getByTestId('move-folder-option:areas'))
    expect(onMove).toHaveBeenCalledWith('projects', 'areas')
  })

  it('asks for confirmation when the move changes locality, then moves', async () => {
    const { onMove } = renderDialog({
      entries: [makeEntry({ path: '/vault/projects/plan.md' })],
    })

    fireEvent.click(await screen.findByTestId('move-folder-option:journal'))
    expect(onMove).not.toHaveBeenCalled()

    const description = await screen.findByTestId('move-folder-locality-description')
    expect(description).toHaveTextContent('1 note will sit under a local-only folder')

    fireEvent.click(screen.getByTestId('move-folder-locality-confirm'))
    expect(onMove).toHaveBeenCalledWith('projects', 'journal')
  })

  it('cancels a locality-changing move without invoking the command', async () => {
    const { onMove, onClose } = renderDialog({
      entries: [makeEntry({ path: '/vault/projects/plan.md' })],
    })

    fireEvent.click(await screen.findByTestId('move-folder-option:journal'))
    fireEvent.click(await screen.findByTestId('move-folder-locality-cancel'))

    expect(onMove).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalled()
  })
})
