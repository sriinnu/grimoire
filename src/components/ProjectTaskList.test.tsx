import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ProjectTaskList } from './ProjectTaskList'
import { makeEntry } from '../test-utils/noteListTestUtils'
import type { ExtractedProjectIssue } from '../project-intelligence/types'

function issue(overrides: Partial<ExtractedProjectIssue> = {}): ExtractedProjectIssue {
  return {
    title: 'Wire local vault mode',
    description: null,
    priority: 'medium',
    sourceFile: 'project/todo.md',
    sourceLine: 4,
    type: 'todo',
    ...overrides,
  }
}

describe('ProjectTaskList', () => {
  it('opens the source note for a scanner task', () => {
    const entry = makeEntry({ path: '/vault/project/todo.md' })
    const onSelectNote = vi.fn()

    render(<ProjectTaskList issues={[issue()]} entries={[entry]} onSelectNote={onSelectNote} />)

    fireEvent.click(screen.getByText('Wire local vault mode'))
    expect(onSelectNote).toHaveBeenCalledWith(entry)
  })

  it('exposes an explicit source-task completion action for markdown todos', () => {
    const onResolveIssue = vi.fn()

    render(
      <ProjectTaskList
        issues={[issue()]}
        entries={[makeEntry({ path: '/vault/project/todo.md' })]}
        onSelectNote={vi.fn()}
        onResolveIssue={onResolveIssue}
      />,
    )

    fireEvent.click(screen.getByLabelText('Mark Wire local vault mode done'))
    expect(onResolveIssue).toHaveBeenCalledWith(issue())
  })

  it('keeps non-markdown scanner tasks read-only', () => {
    render(
      <ProjectTaskList
        issues={[issue({ sourceFile: 'src/app.ts' })]}
        entries={[makeEntry({ path: '/vault/src/app.ts', fileKind: 'text' })]}
        onSelectNote={vi.fn()}
        onResolveIssue={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Mark Wire local vault mode done')).toBeDisabled()
  })

  it('keeps ambiguous shortened scanner paths read-only', () => {
    render(
      <ProjectTaskList
        issues={[issue({ sourceFile: 'app/project/todo.md' })]}
        entries={[
          makeEntry({ path: '/vault/archive/app/project/todo.md' }),
          makeEntry({ path: '/vault/live/app/project/todo.md' }),
        ]}
        onSelectNote={vi.fn()}
        onResolveIssue={vi.fn()}
      />,
    )

    expect(screen.getByLabelText('Mark Wire local vault mode done')).toBeDisabled()
    expect(screen.getByTitle('Multiple source files match this task')).toBeDisabled()
  })
})
