import type { MarkdownDocumentSemantics } from '@grimoire/markdown-editor'
import type { VaultEntry } from '../types'

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
  return {
    activeNotePath: entry.path,
    title: entry.title,
    headingCount: semantics.headings.length,
    frontmatterFieldCount: semantics.frontmatterFields.length,
    outgoingLinks: entry.outgoingLinks,
    relatedTitles: relatedNoteTitles(entry, entries),
    requiredCapabilities: REQUIRED_CHITRAGUPTA_CAPABILITIES,
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
    .filter((candidate) => targets.has(normalizeTarget(candidate.title)) || targets.has(normalizeTarget(candidate.path)))
    .map((candidate) => candidate.title)
    .slice(0, 6)
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
