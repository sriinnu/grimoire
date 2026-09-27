import { useEffect, useState } from 'react'
import { invoke } from '../../lib/tauriRuntime'
import { isTauri, mockInvoke } from '../../mock-tauri'
import type { VaultEntry } from '../../types'
import { NoteTitleIcon } from '../NoteTitleIcon'
import { linkFirstMention, mentionsPlainText } from './unlinkedMentions'

const MAX_MENTIONS = 50

interface MentionsRowProps {
  entry: VaultEntry
  entries: VaultEntry[]
  /** Paths already shown as connections; mentions there are not "unlinked". */
  connectedPaths: ReadonlySet<string>
  onNavigate: (target: string) => void
  onReplaceContent?: (path: string, content: string) => Promise<void> | void
}

function readNoteContent(path: string): Promise<string> {
  return isTauri() ? invoke<string>('get_note_content', { path }) : mockInvoke<string>('get_note_content', { path })
}

async function findUnlinkedMentions(entry: VaultEntry, entries: VaultEntry[], connectedPaths: ReadonlySet<string>): Promise<VaultEntry[]> {
  const { getBodyIndex } = await import('../../lib/bodyIndex/bodyIndex')
  const index = getBodyIndex()
  await index.ready
  const names = [entry.title, ...entry.aliases].filter((name) => name.trim().length > 0)
  const candidatePaths = new Set<string>()
  for (const name of names) {
    for (const path of await index.pathsMentioning(name, MAX_MENTIONS * 2)) {
      if (path !== entry.path && !connectedPaths.has(path)) candidatePaths.add(path)
    }
  }
  const byPath = new Map(entries.map((candidate) => [candidate.path, candidate]))
  const confirmed: VaultEntry[] = []
  for (const path of candidatePaths) {
    const candidate = byPath.get(path)
    if (!candidate || candidate.archived) continue
    // The index is word-based; confirm the mention is prose, not code or an existing link.
    const content = await readNoteContent(path)
    if (mentionsPlainText(content, names)) confirmed.push(candidate)
    if (confirmed.length >= MAX_MENTIONS) break
  }
  return confirmed.sort((a, b) => (b.modifiedAt ?? 0) - (a.modifiedAt ?? 0))
}

/** Pages whose body names this page in plain text; one click makes the first mention a link. */
export function MentionsRow({ entry, entries, connectedPaths, onNavigate, onReplaceContent }: MentionsRowProps) {
  const [mentions, setMentions] = useState<VaultEntry[] | null>(null)
  const [linked, setLinked] = useState<Set<string>>(() => new Set())

  useEffect(() => {
    let cancelled = false
    setMentions(null)
    setLinked(new Set())
    findUnlinkedMentions(entry, entries, connectedPaths)
      .then((found) => { if (!cancelled) setMentions(found) })
      .catch(() => { if (!cancelled) setMentions([]) })
    return () => { cancelled = true }
  }, [entry, entries, connectedPaths])

  if (!mentions || mentions.length === 0) return null

  const link = async (candidate: VaultEntry) => {
    if (!onReplaceContent) return
    const content = await readNoteContent(candidate.path)
    const next = linkFirstMention(content, entry.title, entry.aliases)
    if (!next) return
    await onReplaceContent(candidate.path, next)
    setLinked((current) => new Set(current).add(candidate.path))
  }

  return (
    <div className="mentions" data-testid="unlinked-mentions">
      <span className="inspector-sublabel">Mentioned but not linked ({mentions.length})</span>
      <div className="connections__rows">
        {mentions.map((candidate) => {
          const done = linked.has(candidate.path)
          return (
            <div key={candidate.path} className="connection-row mentions__row" data-testid="unlinked-mention" data-linked={done ? 'true' : undefined}>
              <span className="connection-row__glyph" aria-label="Mentions this page">…</span>
              <NoteTitleIcon icon={candidate.icon} size={13} />
              <button type="button" className="mentions__title" onClick={() => onNavigate(candidate.title)}>{candidate.title}</button>
              {done ? (
                <span className="connection-row__labels">Linked</span>
              ) : onReplaceContent ? (
                <button type="button" className="inspector-text-action" onClick={() => { void link(candidate) }}>Link</button>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}
