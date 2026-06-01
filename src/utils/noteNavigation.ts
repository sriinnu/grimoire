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

/** Wikilink occurrence surfaced by the in-note Links navigator. */
export interface NoteWikilinkMatch extends NoteSearchMatch {
  target: string
  label: string
}

const MAX_SEARCH_MATCHES = 80
const PREVIEW_BEFORE = 48
const PREVIEW_AFTER = 72
const EDITOR_ROOT_SELECTOR = '.editor__blocknote-container, .editor-scroll-area'
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]'
const LINE_ATTRIBUTES = ['data-source-line', 'data-line', 'data-line-number', 'data-grimoire-line']
const NAVIGATOR_HIT_CLASS = 'editor-navigator-hit'
const NAVIGATOR_HIT_OVERLAY_CLASS = 'editor-navigator-hit-overlay'
const NAVIGATOR_HIT_DURATION_MS = 1500

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

function fenceDelimiter(line: string): string | null {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('```')) return '```'
  if (trimmed.startsWith('~~~')) return '~~~'
  return null
}

function readInlineCodeSpan(line: string, start: number): { nextIndex: number } {
  let tickCount = 0
  while (line[start + tickCount] === '`') tickCount += 1
  const marker = '`'.repeat(tickCount)
  const end = line.indexOf(marker, start + tickCount)
  return { nextIndex: end === -1 ? line.length : end + tickCount }
}

function readWikilinkInner(inner: string): { target: string; label: string } | null {
  const pipeIndex = inner.indexOf('|')
  const target = (pipeIndex === -1 ? inner : inner.slice(0, pipeIndex)).trim()
  if (!target) return null
  const display = pipeIndex === -1 ? '' : inner.slice(pipeIndex + 1).trim()
  return { target, label: display || target.split('/').pop() || target }
}

function findInlineWikilinks(line: string, lineIndex: number, startOccurrenceIndex: number): NoteWikilinkMatch[] {
  const matches: NoteWikilinkMatch[] = []
  let occurrenceIndex = startOccurrenceIndex
  let index = 0

  while (index < line.length) {
    if (line[index] === '`') {
      index = readInlineCodeSpan(line, index).nextIndex
      continue
    }

    if (line[index] !== '[' || line[index + 1] !== '[') {
      index += 1
      continue
    }

    const end = line.indexOf(']]', index + 2)
    if (end === -1) break
    const parsed = readWikilinkInner(line.slice(index + 2, end))
    if (parsed) {
      matches.push({
        id: `${lineIndex + 1}:${index}:${parsed.target}`,
        line: lineIndex + 1,
        column: index + 1,
        occurrenceIndex,
        match: parsed.label,
        preview: line.trim(),
        target: parsed.target,
        label: parsed.label,
      })
      occurrenceIndex += 1
    }
    index = end + 2
  }

  return matches
}

/** Finds navigable wikilinks outside fenced code blocks and inline code spans. */
export function findNoteWikilinks(markdown: string): NoteWikilinkMatch[] {
  const matches: NoteWikilinkMatch[] = []
  let fence: string | null = null

  markdown.split(/\r?\n/).forEach((line, lineIndex) => {
    const marker = fenceDelimiter(line)
    if (marker && fence === null) {
      fence = marker
      return
    }
    if (marker && fence === marker) {
      fence = null
      return
    }
    if (fence !== null) return
    matches.push(...findInlineWikilinks(line, lineIndex, matches.length))
  })

  return matches
}

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getEditorRoot(): ParentNode | null {
  return document.querySelector(EDITOR_ROOT_SELECTOR)
}

