import type { MarkdownHeading } from '@grimoire/markdown-editor'
import { markdownSemanticsAdapter } from './markdownSemanticsAdapter'
import { findRawEditorMatches } from './rawEditorFindReplace'

/** Line-level match surfaced by the in-note search navigator. */
export interface NoteSearchMatch {
  id: string
  line: number
  column: number
  occurrenceIndex: number
  match: string
  preview: string
}

const MAX_SEARCH_MATCHES = 80
const PREVIEW_BEFORE = 48
const PREVIEW_AFTER = 72

/** Extracts navigable headings from a Markdown note. */
export function extractNoteHeadings(markdown: string): MarkdownHeading[] {
  return markdownSemanticsAdapter.parseDocument(markdown).headings
}

/** Finds line-oriented matches for the in-note navigator. */
export function findNoteSearchMatches(markdown: string, query: string): NoteSearchMatch[] {
  const needle = query.trim()
  if (!needle) return []

  const matches: NoteSearchMatch[] = []
  const lines = markdown.split(/\r?\n/)
  let occurrenceIndex = 0

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex]
    for (const match of findRawEditorMatches(line, needle)) {
      const before = Math.max(0, match.from - PREVIEW_BEFORE)
      const after = Math.min(line.length, match.to + PREVIEW_AFTER)
      const prefix = before > 0 ? '...' : ''
      const suffix = after < line.length ? '...' : ''
      const preview = `${prefix}${line.slice(before, after).trim()}${suffix}` || '(blank line)'
      matches.push({
        id: `${lineIndex + 1}:${match.from}`,
        line: lineIndex + 1,
        column: match.from + 1,
        occurrenceIndex,
        match: line.slice(match.from, match.to),
        preview,
      })
      occurrenceIndex += 1
      if (matches.length >= MAX_SEARCH_MATCHES) return matches
    }
  }

  return matches
}
