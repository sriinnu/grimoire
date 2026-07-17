import { useEffect, useRef, useState } from 'react'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import {
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
}

/**
 * Past Chitragupta daemon sessions for the active note.
 *
 * Sessions are only fetched after the socket status confirms the daemon is
 * healthy AND a token is present — otherwise the hook stays quiet with an
 * empty list. Fetches are debounced on note changes and stale-guarded with a
 * generation counter (same discipline as useUnlinkedMentions).
 */
export function useChitraguptaNoteSessions(
  notePath: string | null | undefined,
  vaultPath: string | undefined,
  enabled: boolean,
) {
  const [state, setState] = useState<NoteSessionsState>({ status: null, sessions: NO_SESSIONS })
  const genRef = useRef(0)

  useEffect(() => {
    genRef.current++
    setState({ status: null, sessions: NO_SESSIONS })
    if (!enabled || !notePath || !vaultPath) return

    const gen = genRef.current
    const stillCurrent = () => gen === genRef.current

    const fetchSessions = async () => {
      let status: ChitraguptaSocketStatus
      try {
        status = await socketCall<ChitraguptaSocketStatus>('get_chitragupta_socket_status')
      } catch {
        return
      }
      if (!stillCurrent()) return
      setState({ status, sessions: NO_SESSIONS })
      if (!status.healthy || !status.token_present) return

      try {
        const sessions = await socketCall<ChitraguptaNoteSession[]>(
          'list_chitragupta_note_sessions',
          { vaultPath, notePath: vaultRelativeNotePath(notePath, vaultPath) },
        )
        if (stillCurrent()) setState({ status, sessions })
      } catch {
        // Session history is a quiet extra; failures leave the list empty.
      }
    }

    const timer = setTimeout(() => { void fetchSessions() }, DEBOUNCE_MS)
    return () => clearTimeout(timer)
  }, [enabled, notePath, vaultPath])

  return state
}
