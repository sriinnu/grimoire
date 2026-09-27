export interface HighlightSegment {
  text: string
  match: boolean
}

/** Distinct, non-empty, lowercased query terms, longest first so "apis" wins over "api". */
export function queryTerms(query: string): string[] {
  const seen = new Set<string>()
  for (const raw of query.toLowerCase().split(/\s+/)) {
    if (raw) seen.add(raw)
  }
  return Array.from(seen).sort((a, b) => b.length - a.length)
}

/**
 * Splits text into plain and matched runs for the query's terms, case-insensitive,
 * non-overlapping, scanning left to right. Pure string slicing: the caller renders
 * the segments, so nothing here ever touches innerHTML.
 */
export function splitByTerms(text: string, query: string): HighlightSegment[] {
  const terms = queryTerms(query)
  if (!text || terms.length === 0) return text ? [{ text, match: false }] : []

  const lower = text.toLowerCase()
  const segments: HighlightSegment[] = []
  let cursor = 0
  let index = 0
  while (index < lower.length) {
    const term = terms.find((candidate) => lower.startsWith(candidate, index))
    if (!term) {
      index += 1
      continue
    }
    if (index > cursor) segments.push({ text: text.slice(cursor, index), match: false })
    segments.push({ text: text.slice(index, index + term.length), match: true })
    index += term.length
    cursor = index
  }
  if (cursor < text.length) segments.push({ text: text.slice(cursor), match: false })
  return segments
}

/** True when some result title equals the query exactly, ignoring case and outer whitespace. */
export function hasExactTitle(titles: Iterable<string>, query: string): boolean {
  const wanted = query.trim().toLowerCase()
  if (!wanted) return false
  for (const title of titles) {
    if (title.trim().toLowerCase() === wanted) return true
  }
  return false
}
