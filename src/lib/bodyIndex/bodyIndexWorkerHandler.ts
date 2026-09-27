import { BodyIndexStore } from './bodyIndexCore'
import type { WorkerRequest, WorkerResponse } from './bodyIndexProtocol'

export const SNAPSHOT_COALESCE_MS = 30

/**
 * The worker's message loop, separated from the worker global so it can be
 * driven directly in tests. A rebuild sends hundreds of updates; snapshots are
 * coalesced so the sidebar hears about one change, not hundreds.
 */
export function createBodyIndexWorkerHandler(post: (message: WorkerResponse) => void) {
  const store = new BodyIndexStore()
  let snapshotTimer: ReturnType<typeof setTimeout> | null = null

  const postSnapshot = () => post({ type: 'snapshot', snapshot: store.snapshot() })

  const scheduleSnapshot = () => {
    if (snapshotTimer !== null) return
    snapshotTimer = setTimeout(() => {
      snapshotTimer = null
      postSnapshot()
    }, SNAPSHOT_COALESCE_MS)
  }

  return (message: WorkerRequest): void => {
    switch (message.type) {
      case 'update':
        for (const note of message.notes) store.update(note.path, note.content)
        scheduleSnapshot()
        break
      case 'remove':
        for (const path of message.paths) store.remove(path)
        scheduleSnapshot()
        break
      case 'clear':
        store.clear()
        scheduleSnapshot()
        break
      case 'flush':
        if (snapshotTimer !== null) {
          clearTimeout(snapshotTimer)
          snapshotTimer = null
        }
        postSnapshot()
        post({ type: 'flushed', id: message.id })
        break
      case 'mentions':
        post({ type: 'mentions', id: message.id, paths: store.pathsMentioning(message.phrase, message.limit) })
        break
    }
  }
}
