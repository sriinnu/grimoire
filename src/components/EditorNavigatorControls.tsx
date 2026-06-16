import { lazy, Suspense, useCallback, useEffect, useMemo, useState } from 'react'
import { Link2, ListTree, Search } from 'lucide-react'
import { Button } from './ui/button'
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover'
import { cn } from '../lib/utils'

type EditorNavigatorMode = 'search' | 'toc' | 'links'

interface EditorNavigatorSummary {
  headingCount: number
  linkCount: number
}

const EditorNavigatorPopoverSurface = lazy(async () => ({
  default: (await import('./EditorNavigatorPopover')).EditorNavigatorPopover,
}))

function EditorNavigatorFallback() {
  return <div className="editor-navigator-popover" aria-label="Loading note navigator" />
}

function isFindShortcut(event: KeyboardEvent): boolean {
  const hasPrimaryModifier = event.metaKey || event.ctrlKey
  return hasPrimaryModifier && !event.shiftKey && !event.altKey && event.key.toLowerCase() === 'f'
}

function isEditorFocus(): boolean {
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return false
  return Boolean(active.closest('.editor-content-layout--centered, .editor-content-layout--left'))
}

function shouldOpenNoteNavigator(event: KeyboardEvent): boolean {
  if (!isFindShortcut(event)) return false
  if (!isEditorFocus()) return false
  const target = event.target instanceof HTMLElement ? event.target : null
  return !target?.closest('[role="dialog"], .note-list-panel')
}

function fenceDelimiter(line: string): string | null {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('```')) return '```'
  if (trimmed.startsWith('~~~')) return '~~~'
  return null
}

function countVisibleWikilinks(line: string): number {
  const withoutInlineCode = line.replace(/`+[^`]*`+/gu, '')
  return withoutInlineCode.match(/\[\[[^\]\n]+?\]\]/gu)?.length ?? 0
}

function summarizeNavigatorContent(content: string): EditorNavigatorSummary {
  let headingCount = 0
  let linkCount = 0
  let fence: string | null = null
  let inFrontmatter = false

  content.split(/\r?\n/).forEach((line, index) => {
    const trimmed = line.trim()
    if (index === 0 && trimmed === '---') {
      inFrontmatter = true
      return
    }
    if (inFrontmatter) {
      if (trimmed === '---') inFrontmatter = false
      return
    }

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

    if (/^#{1,6}\s+\S/u.test(line.trimStart())) headingCount += 1
    linkCount += countVisibleWikilinks(line)
  })

  return { headingCount, linkCount }
}

function countLabel(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`
}

interface EditorNavigatorControlsProps {
  content: string
  enableFindShortcut?: boolean
  variant?: 'composer' | 'meta'
}

/** Search/TOC launcher for the active Markdown note. */
export function EditorNavigatorControls({
  content,
  enableFindShortcut = false,
  variant = 'composer',
}: EditorNavigatorControlsProps) {
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState<EditorNavigatorMode>('search')
  const summary = useMemo(() => summarizeNavigatorContent(content), [content])

  const openNavigator = useCallback((nextMode: EditorNavigatorMode) => {
    setMode(nextMode)
    setOpen(true)
  }, [])

  useEffect(() => {
    if (!enableFindShortcut) return

    function handleKeyDown(event: KeyboardEvent) {
      if (!shouldOpenNoteNavigator(event)) return
      event.preventDefault()
      openNavigator('search')
    }

    document.addEventListener('keydown', handleKeyDown, true)
    return () => document.removeEventListener('keydown', handleKeyDown, true)
  }, [enableFindShortcut, openNavigator])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <div className={cn('editor-navigator-controls', `editor-navigator-controls--${variant}`)}>
          <Button
            type="button"
            variant="ghost"
            size={variant === 'meta' ? 'sm' : 'icon-sm'}
            className="editor-navigator-controls__button"
            title="Search this note"
            aria-label="Search this note"
            onClick={() => openNavigator('search')}
          >
            <Search className="size-4" />
            {variant === 'meta' ? <span>Find</span> : null}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size={variant === 'meta' ? 'sm' : 'icon-sm'}
            className="editor-navigator-controls__button"
            title="Table of contents"
            aria-label={`Table of contents, ${countLabel(summary.headingCount, 'heading')}`}
            onClick={() => openNavigator('toc')}
          >
            <ListTree className="size-4" />
            {variant === 'meta' ? <span>TOC</span> : null}
            {variant === 'meta' ? (
              <span className="editor-navigator-controls__count" data-empty={summary.headingCount === 0 ? 'true' : 'false'}>
                {summary.headingCount}
              </span>
            ) : null}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size={variant === 'meta' ? 'sm' : 'icon-sm'}
            className="editor-navigator-controls__button"
            title="Note links in this note"
            aria-label={`Note links in this note, ${countLabel(summary.linkCount, 'link')}`}
            onClick={() => openNavigator('links')}
          >
            <Link2 className="size-4" />
            {variant === 'meta' ? <span>Links</span> : null}
            {variant === 'meta' ? (
              <span className="editor-navigator-controls__count" data-empty={summary.linkCount === 0 ? 'true' : 'false'}>
                {summary.linkCount}
              </span>
            ) : null}
          </Button>
        </div>
      </PopoverAnchor>
      <PopoverContent className="editor-navigator-popover-shell grimoire-panel-reveal" align="center" side="top" sideOffset={10}>
        <Suspense fallback={<EditorNavigatorFallback />}>
          <EditorNavigatorPopoverSurface content={content} mode={mode} onModeChange={setMode} />
        </Suspense>
      </PopoverContent>
    </Popover>
  )
}
