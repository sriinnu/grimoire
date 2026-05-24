import { useMemo } from 'react'
import type { VaultEntry } from '../types'
import {
  buildContextSnapshot,
  collectLinkedEntries,
  type NoteListItem,
} from '../utils/ai-context'
import { buildAgentGraphContext } from '../utils/agentGraphContext'
import { extractInlineWikilinkReferences } from './inlineWikilinkText'

interface UseAiPanelContextSnapshotArgs {
  activeEntry?: VaultEntry | null
  activeNoteContent?: string | null
  entries?: VaultEntry[]
  input: string
  openTabs?: VaultEntry[]
  noteList?: NoteListItem[]
  noteListFilter?: { type: string | null; query: string }
}

export function useAiPanelContextSnapshot({
  activeEntry,
  activeNoteContent,
  entries,
  input,
  openTabs,
  noteList,
  noteListFilter,
}: UseAiPanelContextSnapshotArgs) {
  const linkedEntries = useMemo(() => {
    if (!activeEntry || !entries) return []
    return collectLinkedEntries(activeEntry, entries)
  }, [activeEntry, entries])

  const draftReferences = useMemo(
    () => extractInlineWikilinkReferences(input, entries ?? []),
    [entries, input],
  )
  const graphContext = useMemo(() => {
    if (!activeEntry || !entries) return undefined
    return buildAgentGraphContext({ activeEntry, entries })
  }, [activeEntry, entries])

  const contextPrompt = useMemo(() => {
    if (!activeEntry || !entries) return undefined
    return buildContextSnapshot({
      activeEntry,
      activeNoteContent: activeNoteContent ?? undefined,
      openTabs,
      noteList,
      noteListFilter,
      entries,
      graphContext,
      references: draftReferences.length > 0 ? draftReferences : undefined,
    })
  }, [activeEntry, activeNoteContent, draftReferences, entries, graphContext, noteList, noteListFilter, openTabs])

  return { linkedEntries, contextPrompt }
}
