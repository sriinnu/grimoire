import { useEffect, useRef, useState } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from './ui/button'
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
  pendingRequestId: string | null
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
 * Session content requires selected-vault authorization; refresh remains
 * available when history is empty or connection state changes. Transcripts open read-only in a lightweight dialog —
 * the live chat message components are bound to streaming AiAgentMessage
 * state, so reusing them here would cost more than this simple block.
 */
export function ChitraguptaPastSessions({ activeEntry, vaultPath }: ChitraguptaPastSessionsProps) {
  const { status, sessions, loading, error, refreshSessions } = useChitraguptaNoteSessions(activeEntry.path, vaultPath, true)
  const [expanded, setExpanded] = useState(false)
  const [transcript, setTranscript] = useState<OpenTranscript | null>(null)
  const [loadingSessionId, setLoadingSessionId] = useState<string | null>(null)
  const [acknowledging, setAcknowledging] = useState(false)
  const [recoveryError, setRecoveryError] = useState<string | null>(null)
  const transcriptGeneration = useRef(0)
  useEffect(() => {
    transcriptGeneration.current++
    setExpanded(false)
    setTranscript(null)
    setLoadingSessionId(null)
    setAcknowledging(false)
    setRecoveryError(null)
    return () => { transcriptGeneration.current++ }
  }, [vaultPath, activeEntry.path])

  if (!vaultPath) return null

  const connected = status?.state === 'ready' && (status.selectedVaultPath ?? status.projectPath) === vaultPath
  const orderedSessions = connected ? [...sessions].sort((left, right) =>
    Number(!!right.pending_request_id) - Number(!!left.pending_request_id)
      || (sessionDisplayTimestamp(right) ?? 0) - (sessionDisplayTimestamp(left) ?? 0)) : []
  const visibleSessions = expanded ? orderedSessions : orderedSessions.slice(0, MAX_VISIBLE_SESSIONS)
  const hiddenCount = orderedSessions.length - visibleSessions.length

  const openSession = async (session: ChitraguptaNoteSession) => {
    const generation = ++transcriptGeneration.current
    setLoadingSessionId(session.id)
    setRecoveryError(null)
    setAcknowledging(false)
    try {
      const payload = await sessionCall<unknown>('get_chitragupta_session', { id: session.id, vaultPath })
      if (generation !== transcriptGeneration.current) return
      const messages = extractSessionTranscript(payload)
      const connector = payload && typeof payload === 'object' && 'connector' in payload ? payload.connector : null
      const pending = connector && typeof connector === 'object' && 'pendingRequestId' in connector ? connector.pendingRequestId : null
      setTranscript({
        session,
        messages,
        pendingRequestId: typeof pending === 'string' && pending ? pending : null,
        rawJson: messages.length === 0 ? JSON.stringify(payload, null, 2) : null,
        error: null,
      })
    } catch (error) {
      if (generation !== transcriptGeneration.current) return
      setTranscript({
        session,
        messages: [],
        pendingRequestId: null,
        rawJson: null,
        error: error instanceof Error ? error.message : String(error),
      })
    } finally {
      if (generation === transcriptGeneration.current) setLoadingSessionId(null)
    }
  }

  const acknowledgeRequest = async () => {
    if (!transcript?.pendingRequestId || acknowledging) return
    const { session, pendingRequestId } = transcript
    const generation = transcriptGeneration.current
    setAcknowledging(true)
    setRecoveryError(null)
    try {
      const receipt = await sessionCall<{ sessionId: string; acknowledgedRequestId: string }>(
        'acknowledge_chitragupta_request', { vaultPath, sessionId: session.id, requestId: pendingRequestId },
      )
      if (generation !== transcriptGeneration.current) return
      if (receipt.sessionId !== session.id || receipt.acknowledgedRequestId !== pendingRequestId) throw new Error('Chitragupta did not confirm this request acknowledgement.')
      setTranscript((current) => current ? { ...current, pendingRequestId: null } : null)
      refreshSessions()
    } catch (error) {
      if (generation === transcriptGeneration.current) setRecoveryError(error instanceof Error ? error.message : String(error))
    } finally {
      if (generation === transcriptGeneration.current) setAcknowledging(false)
    }
  }

  return (
    <>
      <section
        className="border-b border-border px-3 py-2"
        data-testid="chitragupta-past-sessions"
      >
        <div className="flex items-center justify-between gap-2">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">Past sessions</div>
          <Button size="sm" variant="ghost" disabled={loading} onClick={refreshSessions}>Refresh history</Button>
        </div>
        {loading ? <p className="text-xs text-muted-foreground">Refreshing history…</p> : error ? <p role="alert" className="text-xs text-[var(--feedback-error-text)]">{error}</p> : !connected ? <p className="text-xs text-muted-foreground">Connect this vault in Local AI settings to view history.</p> : orderedSessions.length === 0 ? <p className="text-xs text-muted-foreground">No sessions yet.</p> : null}
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
                      {session.title?.trim() || 'Untitled session'}{session.pending_request_id ? ' · Review previous request' : ''}
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
        {hiddenCount > 0 || expanded ? <Button variant="ghost" size="sm" data-testid="chitragupta-past-sessions-more" onClick={() => setExpanded((value) => !value)}>
          {expanded ? 'Show fewer sessions' : `Show all ${orderedSessions.length} sessions`}
        </Button> : null}
      </section>
      <Dialog open={transcript !== null} onOpenChange={(open) => { if (!open) { transcriptGeneration.current++; setTranscript(null); setAcknowledging(false) } }}>
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
          {transcript?.pendingRequestId ? <div className="space-y-2 rounded-md border border-border p-3 text-sm">
            <p>Previous request may still have completed. Review the history before continuing.</p>
            {recoveryError ? <p role="alert" className="text-[var(--feedback-error-text)]">{recoveryError}</p> : null}
            <Button size="sm" variant="outline" disabled={acknowledging} onClick={() => void acknowledgeRequest()}>Allow a new message</Button>
          </div> : null}
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
