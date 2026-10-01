import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import { addEntryWithMock, persistNewNote } from '../hooks/noteCreationPersistence'
import { planNewNoteCreation, resolveTemplate } from '../hooks/noteCreationModel'
import { persistContent } from '../hooks/useSaveNote'
import { cacheNoteContent } from '../hooks/tabContentCache'
import type { VaultEntry } from '../types'
import { appendCaptureBullet, formatCaptureBullet } from './quickCapture'
import { findTodayJournal, todayJournalTitle } from './todayJournal'

export interface QuickCaptureJournalDeps {
  entries: VaultEntry[]
  vaultPath: string
  /** Paths currently open in the editor; their pending edits are flushed first. */
  openPaths: readonly string[]
  flushBeforeWrite?: (path: string) => Promise<void> | void
  addEntry: (entry: VaultEntry) => void
  removeEntry: (path: string) => void
  updateEntry: (path: string, patch: Partial<VaultEntry>) => void
  updateTabContent: (path: string, content: string) => void
  addPendingSave?: (path: string) => void
  removePendingSave?: (path: string) => void
  loadModifiedFiles?: () => Promise<unknown>
}

export type QuickCaptureResult =
  | { status: 'appended' | 'created'; entry: VaultEntry }
  | { status: 'empty' }
  | { status: 'blocked'; message: string }

function readNoteContent(path: string): Promise<string> {
  return isTauri()
    ? invoke<string>('get_note_content', { path })
    : mockInvoke<string>('get_note_content', { path })
}

async function appendToExisting(entry: VaultEntry, bullet: string, deps: QuickCaptureJournalDeps): Promise<void> {
  // Flush the editor first so an open journal's unsaved typing isn't overwritten.
  if (deps.openPaths.includes(entry.path)) await deps.flushBeforeWrite?.(entry.path)
  const current = await readNoteContent(entry.path)
  const next = appendCaptureBullet(current, bullet)
  await persistContent(entry.path, next)
  cacheNoteContent(entry.path, next)
  deps.updateTabContent(entry.path, next)
  deps.updateEntry(entry.path, { modifiedAt: Math.floor(Date.now() / 1000) })
}

async function createWithCapture(
  bullet: string,
  now: Date,
  deps: QuickCaptureJournalDeps,
): Promise<QuickCaptureResult> {
  const title = todayJournalTitle(now)
  const template = resolveTemplate({ entries: deps.entries, typeName: 'Journal' })
  const plan = planNewNoteCreation({ entries: deps.entries, title, type: 'Journal', vaultPath: deps.vaultPath, template })
  if (plan.status === 'blocked') return { status: 'blocked', message: plan.message }

  const { entry } = plan.resolved
  const content = appendCaptureBullet(plan.resolved.content, bullet)
  addEntryWithMock(entry, content, deps.addEntry)
  deps.addPendingSave?.(entry.path)
  try {
    await persistNewNote(entry.path, content)
    cacheNoteContent(entry.path, content)
  } catch (error) {
    deps.removeEntry(entry.path)
    throw error
  } finally {
    deps.removePendingSave?.(entry.path)
  }
  return { status: 'created', entry }
}

/**
 * Appends a timestamped bullet to today's journal, creating the journal when
 * it doesn't exist yet. Never opens or switches tabs.
 */
export async function appendQuickCaptureToTodayJournal(
  text: string,
  deps: QuickCaptureJournalDeps,
  now: Date = new Date(),
): Promise<QuickCaptureResult> {
  const bullet = formatCaptureBullet(text, now)
  if (!bullet) return { status: 'empty' }

  const existing = findTodayJournal(deps.entries, now)
  let result: QuickCaptureResult
  if (existing) {
    await appendToExisting(existing, bullet, deps)
    result = { status: 'appended', entry: existing }
  } else {
    result = await createWithCapture(bullet, now, deps)
  }
  if (result.status !== 'blocked') void deps.loadModifiedFiles?.().catch(() => {})
  return result
}
