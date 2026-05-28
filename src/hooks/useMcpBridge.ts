/**
 * Hook for communicating with the Grimoire MCP WebSocket bridge.
 *
 * Provides typed tool invocations for vault operations:
 * - readNote, createNote, searchNotes, appendToNote
 *
 * Connection is lazy — only opens when first tool is called.
 */
import { useCallback, useEffect, useRef, useState } from 'react'

const DEFAULT_WS_URL = 'ws://localhost:9710'

interface PendingRequest {
  resolve: (value: unknown) => void
  reject: (reason: unknown) => void
  timeoutId: ReturnType<typeof window.setTimeout>
}

interface SearchResult {
  path: string
  title: string
  snippet: string
}

export function useMcpBridge(wsUrl = DEFAULT_WS_URL) {
  const wsRef = useRef<WebSocket | null>(null)
  const connectingRef = useRef<Promise<WebSocket> | null>(null)
  const pendingRef = useRef<Map<string, PendingRequest>>(new Map())
  const idCounterRef = useRef(0)
  const mountedRef = useRef(true)
  const [connected, setConnected] = useState(false)

  const clearPendingRequests = useCallback((reason: Error) => {
    for (const pending of pendingRef.current.values()) {
      window.clearTimeout(pending.timeoutId)
      pending.reject(reason)
    }
    pendingRef.current.clear()
  }, [])

  const ensureConnection = useCallback((): Promise<WebSocket> => {
    const ws = wsRef.current
    if (ws && ws.readyState === WebSocket.OPEN) return Promise.resolve(ws)
    if (connectingRef.current) return connectingRef.current

    const connecting = new Promise<WebSocket>((resolve, reject) => {
      let settled = false
      const newWs = new WebSocket(wsUrl)
      wsRef.current = newWs

      newWs.onopen = () => {
        settled = true
        connectingRef.current = null
        if (mountedRef.current) setConnected(true)
        resolve(newWs)
      }

      newWs.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data)
          const pending = pendingRef.current.get(msg.id)
          if (pending) {
            pendingRef.current.delete(msg.id)
            window.clearTimeout(pending.timeoutId)
            if (msg.error) {
              pending.reject(new Error(msg.error))
            } else {
              pending.resolve(msg.result)
            }
          }
        } catch {
          // ignore malformed messages
        }
      }

      newWs.onclose = () => {
        if (wsRef.current === newWs) wsRef.current = null
        connectingRef.current = null
        if (mountedRef.current) setConnected(false)
        clearPendingRequests(new Error('MCP bridge disconnected'))
        if (!settled) {
          settled = true
          reject(new Error('WebSocket connection closed'))
        }
      }

      newWs.onerror = () => {
        if (wsRef.current === newWs) wsRef.current = null
        connectingRef.current = null
        if (mountedRef.current) setConnected(false)
        if (settled) return
        settled = true
        reject(new Error('WebSocket connection failed'))
      }
    })

    connectingRef.current = connecting
    return connecting
  }, [clearPendingRequests, wsUrl])

  useEffect(() => () => {
    mountedRef.current = false
    connectingRef.current = null
    clearPendingRequests(new Error('MCP bridge unmounted'))
    wsRef.current?.close()
    wsRef.current = null
  }, [clearPendingRequests])

  const callTool = useCallback(async <T>(tool: string, args: Record<string, unknown>): Promise<T> => {
    const ws = await ensureConnection()
    const id = `mcp-${++idCounterRef.current}`

    return new Promise((resolve, reject) => {
      const timeoutId = window.setTimeout(() => {
        if (pendingRef.current.has(id)) {
          pendingRef.current.delete(id)
          reject(new Error('MCP tool call timed out'))
        }
      }, 30_000)

      pendingRef.current.set(id, { resolve: resolve as (value: unknown) => void, reject, timeoutId })

      try {
        ws.send(JSON.stringify({ id, tool, args }))
      } catch (error) {
        window.clearTimeout(timeoutId)
        pendingRef.current.delete(id)
        reject(error instanceof Error ? error : new Error('MCP tool call failed'))
      }
    })
  }, [ensureConnection])

  const readNote = useCallback(
    (path: string) => callTool<{ content: string }>('read_note', { path }),
    [callTool],
  )

  const createNote = useCallback(
    (path: string, title: string, isA?: string) =>
      callTool<string>('create_note', { path, title, is_a: isA }),
    [callTool],
  )

  const searchNotes = useCallback(
    (query: string, limit?: number) =>
      callTool<SearchResult[]>('search_notes', { query, limit }),
    [callTool],
  )

  const appendToNote = useCallback(
    (path: string, text: string) =>
      callTool<{ ok: boolean }>('append_to_note', { path, text }),
    [callTool],
  )

  return { connected, readNote, createNote, searchNotes, appendToNote, callTool }
}
