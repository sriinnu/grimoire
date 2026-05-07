export type MarkdownFrontmatterState = 'valid' | 'empty' | 'none' | 'invalid'

export interface MarkdownHeading {
  /** Heading depth from 1 to 6. */
  level: number
  /** Plain heading text without leading hashes. */
  text: string
  /** Stable slug derived from heading text and sibling collisions. */
  slug: string
  /** One-based line number in the source document. */
  line: number
}

export interface MarkdownFrontmatterField {
  /** YAML key as written without surrounding quotes. */
  key: string
  /** Raw scalar value or comma-joined inline/list value. */
  value: string
  /** One-based line number inside the full source document. */
  line: number
}

export interface MarkdownDocumentSemantics {
  /** YAML frontmatter state for UI validation and repair prompts. */
  frontmatterState: MarkdownFrontmatterState
  /** Raw frontmatter block including delimiters when present. */
  frontmatter: string
  /** Markdown body after frontmatter is removed. */
  body: string
  /** Shallow parsed frontmatter fields for property and diagnostics surfaces. */
  frontmatterFields: MarkdownFrontmatterField[]
  /** ATX headings outside fenced code blocks. */
  headings: MarkdownHeading[]
}

export interface FormatMarkdownFrontmatterResult {
  /** Full Markdown after formatting. Unchanged when formatting is not possible. */
  markdown: string
  /** Whether the returned Markdown differs from input. */
  changed: boolean
  /** Human-readable refusal reason for malformed or missing frontmatter. */
  error: string | null
}

export interface UpsertMarkdownTocResult {
  /** Full Markdown after inserting or replacing the generated TOC block. */
  markdown: string
  /** Whether the returned Markdown differs from input. */
  changed: boolean
  /** Human-readable refusal reason when no TOC can be generated. */
  error: string | null
}

interface FrontmatterSplit {
  frontmatter: string
  body: string
  bodyStartLine: number
}

const FRONTMATTER_OPEN = /^---[ \t]*(?:\r?\n|$)/
const FRONTMATTER_CLOSE = /^---[ \t]*$/
const FRONTMATTER_KEY_ORDER = [
  'title',
  'type',
  'is_a',
  'status',
  'date',
  'tags',
  'aliases',
  'belongs_to',
  'related_to',
  'color',
  '_icon',
  '_sidebar_label',
]
const TOC_START = '<!-- grimoire-toc:start -->'
const TOC_END = '<!-- grimoire-toc:end -->'

/** Parses document structure shared by Tauri, SwiftUI, and editor UI shells. */
export function parseMarkdownDocumentSemantics(markdown: string): MarkdownDocumentSemantics {
  const split = splitFrontmatter(markdown)
  return {
    frontmatterState: detectFrontmatterState(split.frontmatter),
    frontmatter: split.frontmatter,
    body: split.body,
    frontmatterFields: parseFrontmatterFields(split.frontmatter),
    headings: extractHeadings(split.body, split.bodyStartLine),
  }
}

/** Formats a document's YAML frontmatter without changing Markdown body text. */
export function formatMarkdownFrontmatter(markdown: string): FormatMarkdownFrontmatterResult {
  const split = splitFrontmatter(markdown)
  if (!split.frontmatter) {
    return { markdown, changed: false, error: 'No frontmatter block to format.' }
  }

  const state = detectFrontmatterState(split.frontmatter)
  if (state === 'invalid') {
    return { markdown, changed: false, error: 'Frontmatter is invalid. Fix YAML before formatting.' }
  }

  const formattedFrontmatter = renderFrontmatterBlocks(parseFrontmatterBlocks(split.frontmatter))
  const formattedMarkdown = `${formattedFrontmatter}${split.body}`
  return {
    markdown: formattedMarkdown,
    changed: formattedMarkdown !== markdown,
    error: null,
  }
}

