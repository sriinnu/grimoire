import { useMemo } from 'react'
import type { useTagSnapshot } from '../lib/bodyIndex/tagSnapshot'
import type { SidebarSelection, VaultEntry, ViewFile } from '../types'
import type { NoteListItem } from '../utils/ai-context'
import { filterEntries, filterInboxEntries } from '../utils/noteListHelpers'

/** The notes the AI panel may talk about: whatever the current list shows. */
export function useAiNoteList({
  entries,
  views,
  selection,
  inboxPeriod,
  tagSnapshot,
}: {
  entries: VaultEntry[]
  views: ViewFile[]
  selection: SidebarSelection
  inboxPeriod: Parameters<typeof filterInboxEntries>[1]
  tagSnapshot: ReturnType<typeof useTagSnapshot>
}): NoteListItem[] {
  return useMemo(() => {
    const isInbox = selection.kind === 'filter' && selection.filter === 'inbox'
    const filtered = isInbox ? filterInboxEntries(entries, inboxPeriod) : filterEntries(entries, selection, undefined, views)
    return filtered.map((e) => ({ path: e.path, title: e.title, type: e.isA ?? 'Note' }))
  // eslint-disable-next-line react-hooks/exhaustive-deps -- tag selections re-filter when the index publishes
  }, [entries, views, selection, inboxPeriod, tagSnapshot])
}
