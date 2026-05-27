import type { VaultEntry } from '../types'
import { extractOutgoingLinks } from '../utils/wikilinks'
import type { AskContextPackage } from './askContextPackage'
import { isEntryLocalOnly } from './localityPolicy'

interface CrystallizeSourceLabelParams {
  activeEntry?: VaultEntry | null
  askContextPackage?: AskContextPackage | null
  sourceLabels?: string[]
  sourceName?: string
  sourceEntries?: VaultEntry[]
}

/** Builds source labels for reviewed Memory provenance without inventing hidden state. */
export function buildCrystallizeSourceLabels({
  activeEntry,
  askContextPackage,
  sourceLabels,
  sourceEntries,
  sourceName = 'AI Chat',
}: CrystallizeSourceLabelParams): string[] {
  const explicitLabels = uniqueLabels(sourceLabels
    ?.map(label => normalizeSourceLabel(label, sourceName))
    .filter(label => isDurableSourceLabel(label, sourceName, sourceEntries)) ?? [])
  if (explicitLabels.length > 0) return explicitLabels
  if (activeEntry?.title) return [wikilinkLabel(activeEntry.title)]
  if (askContextPackage && askContextPackage.sourceLabels.length > 0) {
    return uniqueLabels(askContextPackage.sourceLabels.map(label => wikilinkLabel(label)))
  }
  return [sourceName]
}

/** Frontmatter lines for secondary Memory provenance labels. */
export function sourceNotesFrontmatter(sourceLabels: string[]): string[] {
  if (sourceLabels.length <= 1) return []
  return [
    'source_notes:',
    ...sourceLabels.map((label) => `  - ${JSON.stringify(label)}`),
  ]
}

/** Markdown source-link lines, deduped with links found in the proposed memory body. */
export function buildSourceLinkLines(sourceLabels: string[], response: string): string[] {
  const seen = new Set<string>()
  const labels = [...sourceLabels, ...extractOutgoingLinks(response).map(target => `[[${target}]]`)]
  return labels.filter((label) => {
    const normalized = normalizeLinkLabel(label)
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  }).map(label => `- ${label}`)
}

/** Turns note-like labels into wikilinks while preserving product/evidence labels. */
export function wikilinkLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'AI chat') return 'AI chat'
  if (/^\[\[.+\]\]$/.test(trimmed)) return trimmed
  return `[[${trimmed}]]`
}

function normalizeSourceLabel(value: string, sourceName: string): string {
  const trimmed = value.trim()
  if (!trimmed) return ''
  if (trimmed === sourceName || trimmed === 'AI chat') return trimmed
  if (/^\[\[.+\]\]$/.test(trimmed)) return trimmed
  if (isEvidenceLabel(trimmed)) return trimmed
  return wikilinkLabel(trimmed)
}

function isEvidenceLabel(label: string): boolean {
  return label.includes(':') || /^\d+\s/.test(label) || /\b(withheld|held local|policy-only)\b/i.test(label)
}

function isDurableSourceLabel(label: string, sourceName: string, entries?: VaultEntry[]): boolean {
  if (!label) return false
  if (isExactWithheldLabel(label) || /^Conflicts:\s*/i.test(label)) return false
  if (!entries) return true
  if (label === sourceName || label === 'AI chat') return true

  const entry = findPublicEntryForLabel(label, entries)
  if (entry) return !isEntryLocalOnly(entry)

  const conflictLabel = /^Conflicts:\s*(.+)$/i.exec(label)?.[1]
  if (conflictLabel) {
    const conflictEntry = findPublicEntryForLabel(conflictLabel, entries)
    return !!conflictEntry && !isEntryLocalOnly(conflictEntry)
  }

  return false
}

function findPublicEntryForLabel(label: string, entries: VaultEntry[]): VaultEntry | null {
  const target = normalizeLinkLabel(label)
  if (!target) return null
  return entries.find((entry) => entryKeys(entry).includes(target)) ?? null
}

function isExactWithheldLabel(label: string): boolean {
  return /^\d+\s+(dashboard|graph)\s+items\s+withheld$/i.test(label.trim())
}

function entryKeys(entry: VaultEntry): string[] {
  return [
    entry.title,
    entry.filename,
    entry.filename.replace(/\.md$/i, ''),
    entry.path,
    entry.path.replace(/\.md$/i, ''),
    entry.path.split('/').pop()?.replace(/\.md$/i, '') ?? '',
  ].filter(Boolean).map(normalizeLinkLabel)
}

function uniqueLabels(values: string[]): string[] {
  return [...new Set(values.filter((value) => value.trim().length > 0))]
}

function normalizeLinkLabel(value: string): string {
  return value
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')[0]
    .trim()
    .toLowerCase()
}
