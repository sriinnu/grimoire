import { useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { invoke } from '../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../mock-tauri'
import {
  extractSessionTranscript,
  sessionDisplayTimestamp,
  type ChitraguptaNoteSession,
  type ChitraguptaTranscriptMessage,
} from '../lib/chitraguptaSocket'
import { useChitraguptaNoteSessions } from '../hooks/useChitraguptaNoteSessions'
import { relativeDate } from '../utils/noteListHelpers'
import type { VaultEntry } from '../types'

const MAX_VISIBLE_SESSIONS = 5

interface ChitraguptaPastSessionsProps {
  activeEntry: VaultEntry
  vaultPath?: string
}

interface OpenTranscript {
  session: ChitraguptaNoteSession
  messages: ChitraguptaTranscriptMessage[]
  /** Pretty-printed fallback shown when no known message shape was found. */
  rawJson: string | null
  error: string | null
}

function sessionCall<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  return isTauri() ? invoke<T>(command, args) : mockInvoke<T>(command, args)
}

/**
 * A quiet list of past Chitragupta daemon sessions tied to the active note.
 * Renders nothing unless the daemon is healthy, a token exists, and the note
 * actually has history. Transcripts open read-only in a lightweight dialog —
 * the live chat message components are bound to streaming AiAgentMessage
 * state, so reusing them here would cost more than this simple block.
 */
export function ChitraguptaPastSessions({ activeEntry, vaultPath }: ChitraguptaPastSessionsProps) {
  const { status, sessions } = useChitraguptaNoteSessions(activeEntry.path, vaultPath, true)
  const [transcript, setTranscript] = useState<OpenTranscript | null>(null)
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null)

  if (!status?.healthy || !status.token_present || sessions.length === 0) return null

  const visibleSessions = sessions.slice(0, MAX_VISIBLE_SESSIONS)
  const hiddenCount = sessions.length - visibleSessions.length

  const openSession = async (session: ChitraguptaNoteSession) => {
    setLoadingSessionId(session.id)
    try {
      const payload = await sessionCall<unknown>('get_chitragupta_session', { id: session.id })
      const messages = extractSessionTranscript(payload)
      setTranscript({
        session,
        messages,
        rawJson: messages.length === 0 ? JSON.stringify(payload, null, 2) : null,
        error: null,
      })
    } catch (error) {
      setTranscript({
        session,
        messages: [],
        rawJson: null,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      setLoadingSessionId(null)
    }
  }

  return (
    <>
      <section
        className="border-b border-border px-3 py-2"
        data-testid="chitragupta-past-sessions"
      >
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
          Past sessions
        </div>
        <ul className="m-0 mt-1 flex list-none flex-col gap-0.5 p-0">
          {visibleSessions.map((session) => {
            const timestamp = sessionDisplayTimestamp(session)
            return (
              <li key={session.id}>
                <button
                  type="button"
                  className="flex w-full flex-col gap-0.5 rounded-md px-1.5 py-1 text-left hover:bg-accent/50 disabled:opacity-60"
                  disabled={loadingSessionId === session.id}
                  onClick={() => void openSession(session)}
                  data-testid={`chitragupta-past-session-${session.id}`}
                >
                  <span className="flex items-baseline gap-2">
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-foreground">
                      {session.title?.trim() || 'Untitled session'}
                    </span>
                    {timestamp !== null ? (
                      <span className="shrink-0 text-[10px] text-muted-foreground">
                        {relativeDate(timestamp)}
                      </span>
                    ) : null}
                  </span>
                  {session.gist?.trim() ? (
                    <span className="truncate text-[11px] text-muted-foreground">{session.gist}</span>
                  ) : null}
                </button>
              </li>
            )
          })}
        </ul>
        {hiddenCount > 0 ? (
          <div
            className="mt-1 px-1.5 text-[11px] text-muted-foreground"
            data-testid="chitragupta-past-sessions-more"
          >
            +{hiddenCount} more
          </div>
        ) : null}
      </section>
      <Dialog open={transcript !== null} onOpenChange={(open) => { if (!open) setTranscript(null) }}>
        <DialogContent
          className="max-w-xl"
          data-testid="chitragupta-session-transcript-dialog"
        >
          <DialogHeader>
            <DialogTitle>{transcript?.session.title?.trim() || 'Past session'}</DialogTitle>
            <DialogDescription>
              Read-only transcript from the Chitragupta daemon.
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto">
            {transcript?.error ? (
              <div className="rounded-md border border-[var(--feedback-error-text)]/30 bg-[var(--feedback-error-bg)] px-2 py-1 text-[12px] text-[var(--feedback-error-text)]">
                {transcript.error}
              </div>
            ) : transcript && transcript.messages.length > 0 ? (
              <div className="flex flex-col gap-2">
                {transcript.messages.map((message, index) => (
                  <div key={index} className="rounded-md border border-border/70 bg-background/35 px-2 py-1.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {message.role}
                    </div>
                    <div className="mt-0.5 whitespace-pre-wrap text-[12px] leading-relaxed text-foreground">
                      {message.text}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <pre className="m-0 overflow-x-auto rounded-md border border-border/70 bg-background/35 p-2 text-[11px] leading-relaxed text-muted-foreground">
                {transcript?.rawJson ?? 'No transcript available.'}
              </pre>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
