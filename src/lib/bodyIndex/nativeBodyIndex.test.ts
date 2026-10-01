import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { getTagSnapshot, resetTagSnapshotForTests } from './tagSnapshot'

const calls: Array<{ command: string; args: Record<string, unknown> }> = []
let tagsReply: unknown = undefined
vi.mock('../tauriRuntime', () => ({
  invoke: vi.fn(async (command: string, args: Record<string, unknown>) => {
    calls.push({ command, args })
    if (command === 'index_refresh') return { indexed: 1, removed: 0, total: 3, elapsed_ms: 2 }
    if (command === 'index_tags') return tagsReply ?? { version: 7, tags: [{ tag: 'daily', count: 2, paths: ['/v/a.md', '/v/b.md'] }, { tag: 'project', count: 1, paths: ['/v/a.md'] }] }
    if (command === 'index_mentions') return ['/v/b.md']
    throw new Error(`unexpected ${command}`)
  }),
}))

describe('createNativeBodyIndex', () => {
  beforeEach(() => { calls.length = 0; resetTagSnapshotForTests(); vi.useFakeTimers() })
  afterEach(() => vi.useRealTimers())

  it('refreshes on the Rust side and publishes the tag snapshot', async () => {
    const { createNativeBodyIndex } = await import('./nativeBodyIndex')
    const index = createNativeBodyIndex()
    index.setVaultPath('/v')
    await index.rebuild([])
    expect(calls.map((call) => call.command)).toEqual(['index_refresh', 'index_tags'])
    expect(calls[0].args).toEqual({ vaultPath: '/v' })
    expect(getTagSnapshot().tags.map((record) => record.tag)).toEqual(['daily', 'project'])
    expect(index.tagsFor('/v/a.md')).toEqual(['daily', 'project'])
    expect(index.pathsWithTag('daily')).toEqual(['/v/a.md', '/v/b.md'])
    expect(index.allTags()).toEqual([{ tag: 'daily', count: 2 }, { tag: 'project', count: 1 }])
    expect(index.size()).toBe(2)
    await expect(index.pathsMentioning('Alpha', 5)).resolves.toEqual(['/v/b.md'])
    expect(calls.at(-1)).toEqual({ command: 'index_mentions', args: { vaultPath: '/v', phrase: 'Alpha', limit: 5 } })
  })

  it('coalesces saves into one refresh and does nothing without a vault', async () => {
    const { createNativeBodyIndex } = await import('./nativeBodyIndex')
    const index = createNativeBodyIndex()
    index.update('/v/a.md', 'x')
    await vi.advanceTimersByTimeAsync(400)
    expect(calls).toEqual([])
    index.setVaultPath('/v')
    index.update('/v/a.md', 'x')
    index.update('/v/b.md', 'y')
    index.remove('/v/c.md')
    await vi.advanceTimersByTimeAsync(400)
    expect(calls.filter((call) => call.command === 'index_refresh')).toHaveLength(1)
  })

  it('keeps the last good snapshot when the index answers with nothing', async () => {
    const { createNativeBodyIndex } = await import('./nativeBodyIndex')
    const index = createNativeBodyIndex()
    index.setVaultPath('/v')
    await index.rebuild([])
    expect(getTagSnapshot().tags).toHaveLength(2)
    tagsReply = null
    await index.rebuild([])
    expect(getTagSnapshot().tags).toHaveLength(2)
    tagsReply = undefined
  })
})
