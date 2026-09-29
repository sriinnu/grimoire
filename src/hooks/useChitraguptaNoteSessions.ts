import { useCallback, useEffect, useRef, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import {
  CHITRAGUPTA_HISTORY_REFRESH_EVENT,
  vaultRelativeNotePath,
  type ChitraguptaNoteSession,
  type ChitraguptaSocketStatus,
} from '../lib/chitraguptaSocket'

const DEBOUNCE_MS = 300
const NO_SESSIONS: ChitraguptaNoteSession[] = []

function socketCall<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

interface NoteSessionsState {
  status: ChitraguptaSocketStatus | null
  sessions: ChitraguptaNoteSession[]
  loading: boolean
  error: string | null
}

/** Refresh authorized history on note changes, explicit requests, and chat completion. */
export function useChitraguptaNoteSessions(
  notePath: string | null | undefined,
  vaultPath: string | undefined,
  enabled: boolean,
) {
  const [state, setState] = useState<NoteSessionsState>({ status: null, sessions: NO_SESSIONS, loading: false, error: null })
  const [revision, setRevision] = useState(0)
  const genRef = useRef(0)
  const refreshSessions = useCallback(() => { setRevision((current) => current + 1) }, [])

  useEffect(() => {
    const refreshAfterChat = (event: Event) => {
      const detail = (event as CustomEvent<{ vaultPath: string; notePath?: string | null }>).detail
      if (!enabled || !vaultPath || detail?.vaultPath !== vaultPath) return
      if (detail.notePath && vaultRelativeNotePath(detail.notePath, vaultPath) !== vaultRelativeNotePath(notePath ?? '', vaultPath)) return
      refreshSessions()
    }
    window.addEventListener(CHITRAGUPTA_HISTORY_REFRESH_EVENT, refreshAfterChat)
    return () => window.removeEventListener(CHITRAGUPTA_HISTORY_REFRESH_EVENT, refreshAfterChat)
  }, [enabled, notePath, vaultPath, refreshSessions])

  useEffect(() => {
    genRef.current++
    const canFetch = !!(enabled && notePath && vaultPath)
    setState({ status: null, sessions: NO_SESSIONS, loading: canFetch, error: null })
    if (!canFetch) return

    const gen = genRef.current
    const stillCurrent = () => gen === genRef.current
    const fetchSessions = async () => {
      let status: ChitraguptaSocketStatus | null = null
      try {
        status = await socketCall<ChitraguptaSocketStatus>('get_chitragupta_socket_status', { vaultPath })
        if (!stillCurrent()) return
        if (status.contractVersion !== 1 || (status.selectedVaultPath ?? status.projectPath) !== vaultPath || status.state !== 'ready') {
          setState({ status, sessions: NO_SESSIONS, loading: false, error: null })
          return
        }
        const sessions = await socketCall<ChitraguptaNoteSession[]>(
          'list_chitragupta_note_sessions',
          { vaultPath, notePath: vaultRelativeNotePath(notePath!, vaultPath!) },
        )
        if (stillCurrent()) setState({ status, sessions, loading: false, error: null })
      } catch (error) {
        if (stillCurrent()) setState({ status, sessions: NO_SESSIONS, loading: false, error: error instanceof Error ? error.message : String(error) })
      }
    }

    const timer = setTimeout(() => { void fetchSessions() }, DEBOUNCE_MS)
    return () => { clearTimeout(timer); genRef.current++ }
  }, [enabled, notePath, vaultPath, revision])

  return { ...state, refreshSessions }
}
