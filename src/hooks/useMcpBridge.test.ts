import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useMcpBridge } from './useMcpBridge'

let sockets: MockWebSocket[] = []

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  onopen: (() => void) | null = null
  onmessage: ((event: MessageEvent) => void) | null = null
  onerror: (() => void) | null = null
  onclose: (() => void) | null = null
  readyState = MockWebSocket.CONNECTING
  sent: string[] = []
  url: string

  close = vi.fn(() => {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  })

  send = vi.fn((payload: string) => {
    this.sent.push(payload)
  })

  constructor(url: string) {
    this.url = url
    sockets.push(this)
  }

  open() {
    this.readyState = MockWebSocket.OPEN
    this.onopen?.()
  }

  receive(message: Record<string, unknown>) {
    this.onmessage?.(new MessageEvent('message', { data: JSON.stringify(message) }))
  }

  closeFromServer() {
    this.readyState = MockWebSocket.CLOSED
    this.onclose?.()
  }
}

function latestSocket() {
  const socket = sockets.at(-1)
  if (!socket) throw new Error('Expected a WebSocket instance')
  return socket
}

async function flushMicrotasks() {
  await act(async () => {
    await Promise.resolve()
  })
}

function sentRequestId(socket: MockWebSocket, index = 0) {
  const payload: unknown = JSON.parse(socket.sent[index])
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('id' in payload) ||
    typeof payload.id !== 'string'
  ) {
    throw new Error('Expected sent MCP request id')
  }
  return payload.id
}

describe('useMcpBridge', () => {
  beforeEach(() => {
    sockets = []
    vi.useFakeTimers()
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('reuses one socket while the MCP bridge connection is opening', async () => {
    const { result } = renderHook(() => useMcpBridge())

    const readPromise = result.current.readNote('/vault/a.md')
    const searchPromise = result.current.searchNotes('alpha')

    expect(sockets).toHaveLength(1)
    const socket = latestSocket()

    act(() => { socket.open() })
    await flushMicrotasks()

    expect(socket.sent).toHaveLength(2)
    act(() => {
      socket.receive({ id: sentRequestId(socket, 0), result: { content: 'A' } })
      socket.receive({ id: sentRequestId(socket, 1), result: [{ path: '/b.md', title: 'B', snippet: 'beta' }] })
    })

    await expect(readPromise).resolves.toEqual({ content: 'A' })
    await expect(searchPromise).resolves.toEqual([{ path: '/b.md', title: 'B', snippet: 'beta' }])
  })

  it('clears the request timeout after a response resolves', async () => {
    const { result } = renderHook(() => useMcpBridge())

    const readPromise = result.current.readNote('/vault/a.md')
    const socket = latestSocket()
    act(() => { socket.open() })
    await flushMicrotasks()

    expect(vi.getTimerCount()).toBe(1)

    act(() => {
      socket.receive({ id: sentRequestId(socket), result: { content: 'done' } })
    })

    await expect(readPromise).resolves.toEqual({ content: 'done' })
    expect(vi.getTimerCount()).toBe(0)
  })

  it('rejects pending calls and clears timers when the socket closes', async () => {
    const { result } = renderHook(() => useMcpBridge())

    const readPromise = result.current.readNote('/vault/a.md')
    const socket = latestSocket()
    act(() => { socket.open() })
    await flushMicrotasks()

    expect(vi.getTimerCount()).toBe(1)

    act(() => { socket.closeFromServer() })

    await expect(readPromise).rejects.toThrow('MCP bridge disconnected')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('closes a connecting socket when the hook unmounts', () => {
    const { result, unmount } = renderHook(() => useMcpBridge())

    const readPromise = result.current.readNote('/vault/a.md')
    void readPromise.catch(() => undefined)
    const socket = latestSocket()

    unmount()

    expect(socket.close).toHaveBeenCalledOnce()
  })
})
