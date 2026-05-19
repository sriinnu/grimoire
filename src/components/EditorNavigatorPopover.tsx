import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, ListTree, Search } from 'lucide-react'
import type { MarkdownHeading } from '@grimoire/markdown-editor'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { extractNoteHeadings, findNoteSearchMatches, type NoteSearchMatch } from '../utils/noteNavigation'

/** Active mode for the editor note navigator popover. */
export type EditorNavigatorMode = 'search' | 'toc'

interface EditorNavigatorPopoverProps {
  content: string
  mode: EditorNavigatorMode
  onModeChange: (mode: EditorNavigatorMode) => void
}

const EDITOR_ROOT_SELECTOR = '.editor__blocknote-container, .editor-scroll-area'
const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6'
const LINE_ATTRIBUTES = ['data-source-line', 'data-line', 'data-line-number', 'data-grimoire-line']

function normalizeText(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function getEditorRoot(): ParentNode | null {
  return document.querySelector(EDITOR_ROOT_SELECTOR)
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

function pulseElement(element: HTMLElement) {
  element.classList.remove('editor-navigator-hit')
  window.requestAnimationFrame(() => {
    element.classList.add('editor-navigator-hit')
    window.setTimeout(() => element.classList.remove('editor-navigator-hit'), 1500)
  })
}

function scrollToSearchMatch(match: NoteSearchMatch) {
  const root = getEditorRoot()
  if (!root) return

  const target = findLineElement(root, match.line, match.match)
    ?? findTextElementAtOccurrence(root, match.match, match.occurrenceIndex)
  if (!target) return
  target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  pulseElement(target)
}

function getHeadingElements(root: ParentNode): HTMLElement[] {
  const blockHeadings = Array.from(root.querySelectorAll<HTMLElement>('[data-content-type="heading"]'))
  if (blockHeadings.length > 0) return blockHeadings
  return Array.from(root.querySelectorAll<HTMLElement>(HEADING_SELECTOR))
}

function getHeadingLevel(element: HTMLElement): number | null {
  const level = element.getAttribute('data-level')
  if (level) return Number.parseInt(level, 10)
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

function scrollToHeading(heading: MarkdownHeading, index: number, headings: MarkdownHeading[]) {
  const root = getEditorRoot()
  if (!root) return

  const lineTarget = findLineElement(root, heading.line, heading.text)
  const headingTarget = lineTarget?.closest<HTMLElement>('[data-content-type="heading"], h1, h2, h3, h4, h5, h6')
  const matchingHeadings = getHeadingElements(root).filter((element) => isSameHeading(element, heading))
  const duplicateIndex = countPriorHeadings(headings, index)
  const target = headingTarget ?? matchingHeadings[duplicateIndex] ?? getHeadingElements(root)[index]
  if (!target) return

  target.scrollIntoView({ block: 'center', behavior: 'smooth' })
  pulseElement(target)
}

function headingInset(level: number): string {
  return `${Math.max(0, level - 1) * 14}px`
}

function SearchResultButton({ match, active, onSelect }: {
  match: NoteSearchMatch
  active: boolean
  onSelect: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="editor-navigator__item"
      aria-label={`Line ${match.line}: ${match.preview}`}
      data-active={active ? 'true' : 'false'}
      onClick={onSelect}
    >
      <span className="editor-navigator__line">L{match.line}</span>
      <span className="editor-navigator__copy">{match.preview}</span>
    </Button>
  )
}

function HeadingButton({ heading, onSelect }: { heading: MarkdownHeading; onSelect: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="editor-navigator__item"
      aria-label={`H${heading.level} ${heading.text}`}
      style={{ paddingLeft: headingInset(heading.level) }}
      onClick={onSelect}
    >
      <span className="editor-navigator__line">H{heading.level}</span>
      <span className="editor-navigator__copy">{heading.text}</span>
    </Button>
  )
}

/** Search and table-of-contents navigator for the active Markdown note. */
export function EditorNavigatorPopover({ content, mode, onModeChange }: EditorNavigatorPopoverProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const headings = useMemo(() => extractNoteHeadings(content), [content])
  const matches = useMemo(() => findNoteSearchMatches(content, query), [content, query])

  const clampedActiveIndex = matches.length > 0 ? Math.min(activeIndex, matches.length - 1) : 0
  const activeMatch = matches[clampedActiveIndex]

  function selectMatch(index: number) {
    const match = matches[index]
    if (!match) return
    setActiveIndex(index)
    scrollToSearchMatch(match)
  }

  function stepMatch(direction: -1 | 1) {
    if (matches.length === 0) return
    const nextIndex = (clampedActiveIndex + direction + matches.length) % matches.length
    selectMatch(nextIndex)
  }

  return (
    <div className="editor-navigator-popover">
      <div className="editor-navigator__mode-row" role="tablist" aria-label="Note navigator mode">
        <Button
          type="button"
          variant={mode === 'search' ? 'secondary' : 'ghost'}
          size="sm"
          role="tab"
          aria-selected={mode === 'search'}
          onClick={() => onModeChange('search')}
        >
          <Search className="size-4" />
          Search
        </Button>
        <Button
          type="button"
          variant={mode === 'toc' ? 'secondary' : 'ghost'}
          size="sm"
          role="tab"
          aria-selected={mode === 'toc'}
          onClick={() => onModeChange('toc')}
        >
          <ListTree className="size-4" />
          TOC
        </Button>
      </div>

      {mode === 'search' ? (
        <>
          <div className="editor-navigator__search-row">
            <Input
              autoFocus
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setActiveIndex(0)
              }}
              placeholder="Search this note..."
              aria-label="Search this note"
            />
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Previous match" onClick={() => stepMatch(-1)}>
              <ChevronUp className="size-4" />
            </Button>
            <Button type="button" variant="ghost" size="icon-sm" aria-label="Next match" onClick={() => stepMatch(1)}>
              <ChevronDown className="size-4" />
            </Button>
          </div>
          <div className="editor-navigator__summary">
            {query.trim() ? `${matches.length} matches` : 'Type to search the current note'}
          </div>
          <div className="editor-navigator__list">
            {matches.map((match, index) => (
              <SearchResultButton
                key={match.id}
                match={match}
                active={activeMatch?.id === match.id}
                onSelect={() => selectMatch(index)}
              />
            ))}
            {query.trim() && matches.length === 0 ? <p>No matches in this note.</p> : null}
          </div>
        </>
      ) : (
        <>
          <div className="editor-navigator__summary">
            {headings.length > 0 ? `${headings.length} headings` : 'No headings yet'}
          </div>
          <div className="editor-navigator__list">
            {headings.map((heading, index) => (
              <HeadingButton
                key={`${heading.slug}:${heading.line}`}
                heading={heading}
                onSelect={() => scrollToHeading(heading, index, headings)}
              />
            ))}
            {headings.length === 0 ? <p>Add Markdown headings to build a TOC.</p> : null}
          </div>
        </>
      )}
    </div>
  )
}
