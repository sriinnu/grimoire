import { describe, expect, it } from 'vitest'
import { generateProjectBoardMarkdown } from './boardGenerator'

describe('project board generator', () => {
  it('groups issues by project and priority', () => {
    const board = generateProjectBoardMarkdown({
      generatedAt: new Date('2026-05-03T00:00:00.000Z'),
      projects: [{ id: 'p1', name: 'Grimoire', path: '/repo/grimoire' }],
      issues: [
        {
          id: '1',
          projectId: 'p1',
          title: 'Polish wiki links',
          status: 'open',
          priority: 'high',
          source: 'scanner',
          sourceFile: 'src/editor.ts',
          sourceLine: 7,
        },
        {
          id: '2',
          projectId: 'p1',
          title: 'Ship old task',
          status: 'done',
          priority: 'low',
          source: 'manual',
        },
      ],
    })

    expect(board).toContain('# Project Board')
    expect(board).toContain('## Grimoire')
    expect(board).toContain('### High')
    expect(board).toContain(
      '<!-- grimoire-task:1 priority:high source:scanner source-file:src%2Feditor.ts source-line:7 --> - [ ] Polish wiki links (src/editor.ts:7)',
    )
    expect(board).toContain('### Low')
    expect(board).toContain('<!-- grimoire-task:2 priority:low source:manual --> - [x] Ship old task')
  })
})