/** Inserts or replaces a portable Markdown table-of-contents block. */
export function upsertMarkdownToc(markdown: string): UpsertMarkdownTocResult {
  const semantics = parseMarkdownDocumentSemantics(markdown)
  const tocHeadings = semantics.headings.filter((heading) => heading.text.toLowerCase() !== 'table of contents')
  if (tocHeadings.length === 0) {
    return { markdown, changed: false, error: 'No headings available for a table of contents.' }
  }

  const tocBlock = renderMarkdownToc(tocHeadings)
  const existingPattern = new RegExp(`${escapeRegExp(TOC_START)}[\\s\\S]*?${escapeRegExp(TOC_END)}\\n?`)
  const nextMarkdown = existingPattern.test(markdown)
    ? markdown.replace(existingPattern, tocBlock)
    : insertTocAfterOpening(markdown, semantics, tocBlock)
  return { markdown: nextMarkdown, changed: nextMarkdown !== markdown, error: null }
}

function splitFrontmatter(markdown: string): FrontmatterSplit {
  if (!FRONTMATTER_OPEN.test(markdown)) {
    return { frontmatter: '', body: markdown, bodyStartLine: 1 }
  }

  const lines = markdown.split(/(?<=\n)/)
  for (let index = 1; index < lines.length; index++) {
    if (!FRONTMATTER_CLOSE.test(lines[index].replace(/\r?\n$/, ''))) continue
    const frontmatter = lines.slice(0, index + 1).join('')
    return {
      frontmatter,
      body: lines.slice(index + 1).join(''),
      bodyStartLine: index + 2,
    }
  }

  return { frontmatter: '', body: markdown, bodyStartLine: 1 }
}

interface FrontmatterBlock {
  key: string | null
  lines: string[]
  order: number
}

function parseFrontmatterBlocks(frontmatter: string): FrontmatterBlock[] {
  const allLines = frontmatter.split(/\r?\n/)
  if (allLines.at(-1) === '') allLines.pop()
  const lines = allLines.slice(1, -1)
  const blocks: FrontmatterBlock[] = []
  let current: FrontmatterBlock | null = null

  for (const line of lines) {
    const keyValue = parseKeyValueLine(line)
    if (keyValue) {
      current = { key: keyValue.key, lines: [`${keyValue.key}: ${keyValue.value}`.trimEnd()], order: blocks.length }
      blocks.push(current)
      continue
    }

    if (current && /^ {2,}-\s+/.test(line)) {
      current.lines.push(line.replace(/^ +-\s*/, '  - '))
      continue
    }

    if (line.trim()) blocks.push({ key: null, lines: [line.trimEnd()], order: blocks.length })
  }

  return blocks
}

function renderFrontmatterBlocks(blocks: FrontmatterBlock[]): string {
  const renderedBlocks = blocks
    .slice()
    .sort(compareFrontmatterBlocks)
    .flatMap((block) => block.lines)
  return `---\n${renderedBlocks.join('\n')}${renderedBlocks.length > 0 ? '\n' : ''}---\n`
}

function renderMarkdownToc(headings: MarkdownHeading[]): string {
  const lines = [
    TOC_START,
    '## Table of Contents',
    '',
    ...headings.map((heading) => `${'  '.repeat(Math.max(0, heading.level - 1))}- [${heading.text}](#${heading.slug})`),
    TOC_END,
    '',
  ]
  return lines.join('\n')
}

