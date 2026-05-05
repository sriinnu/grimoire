// Wikilink placeholder tokens for markdown round-trip
const WL_START = '\u2039WIKILINK:'
const WL_END = '\u203A'
const WL_RE = new RegExp(`${WL_START.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^${WL_END}]+)${WL_END.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'g')

/** Pre-process markdown: replace [[target]] with placeholder tokens */
export function preProcessWikilinks(md: string): string {
  return replaceWikilinksOutsideCode(md, inner => {
    const normalized = normalizeWikilinkInner(inner)
    return normalized ? `${WL_START}${normalized}${WL_END}` : `[[${inner}]]`
  })
}

// Minimal shape of a BlockNote block for wikilink processing
interface BlockLike {
  content?: InlineItem[]
  children?: BlockLike[]
  [key: string]: unknown
}

interface InlineItem {
  type: string
  text?: string
  props?: Record<string, string>
  content?: unknown
  [key: string]: unknown
}

type ContentTransform = (content: InlineItem[]) => InlineItem[]

/** Walk blocks recursively, applying a transform to each block's inline content */
function walkBlocks(blocks: unknown[], transform: ContentTransform, clone = false): unknown[] {
  return (blocks as BlockLike[]).map(block => {
    const b = clone ? { ...block } : block
    if (b.content && Array.isArray(b.content)) {
      b.content = transform(b.content)
    }
    if (b.children && Array.isArray(b.children)) {
      b.children = walkBlocks(b.children, transform, clone) as BlockLike[]
    }
    return b
  })
}

/** Walk blocks and replace placeholder text with wikilink inline content */
export function injectWikilinks(blocks: unknown[]): unknown[] {
  return walkBlocks(blocks, expandWikilinksInContent)
}

/**
 * Deep-clone blocks and convert wikilink inline content back to [[target]] text.
 * This is the reverse of injectWikilinks — used before blocksToMarkdownLossy
 * so that wikilinks survive the markdown round-trip.
 */
export function restoreWikilinksInBlocks(blocks: unknown[]): unknown[] {
  return walkBlocks(blocks, collapseWikilinksInContent, true)
}

function expandWikilinksInContent(content: InlineItem[]): InlineItem[] {
  const result: InlineItem[] = []
  for (const item of content) {
    if (item.type !== 'text' || typeof item.text !== 'string' || !item.text.includes(WL_START)) {
      result.push(item)
      continue
    }
    const text = item.text as string
    let lastIndex = 0
    WL_RE.lastIndex = 0
    let match
    while ((match = WL_RE.exec(text)) !== null) {
      if (match.index > lastIndex) {
        result.push({ ...item, text: text.slice(lastIndex, match.index) })
      }
      result.push({
        type: 'wikilink',
        props: { target: match[1] },
        content: undefined,
      })
      lastIndex = match.index + match[0].length
    }
    if (lastIndex < text.length) {
      result.push({ ...item, text: text.slice(lastIndex) })
    }
  }
  return result
}

function collapseWikilinksInContent(content: InlineItem[]): InlineItem[] {
  const result: InlineItem[] = []
  for (const item of content) {
    if (item.type === 'wikilink' && item.props?.target) {
      result.push({ type: 'text', text: `[[${item.props.target}]]` })
    } else {
      result.push(item)
    }
  }
  return result
}

function normalizeWikilinkInner(inner: string): string | null {
  const pipeIdx = inner.indexOf('|')
  const rawTarget = pipeIdx === -1 ? inner : inner.slice(0, pipeIdx)
  const target = rawTarget.trim()
  if (!target) return null
  if (pipeIdx === -1) return target

  const display = inner.slice(pipeIdx + 1).trim()
  return display ? `${target}|${display}` : target
}

/** Strip YAML frontmatter from markdown, returning [frontmatter, body] */
export function splitFrontmatter(content: string): [string, string] {
  const match = content.match(/^---[ \t]*\r?\n[\s\S]*?\r?\n---[ \t]*(?:\r?\n|$)/)
  if (!match) return ['', content]
  return [match[0], content.slice(match[0].length)]
}

/** Extract all outgoing wikilink targets from content.
 * Finds [[target]] and [[target|display]] patterns, returning just the target part.
 * Returns a sorted, deduplicated array. */
export function extractOutgoingLinks(content: string): string[] {
  const links: string[] = []
  for (const inner of wikilinkInnersOutsideCode(content)) {
    const normalized = normalizeWikilinkInner(inner)
    if (!normalized) continue
    const pipeIdx = normalized.indexOf('|')
    const target = pipeIdx !== -1 ? normalized.slice(0, pipeIdx) : normalized
    if (target) links.push(target)
  }
  return [...new Set(links)].sort()
}

/** Extract the paragraph surrounding a [[target]] wikilink match from note content.
 * Searches for any target in the set, returns the first matching paragraph trimmed
 * to a max length. Returns null if no match found. */
export function extractBacklinkContext(
  content: string,
  matchTargets: Set<string>,
  maxLength = 120,
): string | null {
  const [, body] = splitFrontmatter(content)
  // Remove the H1 title line
  const withoutTitle = body.replace(/^\s*# [^\n]+\n?/, '')
  const paragraphs = withoutTitle.split(/\n{2,}/)

  for (const para of paragraphs) {
    const trimmed = para.trim()
    if (!trimmed) continue
    // Check if this paragraph contains a wikilink matching any target
    for (const inner of wikilinkInnersOutsideCode(trimmed)) {
      const normalized = normalizeWikilinkInner(inner)
      if (!normalized) continue
      const pipeIdx = normalized.indexOf('|')
      const target = pipeIdx !== -1 ? normalized.slice(0, pipeIdx) : normalized
      if (matchTargets.has(target) || matchTargets.has(target.split('/').pop() ?? '')) {
        // Collapse whitespace and truncate
        const flat = trimmed.replace(/\s+/g, ' ')
        if (flat.length <= maxLength) return flat
        return flat.slice(0, maxLength - 1) + '\u2026'
      }
    }
  }
  return null
}

function replaceWikilinksOutsideCode(
  markdown: string,
  replacement: (target: string) => string,
): string {
  const state = { fence: null as string | null }
  return markdown.split('\n').map(line => {
    const marker = fenceDelimiter(line)

    if (marker !== null && state.fence === null) {
      state.fence = marker
      return line
    }

    if (marker !== null && state.fence === marker) {
      state.fence = null
      return line
    }

    return state.fence === null ? replaceInlineWikilinksOutsideCode(line, replacement) : line
  }).join('\n')
}

function replaceInlineWikilinksOutsideCode(
  line: string,
  replacement: (target: string) => string,
): string {
  let result = ''
  let index = 0

  while (index < line.length) {
    if (line[index] === '`') {
      const span = readInlineCodeSpan(line, index)
      result += span.text
      index = span.nextIndex
      continue
    }

    if (line[index] === '[' && line[index + 1] === '[') {
      const end = line.indexOf(']]', index + 2)
      if (end !== -1) {
        result += replacement(line.slice(index + 2, end))
        index = end + 2
        continue
      }
    }

    result += line[index]
    index++
  }

  return result
}

