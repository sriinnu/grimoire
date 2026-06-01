import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { getNoteWindowParams, isNoteWindow } from '../utils/windowMode'
import {
  isNoActiveVaultSelectedError,
  isUnreadableNoteContentError,
} from './tabContentErrors'

type NotePath = VaultEntry['path']

interface NoteContentCacheEntry {
  path: NotePath
  promise: Promise<string>
  value: string | null
  byteSize: number
}

const prefetchCache = new Map<string, NoteContentCacheEntry>()
const contentSizeEncoder = typeof TextEncoder !== 'undefined' ? new TextEncoder() : null

export const NOTE_CONTENT_CACHE_LIMIT = 48
export const NOTE_CONTENT_ENTRY_MAX_BYTES = 256 * 1024
export const NOTE_CONTENT_CACHE_MAX_BYTES = 1024 * 1024

function measureNoteContentBytes(content: string): number {
  return contentSizeEncoder ? contentSizeEncoder.encode(content).byteLength : content.length
}

function getRetainedPrefetchCacheBytes(): number {
  let totalBytes = 0
  for (const entry of prefetchCache.values()) {
    totalBytes += entry.byteSize
  }
  return totalBytes
}

function dropOldestPrefetchEntry(): void {
  const oldestPath = prefetchCache.keys().next().value
  if (!oldestPath) return
  prefetchCache.delete(oldestPath)
}

function trimPrefetchCache(): void {
  while (
    prefetchCache.size > NOTE_CONTENT_CACHE_LIMIT
    || getRetainedPrefetchCacheBytes() > NOTE_CONTENT_CACHE_MAX_BYTES
  ) {
    if (prefetchCache.size === 0) return
    dropOldestPrefetchEntry()
  }
}

function rememberNoteContent(entry: NoteContentCacheEntry): NoteContentCacheEntry {
  const { path } = entry
  if (prefetchCache.has(path)) prefetchCache.delete(path)
  prefetchCache.set(path, entry)
  trimPrefetchCache()
  return entry
}

function retainResolvedNoteContent(entry: NoteContentCacheEntry, content: string): void {
  const byteSize = measureNoteContentBytes(content)
  if (byteSize > NOTE_CONTENT_ENTRY_MAX_BYTES) {
    prefetchCache.delete(entry.path)
    return
  }

  entry.value = content
  entry.byteSize = byteSize
  rememberNoteContent(entry)
}

function getNoteContentCommandPayload(path: string): { path: string; vaultPath?: string } {
  if (!isNoteWindow()) {
    return { path }
  }

  const noteWindowParams = getNoteWindowParams()
  return noteWindowParams
    ? { path, vaultPath: noteWindowParams.vaultPath }
    : { path }
}

function requestNoteContent({ path }: Pick<NoteContentCacheEntry, 'path'>): NoteContentCacheEntry {
  const cacheEntry: NoteContentCacheEntry = {
    path,
    promise: Promise.resolve(''),
    value: null,
    byteSize: 0,
  }
  const commandPayload = getNoteContentCommandPayload(path)
  const promise = (isTauri()
    ? invoke<string>('get_note_content', commandPayload)
    : mockInvoke<string>('get_note_content', commandPayload)
  )
    .then((content) => {
      retainResolvedNoteContent(cacheEntry, content)
      return content
    })
    .catch((err) => {
      prefetchCache.delete(path)
      throw err
    })

  cacheEntry.promise = promise
  return rememberNoteContent(cacheEntry)
}

/** Prefetches a note's content into the short-lived in-memory cache. */
export function prefetchNoteContent(path: string): void {
  if (prefetchCache.has(path)) return
  void requestNoteContent({ path }).promise.catch((error) => {
    if (isNoActiveVaultSelectedError(error) || isUnreadableNoteContentError(error)) return
    console.warn('Failed to prefetch note content:', error)
  })
}

/** Seeds the note-content cache with known content, usually after a save/create flow. */
export function cacheNoteContent(path: string, content: string): void {
  const byteSize = measureNoteContentBytes(content)
  if (byteSize > NOTE_CONTENT_ENTRY_MAX_BYTES) {
    prefetchCache.delete(path)
    return
  }

  rememberNoteContent({
    path,
    promise: Promise.resolve(content),
    value: content,
    byteSize,
  })
}

/** Clears all cached note content; call when vault content may have changed externally. */
export function clearPrefetchCache(): void {
  prefetchCache.clear()
}

/** Returns resolved cached note content without waiting for an in-flight request. */
export function getCachedNoteContent(path: string): string | null {
  return prefetchCache.get(path)?.value ?? null
}

/** Loads note content through the cache, or forces a fresh read when requested. */
export async function loadNoteContent(path: string, forceFresh = false): Promise<string> {
  if (forceFresh) return requestNoteContent({ path }).promise
  return prefetchCache.get(path)?.promise ?? requestNoteContent({ path }).promise
}
