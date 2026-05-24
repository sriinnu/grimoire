import type { VaultEntry } from '../types'
import type { ExtractedProjectIssue } from './types'

export type ProjectIssueEntryResolution =
  | { status: 'resolved'; entry: VaultEntry }
  | { status: 'ambiguous'; entries: VaultEntry[] }
  | { status: 'missing' }

/**
 * Resolves a scanner issue's shortened source path back to a loaded vault entry.
 */
export function resolveProjectIssueEntry(
  issue: ExtractedProjectIssue,
  entries: VaultEntry[],
): ProjectIssueEntryResolution {
  if (issue.sourcePath) {
    const sourcePath = normalizePathIdentity(issue.sourcePath)
    const matches = entries.filter((entry) => normalizePathIdentity(entry.path) === sourcePath)
    if (matches.length === 1) return { status: 'resolved', entry: matches[0] }
    if (matches.length > 1) return { status: 'ambiguous', entries: matches }
    return { status: 'missing' }
  }

  const normalizedSource = normalizePath(issue.sourceFile)
  const matches = entries.filter((entry) => normalizePath(entry.path).endsWith(normalizedSource))
  if (matches.length === 1) return { status: 'resolved', entry: matches[0] }
  if (matches.length > 1) return { status: 'ambiguous', entries: matches }
  return { status: 'missing' }
}

/**
 * Overlays freshly saved source content onto scanned project content.
 */
export function mergeProjectContentByPath(
  scannedContent: ReadonlyMap<string, string>,
  overrides: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  if (overrides.size === 0) return scannedContent
  return new Map([...scannedContent, ...overrides])
}

/**
 * Keeps saved source-task writes visible until a fresh scan catches up.
 */
export function pruneSyncedProjectContentOverrides(
  scannedContent: ReadonlyMap<string, string>,
  overrides: ReadonlyMap<string, string>,
): ReadonlyMap<string, string> {
  if (overrides.size === 0) return overrides

  let changed = false
  const next = new Map(overrides)
  for (const [path, content] of overrides) {
    if (scannedContent.get(path) === content) {
      next.delete(path)
      changed = true
    }
  }
  return changed ? next : overrides
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').toLowerCase()
}

function normalizePathIdentity(path: string): string {
  return path.replace(/\\/g, '/')
}
