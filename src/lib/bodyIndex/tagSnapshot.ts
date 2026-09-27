import { useSyncExternalStore } from 'react'
import { EMPTY_TAG_SNAPSHOT, normalizeTag, type TagSnapshot } from './bodyIndexCore'

/**
 * The main thread's read model of the body index: every tag with its count
 * and paths. Small enough to hold whole, so the sidebar and the note list can
 * read it synchronously; the worker owns the word index and pushes a new
 * snapshot after each batch of changes.
 */
type Listener = () => void

let current: TagSnapshot = EMPTY_TAG_SNAPSHOT
let pathsByTag = new Map<string, ReadonlySet<string>>()
const listeners = new Set<Listener>()
const EMPTY_PATHS: ReadonlySet<string> = new Set()

export function publishTagSnapshot(snapshot: TagSnapshot): void {
  current = snapshot
  pathsByTag = new Map(snapshot.tags.map((record) => [record.tag, new Set(record.paths)]))
  listeners.forEach((listener) => listener())
}

export function getTagSnapshot(): TagSnapshot {
  return current
}

export function subscribeTagSnapshot(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Paths carrying the tag or any tag nested under it. */
export function pathsWithTagSync(tag: string): ReadonlySet<string> {
  const normalized = normalizeTag(tag)
  if (!normalized) return EMPTY_PATHS
  return pathsByTag.get(normalized) ?? EMPTY_PATHS
}

export function useTagSnapshot(): TagSnapshot {
  return useSyncExternalStore(subscribeTagSnapshot, getTagSnapshot, getTagSnapshot)
}

/** Test seam. */
export function resetTagSnapshotForTests(): void {
  publishTagSnapshot(EMPTY_TAG_SNAPSHOT)
}
