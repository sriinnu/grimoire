import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import type { VaultEntry } from '../types'
import { NoteSearchList } from './NoteSearchList'
import { Input } from './ui/input'
import { useNoteSearch } from '../hooks/useNoteSearch'

interface QuickOpenPaletteProps {
  open: boolean
  entries: VaultEntry[]
  onSelect: (entry: VaultEntry) => void
  onClose: () => void
}

export function QuickOpenPalette({ open, entries, onSelect, onClose }: QuickOpenPaletteProps) {
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
        const selected = results[selectedIndex]
        if (selected) {
          onSelect(selected.entry)
          onClose()
        }
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, results, selectedIndex, onSelect, onClose, handleKeyDown])

  if (!open) return null

  return (
    <div
      data-testid="quick-open-palette"
      className="grimoire-dialog-overlay fixed inset-0 z-[1000] flex justify-center bg-[var(--grimoire-dialog-overlay,var(--shadow-dialog))] pt-[15vh]"
      onClick={onClose}
    >
      <div
        className="grimoire-command-stage grimoire-command-surface flex w-[500px] max-w-[90vw] max-h-[400px] flex-col self-start overflow-hidden border"
        onClick={(e) => e.stopPropagation()}
      >
        <Input
          ref={inputRef}
          data-testid="quick-open-input"
          className="border-b border-border bg-transparent px-4 py-3 text-[15px] text-foreground outline-none placeholder:text-muted-foreground"
          type="text"
          placeholder="Search pages..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <NoteSearchList
          items={results}
          selectedIndex={selectedIndex}
          getItemKey={(item) => item.entry.path}
          onItemClick={(item) => {
            onSelect(item.entry)
            onClose()
          }}
          onItemHover={(i) => setSelectedIndex(i)}
          emptyMessage="No matching pages"
          className="flex-1 overflow-y-auto"
        />
      </div>
    </div>
  )
}
