import { describe, expect, it } from 'vitest'
import type { SidebarSelection, VaultEntry } from '../types'
import { buildGrimoireProjectIntelligence, deriveProjectBoardPath } from './grimoireAdapter'

function entry(overrides: Partial<VaultEntry>): VaultEntry {
  return {
    path: '/vault/project/readme.md',
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

describe('buildGrimoireProjectIntelligence', () => {
  it('returns null outside folder selections', () => {
    const selection: SidebarSelection = { kind: 'filter', filter: 'all' }
    expect(buildGrimoireProjectIntelligence([], selection)).toBeNull()
  })

  it('surfaces curated docs, issue signals, and file counts for a folder', () => {
    const selection: SidebarSelection = { kind: 'folder', path: 'project' }
    const result = buildGrimoireProjectIntelligence(
      [
        entry({ path: '/vault/project/README.md', title: 'Project Readme', snippet: 'Intro' }),
        entry({
          path: '/vault/project/TODO.md',
          title: 'Todo',
          snippet: '- [ ] urgent wire project docs',
        }),
        entry({
          path: '/vault/project/src/app.ts',
          filename: 'app.ts',
          title: 'app.ts',
          fileKind: 'text',
          snippet: '// FIXME: high startup issue',
        }),
      ],
      selection,
    )

    expect(result?.documents.map((document) => document.kind)).toEqual(['readme', 'todo'])
    expect(result?.issues.map((issue) => issue.title)).toEqual([
      'urgent wire project docs',
      'high startup issue',
    ])
    expect(result?.issues.map((issue) => issue.sourceLine)).toEqual([1, 1])
    expect(result?.analytics.urgentCount).toBe(2)
    expect(result?.markdownCount).toBe(2)
    expect(result?.otherCount).toBe(1)
    expect(result?.boardMarkdown).toContain('Project Board')
    expect(result?.boardMarkdown).toContain('<!-- grimoire-task:scanner-')
    expect(result?.boardPath).toBe('/vault/project/BOARD.md')
  })

  it('derives a durable board path from folder entries', () => {
    expect(
      deriveProjectBoardPath(
        [entry({ path: '/Users/sri/Vault/projects/grimoire/readme.md' })],
        'projects/grimoire',
      ),
    ).toBe('/Users/sri/Vault/projects/grimoire/BOARD.md')
  })
})
