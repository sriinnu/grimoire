import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { EditorView } from '@codemirror/view'
import { ChevronDown, ChevronUp, Replace, X } from 'lucide-react'
import { clampRawEditorFindIndex, findRawEditorMatches, type RawEditorFindMatch } from '../utils/rawEditorFindReplace'
import { Button } from './ui/button'
import { Input } from './ui/input'

interface RawEditorFindReplacePanelProps {
  focusSignal: number
  onClose: () => void
  open: boolean
  viewRef: React.MutableRefObject<EditorView | null>
}

function selectMatch(view: EditorView, match: { from: number; to: number }) {
  view.dispatch({
    selection: { anchor: match.from, head: match.to },
    scrollIntoView: true,
  })
}

/** Find and replace controls for raw markdown editing. */
export function RawEditorFindReplacePanel({ focusSignal, onClose, open, viewRef }: RawEditorFindReplacePanelProps) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [matches, setMatches] = useState<RawEditorFindMatch[]>([])
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const activeMatch = matches[clampRawEditorFindIndex(activeIndex, matches.length)]

  useEffect(() => {
    if (!open) return
    inputRef.current?.focus()
  }, [focusSignal, open])

  useEffect(() => {
    const view = viewRef.current
    if (!open || !view || !activeMatch) return
    selectMatch(view, activeMatch)
  }, [activeMatch, open, viewRef])

  const getLiveMatches = useCallback(() => {
    return findRawEditorMatches(viewRef.current?.state.doc.toString() ?? '', query)
  }, [query, viewRef])

  const move = useCallback((delta: number) => {
    const liveMatches = getLiveMatches()
    if (liveMatches.length === 0) {
      setMatches([])
      setActiveIndex(0)
      return
    }
    const nextIndex = (clampRawEditorFindIndex(activeIndex, liveMatches.length) + delta + liveMatches.length) % liveMatches.length
    setMatches(liveMatches)
    setActiveIndex(nextIndex)
  }, [activeIndex, getLiveMatches])

  const updateQuery = useCallback((nextQuery: string) => {
    const nextMatches = findRawEditorMatches(viewRef.current?.state.doc.toString() ?? '', nextQuery)
    setQuery(nextQuery)
    setMatches(nextMatches)
    setActiveIndex(0)
  }, [viewRef])

  const replaceCurrent = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const doc = view.state.doc.toString()
    const liveMatches = findRawEditorMatches(doc, query)
    const liveIndex = clampRawEditorFindIndex(activeIndex, liveMatches.length)
    const match = liveMatches[liveIndex]
    if (!match) {
      setMatches([])
      setActiveIndex(0)
      return
    }
    const nextDoc = `${doc.slice(0, match.from)}${replacement}${doc.slice(match.to)}`
    view.dispatch({
      changes: { from: match.from, to: match.to, insert: replacement },
      selection: { anchor: match.from + replacement.length },
    })
    const nextMatches = findRawEditorMatches(nextDoc, query)
    setMatches(nextMatches)
    setActiveIndex(clampRawEditorFindIndex(liveIndex, nextMatches.length))
    view.focus()
  }, [activeIndex, query, replacement, viewRef])

  const replaceAll = useCallback(() => {
    const view = viewRef.current
    if (!view) return
    const doc = view.state.doc.toString()
    const liveMatches = findRawEditorMatches(doc, query)
    if (liveMatches.length === 0) return
    const nextDoc = liveMatches.reduceRight(
      (updatedDoc, match) => `${updatedDoc.slice(0, match.from)}${replacement}${updatedDoc.slice(match.to)}`,
      doc,
    )
    view.dispatch({
      changes: liveMatches.map(match => ({ from: match.from, to: match.to, insert: replacement })),
      selection: { anchor: liveMatches[0].from + replacement.length },
    })
    setMatches(findRawEditorMatches(nextDoc, query))
    setActiveIndex(0)
    view.focus()
  }, [query, replacement, viewRef])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    event.stopPropagation()
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose()
      viewRef.current?.focus()
      return
    }
    if (event.key !== 'Enter') return
    event.preventDefault()
    move(event.shiftKey ? -1 : 1)
  }, [move, onClose, viewRef])

  if (!open) return null

  return (
    <div
      className="flex shrink-0 items-center gap-1 border-b px-3 py-2"
      style={{ background: 'var(--surface-editor)', borderColor: 'var(--border-subtle)' }}
      data-testid="raw-editor-find-panel"
      onKeyDown={handleKeyDown}
    >
      <Input
        ref={inputRef}
        value={query}
        onChange={(event) => updateQuery(event.target.value)}
        placeholder="Find"
        aria-label="Find in note"
        className="h-7 max-w-44 text-xs"
      />
      <Input
        value={replacement}
        onChange={(event) => setReplacement(event.target.value)}
        placeholder="Replace"
        aria-label="Replace with"
        className="h-7 max-w-44 text-xs"
      />
      <span className="w-16 text-center text-xs text-muted-foreground" data-testid="raw-editor-find-count">
        {matches.length === 0 ? '0/0' : `${clampRawEditorFindIndex(activeIndex, matches.length) + 1}/${matches.length}`}
      </span>
      <Button type="button" variant="ghost" size="icon-xs" aria-label="Previous match" onClick={() => move(-1)}>
        <ChevronUp />
      </Button>
      <Button type="button" variant="ghost" size="icon-xs" aria-label="Next match" onClick={() => move(1)}>
        <ChevronDown />
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={replaceCurrent}>
        <Replace />
        Replace
      </Button>
      <Button type="button" variant="ghost" size="xs" onClick={replaceAll}>All</Button>
      <Button type="button" variant="ghost" size="icon-xs" aria-label="Close find in note" onClick={onClose}>
        <X />
      </Button>
    </div>
  )
}
