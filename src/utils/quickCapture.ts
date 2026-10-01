/** Local 24h clock label used as the capture bullet prefix, e.g. "14:05". */
export function formatCaptureTime(now: Date = new Date()): string {
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

/**
 * Turns a raw capture into one Markdown bullet: "- 14:05 text".
 * Extra lines become indented continuation lines so the bullet stays one list
 * item; blank lines are dropped for the same reason. Returns null when there
 * is nothing worth saving.
 */
export function formatCaptureBullet(text: string, now: Date = new Date()): string | null {
  const lines = text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
  if (lines.length === 0) return null

  const [first, ...rest] = lines
  const head = `- ${formatCaptureTime(now)} ${first.trim()}`
  return [head, ...rest.map((line) => `  ${line.trim()}`)].join('\n')
}

const LIST_LINE = /^\s*(?:[-*+]|\d+[.)])\s/
const CONTINUATION_LINE = /^\s{2,}\S/

function endsWithListItem(content: string): boolean {
  const lines = content.split('\n')
  const last = lines[lines.length - 1] ?? ''
  return LIST_LINE.test(last) || CONTINUATION_LINE.test(last)
}

/**
 * Appends a capture bullet to a note body. Captures stack into the trailing
 * list when the note already ends with one; otherwise a blank line separates
 * the new list from the preceding paragraph, heading or frontmatter.
 */
export function appendCaptureBullet(content: string, bullet: string): string {
  const body = content.replace(/\s+$/u, '')
  if (body.length === 0) return `${bullet}\n`
  const separator = endsWithListItem(body) ? '\n' : '\n\n'
  return `${body}${separator}${bullet}\n`
}
