import { useState, useEffect, useRef, useCallback } from 'react'

export type HighlightElement = 'editor' | 'tab' | 'properties' | 'notelist' | null

export interface AiActivity {
  highlightElement: HighlightElement
  highlightPath: string | null
}

export interface AiActivityCallbacks {
  onOpenNote?: (path: string) => void
  onOpenTab?: (path: string) => void
  onSetFilter?: (type: string) => void
  onVaultChanged?: (path?: string) => void
}

const WS_UI_URL = 'ws://localhost:9711'
const HIGHLIGHT_DURATION_MS = 800
const RECONNECT_DELAY_MS = 3000
const MAX_RECONNECT_DELAY_MS = 30_000

function isUiBridgeVisible(): boolean {
  return typeof document === 'undefined' || document.visibilityState !== 'hidden'
}

function nextReconnectDelay(delayMs: number): number {
  return Math.min(delayMs * 2, MAX_RECONNECT_DELAY_MS)
}

/**
 * Listens on the UI WebSocket bridge (port 9711) for UI action events
 * from the MCP server. Handles highlight, open_note, open_tab, set_filter,
 * and vault_changed actions.
 */
export function useAiActivity(callbacks?: AiActivityCallbacks): AiActivity {
  const [highlightElement, setHighlightElement] = useState<HighlightElement>(null)
  const [highlightPath, setHighlightPath] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const callbacksRef = useRef(callbacks)
  useEffect(() => { callbacksRef.current = callbacks })

  const handleMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string)
      if (data.type !== 'ui_action') return
      switch (data.action) {
        case 'highlight':
          setHighlightElement(data.element ?? null)
          setHighlightPath(data.path ?? null)
          if (timerRef.current) clearTimeout(timerRef.current)
          timerRef.current = setTimeout(() => {
            setHighlightElement(null)
            setHighlightPath(null)
          }, HIGHLIGHT_DURATION_MS)
          break
        case 'open_note':
          if (data.path) callbacksRef.current?.onOpenNote?.(data.path)
          break
        case 'open_tab':
          if (data.path) callbacksRef.current?.onOpenTab?.(data.path)
          break
        case 'set_filter':
          if (data.filterType) callbacksRef.current?.onSetFilter?.(data.filterType)
          break
        case 'vault_changed':
          callbacksRef.current?.onVaultChanged?.(data.path)
          break
      }
    } catch {
      // Ignore parse errors from malformed messages
    }
  }, [])

  useEffect(() => {
    let ws: WebSocket | null = null
    let mounted = true
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null
    let reconnectDelayMs = RECONNECT_DELAY_MS

    function clearReconnectTimer() {
      if (reconnectTimer) clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    function closeSocket() {
      if (!ws) return
      ws.onclose = null
      ws.onmessage = null
      ws.onerror = null
      ws.close()
      ws = null
    }

    function scheduleReconnect() {
      clearReconnectTimer()
      if (!mounted || !isUiBridgeVisible()) return
      reconnectTimer = setTimeout(connect, reconnectDelayMs)
      reconnectDelayMs = nextReconnectDelay(reconnectDelayMs)
    }

    function connect() {
      if (!mounted || !isUiBridgeVisible() || typeof WebSocket === 'undefined') return
      if (ws) return
      try {
        clearReconnectTimer()
        ws = new WebSocket(WS_UI_URL)
        ws.onopen = () => { reconnectDelayMs = RECONNECT_DELAY_MS }
        ws.onmessage = handleMessage
        ws.onclose = () => {
          ws = null
          scheduleReconnect()
        }
        ws.onerror = () => { /* Silent — bridge may not be running */ }
      } catch {
        scheduleReconnect()
      }
    }

    const handleVisibilityChange = () => {
      if (!isUiBridgeVisible()) {
        clearReconnectTimer()
        closeSocket()
        return
      }
      reconnectDelayMs = RECONNECT_DELAY_MS
      connect()
    }

    connect()
    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('focus', handleVisibilityChange)

    return () => {
      mounted = false
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('focus', handleVisibilityChange)
      closeSocket()
      if (timerRef.current) clearTimeout(timerRef.current)
      clearReconnectTimer()
    }
  }, [handleMessage])

  return { highlightElement, highlightPath }
}
