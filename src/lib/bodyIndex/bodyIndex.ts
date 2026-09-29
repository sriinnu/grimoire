import { invoke } from '../tauriRuntime'
import { isTauri, mockInvoke } from '../../mock-tauri'
import type { VaultEntry } from '../../types'
import { BodyIndexStore, type Tag, type TagSnapshot } from './bodyIndexCore'
import type { IndexedNoteInput, WorkerRequest, WorkerResponse } from './bodyIndexProtocol'
import { getTagSnapshot, publishTagSnapshot } from './tagSnapshot'
import { createNativeBodyIndex } from './nativeBodyIndex'

/**
 * Body index: which notes carry which tags, and which notes mention a phrase.
 * Built off the boot path in a worker; the main thread keeps only the tag
 * snapshot. Where workers are unavailable the same store runs in-thread.
 */
export interface BodyIndex {
  /** Resolves once the first sync has finished. */
  ready: Promise<void>
  update(path: string, content: string): void
  remove(path: string): void
  /** Forget everything and index the given entries from scratch. */
  rebuild(entries: readonly VaultEntry[]): Promise<void>
  /** Index only entries whose path or modifiedAt changed since the last sync; drop the rest. */
  sync(entries: readonly VaultEntry[]): Promise<void>
  tagsFor(path: string): Tag[]
  pathsWithTag(tag: Tag): string[]
  allTags(): Array<{ tag: Tag; count: number }>
  pathsMentioning(phrase: string, limit?: number): Promise<string[]>
  /** Number of notes currently indexed. */
  size(): number
  dispose(): void
  /** The native index is per vault; the worker index does not need this. */
  setVaultPath?(path: string | null): void
}

export interface BodyIndexOptions {
  loadContent?: (path: string) => Promise<string>
  /** Optional one-shot loader for every note; used by the browser mock build. */
  loadAllContent?: () => Promise<Record<string, string> | null>
  createWorker?: () => Worker | null
  batchSize?: number
}

type EntryLike = Pick<VaultEntry, 'path' | 'modifiedAt' | 'fileKind'>

const DEFAULT_BATCH = 8

function isIndexable(entry: EntryLike): boolean {
  return !entry.fileKind || entry.fileKind === 'markdown'
}

function fingerprint(entry: EntryLike): string {
  return `${entry.modifiedAt ?? 'x'}`
}

async function defaultLoadContent(path: string): Promise<string> {
  return isTauri()
    ? invoke<string>('get_note_content', { path })
    : mockInvoke<string>('get_note_content', { path })
}

async function defaultLoadAllContent(): Promise<Record<string, string> | null> {
  if (isTauri()) return null
  try {
    return await mockInvoke<Record<string, string>>('get_all_content')
  } catch {
    return null
  }
}

function defaultCreateWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null
  try {
    return new Worker(new URL('./bodyIndex.worker.ts', import.meta.url), { type: 'module' })
  } catch {
    return null
  }
}

/** Where the index lives: a worker, or the same store in-thread. */
interface IndexBackend {
  update(notes: IndexedNoteInput[]): void
  remove(paths: string[]): void
  clear(): void
  flush(): Promise<void>
  mentions(phrase: string, limit?: number): Promise<string[]>
  dispose(): void
}

function inThreadBackend(): IndexBackend {
  const store = new BodyIndexStore()
  const publish = () => publishTagSnapshot(store.snapshot())
  return {
    update(notes) {
      for (const note of notes) store.update(note.path, note.content)
      publish()
    },
    remove(paths) {
      for (const path of paths) store.remove(path)
      publish()
    },
    clear() {
      store.clear()
      publish()
    },
    flush: () => Promise.resolve(),
    mentions: (phrase, limit) => Promise.resolve(store.pathsMentioning(phrase, limit)),
    dispose() {},
  }
}

