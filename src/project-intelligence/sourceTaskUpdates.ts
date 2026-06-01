import type { ExtractedProjectIssue } from './types'

export type ProjectSourceTaskUpdateResult =
  | { status: 'updated'; content: string }
  | { status: 'conflict'; reason: string }

const UNCHECKED_MARKDOWN_TASK = /^(\s*[-*]\s+\[)\s(\]\s+)(.+)$/

/**
 * Builds a stable key for scanner-derived source tasks.
 */
export function projectIssueKey(issue: ExtractedProjectIssue): string {
  return `${issue.sourcePath ?? issue.sourceFile}:${issue.sourceLine}:${issue.type}:${issue.title}`
}

/**
 * Marks a scanner-derived markdown checkbox task done only when the captured
 * source line still matches the issue text.
 */
export function markSourceTaskDone(
  content: string,
  issue: ExtractedProjectIssue,
): ProjectSourceTaskUpdateResult {
  const lines = content.split(/\r?\n/)
  const lineIndex = issue.sourceLine - 1
  if (lineIndex < 0 || lineIndex >= lines.length) {
    return { status: 'conflict', reason: 'Source line no longer exists.' }
  }

  const line = lines[lineIndex]
  const match = line.match(UNCHECKED_MARKDOWN_TASK)
  if (!match) {
    return { status: 'conflict', reason: 'Only unchecked markdown source tasks can be marked done.' }
  }

  if (match[3].trim() !== issue.title.trim()) {
    return { status: 'conflict', reason: 'Source task text changed since the scan.' }
  }

  lines[lineIndex] = `${match[1]}x${match[2]}${match[3]}`
  return { status: 'updated', content: lines.join(content.includes('\r\n') ? '\r\n' : '\n') }
}

/**
 * Returns whether a scanner issue can be written back safely by this updater.
 */
export function canMarkSourceTaskDone(issue: ExtractedProjectIssue): boolean {
  return issue.type === 'todo' && /\.(md|markdown|todo|todos)$/i.test(issue.sourcePath ?? issue.sourceFile)
}
