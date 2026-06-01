import { Clock3, Network, Sparkles } from 'lucide-react'
import type { VaultEntry } from '../types'
import { getDisplayDate, relativeDate } from '../utils/noteListHelpers'
import { resolveEntry, wikilinkDisplay, wikilinkTarget } from '../utils/wikilink'

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
  tone: 'matched' | 'unresolved'
}

function getLinkedConcepts(entry: VaultEntry, entries: VaultEntry[]): LinkedConcept[] {
  const refs = [...new Set([
    ...(entry.belongsTo ?? []).map(stripWiki),
    ...(entry.relatedTo ?? []).map(stripWiki),
    ...(entry.outgoingLinks ?? []),
  ].filter(Boolean))].slice(0, 6)

  return refs.map((ref) => {
    const target = resolveEntry(entries, wikilinkTarget(ref)) ?? null
    return {
      label: target?.title ?? wikilinkDisplay(ref),
      target,
      tone: target ? 'matched' : 'unresolved',
    }
  })
}

function modifiedLabel(entry: VaultEntry): string {
  const modified = getDisplayDate(entry)
  return modified ? relativeDate(modified) : 'recently'
}

function ConceptMap({ concepts, onNavigate }: { concepts: LinkedConcept[]; onNavigate: (target: string) => void }) {
  const nodes = concepts.slice(0, 6)

  return (
    <div className="constellation-concept-map" aria-label="Linked concept map">
      <span className="constellation-concept-map__core"><Network className="size-4" /></span>
      {nodes.map((concept, index) => (
        <button
          type="button"
          aria-label={concept.target ? `Open linked concept ${concept.label}` : `Unresolved linked concept ${concept.label}`}
          className={`constellation-concept-map__node constellation-concept-map__node--${index + 1}`}
          key={`${concept.label}-${index}`}
          data-concept-state={concept.tone}
          disabled={!concept.target}
          onClick={() => {
            if (concept.target) onNavigate(concept.target.title)
          }}
        >
          {concept.label}
        </button>
      ))}
    </div>
  )
}

/** Local, inspectable insight layer for the right-side panel. */
export function ConstellationInsightsPanel({
  entry,
  entries,
  content,
  onNavigate,
}: {
  entry: VaultEntry
  entries: VaultEntry[]
  content: string | null
  onNavigate: (target: string) => void
}) {
  const keyPoints = getKeyPoints(entry, content)
  const linkedConcepts = getLinkedConcepts(entry, entries)

  return (
    <section className="constellation-insights" aria-label="AI Insights">
      <header className="constellation-insights__header">
        <Sparkles className="size-4" />
        <span>AI Insights</span>
      </header>
      <div className="constellation-insights__section">
        <h3>Summary</h3>
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
      {linkedConcepts.length > 0 ? (
        <div className="constellation-insights__section">
          <h3>Linked Concepts</h3>
          <ConceptMap concepts={linkedConcepts} onNavigate={onNavigate} />
        </div>
      ) : null}
      <div className="constellation-insights__section constellation-insights__activity">
        <h3>Activity</h3>
        <p><Clock3 className="size-3.5" /> You edited this note {modifiedLabel(entry)}.</p>
      </div>
    </section>
  )
}
