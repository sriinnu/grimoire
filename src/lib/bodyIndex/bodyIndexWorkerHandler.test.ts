import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { WorkerResponse } from './bodyIndexProtocol'
import { SNAPSHOT_COALESCE_MS, createBodyIndexWorkerHandler } from './bodyIndexWorkerHandler'

describe('createBodyIndexWorkerHandler', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  function setup() {
    const posted: WorkerResponse[] = []
    const handle = createBodyIndexWorkerHandler((message) => posted.push(message))
    return { posted, handle }
  }

  it('coalesces a burst of updates into one snapshot', () => {
    const { posted, handle } = setup()
    handle({ type: 'update', notes: [{ path: '/a.md', content: '#one' }] })
    handle({ type: 'update', notes: [{ path: '/b.md', content: '#two' }] })
    handle({ type: 'remove', paths: ['/a.md'] })
    expect(posted).toHaveLength(0)
    vi.advanceTimersByTime(SNAPSHOT_COALESCE_MS)
    expect(posted).toHaveLength(1)
    expect(posted[0]).toMatchObject({ type: 'snapshot', snapshot: { tags: [{ tag: 'two', count: 1, paths: ['/b.md'] }] } })
  })

  it('flush posts the snapshot immediately, cancels the pending one, and acknowledges', () => {
    const { posted, handle } = setup()
    handle({ type: 'update', notes: [{ path: '/a.md', content: '#one' }] })
    handle({ type: 'flush', id: 7 })
    expect(posted.map((message) => message.type)).toEqual(['snapshot', 'flushed'])
    expect(posted[1]).toEqual({ type: 'flushed', id: 7 })
    vi.advanceTimersByTime(SNAPSHOT_COALESCE_MS * 2)
    expect(posted).toHaveLength(2)
  })

  it('answers mention queries by id', () => {
    const { posted, handle } = setup()
    handle({ type: 'update', notes: [{ path: '/a.md', content: 'about the Test Project' }] })
    handle({ type: 'mentions', id: 3, phrase: 'test project' })
    expect(posted.at(-1)).toEqual({ type: 'mentions', id: 3, paths: ['/a.md'] })
  })

  it('clear empties the index', () => {
    const { posted, handle } = setup()
    handle({ type: 'update', notes: [{ path: '/a.md', content: '#one' }] })
    handle({ type: 'clear' })
    handle({ type: 'flush', id: 1 })
    expect(posted[0]).toMatchObject({ type: 'snapshot', snapshot: { tags: [] } })
  })
})
