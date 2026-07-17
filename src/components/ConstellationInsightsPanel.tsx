import { useMemo } from 'react'
import { Brain, Clock3, MessageCircle, ShieldCheck, Unlink2 } from 'lucide-react'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { VaultEntry } from '../types'
import { useUnlinkedMentions, type UnlinkedMention } from '../hooks/useUnlinkedMentions'
import { getDisplayDate, relativeDate } from '../utils/noteListHelpers'
import { buildNoteNeighborhood } from '../utils/noteNeighborhood'
import { resolveEntry, wikilinkDisplay, wikilinkTarget } from '../utils/wikilink'
import { Button } from './ui/button'
import { NeighborhoodMap } from './NeighborhoodMap'

function stripWiki(value: string): string {
  return value.replace(/^\[\[|\]\]$/gu, '')
}

function firstSentences(content: string | null): string {
  const text = (content ?? '')
    .replace(/^---[\s\S]*?---/u, '')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/~~([^~]+)~~/gu, '$1')
    .replace(/\*\*([^*]+)\*\*/gu, '$1')
    .replace(/\*([^*]+)\*/gu, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gmu, '')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/gu, (_, target: string, alias?: string) => alias ?? target)
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim()
  return text ? text.split(/(?<=[.!?])\s/u).slice(0, 2).join(' ').slice(0, 220) : ''
}

function getKeyPoints(entry: VaultEntry, content: string | null): string[] {
  const explicit = [
    entry.isA ? `${entry.isA} note` : null,
    entry.status ? `Status: ${entry.status}` : null,
    entry.belongsTo?.length ? `Belongs to ${entry.belongsTo.map(stripWiki).slice(0, 2).join(', ')}` : null,
  ].filter(Boolean) as string[]
  const checklist = (content ?? '')
    .split('\n')
    .filter((line) => /^\s*[-*]\s+\[[ xX]\]/u.test(line))
    .slice(0, 2)
    .map((line) => line.replace(/^\s*[-*]\s+\[[ xX]\]\s*/u, '').trim())

  return [...explicit, ...checklist].slice(0, 4)
}

interface NoteConnection {
  label: string
  target: VaultEntry | null
}

function getExplicitConnections(entry: VaultEntry, entries: VaultEntry[]): NoteConnection[] {
  const references = [...new Set([
    ...(entry.belongsTo ?? []).map(stripWiki),
    ...(entry.relatedTo ?? []).map(stripWiki),
    ...(entry.outgoingLinks ?? []),
  ].filter(Boolean))]

  return references.slice(0, 6).map((reference) => {
    const target = resolveEntry(entries, wikilinkTarget(reference)) ?? null
    return { label: target?.title ?? wikilinkDisplay(reference), target }
  })
}

function modifiedLabel(entry: VaultEntry): string {
  const modified = getDisplayDate(entry)
  return modified ? relativeDate(modified) : 'recently'
}

const MAX_VISIBLE_MENTIONS = 5

function MentionContext({ context, matchedText }: { context: string; matchedText: string }) {
  const index = context.toLowerCase().indexOf(matchedText.toLowerCase())
  if (index < 0) return <>{context}</>
  const end = index + matchedText.length
  return (
    <>
      {context.slice(0, index)}
      <mark className="bg-transparent text-inherit underline decoration-dotted decoration-muted-foreground/70 underline-offset-2">
        {context.slice(index, end)}
      </mark>
      {context.slice(end)}
    </>
  )
}

function UnlinkedMentionsSection({ mentions, onLink }: {
  mentions: UnlinkedMention[]
  onLink: (mention: UnlinkedMention) => Promise<void>
}) {
  if (mentions.length === 0) return null
  const hidden = mentions.length - MAX_VISIBLE_MENTIONS

  return (
    <div className="constellation-insights__section second-brain-mentions" data-testid="unlinked-mentions-section">
      <div className="flex items-center justify-between gap-2">
        <h3>Unlinked mentions</h3>
        <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
          {mentions.length}
        </span>
      </div>
      <div className="mt-1 space-y-1">
        {mentions.slice(0, MAX_VISIBLE_MENTIONS).map((mention) => (
          <div
            key={`${mention.path}:${mention.line}`}
            className="flex min-w-0 items-center gap-2 rounded-md px-1.5 py-1"
          >
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold">{mention.title}</div>
              <div className="truncate text-[11px] text-muted-foreground">
                <MentionContext context={mention.context} matchedText={mention.matchedText} />
              </div>
            </div>
            <Button
              aria-label={`Link mention in ${mention.title}`}
              className="shrink-0"
              onClick={() => { void onLink(mention) }}
              size="xs"
              type="button"
              variant="outline"
            >
              Link
            </Button>
          </div>
        ))}
        {hidden > 0 ? (
          <div className="px-1.5 text-[11px] text-muted-foreground">+{hidden} more</div>
        ) : null}
      </div>
    </div>
  )
}

