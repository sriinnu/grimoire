import { Brain, Clock3, MessageCircle, Network, ShieldCheck } from 'lucide-react'
import type { VaultEntry } from '../types'
import { getDisplayDate, relativeDate } from '../utils/noteListHelpers'
import { resolveEntry, wikilinkDisplay, wikilinkTarget } from '../utils/wikilink'
import { Button } from './ui/button'

function stripWiki(value: string): string {
  return value.replace(/^\[\[|\]\]$/gu, '')
}

function firstSentences(content: string | null): string {
  const text = (content ?? '')
    .replace(/^---[\s\S]*?---/u, '')
    .replace(/`([^`]+)`/gu, '$1')
    .replace(/\*\*([^*]+)\*\*/gu, '$1')
    .replace(/\*([^*]+)\*/gu, '$1')
    .replace(/^\s{0,3}#{1,6}\s+/gmu, '')
    .replace(/\[([^\]]+)\]\([^)]+\)/gu, '$1')
    .replace(/\s+/gu, ' ')
    .trim()
  if (!text) return 'Local context is ready. Open this note with agent memory, backlinks, and vault relationships visible.'
  return text.split(/(?<=[.!?])\s/u).slice(0, 2).join(' ').slice(0, 220)
}

function getKeyPoints(entry: VaultEntry, content: string | null): string[] {
  const belongsTo = entry.belongsTo ?? []
  const explicit = [
    entry.isA ? `${entry.isA} note in the active vault.` : null,
    entry.status ? `Status is ${entry.status}.` : null,
    belongsTo.length > 0 ? `Belongs to ${belongsTo.map(stripWiki).slice(0, 2).join(', ')}.` : null,
  ].filter(Boolean) as string[]

  const checklist = (content ?? '')
    .split('\n')
    .filter((line) => /^\s*[-*]\s+\[[ xX]\]/u.test(line))
    .slice(0, 3)
    .map((line) => line.replace(/^\s*[-*]\s+\[[ xX]\]\s*/u, '').trim())

  return [...explicit, ...checklist].slice(0, 4)
}

interface LinkedConcept {
  label: string
  target: VaultEntry | null
  tone: 'active' | 'matched' | 'nearby' | 'unresolved'
}

function getLinkedConcepts(entry: VaultEntry, entries: VaultEntry[]): LinkedConcept[] {
  const refs = [...new Set([
    ...(entry.belongsTo ?? []).map(stripWiki),
    ...(entry.relatedTo ?? []).map(stripWiki),
    ...(entry.outgoingLinks ?? []),
  ].filter(Boolean))].slice(0, 6)

  if (refs.length > 0) {
    return refs.map((ref) => {
      const target = resolveEntry(entries, wikilinkTarget(ref)) ?? null
      return {
        label: target?.title ?? wikilinkDisplay(ref),
        target,
        tone: target ? 'matched' : 'unresolved',
      }
    })
  }

  const localNoteCount = entries.filter((candidate) => !candidate.archived).length

  const fallbackNodes: LinkedConcept[] = [
    { label: entry.title, target: entry, tone: 'active' },
    { label: `${localNoteCount} local notes`, target: null, tone: 'nearby' },
    { label: 'Memory lane', target: null, tone: 'nearby' },
    { label: 'Relationship scan', target: null, tone: 'nearby' },
  ]

  return fallbackNodes.slice(0, 6)
}

function modifiedLabel(entry: VaultEntry): string {
  const modified = getDisplayDate(entry)
  return modified ? relativeDate(modified) : 'recently'
}

function ConceptMap({ concepts, onNavigate }: { concepts: LinkedConcept[]; onNavigate: (target: string) => void }) {
  const nodes = concepts.slice(0, 6)

  return (
    <div className="linked-concept-map" aria-label="Linked concept map">
      <span className="linked-concept-map__core"><Network className="size-4" /></span>
      {nodes.map((concept, index) => (
        <button
          type="button"
          aria-label={conceptAriaLabel(concept)}
          className={`linked-concept-map__node linked-concept-map__node--${index + 1}`}
          key={`${concept.label}-${index}`}
          data-concept-state={concept.tone}
          disabled={!concept.target || concept.tone === 'active'}
          onClick={() => {
            if (concept.target && concept.tone !== 'active') onNavigate(concept.target.title)
          }}
        >
          {concept.label}
        </button>
      ))}
    </div>
  )
}

function conceptAriaLabel(concept: LinkedConcept): string {
  if (concept.tone === 'active') return `Current graph node ${concept.label}`
  if (concept.tone === 'nearby' && concept.target) return `Open nearby graph node ${concept.label}`
  if (concept.tone === 'nearby') return `Local graph node ${concept.label}`
  if (concept.target) return `Open linked concept ${concept.label}`
  return `Unresolved linked concept ${concept.label}`
}

/** Local, inspectable insight layer for the right-side panel. */
export function ConstellationInsightsPanel({
  entry,
  entries,
  content,
  onOpenSecondBrain,
  onNavigate,
}: {
  entry: VaultEntry
  entries: VaultEntry[]
  content: string | null
  onOpenSecondBrain?: () => void
  onNavigate: (target: string) => void
}) {
  const keyPoints = getKeyPoints(entry, content)
  const linkedConcepts = getLinkedConcepts(entry, entries)

  return (
    <section className="constellation-insights" aria-label="Second Brain" data-testid="second-brain-panel">
      <header className="constellation-insights__header flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <Brain className="size-4" />
            <span>Second Brain</span>
          </div>
          <div className="mt-1 flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
            <ShieldCheck className="size-3" />
            <span className="truncate">Local context</span>
          </div>
        </div>
        {onOpenSecondBrain ? (
          <Button
            aria-label="Open Second Brain chat"
            className="second-brain-panel__ask shrink-0"
            onClick={onOpenSecondBrain}
            size="xs"
            type="button"
            variant="secondary"
          >
            <MessageCircle className="size-3" />
            Ask
          </Button>
        ) : null}
      </header>
      <div className="constellation-insights__section">
        <h3>Signal</h3>
        <p>{firstSentences(content)}</p>
      </div>
      {keyPoints.length > 0 ? (
        <div className="constellation-insights__section">
          <h3>Key Points</h3>
          <ul>
            {keyPoints.map((point) => <li key={point}>{point}</li>)}
          </ul>
        </div>
      ) : null}
      <div className="constellation-insights__section">
        <h3>Graph Nodes</h3>
        <ConceptMap concepts={linkedConcepts} onNavigate={onNavigate} />
      </div>
      <div className="constellation-insights__section constellation-insights__activity">
        <h3>Activity</h3>
        <p><Clock3 className="size-3.5" /> You edited this note {modifiedLabel(entry)}.</p>
      </div>
    </section>
  )
}
