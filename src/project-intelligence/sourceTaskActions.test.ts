import { describe, expect, it, vi } from 'vitest'
import { makeEntry } from '../test-utils/noteListTestUtils'
import { resolveSourceTaskUpdate } from './sourceTaskActions'
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

describe('sourceTaskActions', () => {
  it('re-reads current source bytes before saving the completed task', async () => {
    const entry = makeEntry({ path: '/vault/live/docs/todo.md' })
    const readContent = vi.fn(async () => '# Todo\n- [ ] Wire local vault mode\n- [ ] Fresh local edit\n')
    const saveContent = vi.fn(async () => undefined)

    const result = await resolveSourceTaskUpdate(
      issue({ sourcePath: entry.path }),
      [entry],
      readContent,
      saveContent,
    )

    expect(result.status).toBe('updated')
    expect(readContent).toHaveBeenCalledWith(entry.path)
    expect(saveContent).toHaveBeenCalledWith(
      entry.path,
      '# Todo\n- [x] Wire local vault mode\n- [ ] Fresh local edit\n',
    )
  })

  it('does not save when shortened source paths collide', async () => {
    const readContent = vi.fn(async () => '# Todo\n- [ ] Wire local vault mode\n')
    const saveContent = vi.fn(async () => undefined)

    const result = await resolveSourceTaskUpdate(
      issue({ sourceFile: 'app/docs/todo.md' }),
      [
        makeEntry({ path: '/vault/archive/app/docs/todo.md' }),
        makeEntry({ path: '/vault/live/app/docs/todo.md' }),
      ],
      readContent,
      saveContent,
    )

    expect(result).toEqual({
      status: 'conflict',
      reason: 'Multiple source files match this task. Open the note first.',
    })
    expect(saveContent).not.toHaveBeenCalled()
  })
})
