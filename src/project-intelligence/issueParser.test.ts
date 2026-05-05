import { describe, expect, it } from 'vitest'
import {
  inferProjectIssuePriority,
  parseProjectIssuesFromContent,
  shouldScanProjectFile,
} from './issueParser'

describe('project issue parser', () => {
  it('extracts unchecked markdown tasks', () => {
    const issues = parseProjectIssuesFromContent(
      '- [ ] urgent fix autosave\n- [x] done thing\n* [ ] low polish',
      'TODO.md',
    )

    expect(issues).toEqual([
      {
        title: 'urgent fix autosave',
        description: null,
        priority: 'critical',
        sourceFile: 'TODO.md',
        sourceLine: 1,
        type: 'todo',
      },
      {
        title: 'low polish',
        description: null,
        priority: 'low',
        sourceFile: 'TODO.md',
        sourceLine: 3,
        type: 'todo',
      },
    ])
  })

  it('extracts code comment markers', () => {
    const issues = parseProjectIssuesFromContent(
      '// TODO: important parser cleanup\nconst x = 1\n/** FIXME: critical crash */',
      'src/app.ts',
    )

    expect(issues.map((issue) => [issue.type, issue.priority, issue.title, issue.sourceLine])).toEqual([
      ['todo', 'high', 'important parser cleanup', 1],
      ['fixme', 'critical', 'critical crash', 3],
    ])
  })

  it('uses medium priority by default', () => {
    expect(inferProjectIssuePriority('normal work item')).toBe('medium')
  })

  it('honors include and exclude scan defaults', () => {
    expect(shouldScanProjectFile('src/app.ts')).toBe(true)
    expect(shouldScanProjectFile('node_modules/pkg/index.ts')).toBe(false)
    expect(shouldScanProjectFile('dist/app.js')).toBe(false)
    expect(shouldScanProjectFile('README.md')).toBe(true)
  })
})
