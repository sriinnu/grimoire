import { renderHook, act } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useUnifiedSearch } from './useUnifiedSearch'

const { buildChitraguptaContextMock } = vi.hoisted(() => ({
  buildChitraguptaContextMock: vi.fn(),
}))

vi.mock('../mock-tauri', () => ({
  mockInvoke: vi.fn(),
  isTauri: () => false,
}))

vi.mock('../lib/chitraguptaContext', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../lib/chitraguptaContext')>()
  return { ...actual, buildChitraguptaContext: buildChitraguptaContextMock }
})

import { mockInvoke } from '../mock-tauri'

const mockInvokeFn = vi.mocked(mockInvoke)

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const KEYWORD_RESPONSE = {
  results: [
    { title: 'Note', path: '/vault/note.md', snippet: 'hit', score: 0.9, note_type: null },
  ],
  elapsed_ms: 12,
}

function renderSearch(mode?: 'keyword' | 'semantic' | 'hybrid') {
  return renderHook(
    (props: { mode?: 'keyword' | 'semantic' | 'hybrid' }) =>
      useUnifiedSearch('/vault', true, undefined, '', 0, props.mode ? { mode: props.mode } : undefined),
    { initialProps: { mode } },
  )
}

async function typeQuery(hook: ReturnType<typeof renderSearch>, value: string) {
  act(() => hook.result.current.setQuery(value))
  await act(async () => {
    vi.advanceTimersByTime(300)
    await Promise.resolve()
  })
}

describe('useUnifiedSearch', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    mockInvokeFn.mockResolvedValue(KEYWORD_RESPONSE)
    buildChitraguptaContextMock.mockResolvedValue({
      schemaVersion: 'chitragupta.context-build.v1',
      requestId: 'req-1',
      recalled: [{ answer: 'Memory answer', primarySource: 'Smriti', score: 0.9, snippet: 'Memory snippet' }],
      live: { predictions: [], guidanceBlock: 'Guidance text', predictionsBlock: null },
      degraded: false,
      warnings: [],
    })
  })

  it('keyword mode keeps keyword results and never calls the recall seam', async () => {
    const hook = renderSearch('keyword')

    await typeQuery(hook, 'alpha')

    await act(async () => {})
    expect(mockInvokeFn).toHaveBeenCalledWith('search_vault', expect.objectContaining({ query: 'alpha', mode: 'keyword' }))
    expect(buildChitraguptaContextMock).not.toHaveBeenCalled()
    expect(hook.result.current.results).toHaveLength(1)
    expect(hook.result.current.recall).toEqual({ status: 'ready', attachment: null })
  })

  it('hybrid mode fires the recall seam with the query alongside keyword scopes', async () => {
    const hook = renderSearch('hybrid')

    await typeQuery(hook, 'alpha')
    await act(async () => {})

    expect(buildChitraguptaContextMock).toHaveBeenCalledWith(expect.objectContaining({
      query: 'alpha',
      project: '/vault',
      intent: 'recall',
      limit: 5,
    }))
    const requestId = buildChitraguptaContextMock.mock.calls[0][0].requestId
    expect(requestId).toMatch(/^grimoire:search:/)
    // Keyword results are independent and intact.
    expect(mockInvokeFn).toHaveBeenCalledWith('search_vault', expect.objectContaining({ query: 'alpha' }))
    expect(hook.result.current.results).toHaveLength(1)
    expect(hook.result.current.recall.status).toBe('ready')
    expect(hook.result.current.recall.attachment).toMatchObject({
      guidance: 'Guidance text',
      recalledCount: 1,
      items: [{ answer: 'Memory answer', primarySource: 'Smriti', snippet: 'Memory snippet' }],
    })
  })

  it('drops a stale recall response after the query changes', async () => {
    const first = deferred<unknown>()
    const second = deferred<unknown>()
    buildChitraguptaContextMock
      .mockImplementationOnce(() => first.promise)
      .mockImplementationOnce(() => second.promise)
    const hook = renderSearch('hybrid')

    await typeQuery(hook, 'first')
    await typeQuery(hook, 'second')

    // Resolve the stale first recall after the second search is inflight.
    await act(async () => { first.resolve({ schemaVersion: 'v', recalled: [{ answer: 'Stale memory' }] }) })
    await act(async () => {})
    expect(hook.result.current.recall.status).toBe('loading')

    await act(async () => {
      second.resolve({
        schemaVersion: 'v',
        recalled: [{ answer: 'Fresh memory', primarySource: 'Smriti' }],
      })
    })
    await act(async () => {})
    expect(hook.result.current.recall.status).toBe('ready')
    expect(hook.result.current.recall.attachment?.items?.[0]?.answer).toBe('Fresh memory')
  })

  it('marks recall unavailable on seam rejection while keyword results stay intact', async () => {
    buildChitraguptaContextMock.mockRejectedValue(new Error('Chitragupta recall is available in the desktop app only.'))
    const hook = renderSearch('hybrid')

    await typeQuery(hook, 'alpha')
    await act(async () => {})

    expect(hook.result.current.recall.status).toBe('unavailable')
    expect(hook.result.current.recall.attachment).toBeNull()
    expect(hook.result.current.results).toHaveLength(1)
    expect(hook.result.current.loading).toBe(false)
  })

  it('clears recall state when the query is emptied', async () => {
    const hook = renderSearch('hybrid')

    await typeQuery(hook, 'alpha')
    await act(async () => {})
    expect(hook.result.current.recall.status).toBe('ready')

    await typeQuery(hook, '')
    await act(async () => {})
    expect(hook.result.current.recall).toEqual({ status: 'ready', attachment: null })
  })
})
