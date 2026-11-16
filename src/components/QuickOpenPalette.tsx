import { formatShortcutDisplay } from '../hooks/appCommandCatalog'
import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { Search } from 'lucide-react'
import type { VaultEntry } from '../types'
import { NoteSearchList } from './NoteSearchList'
import { Glyph } from '@/components/glyphs/Glyph'
import { Input } from './ui/input'
import { useNoteSearch } from '../hooks/useNoteSearch'
import { PaletteShell } from './palette/PaletteShell'
import { PaletteEmpty } from './palette/PaletteEmpty'
import { PaletteFooter } from './palette/PaletteFooter'

interface QuickOpenPaletteProps {
  open: boolean
  entries: VaultEntry[]
  onSelect: (entry: VaultEntry) => void
  onClose: () => void
  /** Creates a new page titled with the query (Enter when nothing matches, Shift+Enter always). */
  onCreate?: (title: string) => void
}

export function QuickOpenPalette({ open, entries, onSelect, onClose, onCreate }: QuickOpenPaletteProps) {
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const { results, selectedIndex, setSelectedIndex, handleKeyDown } = useNoteSearch(entries, query)

  useLayoutEffect(() => {
    if (!open) return

    setQuery('')
    setSelectedIndex(0)
    inputRef.current?.focus()

    if (document.activeElement === inputRef.current) return
    const retry = window.requestAnimationFrame(() => inputRef.current?.focus())
    return () => window.cancelAnimationFrame(retry)
  }, [open, setSelectedIndex])

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      handleKeyDown(e)
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const title = query.trim()
        // Bear/Obsidian habit: a search that finds nothing becomes the new page.
        if (onCreate && title && (e.shiftKey || results.length === 0)) {
          onCreate(title)
          onClose()
          return
        }
        const selected = results[selectedIndex]
        if (selected) {
          onSelect(selected.entry)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, query, results, selectedIndex, onSelect, onClose, onCreate, handleKeyDown])

  const createTitle = query.trim()
  const showCreateRow = Boolean(onCreate && createTitle && results.length === 0)

  if (!open) return null

  return (
    <div
      data-testid="quick-open-palette"
      className="grimoire-dialog-overlay fixed inset-0 z-[1000] flex justify-center bg-[var(--grimoire-dialog-overlay,var(--shadow-dialog))] pt-[var(--palette-offset)]"
      onClick={onClose}
    >
      <PaletteShell className="max-h-[440px]" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Glyph name="search" size={18} className="shrink-0 text-muted-foreground" aria-hidden="true" />
          <Input
            ref={inputRef}
            data-testid="quick-open-input"
            className="h-[var(--palette-input-height)] flex-1 rounded-none border-0 bg-transparent px-0 text-[16px] text-foreground shadow-none outline-none placeholder:text-muted-foreground focus-visible:border-0 focus-visible:ring-0"
            type="text"
            placeholder="Search pages"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {showCreateRow ? (
          <button
            type="button"
            data-testid="quick-open-create"
            className="flex h-10 w-full items-center gap-2 px-4 text-left text-sm text-foreground hover:bg-muted"
            onClick={() => {
              onCreate?.(createTitle)
              onClose()
            }}
          >
            <span className="text-muted-foreground">No matching pages —</span>
            <span className="font-semibold">Create “{createTitle}”</span>
            <kbd className="ml-auto text-[11px] text-muted-foreground">{formatShortcutDisplay({ display: '↵' })}</kbd>
          </button>
        ) : results.length === 0 ? (
          <PaletteEmpty icon={Search} title="No matching pages" className="flex-1" />
        ) : (
          <NoteSearchList
            items={results}
            selectedIndex={selectedIndex}
            getItemKey={(item) => item.entry.path}
            onItemClick={(item) => {
              onSelect(item.entry)
              onClose()
            }}
            onItemHover={(i) => setSelectedIndex(i)}
            className="flex-1 overflow-y-auto"
          />
        )}
        <PaletteFooter
          hints={[
            { keys: '↑↓', label: 'Navigate' },
            { keys: '↵', label: 'Open' },
            ...(onCreate ? [{ keys: '↵', label: 'Create when nothing matches' }] : []),
            { keys: 'esc', label: 'Close' },
          ]}
        />
      </PaletteShell>
    </div>
  )
}
