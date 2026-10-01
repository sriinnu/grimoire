import { useCallback, useState } from 'react'
import { APP_STORAGE_KEYS } from '../../constants/appStorage'
import type { SidebarSelection } from '../../types'

export type NoteListLayout = 'list' | 'table'

/** One remembered layout per place you can be: a type's list, a view, a folder, a tag. */
export function noteListLayoutKey(selection: SidebarSelection): string {
  switch (selection.kind) {
    case 'filter': return `filter:${selection.filter}`
    case 'sectionGroup': return `section:${selection.type}`
    case 'folder': return `folder:${selection.path}`
    case 'view': return `view:${selection.filename}`
    case 'tag': return `tag:${selection.tag}`
    case 'entity': return `entity:${selection.entry.path}`
    default: return selection.kind
  }
}

function readAll(): Record<string, NoteListLayout> {
  try {
    const raw = localStorage.getItem(APP_STORAGE_KEYS.noteListLayout)
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return parsed && typeof parsed === 'object' ? (parsed as Record<string, NoteListLayout>) : {}
  } catch {
    return {}
  }
}

export function readNoteListLayout(key: string): NoteListLayout {
  return readAll()[key] === 'table' ? 'table' : 'list'
}

export function writeNoteListLayout(key: string, layout: NoteListLayout): void {
  try {
    const all = readAll()
    if (layout === 'list') delete all[key]
    else all[key] = layout
    localStorage.setItem(APP_STORAGE_KEYS.noteListLayout, JSON.stringify(all))
  } catch {
    // Storage may be unavailable; the in-memory choice still applies.
  }
}

export function useNoteListLayout(selection: SidebarSelection): [NoteListLayout, () => void] {
  const key = noteListLayoutKey(selection)
  const [state, setState] = useState<{ key: string; layout: NoteListLayout }>(() => ({ key, layout: readNoteListLayout(key) }))
  const layout = state.key === key ? state.layout : readNoteListLayout(key)
  const toggle = useCallback(() => {
    const next: NoteListLayout = readNoteListLayout(key) === 'table' ? 'list' : 'table'
    writeNoteListLayout(key, next)
    setState({ key, layout: next })
  }, [key])
  return [layout, toggle]
}
