import { describe, expect, it } from 'vitest'
import {
  buildProjectAnalytics,
  buildProjectDocumentSummaries,
  classifyProjectDocument,
  deriveProjectDocumentTitle,
  extractProjectDocumentPreview,
} from './documents'
import type { ProjectBoardIssue } from './types'

describe('project document discovery', () => {
  it('classifies curated project documents', () => {
    expect(classifyProjectDocument('README.md')).toBe('readme')
    expect(classifyProjectDocument('docs/architecture.md')).toBe('architecture')
    expect(classifyProjectDocument('project-spec.md')).toBe('spec')
    expect(classifyProjectDocument('weekly-review.md')).toBe('review')
    expect(classifyProjectDocument('random-note.md')).toBeNull()
  })

  it('derives titles from headings before file names', () => {
    expect(deriveProjectDocumentTitle('docs/architecture.md', '# System Shape\nBody')).toBe(
      'System Shape',
    )
    expect(deriveProjectDocumentTitle('docs/project-spec.md', 'No heading')).toBe('Project Spec')
  })

  it('extracts compact previews without markdown control lines', () => {
    expect(
      extractProjectDocumentPreview('# Title\n\n- [ ] hidden task\nFirst line\n```ts\ncode\n```\nSecond'),
    ).toBe('First line code Second')
  })

  it('orders summaries by kind and recency', () => {
    const summaries = buildProjectDocumentSummaries([
      { relativePath: 'docs/todo.md', content: '# Todo', updatedAt: 1 },
      { relativePath: 'docs/readme.md', content: '# Read Me', updatedAt: 1 },
      { relativePath: 'docs/design.md', content: '# Design', updatedAt: 2 },
    ])

    expect(summaries.map((summary) => summary.kind)).toEqual(['readme', 'architecture', 'todo'])
  })
})

describe('project analytics', () => {
  it('builds dashboard signals from issues and documents', () => {
    const issues: ProjectBoardIssue[] = [
      {
        id: '1',
        projectId: 'p1',
        title: 'Fix startup',
        status: 'open',
        priority: 'high',
        source: 'scanner',
      },
      {
        id: '2',
        projectId: 'p1',
        title: 'Write docs',
        status: 'done',
        priority: 'low',
        source: 'manual',
      },
    ]
    const documents = buildProjectDocumentSummaries([
      { relativePath: 'README.md', content: '# Readme' },
      { relativePath: 'docs/architecture.md', content: '# Architecture' },
    ])

    expect(buildProjectAnalytics(issues, documents)).toMatchObject({
      urgentCount: 1,
      completionRate: 50,
      docsCount: 2,
      scannerIssues: 1,
      manualIssues: 1,
      hasReadme: true,
      hasArchitecture: true,
    })
  })
})

