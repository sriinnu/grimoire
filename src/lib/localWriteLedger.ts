/**
 * Which files Grimoire itself just wrote. The vault watcher sees every write,
 * including ours; this is how it tells a sync from the phone apart from the
 * save we made a moment ago.
 */
const WINDOW_MS = 2500
const recent = new Map<string, number>()

export function markLocalWrite(path: string, now = Date.now()): void {
  recent.set(path, now)
  if (recent.size > 256) {
    for (const [key, at] of recent) {
      if (now - at > WINDOW_MS) recent.delete(key)
    }
  }
}

export function wasWrittenLocally(path: string, now = Date.now()): boolean {
  const at = recent.get(path)
  if (at === undefined) return false
  if (now - at > WINDOW_MS) {
    recent.delete(path)
    return false
  }
  return true
}

export function resetLocalWriteLedgerForTests(): void {
  recent.clear()
}
