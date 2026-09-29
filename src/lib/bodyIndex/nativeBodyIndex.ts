import { invoke } from '../tauriRuntime'
import type { BodyIndex } from './bodyIndex'
import type { Tag, TagSnapshot } from './bodyIndexCore'
import { getTagSnapshot, publishTagSnapshot } from './tagSnapshot'

/**
 * The same BodyIndex surface, answered by the SQLite index in Rust. Nothing
 * is read in the webview: `index_refresh` diffs the vault by mtime on the
 * Rust side and re-reads only what changed, then `index_tags` publishes the
 * tag snapshot the sidebar already subscribes to. Mentions are an FTS5
 * phrase query. Saves and watcher reloads both end in a refresh.
 */
const REFRESH_COALESCE_MS = 300

export function createNativeBodyIndex(): BodyIndex & { setVaultPath(path: string | null): void } {
  let vaultPath: string | null = null
  let disposed = false
  let timer: number | null = null
  let inFlight: Promise<void> | null = null
  let resolveReady: () => void = () => {}
  const ready = new Promise<void>((resolve) => { resolveReady = resolve })

  const refresh = async (): Promise<void> => {
    const path = vaultPath
    if (!path || disposed) return
    try {
      await invoke('index_refresh', { vaultPath: path })
      const snapshot = await invoke<TagSnapshot | null | undefined>('index_tags', { vaultPath: path })
      if (disposed || vaultPath !== path) return
      // A malformed reply must never poison the sidebar; keep the last good snapshot.
      if (!snapshot || !Array.isArray(snapshot.tags)) return
      publishTagSnapshot(snapshot)
      resolveReady()
    } catch (error) {
      console.warn('[index] refresh failed:', error)
    }
  }

  const refreshSoon = () => {
    if (timer !== null) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      timer = null
      inFlight = (inFlight ?? Promise.resolve()).then(refresh)
    }, REFRESH_COALESCE_MS)
  }

  return {
    ready,
    setVaultPath(path) {
      if (path === vaultPath) return
      vaultPath = path
      publishTagSnapshot({ version: 0, tags: [] })
    },
    update() { refreshSoon() },
    remove() { refreshSoon() },
    async rebuild() { await refresh() },
    async sync() { await refresh() },
    tagsFor(path: string): Tag[] {
      return getTagSnapshot().tags.filter((record) => record.paths.includes(path)).map((record) => record.tag)
    },
    pathsWithTag(tag: Tag): string[] {
      return [...(getTagSnapshot().tags.find((record) => record.tag === tag)?.paths ?? [])]
    },
    allTags() {
      return getTagSnapshot().tags.map(({ tag, count }) => ({ tag, count }))
    },
    async pathsMentioning(phrase: string, limit = 100): Promise<string[]> {
      if (!vaultPath) return []
      return invoke<string[]>('index_mentions', { vaultPath, phrase, limit })
    },
    size() {
      const paths = new Set<string>()
      for (const record of getTagSnapshot().tags) for (const path of record.paths) paths.add(path)
      return paths.size
    },
    dispose() {
      disposed = true
      if (timer !== null) window.clearTimeout(timer)
    },
  }
}

