export interface RawEditorFindMatch {
  from: number
  to: number
}

/** Finds non-overlapping query matches in a raw markdown document. */
export function findRawEditorMatches(doc: string, query: string): RawEditorFindMatch[] {
  if (!query) return []

  const matches: RawEditorFindMatch[] = []
  const collator = new Intl.Collator(undefined, { sensitivity: 'accent', usage: 'search' })
  let from = 0

  while (from <= doc.length - query.length) {
    const candidate = doc.slice(from, from + query.length)
    if (collator.compare(candidate, query) === 0) {
      matches.push({ from, to: from + query.length })
      from += query.length
      continue
    }
    from += 1
  }

  return matches
}

/** Keeps a find-match index valid after query or document changes. */
export function clampRawEditorFindIndex(index: number, matchCount: number): number {
  if (matchCount <= 0) return 0
  return Math.min(Math.max(index, 0), matchCount - 1)
}