function wikilinkInnersOutsideCode(markdown: string): string[] {
  const inners: string[] = []
  replaceWikilinksOutsideCode(markdown, inner => {
    inners.push(inner)
    return ''
  })
  return inners
}

function fenceDelimiter(line: string): string | null {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('```')) return '```'
  if (trimmed.startsWith('~~~')) return '~~~'
  return null
}

function readInlineCodeSpan(line: string, start: number): { text: string; nextIndex: number } {
  let markerEnd = start
  while (markerEnd < line.length && line[markerEnd] === '`') markerEnd++

  const marker = line.slice(start, markerEnd)
  const close = line.indexOf(marker, markerEnd)
  if (close === -1) return { text: line.slice(start), nextIndex: line.length }

  return { text: line.slice(start, close + marker.length), nextIndex: close + marker.length }
}

/** Check if a line is useful for snippet extraction (not blank, heading, code fence, or rule). */
function isSnippetLine(line: string): boolean {
  const t = line.trim()
  return t !== '' && !t.startsWith('#') && !t.startsWith('```') && !t.startsWith('---')
}

/** Strip leading list markers (*, -, +, 1.) from a line. */
function stripListMarker(line: string): string {
  const t = line.trimStart()
  for (const prefix of ['* ', '- ', '+ ']) {
    if (t.startsWith(prefix)) return t.slice(prefix.length)
  }
  const dotPos = t.indexOf('. ')
  if (dotPos >= 1 && dotPos <= 3 && /^\d+$/.test(t.slice(0, dotPos))) {
    return t.slice(dotPos + 2)
  }
  return t
}

