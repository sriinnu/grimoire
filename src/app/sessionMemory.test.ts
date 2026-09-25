import { renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { SidebarSelection, VaultEntry } from '../types'
import {
  parsePersistableSelection,
  readStoredSession,
  resolveSessionRestore,
  sessionStorageKey,
  writeStoredSession,
} from './sessionMemory'
import { useSessionMemory } from './useSessionMemory'

const VAULT = '/Users/sriinnu/Grimoire'

function entry(path: string, isA: string | null = null): VaultEntry {
  return { path, title: path.split('/').pop() ?? path, isA } as VaultEntry
}

describe('sessionMemory model', () => {
  afterEach(() => localStorage.clear())

  it('round-trips a session per vault', () => {
    writeStoredSession(localStorage, VAULT, { selection: { kind: 'filter', filter: 'all' }, notePath: `${VAULT}/a.md` })

    expect(readStoredSession(localStorage, VAULT)).toEqual({
      selection: { kind: 'filter', filter: 'all' },
      notePath: `${VAULT}/a.md`,
    })
    expect(readStoredSession(localStorage, '/other/vault')).toBeNull()
  })

  it('drops malformed or unknown selections instead of trusting storage', () => {
    expect(parsePersistableSelection({ kind: 'filter', filter: 'nope' })).toBeNull()
    expect(parsePersistableSelection({ kind: 'entity', entry: {} })).toBeNull()
    expect(parsePersistableSelection({ kind: 'folder', path: '' })).toBeNull()
    expect(parsePersistableSelection('dashboard')).toBeNull()

    localStorage.setItem(sessionStorageKey(VAULT), '{not json')
    expect(readStoredSession(localStorage, VAULT)).toBeNull()
  })

  it('degrades stale pointers: missing note, removed folder or type', () => {
    const entries = [entry(`${VAULT}/journal/today.md`, 'Journal')]

    expect(resolveSessionRestore({ selection: { kind: 'folder', path: `${VAULT}/gone` }, notePath: `${VAULT}/deleted.md` }, entries))
      .toEqual({ selection: null, note: null })
    expect(resolveSessionRestore({ selection: { kind: 'sectionGroup', type: 'Recipe' }, notePath: null }, entries).selection)
      .toBeNull()
    expect(resolveSessionRestore({ selection: { kind: 'folder', path: `${VAULT}/journal` }, notePath: `${VAULT}/journal/today.md` }, entries))
      .toEqual({ selection: { kind: 'folder', path: `${VAULT}/journal` }, note: entries[0] })
  })
})

describe('useSessionMemory', () => {
  afterEach(() => localStorage.clear())

  const note = entry(`${VAULT}/ideas.md`)
  const dashboard: SidebarSelection = { kind: 'dashboard' }

  function mount(props: Partial<Parameters<typeof useSessionMemory>[0]> = {}) {
    const onRestoreSelection = vi.fn()
    const onRestoreNote = vi.fn()
    const initial = {
      disabled: false,
      vaultPath: VAULT,
      isLoading: false,
      entries: [note],
      selection: dashboard,
      activeTabPath: null as string | null,
      onRestoreSelection,
      onRestoreNote,
      ...props,
    }
    const hook = renderHook((p: typeof initial) => useSessionMemory(p), { initialProps: initial })
    return { ...hook, initial, onRestoreSelection, onRestoreNote }
  }

  it('reopens the remembered note and its screen once the vault has loaded', () => {
    writeStoredSession(localStorage, VAULT, { selection: { kind: 'filter', filter: 'favorites' }, notePath: note.path })

    const { onRestoreSelection, onRestoreNote } = mount()

    expect(onRestoreSelection).toHaveBeenCalledWith({ kind: 'filter', filter: 'favorites' })
    expect(onRestoreNote).toHaveBeenCalledWith(note)
  })

  it('never lets the pre-restore dashboard overwrite the saved session', () => {
    writeStoredSession(localStorage, VAULT, { selection: { kind: 'filter', filter: 'favorites' }, notePath: note.path })

    const { rerender, initial } = mount()
    rerender({ ...initial })

    expect(readStoredSession(localStorage, VAULT)?.selection).toEqual({ kind: 'filter', filter: 'favorites' })
  })

  it('waits for the vault to finish loading before restoring', () => {
    writeStoredSession(localStorage, VAULT, { selection: { kind: 'filter', filter: 'all' }, notePath: note.path })

    const { rerender, initial, onRestoreNote } = mount({ isLoading: true })
    expect(onRestoreNote).not.toHaveBeenCalled()

    rerender({ ...initial, isLoading: false })
    expect(onRestoreNote).toHaveBeenCalledTimes(1)
  })

  it('remembers what you open next, and nothing in note windows', () => {
    const { rerender, initial } = mount()
    rerender({ ...initial, selection: { kind: 'filter', filter: 'all' }, activeTabPath: note.path })
    expect(readStoredSession(localStorage, VAULT)).toEqual({ selection: { kind: 'filter', filter: 'all' }, notePath: note.path })

    localStorage.clear()
    const detached = mount({ disabled: true })
    detached.rerender({ ...detached.initial, selection: { kind: 'filter', filter: 'all' } })
    expect(readStoredSession(localStorage, VAULT)).toBeNull()
  })
})
