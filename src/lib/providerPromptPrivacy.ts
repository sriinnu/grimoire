import type { VaultEntry } from '../types'
import type { NoteReference } from '../utils/ai-context'
import { resolveEntry } from '../utils/wikilink'
import { resolveEntryLocalityPolicy } from './localityPolicy'

export interface ProviderPromptDraft {
  references: NoteReference[]
  text: string
}

const INLINE_WIKILINK_PATTERN = /\[\[([^[\]\r\n]+?)\]\]/g
const LOCAL_ONLY_PROMPT_REPLACEMENT = '[local-only note withheld]'

/** Normalizes provider-bound prompt text before wikilink privacy filtering. */
export function normalizeProviderPromptText(value: string): string {
  return value
    .replace(/\u00A0/g, ' ')
    .replace(/\u200B/g, '')
    .replace(/\r?\n/g, ' ')
}

/** Builds the exact prompt text and public references allowed to leave the local UI. */
export function buildProviderPromptDraft(
  value: string,
  entries: VaultEntry[],
): ProviderPromptDraft {
  const normalizedValue = normalizeProviderPromptText(value)
  const references: NoteReference[] = []
  const seenPaths = new Set<string>()
  let cursor = 0
  let text = ''

  INLINE_WIKILINK_PATTERN.lastIndex = 0
  for (const match of normalizedValue.matchAll(INLINE_WIKILINK_PATTERN)) {
    const fullMatch = match[0]
    const target = match[1]
    const start = match.index ?? 0

    text += normalizedValue.slice(cursor, start)

    const entry = resolveEntry(entries, target)
    if (!entry) {
      text += fullMatch
    } else if (resolveEntryLocalityPolicy(entry).localOnly) {
      text += LOCAL_ONLY_PROMPT_REPLACEMENT
    } else {
      text += providerWikilinkToken(entry)
      appendPromptReference(references, seenPaths, entry)
    }

    cursor = start + fullMatch.length
  }

  text += normalizedValue.slice(cursor)
  return { references, text }
}

/** Removes local-only wikilink labels from prompt text without changing public links. */
export function sanitizeProviderPromptText(value: string, entries: VaultEntry[]): string {
  return buildProviderPromptDraft(value, entries).text
}

/** Extracts only public note references from provider-bound prompt text. */
export function extractProviderPromptReferences(
  value: string,
  entries: VaultEntry[],
): NoteReference[] {
  return buildProviderPromptDraft(value, entries).references
}

/** Merges note references while preserving the first safe path occurrence. */
export function mergeNoteReferences(...groups: NoteReference[][]): NoteReference[] {
  const byPath = new Map<string, NoteReference>()

  for (const reference of groups.flat()) {
    if (!byPath.has(reference.path)) byPath.set(reference.path, reference)
  }

  return [...byPath.values()]
}

function appendPromptReference(
  references: NoteReference[],
  seenPaths: Set<string>,
  entry: VaultEntry,
): void {
  if (seenPaths.has(entry.path)) return

  seenPaths.add(entry.path)
  references.push({
    path: entry.path,
    title: entry.title,
    type: entry.isA,
  })
}

function providerWikilinkToken(entry: VaultEntry): string {
  return `[[${entry.filename.replace(/\.md$/i, '')}]]`
}
