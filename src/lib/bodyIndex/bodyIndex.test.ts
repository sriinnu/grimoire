import { afterEach, describe, expect, it, vi } from 'vitest'
import type { VaultEntry } from '../../types'
import { makeEntry } from '../../test-utils/noteListTestUtils'
import { createBodyIndex, resetBodyIndexForTests } from './bodyIndex'
import type { WorkerRequest, WorkerResponse } from './bodyIndexProtocol'
import { createBodyIndexWorkerHandler } from './bodyIndexWorkerHandler'
import { getTagSnapshot, pathsWithTagSync, resetTagSnapshotForTests } from './tagSnapshot'

const CONTENT: Record<string, string> = {
  '/vault/a.md': '---\ntags: [alpha]\n---\n# A\n\nMentions the Test Project.',
  '/vault/b.md': '# B\n\n#beta and #alpha/deep',
  '/vault/c.md': '# C\n\nno tags here',
}

function entry(path: string, modifiedAt = 1): VaultEntry {
  return makeEntry({ path, filename: path.split('/').pop() ?? path, title: path, modifiedAt })
}

/** A Worker stand-in that runs the real handler synchronously on the same thread. */
class FakeWorker {
  onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null
  terminated = false
  private handle = createBodyIndexWorkerHandler((message) => {
    this.onmessage?.({ data: message } as MessageEvent<WorkerResponse>)
  })
  postMessage(message: WorkerRequest) { this.handle(message) }
  terminate() { this.terminated = true }
}

afterEach(() => {
  resetBodyIndexForTests()
  resetTagSnapshotForTests()
  vi.useRealTimers()
})

describe('createBodyIndex (in-thread fallback)', () => {
  function build() {
    const loads: string[] = []
    const index = createBodyIndex({
      createWorker: () => null,
      loadContent: async (path) => {
        loads.push(path)
        return CONTENT[path] ?? ''
      },
      loadAllContent: async () => null,
      batchSize: 2,
    })
    return { index, loads }
  }

  it('rebuilds from entries, publishes the tag snapshot, and resolves ready', async () => {
    const { index, loads } = build()
    await index.rebuild([entry('/vault/a.md'), entry('/vault/b.md'), entry('/vault/c.md')])
    await index.ready
    expect(loads.sort()).toEqual(['/vault/a.md', '/vault/b.md', '/vault/c.md'])
    expect(index.size()).toBe(3)
    expect(index.allTags()).toEqual([
      { tag: 'alpha', count: 2 },
      { tag: 'alpha/deep', count: 1 },
      { tag: 'beta', count: 1 },
    ])
    expect(index.pathsWithTag('alpha')).toEqual(['/vault/a.md', '/vault/b.md'])
    expect(index.tagsFor('/vault/b.md')).toEqual(['alpha', 'alpha/deep', 'beta'])
    expect([...pathsWithTagSync('beta')]).toEqual(['/vault/b.md'])
  })

  it('sync re-reads only changed entries and drops missing ones', async () => {
    const { index, loads } = build()
    await index.rebuild([entry('/vault/a.md'), entry('/vault/b.md')])
    loads.length = 0
    CONTENT['/vault/b.md'] = '# B\n\n#gamma'
    await index.sync([entry('/vault/a.md'), entry('/vault/b.md', 2)])
    expect(loads).toEqual(['/vault/b.md'])
    expect(index.allTags()).toEqual([{ tag: 'alpha', count: 1 }, { tag: 'gamma', count: 1 }])
    await index.sync([entry('/vault/a.md')])
    expect(index.allTags()).toEqual([{ tag: 'alpha', count: 1 }])
    expect(index.size()).toBe(1)
    CONTENT['/vault/b.md'] = '# B\n\n#beta and #alpha/deep'
  })

  it('update and remove apply immediately without a file read', async () => {
    const { index, loads } = build()
    await index.rebuild([])
    index.update('/vault/x.md', '#fresh')
    expect(loads).toEqual([])
    expect(index.pathsWithTag('fresh')).toEqual(['/vault/x.md'])
    index.remove('/vault/x.md')
    expect(index.allTags()).toEqual([])
  })

  it('skips non-markdown entries and tolerates a failing read', async () => {
    const index = createBodyIndex({
      createWorker: () => null,
      loadContent: async (path) => {
        if (path.endsWith('bad.md')) throw new Error('unreadable')
        return CONTENT[path] ?? ''
      },
      loadAllContent: async () => null,
    })
    await index.rebuild([
      entry('/vault/a.md'),
      entry('/vault/bad.md'),
      { ...entry('/vault/img.png'), fileKind: 'binary' },
    ])
    expect(index.size()).toBe(1)
    expect(index.allTags()).toEqual([{ tag: 'alpha', count: 1 }])
  })

  it('answers mentions through the backend', async () => {
    const { index } = build()
    await index.rebuild([entry('/vault/a.md'), entry('/vault/b.md')])
    await expect(index.pathsMentioning('test project')).resolves.toEqual(['/vault/a.md'])
  })
})

describe('createBodyIndex (worker protocol)', () => {
  it('drives the worker, receives coalesced snapshots, and terminates on dispose', async () => {
    vi.useFakeTimers()
    const worker = new FakeWorker()
    const index = createBodyIndex({
      createWorker: () => worker as unknown as Worker,
      loadContent: async (path) => CONTENT[path] ?? '',
      loadAllContent: async () => CONTENT,
      batchSize: 1,
    })
    const rebuilt = index.rebuild([entry('/vault/a.md'), entry('/vault/b.md')])
    await vi.runAllTimersAsync()
    await rebuilt
    expect(getTagSnapshot().tags.map((record) => record.tag)).toEqual(['alpha', 'alpha/deep', 'beta'])
    const mentions = index.pathsMentioning('test project')
    await expect(mentions).resolves.toEqual(['/vault/a.md'])
    index.dispose()
    expect(worker.terminated).toBe(true)
  })
})