/** Remove the first H1 heading line, allowing leading blank lines. */
function removeH1Line(body: string): string {
  const lines = body.split('\n')
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim().startsWith('# ')) return lines.slice(i + 1).join('\n')
    if (lines[i].trim() !== '') return body
  }
  return body
}

/** Strip markdown formatting chars: bold, italic, code, strikethrough, and resolve links. */
function stripMarkdownChars(s: string): string {
  let result = ''
  let i = 0
  while (i < s.length) {
    if (s[i] === '[' && s[i + 1] === '[') {
      i += 2
      let inner = ''
      while (i < s.length - 1 && !(s[i] === ']' && s[i + 1] === ']')) { inner += s[i]; i++ }
      if (i < s.length - 1) i += 2
      const pipe = inner.indexOf('|')
      result += pipe !== -1 ? inner.slice(pipe + 1) : inner
    } else if (s[i] === '[') {
      i++
      let text = ''
      while (i < s.length && s[i] !== ']') { text += s[i]; i++ }
      if (i < s.length) i++
      if (i < s.length && s[i] === '(') { i++; while (i < s.length && s[i] !== ')') i++; if (i < s.length) i++ }
      result += text
    } else if (s[i] === '*' || s[i] === '_' || s[i] === '`' || s[i] === '~') {
      i++
    } else {
      result += s[i]
      i++
    }
  }
  return result
}

/** Extract sub-heading text (## , ### , etc.) stripped of the # prefix. */
function extractSubheadingText(line: string): string | null {
  const t = line.trim()
  const stripped = t.replace(/^#+/, '')
  if (stripped.length < t.length && stripped.startsWith(' ')) {
    const text = stripped.trim()
    return text || null
  }
  return null
}

/** Extract a snippet: first ~160 chars of body content, stripped of markdown.
 *  Mirrors the Rust extract_snippet() logic for frontend use. */
export function extractSnippet(content: string): string {
  const [, body] = splitFrontmatter(content)
  const withoutH1 = removeH1Line(body)
  const clean = withoutH1.split('\n').filter(isSnippetLine).map(stripListMarker).join(' ')
  const stripped = stripMarkdownChars(clean).trim()
  if (stripped) {
    if (stripped.length <= 160) return stripped
    return stripped.slice(0, 160) + '...'
  }
  // Fallback: collect sub-heading text when no paragraph content exists
  const headingText = withoutH1.split('\n')
    .map(extractSubheadingText)
    .filter((t): t is string => t !== null)
    .join(' ')
  const headingStripped = stripMarkdownChars(headingText).trim()
  if (!headingStripped) return ''
  if (headingStripped.length <= 160) return headingStripped
  return headingStripped.slice(0, 160) + '...'
}

export function countWords(content: string): number {
  const [, body] = splitFrontmatter(content)
  const withoutTitle = body.replace(/^\s*# [^\n]+\n?/, '')
  const withoutWikilinks = replaceWikilinksOutsideCode(withoutTitle, () => '')
  const text = withoutWikilinks.replace(/[#*_[\]`>~\-|]/g, '').trim()
  if (!text) return 0
  return text.split(/\s+/).filter(Boolean).length
}
