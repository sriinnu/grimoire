/**
 * Plain-text mentions of a page's title that were never turned into links.
 * Whole-word, case-insensitive, never inside a code fence, inline code or an
 * existing wikilink.
 */

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function mentionPattern(phrase: string): RegExp {
  return new RegExp(`(^|[^\\w\\[])(${escapeRegExp(phrase)})(?![\\w\\]|])`, 'i')
}

interface Segment {
  text: string
  /** Prose segments may be linked; code and existing links are left alone. */
  editable: boolean
}

/** Splits Markdown into prose and protected spans (fenced code, inline code, wikilinks). */
export function splitProtectedSpans(content: string): Segment[] {
  const segments: Segment[] = []
  const pattern = /```[\s\S]*?(?:```|$)|`[^`\n]*`|\[\[[^\]]*\]\]/g
  let cursor = 0
  for (const match of content.matchAll(pattern)) {
    const start = match.index ?? 0
    if (start > cursor) segments.push({ text: content.slice(cursor, start), editable: true })
    segments.push({ text: match[0], editable: false })
    cursor = start + match[0].length
  }
  if (cursor < content.length) segments.push({ text: content.slice(cursor), editable: true })
  return segments
}

/** True when the body mentions any of the names as plain prose. */
export function mentionsPlainText(content: string, names: readonly string[]): boolean {
  const prose = splitProtectedSpans(content).filter((segment) => segment.editable)
  return names.some((name) => name.trim().length > 0 && prose.some((segment) => mentionPattern(name).test(segment.text)))
}

/**
 * Turns the first plain mention of any of the names into a wikilink to the
 * page title. The mention's own casing is kept as the alias when it differs.
 * Returns null when there was nothing to link.
 */
export function linkFirstMention(content: string, title: string, aliases: readonly string[] = []): string | null {
  const names = [title, ...aliases].filter((name) => name.trim().length > 0)
  const segments = splitProtectedSpans(content)
  for (const segment of segments) {
    if (!segment.editable) continue
    for (const name of names) {
      const match = mentionPattern(name).exec(segment.text)
      if (!match) continue
      const [, lead, found] = match
      const link = found === title ? `[[${title}]]` : `[[${title}|${found}]]`
      const start = (match.index ?? 0) + lead.length
      segment.text = segment.text.slice(0, start) + link + segment.text.slice(start + found.length)
      return segments.map((part) => part.text).join('')
    }
  }
  return null
}