function insertTocAfterOpening(
  markdown: string,
  semantics: MarkdownDocumentSemantics,
  tocBlock: string,
): string {
  const firstHeading = semantics.headings[0]
  if (!firstHeading) return `${tocBlock}${markdown}`
  const lines = markdown.split(/(?<=\n)/)
  const insertionLine = firstHeading.level === 1 ? firstHeading.line : semantics.frontmatter.split(/\r?\n/).length
  const index = Math.min(lines.length, insertionLine)
  return `${lines.slice(0, index).join('').trimEnd()}\n\n${tocBlock}\n${lines.slice(index).join('').trimStart()}`
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function compareFrontmatterBlocks(left: FrontmatterBlock, right: FrontmatterBlock): number {
  const leftRank = frontmatterKeyRank(left.key)
  const rightRank = frontmatterKeyRank(right.key)
  return leftRank === rightRank ? left.order - right.order : leftRank - rightRank
}

function frontmatterKeyRank(key: string | null): number {
  if (!key) return FRONTMATTER_KEY_ORDER.length + 1
  const index = FRONTMATTER_KEY_ORDER.indexOf(key.toLowerCase())
  return index === -1 ? FRONTMATTER_KEY_ORDER.length : index
}

function detectFrontmatterState(frontmatter: string): MarkdownFrontmatterState {
  if (!frontmatter) return 'none'
  const body = frontmatter
    .replace(/^---[ \t]*(?:\r?\n|$)/, '')
    .replace(/\r?\n---[ \t]*\r?\n?$/, '')
    .trim()
  if (!body) return 'empty'
  return body.split(/\r?\n/).some((line) => parseKeyValueLine(line) !== null) ? 'valid' : 'invalid'
}

function parseFrontmatterFields(frontmatter: string): MarkdownFrontmatterField[] {
  if (!frontmatter) return []
  const lines = frontmatter.split(/\r?\n/)
  const fields: MarkdownFrontmatterField[] = []
  let activeKey: string | null = null
  let activeLine = 0
  let activeItems: string[] = []

  for (let index = 1; index < Math.max(1, lines.length - 1); index++) {
    const listItem = lines[index].match(/^ {2,}-\s*(.*)$/)
    if (listItem && activeKey) {
      activeItems.push(cleanYamlScalar(listItem[1]))
      continue
    }

    flushListField(fields, activeKey, activeLine, activeItems)
    activeItems = []

    const keyValue = parseKeyValueLine(lines[index])
    if (!keyValue) {
      activeKey = null
      continue
    }

    activeKey = keyValue.key
    activeLine = index + 1
    if (keyValue.value !== '' && keyValue.value !== '|' && keyValue.value !== '>') {
      fields.push({ key: keyValue.key, value: cleanYamlScalar(keyValue.value), line: activeLine })
      activeKey = null
    }
  }

  flushListField(fields, activeKey, activeLine, activeItems)
  return fields
}

function flushListField(
  fields: MarkdownFrontmatterField[],
  key: string | null,
  line: number,
  items: string[],
) {
  if (key && items.length > 0) fields.push({ key, value: items.join(', '), line })
}

function parseKeyValueLine(line: string): { key: string; value: string } | null {
  const match = line.match(/^["']?([A-Za-z_][\w -]*)["']?\s*:\s*(.*)$/)
  if (!match) return null
  return { key: match[1].trim(), value: match[2].trim() }
}

function cleanYamlScalar(value: string): string {
  const trimmed = value.trim()
  if (trimmed.startsWith('[') && trimmed.endsWith(']') && !trimmed.startsWith('[[')) {
    return trimmed.slice(1, -1).split(',').map((item) => cleanYamlScalar(item)).join(', ')
  }
  return trimmed.replace(/^["']|["']$/g, '')
}

function extractHeadings(body: string, bodyStartLine: number): MarkdownHeading[] {
  const headings: MarkdownHeading[] = []
  const slugCounts = new Map<string, number>()
  let fence: string | null = null

  body.split(/\r?\n/).forEach((line, index) => {
    const fenceMarker = fenceDelimiter(line)
    if (fenceMarker && fence === null) {
      fence = fenceMarker
      return
    }
    if (fenceMarker && fence === fenceMarker) {
      fence = null
      return
    }
    if (fence !== null) return

    const match = line.match(/^ {0,3}(#{1,6})\s+(.+?)\s*#*\s*$/)
    if (!match) return
    const text = match[2].trim()
    const baseSlug = slugifyHeading(text)
    const count = slugCounts.get(baseSlug) ?? 0
    slugCounts.set(baseSlug, count + 1)
    headings.push({
      level: match[1].length,
      text,
      slug: count === 0 ? baseSlug : `${baseSlug}-${count + 1}`,
      line: bodyStartLine + index,
    })
  })

  return headings
}

function fenceDelimiter(line: string): string | null {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('```')) return '```'
  if (trimmed.startsWith('~~~')) return '~~~'
  return null
}

function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/`([^`]+)`/g, '$1')
    .replace(/[^\p{Letter}\p{Number}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-') || 'section'
}
