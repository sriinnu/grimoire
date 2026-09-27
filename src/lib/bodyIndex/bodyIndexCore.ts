import { parseFrontmatter } from '../../utils/frontmatter'

/** One tag as the sidebar shows it: lowercase, no leading '#', nested with '/'. */
export type Tag = string

export interface TagRecord {
  tag: Tag
  count: number
  paths: string[]
}

export interface TagSnapshot {
  version: number
  tags: TagRecord[]
}

export const EMPTY_TAG_SNAPSHOT: TagSnapshot = { version: 0, tags: [] }

const FRONTMATTER = /^---\n[\s\S]*?\n---\n?/
const FENCED_CODE = /(^|\n)(```|~~~)[^\n]*\n[\s\S]*?\n\2[ \t]*(?=\n|$)/g
const INLINE_CODE = /`[^`\n]*`/g
// '#tag' after start, whitespace or an opening bracket. Headings ('# Title')
// have a space after the hash so they never match; '#123' is an issue number.
const HASHTAG = /(^|[\s([{])#([\p{L}\p{N}_][\p{L}\p{N}_\-/]*)/gu
const WORD = /[\p{L}\p{N}_]+(?:['’][\p{L}\p{N}_]+)*/gu

export function normalizeTag(raw: string): Tag | null {
  const trimmed = raw.trim().replace(/^#+/, '').replace(/^\/+|\/+$/g, '').replace(/\/{2,}/g, '/').toLowerCase()
  if (!trimmed) return null
  if (/^\d+$/.test(trimmed)) return null
  return trimmed
}

/** 'a/b/c' → ['a', 'a/b', 'a/b/c'], so a nested tag counts under each ancestor. */
export function tagLineage(tag: Tag): Tag[] {
  const parts = tag.split('/')
  return parts.map((_, index) => parts.slice(0, index + 1).join('/'))
}

function frontmatterTags(content: string): Tag[] {
  const frontmatter = parseFrontmatter(content)
  const raw = frontmatter.tags ?? frontmatter.Tags
  if (raw == null || typeof raw === 'boolean' || typeof raw === 'number') return []
  const items = Array.isArray(raw) ? raw : raw.split(',')
  return items.map(normalizeTag).filter((tag): tag is Tag => tag !== null)
}

/** Body with frontmatter, fenced blocks and inline code removed. */
export function stripNonProse(content: string): string {
  return content.replace(FRONTMATTER, '').replace(FENCED_CODE, '$1').replace(INLINE_CODE, ' ')
}

function bodyTags(prose: string): Tag[] {
  const tags: Tag[] = []
  for (const match of prose.matchAll(HASHTAG)) {
    const tag = normalizeTag(match[2])
    if (tag) tags.push(tag)
  }
  return tags
}

/** Every tag the note carries, exact form only (no ancestors), deduplicated. */
export function extractTags(content: string): Tag[] {
  const prose = stripNonProse(content)
  return Array.from(new Set([...frontmatterTags(content), ...bodyTags(prose)]))
}

export function tokenizeWords(text: string): Set<string> {
  const words = new Set<string>()
  for (const match of text.toLowerCase().matchAll(WORD)) words.add(match[0])
  return words
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/** Whole-word, case-insensitive test for a phrase inside prose. */
export function mentionsPhrase(prose: string, phrase: string): boolean {
  const words = phrase.trim().split(/\s+/).filter(Boolean).map(escapeRegExp)
  if (words.length === 0) return false
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}_])${words.join('\\s+')}(?![\\p{L}\\p{N}_])`, 'iu')
  return pattern.test(prose)
}

interface IndexedNote {
  tags: Tag[]
  words: Set<string>
  prose: string
}

/**
 * The index itself: runs inside the worker, or on the main thread where
 * workers are unavailable (tests, very old webviews). Pure data, no DOM.
 */
export class BodyIndexStore {
  private notes = new Map<string, IndexedNote>()
  private tagPaths = new Map<Tag, Set<string>>()
  private version = 0

  update(path: string, content: string): void {
    this.remove(path)
    const prose = stripNonProse(content)
    const tags = extractTags(content)
    for (const tag of tags) {
      for (const ancestor of tagLineage(tag)) {
        let paths = this.tagPaths.get(ancestor)
        if (!paths) {
          paths = new Set()
          this.tagPaths.set(ancestor, paths)
        }
        paths.add(path)
      }
    }
    this.notes.set(path, { tags, words: tokenizeWords(prose), prose: prose.toLowerCase() })
    this.version += 1
  }

  remove(path: string): void {
    const existing = this.notes.get(path)
    if (!existing) return
    for (const tag of existing.tags) {
      for (const ancestor of tagLineage(tag)) {
        const paths = this.tagPaths.get(ancestor)
        if (!paths) continue
        paths.delete(path)
        if (paths.size === 0) this.tagPaths.delete(ancestor)
      }
    }
    this.notes.delete(path)
    this.version += 1
  }

  clear(): void {
    this.notes.clear()
    this.tagPaths.clear()
    this.version += 1
  }

  has(path: string): boolean {
    return this.notes.has(path)
  }

  size(): number {
    return this.notes.size
  }

  tagsFor(path: string): Tag[] {
    return [...(this.notes.get(path)?.tags ?? [])]
  }

  pathsWithTag(tag: Tag): string[] {
    const normalized = normalizeTag(tag)
    if (!normalized) return []
    return [...(this.tagPaths.get(normalized) ?? [])].sort()
  }

  allTags(): Array<{ tag: Tag; count: number }> {
    return [...this.tagPaths.entries()]
      .map(([tag, paths]) => ({ tag, count: paths.size }))
      .sort((a, b) => a.tag.localeCompare(b.tag))
  }

  /** Notes whose prose contains the phrase as whole words, in path order. */
  pathsMentioning(phrase: string, limit = 50): string[] {
    const needles = [...tokenizeWords(phrase)]
    if (needles.length === 0) return []
    const hits: string[] = []
    for (const [path, note] of this.notes) {
      if (!needles.every((word) => note.words.has(word))) continue
      if (!mentionsPhrase(note.prose, phrase)) continue
      hits.push(path)
      if (hits.length >= limit) break
    }
    return hits.sort()
  }

  snapshot(): TagSnapshot {
    return {
      version: this.version,
      tags: [...this.tagPaths.entries()]
        .map(([tag, paths]) => ({ tag, count: paths.size, paths: [...paths].sort() }))
        .sort((a, b) => a.tag.localeCompare(b.tag)),
    }
  }
}
