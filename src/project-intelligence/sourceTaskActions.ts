import type { VaultEntry } from '../types'
import { resolveProjectIssueEntry } from './sourceTaskEntries'
import { markSourceTaskDone } from './sourceTaskUpdates'
import type { ExtractedProjectIssue } from './types'

export type SourceTaskActionResult =
  | { status: 'updated'; entry: VaultEntry; content: string }
  | { status: 'conflict'; reason: string }

/**
 * Marks a scanner-derived source task complete after resolving the exact entry
 * and re-reading current bytes from disk.
 */
export async function resolveSourceTaskUpdate(
  issue: ExtractedProjectIssue,
  entries: VaultEntry[],
  readContent: (path: string) => Promise<string>,
  saveContent: (path: string, content: string) => Promise<unknown>,
): Promise<SourceTaskActionResult> {
  const resolution = resolveProjectIssueEntry(issue, entries)
  if (resolution.status === 'missing') {
    return { status: 'conflict', reason: 'Source file could not be found.' }
  }
  if (resolution.status === 'ambiguous') {
    return { status: 'conflict', reason: 'Multiple source files match this task. Open the note first.' }
  }

  const currentContent = await readContent(resolution.entry.path)
  const update = markSourceTaskDone(currentContent, issue)
  if (update.status === 'conflict') return update

  await saveContent(resolution.entry.path, update.content)
  return { status: 'updated', entry: resolution.entry, content: update.content }
}
