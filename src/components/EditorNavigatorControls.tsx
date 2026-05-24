import { useCallback, useEffect, useState } from 'react'
import { Link2, ListTree, Search } from 'lucide-react'
import { Button } from './ui/button'
import { Popover, PopoverAnchor, PopoverContent } from './ui/popover'
import { EditorNavigatorPopover, type EditorNavigatorMode } from './EditorNavigatorPopover'
import { cn } from '../lib/utils'

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
            aria-label="Table of contents"
            onClick={() => openNavigator('toc')}
          >
            <ListTree className="size-4" />
            {variant === 'meta' ? <span>TOC</span> : null}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size={variant === 'meta' ? 'sm' : 'icon-sm'}
            className="editor-navigator-controls__button"
            title="Spelllinks in this note"
            aria-label="Spelllinks in this note"
            onClick={() => openNavigator('links')}
          >
            <Link2 className="size-4" />
            {variant === 'meta' ? <span>Links</span> : null}
          </Button>
        </div>
      </PopoverAnchor>
      <PopoverContent className="editor-navigator-popover-shell grimoire-panel-reveal" align="center" side="top" sideOffset={10}>
        <EditorNavigatorPopover content={content} mode={mode} onModeChange={setMode} />
      </PopoverContent>
    </Popover>
  )
}
