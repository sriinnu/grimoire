import type { ProjectBoardIssue, ProjectBoardProject, ProjectIssuePriority } from './types'

export interface GenerateProjectBoardOptions {
  /** Projects to include in the generated board. */
  projects: ProjectBoardProject[]
  /** Issues to group beneath projects. */
  issues: ProjectBoardIssue[]
  /** Stable generation date for deterministic tests. */
  generatedAt?: Date
}

const PRIORITY_LABELS: Record<ProjectIssuePriority, string> = {
  critical: 'critical',
  high: 'high',
  medium: 'medium',
  low: 'low',
}

const PRIORITY_ORDER: ProjectIssuePriority[] = ['critical', 'high', 'medium', 'low']

/**
 * Generates a clean Markdown project board that agents and humans can read.
 */
export function generateProjectBoardMarkdown(options: GenerateProjectBoardOptions): string {
  const generatedAt = options.generatedAt ?? new Date()
  const lines = [
    '# Project Board',
    '',
    `Generated: ${generatedAt.toISOString()}`,
    '',
    'This board is generated from Grimoire project intelligence.',
    '',
  ]

  for (const project of options.projects) {
    const projectIssues = options.issues.filter((issue) => issue.projectId === project.id)
    lines.push(`## ${project.name}`)
    if (project.path) {
      lines.push('', `Path: \`${project.path}\``)
    }

    if (projectIssues.length === 0) {
      lines.push('', 'No tracked issues.', '')
      continue
    }

    for (const priority of PRIORITY_ORDER) {
      const grouped = projectIssues
        .filter((issue) => issue.priority === priority)
        .sort((left, right) => left.title.localeCompare(right.title))

      if (grouped.length === 0) {
        continue
      }

      lines.push('', `### ${capitalize(PRIORITY_LABELS[priority])}`)
      for (const issue of grouped) {
        const checkbox = issue.status === 'done' ? '[x]' : '[ ]'
        const source = formatIssueSource(issue)
        lines.push(`<!-- ${formatTaskComment(issue)} --> - ${checkbox} ${issue.title}${source}`)
      }
    }

    lines.push('')
  }

  return `${lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()}\n`
}

function capitalize(value: string): string {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`
}

function formatIssueSource(issue: ProjectBoardIssue): string {
  if (!issue.sourceFile) return ''
  return ` (${issue.sourceFile}${issue.sourceLine ? `:${issue.sourceLine}` : ''})`
}

function stableIssueId(issue: ProjectBoardIssue): string {
  if (issue.id) return sanitizeId(issue.id)
  const basis = [
    issue.projectId,
    issue.source,
    issue.sourceFile ?? '',
    issue.sourceLine ?? '',
    issue.title,
  ].join('|')
  return `task-${hashString(basis)}`
}

function formatTaskComment(issue: ProjectBoardIssue): string {
  const fields = [
    `grimoire-task:${stableIssueId(issue)}`,
    `priority:${issue.priority}`,
    `source:${issue.source}`,
  ]
  if (issue.sourceFile) fields.push(`source-file:${encodeCommentValue(issue.sourceFile)}`)
  if (issue.sourceLine) fields.push(`source-line:${issue.sourceLine}`)
  return fields.join(' ')
}

function encodeCommentValue(value: string): string {
  return encodeURIComponent(value)
}

function sanitizeId(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '')
}

function hashString(value: string): string {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(36)
}
