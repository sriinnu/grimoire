import type { SVGAttributes } from 'react'
import type { VaultEntry } from '../types'
import type { WikilinkSuggestionItem } from './WikilinkSuggestionMenu'
import { Glyph } from './glyphs/Glyph'

const TagIcon = (props: SVGAttributes<SVGSVGElement>) => (
  <Glyph name="tag" size={typeof props.width === 'number' ? props.width : undefined} className={props.className} style={props.style} />
)

const TAG_KEYS = new Set(['tag', 'tags', 'keyword', 'keywords', 'category', 'categories', 'label', 'labels'])
const BODY_TAG_RE = /(?:^|\s)#([A-Za-z0-9][A-Za-z0-9_/-]*)/g
const MAX_TAG_RESULTS = 20

interface TagCandidate {
  tag: string
  count: number
}

function normalizeTag(raw: string): string | null {
  const normalized = raw
    .trim()
    .replace(/^#+/, '')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9_/-]/g, '')
    .replace(/^[^A-Za-z0-9]+/, '')
  return normalized ? normalized : null
}

function splitTagValue(value: string): string[] {
  return value
    .split(',')
    .map(normalizeTag)
    .filter((tag): tag is string => Boolean(tag))
}

function collectPropertyTags(entry: VaultEntry): string[] {
  const tags: string[] = []
  for (const [key, value] of Object.entries(entry.properties)) {
    if (!TAG_KEYS.has(key.toLowerCase())) continue
    if (typeof value === 'string') tags.push(...splitTagValue(value))
    if (typeof value === 'number' || typeof value === 'boolean') tags.push(String(value))
  }
  return tags
}

function collectBodyTags(entry: VaultEntry): string[] {
  return Array.from(entry.snippet.matchAll(BODY_TAG_RE), match => match[1])
}

function collectTopicTags(entry: VaultEntry): string[] {
  if (!entry.isA) return []
  const type = entry.isA.toLowerCase()
  if (type !== 'collection' && type !== 'topic' && type !== 'tag') return []
  return [entry.title]
}

/** Builds Mem-style `#` collection/tag suggestions from vault metadata. */
export function buildTagCollectionSuggestionItems(
  entries: VaultEntry[],
  query: string,
  insertTag: (tag: string) => void,
): WikilinkSuggestionItem[] {
  const counts = new Map<string, TagCandidate>()
  const addTag = (raw: string | undefined) => {
    const tag = raw ? normalizeTag(raw) : null
    if (!tag) return
    const key = tag.toLowerCase()
    const existing = counts.get(key)
    counts.set(key, { tag: existing?.tag ?? tag, count: (existing?.count ?? 0) + 1 })
  }

  for (const entry of entries) {
    collectPropertyTags(entry).forEach(addTag)
    collectBodyTags(entry).forEach(addTag)
    collectTopicTags(entry).forEach(addTag)
  }

  const normalizedQuery = normalizeTag(query)?.toLowerCase() ?? ''
  const candidates = Array.from(counts.values())
    .filter(candidate => !normalizedQuery || candidate.tag.toLowerCase().includes(normalizedQuery))
    .sort((left, right) => right.count - left.count || left.tag.localeCompare(right.tag))
    .slice(0, MAX_TAG_RESULTS)
    .map(({ tag, count }) => ({
      title: `#${tag}`,
      noteType: count === 1 ? 'Tag' : `${count} notes`,
      TypeIcon: TagIcon,
      aliases: [tag],
      entryTitle: tag,
      path: tag,
      onItemClick: () => insertTag(tag),
    }))

  const exactMatch = normalizedQuery
    ? candidates.some(item => item.entryTitle?.toLowerCase() === normalizedQuery)
    : true
  if (normalizedQuery && !exactMatch) {
    candidates.unshift({
      title: `#${normalizedQuery}`,
      noteType: 'New tag',
      TypeIcon: TagIcon,
      aliases: [normalizedQuery],
      entryTitle: normalizedQuery,
      path: normalizedQuery,
      onItemClick: () => insertTag(normalizedQuery),
    })
  }

  return candidates
}
