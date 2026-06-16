const PAGE_TYPE_LABELS = new Set(['agent', 'agents', 'config', 'console', 'consoles', 'page', 'pages', 'type', 'types'])
const STATE_LABELS = new Set(['done', 'open', 'unmarked'])

/** Formats a generic count phrase such as "2 pages" or "1 memory review". */
export function pluralizeCount(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

/** Formats notebook type buckets as count-first human labels. */
export function formatTypeCount(label: string, count: number): string {
  return `${count} ${formatTypeLabel(label, count)}`
}

/** Formats only the human-facing type label for split count/label UI. */
export function formatTypeLabel(label: string, count: number): string {
  return typeNoun(label, count)
}

/** Formats status buckets as count-first state labels without fake plurals. */
export function formatStateCount(label: string, count: number): string {
  return `${count} ${label.trim().toLocaleLowerCase() || 'unmarked'}`
}

/** Formats mixed calendar agenda counts while preserving status semantics. */
export function formatCalendarCount(label: string, count: number): string {
  const lower = label.trim().toLocaleLowerCase()
  if (lower === 'held local') return `${count} held local`
  return STATE_LABELS.has(lower) ? formatStateCount(label, count) : formatTypeCount(label, count)
}

function typeNoun(label: string, count: number): string {
  const normalized = label.trim()
  if (!normalized) return count === 1 ? 'page' : 'pages'
  const lower = normalized.toLocaleLowerCase()
  if (PAGE_TYPE_LABELS.has(lower)) return count === 1 ? 'page' : 'pages'
  if (lower === 'calendar') return count === 1 ? 'planned mark' : 'planned marks'
  if (lower === 'commit') return count === 1 ? 'saved point' : 'saved points'
  if (lower === 'event') return count === 1 ? 'moment' : 'moments'
  if (lower === 'experiment') return count === 1 ? 'trial' : 'trials'
  if (lower === 'memory review') return count === 1 ? 'memory review' : 'memory reviews'
  if (lower === 'mobile') return count === 1 ? 'mobile capture' : 'mobile captures'
  if (lower === 'person') return count === 1 ? 'person' : 'people'
  if (lower === 'private') return count === 1 ? 'private page' : 'private pages'
  if (lower === 'procedure') return count === 1 ? 'way' : 'ways'
  if (lower === 'project') return count === 1 ? 'work' : 'works'
  if (lower === 'responsibility') return count === 1 ? 'care area' : 'care areas'
  if (lower === 'topic') return count === 1 ? 'idea' : 'ideas'
  if (lower === 'voice') return count === 1 ? 'voice capture' : 'voice captures'
  if (lower === 'memory') return count === 1 ? 'memory' : 'memories'
  if (count === 1) return lower
  if (lower.endsWith('y')) return `${lower.slice(0, -1)}ies`
  if (lower.endsWith('s')) return lower
  return `${lower}s`
}
