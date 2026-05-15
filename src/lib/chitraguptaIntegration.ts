import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../types'
import { resolveEntryLocalityPolicy, type EntryLocalityPolicy } from './localityPolicy'

export type ChitraguptaCapability =
  | 'memory.append'
  | 'memory.search'
  | 'recall.unified'
  | 'wiki.list'
  | 'wiki.read'
  | 'graph.neighborhood'
  | 'diagnostics.memory'
  | 'ingest.markdown'

export interface ChitraguptaMemoryContext {
  /** Active note path Grimoire can pass to Chitragupta recall. */
  activeNotePath: string
  /** Active note title. */
  title: string
  /** Heading count from shared Markdown semantics. */
  headingCount: number
  /** Frontmatter field count from shared Markdown semantics. */
  frontmatterFieldCount: number
  /** Outgoing wikilink targets indexed by Grimoire. */
  outgoingLinks: string[]
  /** Nearby notes derived from existing vault metadata. */
  relatedTitles: string[]
  /** Contract capabilities Grimoire expects before enabling live memory UX. */
  requiredCapabilities: ChitraguptaCapability[]
  /** Locality policy for the active note before any agent receives context. */
  locality: EntryLocalityPolicy
}

export const REQUIRED_CHITRAGUPTA_CAPABILITIES: ChitraguptaCapability[] = [
  'memory.append',
  'memory.search',
  'recall.unified',
  'wiki.list',
  'wiki.read',
  'graph.neighborhood',
  'diagnostics.memory',
  'ingest.markdown',
]

/** Builds the active-note context packet Grimoire will send to Chitragupta. */
export function buildChitraguptaMemoryContext(
  entry: VaultEntry,
  entries: VaultEntry[],
  semantics: MarkdownDocumentSemantics,
): ChitraguptaMemoryContext {
  const locality = resolveEntryLocalityPolicy(entry)
  if (locality.localOnly) {
    return {
      activeNotePath: '[local-only path withheld]',
      title: '[local-only title withheld]',
      headingCount: 0,
      frontmatterFieldCount: 0,
      outgoingLinks: [],
      relatedTitles: [],
      requiredCapabilities: REQUIRED_CHITRAGUPTA_CAPABILITIES,
      locality: protectedLocality(locality),
    }
  }

  return {
    activeNotePath: entry.path,
    title: entry.title,
    headingCount: semantics.headings.length,
    frontmatterFieldCount: semantics.frontmatterFields.length,
    outgoingLinks: visibleOutgoingLinks(entry, entries),
    relatedTitles: relatedNoteTitles(entry, entries),
    requiredCapabilities: REQUIRED_CHITRAGUPTA_CAPABILITIES,
    locality,
  }
}

function relatedNoteTitles(entry: VaultEntry, entries: VaultEntry[]): string[] {
  const targets = new Set([
    ...entry.outgoingLinks.map(normalizeTarget),
    ...entry.belongsTo.map(normalizeTarget),
    ...entry.relatedTo.map(normalizeTarget),
  ])

  return entries
    .filter((candidate) => candidate.path !== entry.path)
    .filter((candidate) => !resolveEntryLocalityPolicy(candidate).localOnly)
    .filter((candidate) => targets.has(normalizeTarget(candidate.title)) || targets.has(normalizeTarget(candidate.path)))
    .map((candidate) => candidate.title)
    .slice(0, 6)
}

function visibleOutgoingLinks(entry: VaultEntry, entries: VaultEntry[]): string[] {
  return entry.outgoingLinks.filter((target) => {
    const normalizedTarget = normalizeTarget(target)
    const candidate = entries.find((entryCandidate) =>
      normalizeTarget(entryCandidate.title) === normalizedTarget
        || normalizeTarget(entryCandidate.path) === normalizedTarget
    )
    return !!candidate && !resolveEntryLocalityPolicy(candidate).localOnly
  })
}

function protectedLocality(locality: EntryLocalityPolicy): EntryLocalityPolicy {
  return {
    localOnly: true,
    source: 'none',
    reason: 'Local-only marker present',
    badgeLabel: locality.badgeLabel,
  }
}

function normalizeTarget(value: string): string {
  return value
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .replace(/\.md$/i, '')
    .split('|')[0]
    .trim()
    .toLowerCase()
}
