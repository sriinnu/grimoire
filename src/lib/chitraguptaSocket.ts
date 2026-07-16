/**
 * Types and pure helpers for the local Chitragupta daemon socket.
 *
 * The daemon API is still evolving, so everything here parses defensively:
 * unknown fields are tolerated, timestamps may be epoch numbers or ISO
 * strings, and transcripts fall back to raw JSON when the shape is new.
 */

import type { AiProviderKeySource } from './aiProviderKeys'

/** Redacted socket readiness from `get_chitragupta_socket_status`. */
export interface ChitraguptaSocketStatus {
  healthy: boolean
  version: string | null
  token_present: boolean
  token_source: AiProviderKeySource
  base_url: string
}

/** Redacted token readiness from the save/clear token commands. */
export interface ChitraguptaSocketTokenStatus {
  token_present: boolean
  token_source: AiProviderKeySource
}

/** Trimmed session summary from `list_chitragupta_note_sessions`. */
export interface ChitraguptaNoteSession {
  id: string
  title: string | null
  updated_at: unknown
  created_at: unknown
  message_count: number | null
  gist: string | null
}

/** One rendered line of a read-only session transcript. */
export interface ChitraguptaTranscriptMessage {
  role: string
  text: string
}

/** Human status line for the Settings card. Never mentions the token value. */
export function describeChitraguptaSocketStatus(status: ChitraguptaSocketStatus | null): string {
  if (!status) return 'Checking daemon...'
  if (!status.healthy) return 'Daemon unreachable'
  if (!status.token_present) return `Connected${status.version ? ` · v${status.version}` : ''} · Token missing`
  return `Connected${status.version ? ` · v${status.version}` : ''}`
}

/** Epoch seconds from a defensive timestamp value (ISO string, s, or ms). */
export function sessionTimestampSeconds(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Heuristic: epoch milliseconds are 13+ digits for modern dates.
    return value > 1e12 ? Math.floor(value / 1000) : Math.floor(value)
  }
  if (typeof value === 'string' && value.trim()) {
    const parsed = Date.parse(value)
    if (!Number.isNaN(parsed)) return Math.floor(parsed / 1000)
  }
  return null
}

/** Best display timestamp for a session row: updated, falling back to created. */
export function sessionDisplayTimestamp(session: ChitraguptaNoteSession): number | null {
  return sessionTimestampSeconds(session.updated_at) ?? sessionTimestampSeconds(session.created_at)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function textFromContent(content: unknown): string | null {
  if (typeof content === 'string') return content.trim() ? content : null
  if (Array.isArray(content)) {
    const parts = content
      .map((block) => (isRecord(block) && typeof block.text === 'string' ? block.text : null))
      .filter((part): part is string => !!part)
    return parts.length > 0 ? parts.join('\n') : null
  }
  if (isRecord(content) && typeof content.text === 'string' && content.text.trim()) {
    return content.text
  }
  return null
}

function transcriptMessage(entry: unknown): ChitraguptaTranscriptMessage | null {
  if (!isRecord(entry)) return null
  const role = [entry.role, entry.author, entry.sender]
    .find((value): value is string => typeof value === 'string' && !!value.trim()) ?? 'unknown'
  const text = textFromContent(entry.content) ?? textFromContent(entry.text) ?? textFromContent(entry.message)
  if (!text) return null
  return { role, text }
}

/**
 * Extract a readable transcript from a full session payload. Returns an empty
 * array when no known message shape is found, so callers can fall back to
 * showing the raw JSON.
 */
export function extractSessionTranscript(session: unknown): ChitraguptaTranscriptMessage[] {
  if (!isRecord(session)) return []
  const candidates = [session.messages, session.turns, session.history, session.events]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      const messages = candidate
        .map(transcriptMessage)
        .filter((message): message is ChitraguptaTranscriptMessage => message !== null)
      if (messages.length > 0) return messages
    }
  }
  if (isRecord(session.session)) return extractSessionTranscript(session.session)
  if (isRecord(session.data)) return extractSessionTranscript(session.data)
  return []
}

/** Vault-relative note path, matching how the backend expects lineage keys. */
export function vaultRelativeNotePath(notePath: string, vaultPath: string): string {
  const prefix = `${vaultPath.replace(/\/+$/u, '')}/`
  return notePath.startsWith(prefix) ? notePath.slice(prefix.length) : notePath
}
