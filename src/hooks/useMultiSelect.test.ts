import { act, renderHook } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { VaultEntry } from '../types'
import { useMultiSelect } from './useMultiSelect'

function makeEntry(path: string): VaultEntry {
  return {
    path,
    filename: path.split('/').slice(-1)[0],
    title: path,
    isA: 'Note',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: 1,
    createdAt: 1,
    fileSize: 100,
    snippet: '',
    wordCount: 0,
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
  }
}

describe('useMultiSelect', () => {
  it('prunes selected paths when the visible note scope changes', () => {
    const alpha = makeEntry('/vault/alpha.md')
    const beta = makeEntry('/vault/beta.md')
    const { result, rerender } = renderHook(
      ({ entries }) => useMultiSelect(entries),
      { initialProps: { entries: [alpha, beta] } },
    )

    act(() => {
      result.current.toggle(alpha.path)
      result.current.toggle(beta.path)
    })
    expect([...result.current.selectedPaths]).toEqual([alpha.path, beta.path])

    rerender({ entries: [beta] })
    act(() => {
      result.current.pruneToVisible()
    })

    expect([...result.current.selectedPaths]).toEqual([beta.path])
  })
})
