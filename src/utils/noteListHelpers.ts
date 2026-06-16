import type { VaultEntry, SidebarSelection, InboxPeriod, ViewFile } from '../types'
import { evaluateView } from './viewFilters'

export type NoteListFilter = 'open' | 'archived'
export type NoteFileScope = 'markdown' | 'other' | 'all'

export const DEFAULT_NOTE_FILE_SCOPE: NoteFileScope = 'markdown'

export interface RelationshipGroup {
  label: string
  entries: VaultEntry[]
}

export function relativeDate(ts: number | null): string {
  if (!ts) return ''
  const now = Math.floor(Date.now() / 1000)
  const diff = now - ts
  if (diff < 0) {
    const date = new Date(ts * 1000)
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`
  const date = new Date(ts * 1000)
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function getDisplayDate(entry: VaultEntry): number | null {
  return entry.modifiedAt ?? entry.createdAt
}

export function formatSubtitle(entry: VaultEntry): string {
  const parts: string[] = []
  const date = getDisplayDate(entry)
  if (date) parts.push(relativeDate(date))
  if (entry.wordCount > 0) {
    parts.push(`${entry.wordCount.toLocaleString()} words`)
  } else {
    parts.push('Empty')
  }
  if (entry.outgoingLinks.length > 0) {
    parts.push(`${entry.outgoingLinks.length} ${entry.outgoingLinks.length === 1 ? 'link' : 'links'}`)
  }
  return parts.join(' \u00b7 ')
}

function wasCreatedBeforeLastModification(entry: VaultEntry): boolean {
  return !!(entry.createdAt && entry.modifiedAt && entry.createdAt !== entry.modifiedAt)
}

export function formatSearchSubtitle(entry: VaultEntry): string {
  const parts: string[] = []
  const modified = entry.modifiedAt ?? entry.createdAt
  if (modified) parts.push(relativeDate(modified))
  if (wasCreatedBeforeLastModification(entry)) {
    parts.push(`Created ${relativeDate(entry.createdAt!)}`)
  }
  if (entry.wordCount > 0) {
    parts.push(`${entry.wordCount.toLocaleString()} words`)
  } else {
    parts.push('Empty')
  }
  if (entry.outgoingLinks.length > 0) {
    parts.push(`${entry.outgoingLinks.length} ${entry.outgoingLinks.length === 1 ? 'link' : 'links'}`)
  }
  return parts.join(' \u00b7 ')
}

const isActive = (e: VaultEntry) => !e.archived
const isMarkdown = (e: VaultEntry) => e.fileKind === 'markdown' || !e.fileKind
const ATTACHMENTS_FOLDER = 'attachments'

function matchesType(entry: VaultEntry, type: string): boolean {
  return entry.isA?.trim().toLowerCase() === type.trim().toLowerCase()
}

function applySubFilter(entries: VaultEntry[], subFilter: NoteListFilter): VaultEntry[] {
  if (subFilter === 'archived') return entries.filter((e) => e.archived)
  return entries.filter(isActive)
}

function matchesFileScope(entry: VaultEntry, scope: NoteFileScope): boolean {
  if (scope === 'all') return true
  if (scope === 'other') return !isMarkdown(entry)
  return isMarkdown(entry)
}

/** Filter entries to the requested file scope for code-project folder views. */
export function filterEntriesByFileScope(entries: VaultEntry[], scope: NoteFileScope): VaultEntry[] {
  return entries.filter((entry) => matchesFileScope(entry, scope))
}

function isInFolder(entryPath: string, folderRelPath: string): boolean {
  const needle = '/' + folderRelPath + '/'
  return entryPath.includes(needle) || entryPath.startsWith(folderRelPath + '/')
}

export function isAllNotesEntry(entry: VaultEntry): boolean {
  return isMarkdown(entry) && !isInFolder(entry.path, ATTACHMENTS_FOLDER)
}

function filterViewEntries(entries: VaultEntry[], filename: string, views?: ViewFile[]): VaultEntry[] {
  const view = views?.find((candidate) => candidate.filename === filename)
  if (!view) return []
  return evaluateView(view.definition, entries.filter(isMarkdown))
}

function filterFolderEntries(
  entries: VaultEntry[],
  folderPath: string,
  subFilter?: NoteListFilter,
  fileScope: NoteFileScope = DEFAULT_NOTE_FILE_SCOPE,
): VaultEntry[] {
  const folderEntries = filterEntriesByFileScope(
    entries.filter((entry) => isInFolder(entry.path, folderPath)),
    fileScope,
  )
  return subFilter ? applySubFilter(folderEntries, subFilter) : folderEntries.filter(isActive)
}

function filterSectionGroupEntries(entries: VaultEntry[], type: string, subFilter?: NoteListFilter): VaultEntry[] {
  const typeEntries = entries.filter((entry) => isAllNotesEntry(entry) && matchesType(entry, type))
  return subFilter ? applySubFilter(typeEntries, subFilter) : typeEntries.filter(isActive)
}

function filterTopLevelEntries(
  entries: VaultEntry[],
  selection: Extract<SidebarSelection, { kind: 'filter' }>,
  subFilter?: NoteListFilter,
): VaultEntry[] {
  const filterableEntries = selection.filter === 'all'
    ? entries.filter(isAllNotesEntry)
    : entries.filter(isMarkdown)
  if (selection.filter === 'all' && subFilter) return applySubFilter(filterableEntries, subFilter)
  return filterByFilterType(filterableEntries, selection.filter)
}

function filterByKind(
  entries: VaultEntry[],
  selection: SidebarSelection,
  subFilter?: NoteListFilter,
  views?: ViewFile[],
  fileScope: NoteFileScope = DEFAULT_NOTE_FILE_SCOPE,
): VaultEntry[] {
  if (selection.kind === 'dashboard') return []
  if (selection.kind === 'entity') return []
  if (selection.kind === 'view') return filterViewEntries(entries, selection.filename, views)
  if (selection.kind === 'folder') return filterFolderEntries(entries, selection.path, subFilter, fileScope)
  if (selection.kind === 'sectionGroup') return filterSectionGroupEntries(entries, selection.type, subFilter)
  if (selection.kind === 'filter') return filterTopLevelEntries(entries, selection, subFilter)
  return []
}

function filterByFilterType(entries: VaultEntry[], filter: string): VaultEntry[] {
  if (filter === 'all') return entries.filter(isActive)
  if (filter === 'archived') return entries.filter((e) => e.archived)
  if (filter === 'favorites') return entries.filter((e) => e.favorite && !e.archived)
  if (filter === 'pulse') return []
  return []
}

export function filterEntries(
  entries: VaultEntry[],
  selection: SidebarSelection,
  subFilter?: NoteListFilter,
  views?: ViewFile[],
  fileScope: NoteFileScope = DEFAULT_NOTE_FILE_SCOPE,
): VaultEntry[] {
  return filterByKind(entries, selection, subFilter, views, fileScope)
}

/** Count notes per sub-filter for a given type. */
export function countByFilter(entries: VaultEntry[], type: string): Record<NoteListFilter, number> {
  let open = 0, archived = 0
  for (const e of entries) {
    if (!isAllNotesEntry(e) || !matchesType(e, type)) continue
    if (e.archived) archived++
    else open++
  }
  return { open, archived }
}

function countEntriesByArchiveStatus(entries: VaultEntry[]): Record<NoteListFilter, number> {
  let open = 0, archived = 0
  for (const entry of entries) {
    if (entry.archived) archived++
    else open++
  }
  return { open, archived }
}

/** Count notes per sub-filter across all entries (no type filter). */
export function countAllByFilter(entries: VaultEntry[]): Record<NoteListFilter, number> {
  return countEntriesByArchiveStatus(entries.filter(isMarkdown))
}

/** Count folder entries by archive status within the requested file scope. */
export function countFolderByFilter(
  entries: VaultEntry[],
  folderPath: string,
  fileScope: NoteFileScope = DEFAULT_NOTE_FILE_SCOPE,
): Record<NoteListFilter, number> {
  return countEntriesByArchiveStatus(
    filterEntriesByFileScope(
      entries.filter((entry) => isInFolder(entry.path, folderPath)),
      fileScope,
    ),
  )
}

/** Count file-scope options for the current folder and archive filter. */
export function countFolderFileScopes(
  entries: VaultEntry[],
  folderPath: string,
  subFilter: NoteListFilter,
): Record<NoteFileScope, number> {
  const folderEntries = applySubFilter(
    entries.filter((entry) => isInFolder(entry.path, folderPath)),
    subFilter,
  )
  return {
    markdown: folderEntries.filter((entry) => matchesFileScope(entry, 'markdown')).length,
    other: folderEntries.filter((entry) => matchesFileScope(entry, 'other')).length,
    all: folderEntries.length,
  }
}

/** Count Pages-eligible documents per sub-filter, excluding files under attachments/. */
export function countAllNotesByFilter(entries: VaultEntry[]): Record<NoteListFilter, number> {
  return countEntriesByArchiveStatus(entries.filter(isAllNotesEntry))
}

// --- Inbox ---

/** Check if entry belongs in the Inbox (markdown only, not organized, not archived, not a Type). */
export function isInboxEntry(entry: VaultEntry): boolean {
  if (!isMarkdown(entry)) return false
  if (entry.archived) return false
  if (entry.isA === 'Type') return false
  return !entry.organized
}

const INBOX_PERIOD_DAYS: Record<InboxPeriod, number> = {
  week: 7, month: 30, quarter: 90, all: Infinity,
}

/** Filter entries for the Inbox view: not organized, within the given time period, sorted by createdAt desc. */
export function filterInboxEntries(entries: VaultEntry[], period: InboxPeriod): VaultEntry[] {
  const now = Math.floor(Date.now() / 1000)
  const cutoff = period === 'all' ? 0 : now - INBOX_PERIOD_DAYS[period] * 86400

  return entries
    .filter((e) => isInboxEntry(e) && (e.createdAt ?? 0) >= cutoff)
    .sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0))
}

/** Count inbox entries per period. */
export function countInboxByPeriod(entries: VaultEntry[]): Record<InboxPeriod, number> {
  const inbox = entries.filter((e) => isInboxEntry(e))
  const now = Math.floor(Date.now() / 1000)

  let week = 0, month = 0, quarter = 0
  for (const e of inbox) {
    const age = now - (e.createdAt ?? 0)
    if (age <= 7 * 86400) week++
    if (age <= 30 * 86400) month++
    if (age <= 90 * 86400) quarter++
  }

  return { week, month, quarter, all: inbox.length }
}
