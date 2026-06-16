import { useMemo, useState } from 'react'
import { ChevronDown, ChevronUp, Link2, ListTree, Search } from 'lucide-react'
import type { MarkdownHeading } from '@grimoire/markdown-editor'
import { Button } from './ui/button'
import { Input } from './ui/input'
import {
  extractNoteHeadings,
  findNoteWikilinks,
  findNoteSearchMatches,
  scrollToNoteHeading,
  scrollToNoteSearchMatch,
  type NoteSearchMatch,
  type NoteWikilinkMatch,
} from '../utils/noteNavigation'

/** Active mode for the editor note navigator popover. */
export type EditorNavigatorMode = 'search' | 'toc' | 'links'

interface EditorNavigatorPopoverProps {
  content: string
  mode: EditorNavigatorMode
  onModeChange: (mode: EditorNavigatorMode) => void
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

function WikilinkButton({ link, onSelect }: { link: NoteWikilinkMatch; onSelect: () => void }) {
  return (
    <Button
      type="button"
      variant="ghost"
      className="editor-navigator__item"
      aria-label={`Line ${link.line}: ${link.label}`}
      onClick={onSelect}
    >
      <span className="editor-navigator__line">L{link.line}</span>
      <span className="editor-navigator__copy">
        <strong>{link.label}</strong>
        <small>{link.target}</small>
      </span>
    </Button>
  )
}

/** Search and table-of-contents navigator for the active Markdown note. */
export function EditorNavigatorPopover({ content, mode, onModeChange }: EditorNavigatorPopoverProps) {
  const [query, setQuery] = useState('')
  const [activeIndex, setActiveIndex] = useState(0)
  const headings = useMemo(() => extractNoteHeadings(content), [content])
  const matches = useMemo(() => findNoteSearchMatches(content, query), [content, query])
  const links = useMemo(() => findNoteWikilinks(content), [content])

  const clampedActiveIndex = matches.length > 0 ? Math.min(activeIndex, matches.length - 1) : 0
  const activeMatch = matches[clampedActiveIndex]

  function selectMatch(index: number) {
    const match = matches[index]
    if (!match) return
    setActiveIndex(index)
    scrollToNoteSearchMatch(match)
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
        <Button
          type="button"
          variant={mode === 'links' ? 'secondary' : 'ghost'}
          size="sm"
          role="tab"
          aria-selected={mode === 'links'}
          onClick={() => onModeChange('links')}
        >
          <Link2 className="size-4" />
          Links
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
      ) : mode === 'toc' ? (
        <>
          <div className="editor-navigator__summary">
            {headings.length > 0 ? `${headings.length} headings` : 'No headings yet'}
          </div>
          <div className="editor-navigator__list">
            {headings.map((heading, index) => (
              <HeadingButton
                key={`${heading.slug}:${heading.line}`}
                heading={heading}
                onSelect={() => scrollToNoteHeading(heading, index, headings)}
              />
            ))}
            {headings.length === 0 ? <p>Add Markdown headings to build a TOC.</p> : null}
          </div>
        </>
      ) : (
        <>
          <div className="editor-navigator__summary">
            {links.length > 0 ? `${links.length} note links` : 'No note links yet'}
          </div>
          <div className="editor-navigator__list">
            {links.map((link) => (
              <WikilinkButton
                key={link.id}
                link={link}
                onSelect={() => scrollToNoteSearchMatch(link)}
              />
            ))}
            {links.length === 0 ? <p>Add [[Note Title]] links to connect this note.</p> : null}
          </div>
        </>
      )}
    </div>
  )
}