function workerBackend(worker: Worker): IndexBackend {
  let nextId = 1
  const pending = new Map<number, (value: unknown) => void>()
  const send = (message: WorkerRequest) => worker.postMessage(message)
  const request = <T,>(build: (id: number) => WorkerRequest): Promise<T> => new Promise((resolve) => {
    const id = nextId++
    pending.set(id, resolve as (value: unknown) => void)
    send(build(id))
  })
  worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
    const message = event.data
    if (message.type === 'snapshot') {
      publishTagSnapshot(message.snapshot)
      return
    }
    const resolve = pending.get(message.id)
    if (!resolve) return
    pending.delete(message.id)
    resolve(message.type === 'mentions' ? message.paths : undefined)
  }
  return {
    update: (notes) => send({ type: 'update', notes }),
    remove: (paths) => send({ type: 'remove', paths }),
    clear: () => send({ type: 'clear' }),
    flush: () => request<void>((id) => ({ type: 'flush', id })),
    mentions: (phrase, limit) => request<string[]>((id) => ({ type: 'mentions', id, phrase, limit })),
    dispose() {
      worker.terminate()
      pending.clear()
    },
  }
}

export function createBodyIndex(options: BodyIndexOptions = {}): BodyIndex {
  const loadContent = options.loadContent ?? defaultLoadContent
  const loadAllContent = options.loadAllContent ?? defaultLoadAllContent
  const batchSize = options.batchSize ?? DEFAULT_BATCH
  const worker = (options.createWorker ?? defaultCreateWorker)()
  const backend = worker ? workerBackend(worker) : inThreadBackend()
  const indexed = new Map<string, string>()
  let resolveReady: () => void = () => {}
  const ready = new Promise<void>((resolve) => { resolveReady = resolve })
  let disposed = false

  async function indexPaths(paths: string[], byPath: Map<string, EntryLike>): Promise<void> {
    const all = paths.length > batchSize ? await loadAllContent() : null
    for (let start = 0; start < paths.length && !disposed; start += batchSize) {
      const slice = paths.slice(start, start + batchSize)
      const loaded = await Promise.all(slice.map(async (path) => {
        try {
          const content = all?.[path] ?? await loadContent(path)
          return { path, content }
        } catch {
          return null
        }
      }))
      const notes = loaded.filter((note): note is IndexedNoteInput => note !== null)
      if (notes.length > 0) backend.update(notes)
      for (const note of notes) {
        const entry = byPath.get(note.path)
        if (entry) indexed.set(note.path, fingerprint(entry))
      }
    }
  }

  async function sync(entries: readonly VaultEntry[]): Promise<void> {
    const byPath = new Map<string, EntryLike>()
    for (const entry of entries) if (isIndexable(entry)) byPath.set(entry.path, entry)
    const stale = [...indexed.keys()].filter((path) => !byPath.has(path))
    if (stale.length > 0) {
      backend.remove(stale)
      for (const path of stale) indexed.delete(path)
    }
    const changed = [...byPath.values()]
      .filter((entry) => indexed.get(entry.path) !== fingerprint(entry))
      .map((entry) => entry.path)
    await indexPaths(changed, byPath)
    await backend.flush()
    resolveReady()
  }

  return {
    ready,
    update(path, content) {
      backend.update([{ path, content }])
      // Content from a save is fresher than any listed modifiedAt; a later sync re-checks.
      indexed.set(path, `saved:${Date.now()}`)
    },
    remove(path) {
      backend.remove([path])
      indexed.delete(path)
    },
    async rebuild(entries) {
      backend.clear()
      indexed.clear()
      await sync(entries)
    },
    sync,
    tagsFor(path) {
      return getTagSnapshot().tags.filter((record) => record.paths.includes(path)).map((record) => record.tag)
    },
    pathsWithTag(tag) {
      return [...(getTagSnapshot().tags.find((record) => record.tag === tag)?.paths ?? [])]
    },
    allTags() {
      return getTagSnapshot().tags.map(({ tag, count }) => ({ tag, count }))
    },
    pathsMentioning: (phrase, limit) => backend.mentions(phrase, limit),
    size: () => indexed.size,
    dispose() {
      disposed = true
      backend.dispose()
      indexed.clear()
    },
  }
}

let shared: BodyIndex | null = null

/** The app-wide index. Created on first use, never on the boot path. */
export function getBodyIndex(): BodyIndex {
  shared ??= isTauri() ? createNativeBodyIndex() : createBodyIndex()
  return shared
}

/** Test seam: drop the shared instance. */
export function resetBodyIndexForTests(): void {
  shared?.dispose()
  shared = null
}

export type { TagSnapshot }
