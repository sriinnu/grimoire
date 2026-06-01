import { describe, expect, it } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import {
  pruneSyncedProjectContentOverrides,
  resolveProjectIssueEntry,
} from './sourceTaskEntries'
import type { ExtractedProjectIssue } from './types'

function issue(overrides: Partial<ExtractedProjectIssue> = {}): ExtractedProjectIssue {
  return {
    title: 'Wire local vault mode',
    description: null,
    priority: 'medium',
    sourceFile: 'docs/todo.md',
    sourceLine: 2,
    type: 'todo',
    ...overrides,
  }
}

describe('sourceTaskEntries', () => {
  it('uses exact scanner source paths when available', () => {
    const target = makeEntry({ path: '/vault/live/app/docs/todo.md' })
    const resolution = resolveProjectIssueEntry(
      issue({ sourcePath: '/vault/live/app/docs/todo.md' }),
      [makeEntry({ path: '/vault/archive/app/docs/todo.md' }), target],
    )

    expect(resolution).toEqual({ status: 'resolved', entry: target })
  })

  it('reports ambiguous shortened paths instead of choosing the first match', () => {
    const resolution = resolveProjectIssueEntry(
      issue({ sourceFile: 'app/docs/todo.md' }),
      [
        makeEntry({ path: '/vault/archive/app/docs/todo.md' }),
        makeEntry({ path: '/vault/live/app/docs/todo.md' }),
      ],
    )

    expect(resolution.status).toBe('ambiguous')
  })

  it('keeps exact source path identity case-sensitive', () => {
    const resolution = resolveProjectIssueEntry(
      issue({ sourcePath: '/vault/TODO.md' }),
      [makeEntry({ path: '/vault/todo.md' })],
    )

    expect(resolution.status).toBe('missing')
  })

  it('keeps saved content overrides until scans catch up', () => {
    const overrides = new Map([['/vault/todo.md', '# Todo\n- [x] Done\n']])

    expect(pruneSyncedProjectContentOverrides(
      new Map([['/vault/todo.md', '# Todo\n- [ ] Done\n']]),
      overrides,
    )).toBe(overrides)

    expect(Array.from(pruneSyncedProjectContentOverrides(
      new Map([['/vault/todo.md', '# Todo\n- [x] Done\n']]),
      overrides,
    ).entries())).toEqual([])
  })
})
