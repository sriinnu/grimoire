import { describe, expect, it } from 'vitest'
import {
  canMarkSourceTaskDone,
  markSourceTaskDone,
  projectIssueKey,
} from './sourceTaskUpdates'
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

describe('sourceTaskUpdates', () => {
  it('marks the captured markdown task line done', () => {
    const result = markSourceTaskDone('# Todo\n- [ ] Wire local vault mode\n', issue())

    expect(result).toEqual({
      status: 'updated',
      content: '# Todo\n- [x] Wire local vault mode\n',
    })
  })

  it('preserves CRLF line endings', () => {
    const result = markSourceTaskDone('# Todo\r\n- [ ] Wire local vault mode\r\n', issue())

    expect(result.status).toBe('updated')
    if (result.status === 'updated') {
      expect(result.content).toBe('# Todo\r\n- [x] Wire local vault mode\r\n')
    }
  })

  it('refuses to update when the scanned line changed', () => {
    const result = markSourceTaskDone('# Todo\n- [ ] Different work\n', issue())

    expect(result).toEqual({
      status: 'conflict',
      reason: 'Source task text changed since the scan.',
    })
  })

  it('refuses to update non-checkbox TODO markers', () => {
    const result = markSourceTaskDone('// TODO: Wire local vault mode\n', issue({ sourceLine: 1 }))

    expect(result).toEqual({
      status: 'conflict',
      reason: 'Only unchecked markdown source tasks can be marked done.',
    })
  })

  it('identifies markdown TODO issues as writable', () => {
    expect(canMarkSourceTaskDone(issue())).toBe(true)
    expect(canMarkSourceTaskDone(issue({ sourceFile: 'src/app.ts' }))).toBe(false)
    expect(canMarkSourceTaskDone(issue({ type: 'fixme' }))).toBe(false)
  })

  it('builds a stable source issue key', () => {
    expect(projectIssueKey(issue())).toBe('docs/todo.md:2:todo:Wire local vault mode')
    expect(projectIssueKey(issue({ sourcePath: '/vault/archive/docs/todo.md' })))
      .toBe('/vault/archive/docs/todo.md:2:todo:Wire local vault mode')
  })
})