function prefersReducedMotion(): boolean {
  return typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function navigatorScrollOptions(): ScrollIntoViewOptions {
  return prefersReducedMotion() ? { block: 'center' } : { block: 'center', behavior: 'smooth' }
}

function textIncludes(element: HTMLElement, text: string): boolean {
  return normalizeText(element.textContent ?? '').includes(normalizeText(text))
}

function findLineElement(root: ParentNode, line: number, text: string): HTMLElement | null {
  for (const attribute of LINE_ATTRIBUTES) {
    const selector = `[${attribute}="${line}"]`
    const elements = Array.from(root.querySelectorAll<HTMLElement>(selector))
    for (const element of elements) {
      if (textIncludes(element, text)) return element
    }
  }
  return null
}

function findTextElementAtOccurrence(root: ParentNode, text: string, occurrenceIndex: number): HTMLElement | null {
  const needle = normalizeText(text)
  if (!needle) return null

  let seen = 0
  const showText = typeof NodeFilter === 'undefined' ? 4 : NodeFilter.SHOW_TEXT
  const walker = document.createTreeWalker(root, showText)
  let node = walker.nextNode()
  while (node) {
    const haystack = normalizeText(node.textContent ?? '')
    let from = 0
    let index = haystack.indexOf(needle, from)
    while (index >= 0) {
      if (seen === occurrenceIndex) return node.parentElement
      seen += 1
      from = index + needle.length
      index = haystack.indexOf(needle, from)
    }
    node = walker.nextNode()
  }
  return null
}

function navigatorCueTarget(element: HTMLElement): HTMLElement {
  return element.closest<HTMLElement>('.bn-block-outer')
    ?? element.closest<HTMLElement>('.bn-block')
    ?? element.closest<HTMLElement>('[data-content-type]')
    ?? element.closest<HTMLElement>('.bn-block-content')
    ?? element
}

function clearNavigatorHitOverlays() {
  document.querySelectorAll(`.${NAVIGATOR_HIT_OVERLAY_CLASS}`).forEach((overlay) => overlay.remove())
}

function showNavigatorHitOverlay(element: HTMLElement) {
  const rect = element.getBoundingClientRect()
  if (rect.width <= 0 || rect.height <= 0) return

  const overlay = document.createElement('div')
  overlay.className = NAVIGATOR_HIT_OVERLAY_CLASS
  overlay.setAttribute('aria-hidden', 'true')
  overlay.style.left = `${rect.left}px`
  overlay.style.top = `${rect.top}px`
  overlay.style.width = `${rect.width}px`
  overlay.style.height = `${rect.height}px`
  document.body.append(overlay)
  window.setTimeout(() => overlay.remove(), NAVIGATOR_HIT_DURATION_MS)
}

function pulseElement(element: HTMLElement) {
  const cueTarget = navigatorCueTarget(element)
  cueTarget.classList.remove(NAVIGATOR_HIT_CLASS)
  clearNavigatorHitOverlays()

  const applyCue = () => {
    cueTarget.classList.add(NAVIGATOR_HIT_CLASS)
    showNavigatorHitOverlay(cueTarget)
    window.setTimeout(() => cueTarget.classList.remove(NAVIGATOR_HIT_CLASS), NAVIGATOR_HIT_DURATION_MS)
  }

  if (prefersReducedMotion()) {
    applyCue()
    return
  }

  window.requestAnimationFrame(applyCue)
}

function getHeadingElements(root: ParentNode): HTMLElement[] {
  return Array.from(new Set([
    ...root.querySelectorAll<HTMLElement>('[data-content-type="heading"]'),
    ...root.querySelectorAll<HTMLElement>(HEADING_SELECTOR),
  ]))
}

function getHeadingLevel(element: HTMLElement): number | null {
  const level = element.getAttribute('data-level')
  if (level) return Number.parseInt(level, 10)
  const ariaLevel = element.getAttribute('aria-level')
  if (ariaLevel) return Number.parseInt(ariaLevel, 10)
  const tagMatch = element.tagName.match(/^H([1-6])$/)
  return tagMatch ? Number.parseInt(tagMatch[1], 10) : null
}

function isSameHeading(element: HTMLElement, heading: MarkdownHeading): boolean {
  const level = getHeadingLevel(element)
  return normalizeText(element.textContent ?? '') === normalizeText(heading.text)
    && (level === null || level === heading.level)
}

function countPriorHeadings(headings: MarkdownHeading[], index: number): number {
  const selected = headings[index]
  if (!selected) return 0
  return headings.slice(0, index).filter((heading) => (
    heading.level === selected.level && normalizeText(heading.text) === normalizeText(selected.text)
  )).length
}

/** Scrolls a line-level in-note search match into view and stages the same hit cue everywhere. */
export function scrollToNoteSearchMatch(match: NoteSearchMatch) {
  const root = getEditorRoot()
  if (!root) return

  const target = findLineElement(root, match.line, match.match)
    ?? findTextElementAtOccurrence(root, match.match, match.occurrenceIndex)
  if (!target) return
  target.scrollIntoView(navigatorScrollOptions())
  pulseElement(target)
}

/** Scrolls a Markdown heading from any outline surface into the active editor. */
export function scrollToNoteHeading(heading: MarkdownHeading, index: number, headings: MarkdownHeading[]) {
  const root = getEditorRoot()
  if (!root) return

  const lineTarget = findLineElement(root, heading.line, heading.text)
  const headingTarget = lineTarget?.closest<HTMLElement>(`[data-content-type="heading"], ${HEADING_SELECTOR}`)
  const matchingHeadings = getHeadingElements(root).filter((element) => isSameHeading(element, heading))
  const duplicateIndex = countPriorHeadings(headings, index)
  const target = headingTarget ?? matchingHeadings[duplicateIndex] ?? getHeadingElements(root)[index]
  if (!target) return

  target.scrollIntoView(navigatorScrollOptions())
  pulseElement(target)
}
