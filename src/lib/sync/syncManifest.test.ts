import { describe, expect, it, vi } from 'vitest'
import { conflictCopyPath, fetchSyncManifest, planSync } from './syncManifest'

vi.mock('../tauriRuntime', () => ({
  invoke: vi.fn(async (command: string, args: Record<string, unknown>) => {
    if (command === 'index_manifest') return [{ path: 'a.md', mtime: 1, size: 2, hash: 'h' }]
    if (command === 'sync_plan') return { pull: [], push: Object.keys(args), conflicts: [], delete_local: [], delete_remote: [] }
    throw new Error(command)
  }),
}))

describe('syncManifest', () => {
  it('fetches the manifest and asks the planner, passing base as null when absent', async () => {
    await expect(fetchSyncManifest('/v')).resolves.toEqual([{ path: 'a.md', mtime: 1, size: 2, hash: 'h' }])
    const plan = await planSync([], [])
    expect(plan.push).toEqual(['local', 'remote', 'base'])
  })

  it('names a conflict copy after the device and the minute', () => {
    const at = new Date(Date.UTC(2026, 8, 29, 14, 5))
    expect(conflictCopyPath('journal/today.md', 'iPhone', at)).toBe('journal/today (iPhone 2026-09-29 14.05).md')
    expect(conflictCopyPath('no-ext', 'Mac', at)).toBe('no-ext (Mac 2026-09-29 14.05)')
  })
})
