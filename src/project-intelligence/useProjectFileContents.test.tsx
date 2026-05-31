import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { SidebarSelection, VaultEntry } from '../types'
import { useProjectFileContents } from './useProjectFileContents'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: '/fixture/project/readme.md',
    filename: 'readme.md',
    title: 'Readme',
    isA: null,
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
    ...overrides,
  }
}

describe('useProjectFileContents', () => {
  it('does not load folder content until explicitly enabled', async () => {
    const entries = [
      entry({ path: '/Users/mock/Grimoire/26q1-grimoire-app.md' }),
    ]
    const selection: SidebarSelection = { kind: 'folder', path: 'Grimoire' }
    const { result } = renderHook(() =>
      useProjectFileContents(entries, selection),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.contentByPath.size).toBe(0)
  })

  it('loads bounded full content for folder entries', async () => {
    const entries = [
      entry({ path: '/Users/mock/Grimoire/26q1-grimoire-app.md' }),
      entry({ path: '/Users/mock/Other/beta.md' }),
    ]
    const selection: SidebarSelection = { kind: 'folder', path: 'Grimoire' }
    const { result } = renderHook(() =>
      useProjectFileContents(entries, selection, true),
    )

    await waitFor(() =>
      expect(result.current.contentByPath.get('/Users/mock/Grimoire/26q1-grimoire-app.md')).toContain(
        '# Build Grimoire App',
      ),
    )
    expect(result.current.contentByPath.has('/Users/mock/Other/beta.md')).toBe(false)
  })

  it('skips binary and oversized files', async () => {
    const selection: SidebarSelection = { kind: 'folder', path: 'project' }
    const entries = [
      entry({ path: '/fixture/project/image.png', fileKind: 'binary' }),
      entry({ path: '/fixture/project/huge.md', fileSize: 2_000_000 }),
    ]
    const { result } = renderHook(() =>
      useProjectFileContents(entries, selection, true),
    )

    await waitFor(() => expect(result.current.loading).toBe(false))
    expect(result.current.contentByPath.size).toBe(0)
  })

  it('applies the project scanner allow and deny policy before reading files', async () => {
    const selection: SidebarSelection = { kind: 'folder', path: 'project' }
    const entries = [
      entry({ path: '/fixture/project/.env', filename: '.env', fileKind: 'text' }),
      entry({ path: '/fixture/project/node_modules/pkg/todo.md' }),
      entry({ path: '/fixture/project/src/app.ts', fileKind: 'text' }),
    ]
    const { result } = renderHook(() =>
      useProjectFileContents(entries, selection, true),
    )

    await waitFor(() => expect(result.current.contentByPath.has('/fixture/project/src/app.ts')).toBe(true))
    expect(result.current.contentByPath.has('/fixture/project/.env')).toBe(false)
    expect(result.current.contentByPath.has('/fixture/project/node_modules/pkg/todo.md')).toBe(false)
  })
})