/** A compact, truthful local context panel. It never fabricates relationships. */
export function ConstellationInsightsPanel({
  entry,
  entries,
  content,
  vaultPath,
  onOpenSecondBrain,
  onNavigate,
  onFileModified,
}: {
  entry: VaultEntry
  entries: VaultEntry[]
  content: string | null
  vaultPath?: string
  onOpenSecondBrain?: () => void
  onNavigate: (target: string) => void
  onFileModified?: (relativePath: string) => void
}) {
  const summary = firstSentences(content)
  const keyPoints = getKeyPoints(entry, content)
  const neighborhood = useMemo(() => buildNoteNeighborhood(entries, entry.path), [entries, entry.path])
  const missingLinks = getExplicitConnections(entry, entries).filter((connection) => !connection.target)
  const locality = resolveEntryLocalityPolicy(entry)
  const { mentions, linkMention } = useUnlinkedMentions(entry, vaultPath, onFileModified)

  return (
    <section className="constellation-insights" aria-label="Second Brain" data-testid="second-brain-panel">
      <header className="constellation-insights__header flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Brain className="size-4" data-icon-intent="ai" />
            <span>Second Brain</span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <ShieldCheck className="size-3" data-icon-intent="safe" />
            <span className="truncate">{locality.localOnly ? 'Private on this Mac' : 'Local note context'}</span>
          </div>
        </div>
        {onOpenSecondBrain ? (
          <Button aria-label="Ask about this note" className="second-brain-panel__ask shrink-0" onClick={onOpenSecondBrain} size="xs" type="button" variant="secondary">
            <MessageCircle className="size-3" data-icon-intent="ai" />
            Ask
          </Button>
        ) : null}
      </header>

      {summary ? (
        <div className="constellation-insights__section">
          <h3>At a glance</h3>
          <p>{summary}</p>
        </div>
      ) : null}

      {keyPoints.length > 0 ? (
        <div className="constellation-insights__section">
          <h3>Note details</h3>
          <ul>{keyPoints.map((point) => <li key={point}>{point}</li>)}</ul>
        </div>
      ) : null}

      <div className="constellation-insights__section second-brain-connections">
        <div className="second-brain-connections__heading flex items-center justify-between gap-2">
          <h3>Neighborhood</h3>
          <span className="rounded-full bg-muted px-1.5 py-0.5 text-[10px] tabular-nums text-muted-foreground">
            {neighborhood.total + missingLinks.length}
          </span>
        </div>
        {neighborhood.total > 0 ? (
          <NeighborhoodMap neighborhood={neighborhood} entries={entries} onNavigate={onNavigate} />
        ) : (
          <p className="second-brain-connections__empty">No explicit links yet. Add a <code>[[note]]</code> link or a relationship property to map this page.</p>
        )}
        {missingLinks.length > 0 ? (
          <div className="mt-2 space-y-0.5">
            {missingLinks.map((connection) => (
              <div
                key={connection.label}
                className="second-brain-connection--missing flex min-w-0 items-center gap-1.5 rounded-md px-1.5 py-1 text-xs text-muted-foreground"
              >
                <Unlink2 className="size-3.5 shrink-0" data-icon-intent="neutral" />
                <span className="min-w-0 flex-1 truncate">{connection.label}</span>
                <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[10px]">Missing</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>

      <UnlinkedMentionsSection mentions={mentions} onLink={linkMention} />

      <div className="constellation-insights__section constellation-insights__activity">
        <h3>Activity</h3>
        <p><Clock3 className="size-3.5" data-icon-intent="neutral" /> Edited {modifiedLabel(entry)}.</p>
      </div>
    </section>
  )
}
