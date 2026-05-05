import fs from 'fs'
import path from 'path'
import matter from 'gray-matter'

interface VaultEntry {
  path: string
  filename: string
  title: string
  isA: string | null
  aliases: string[]
  belongsTo: string[]
  relatedTo: string[]
  status: string | null
  archived: boolean
  trashed: boolean
  trashedAt: number | null
  modifiedAt: number | null
  createdAt: number | null
  fileSize: number
  snippet: string
  wordCount: number
  relationships: Record<string, string[]>
  icon: string | null
  color: string | null
  order: number | null
  sidebarLabel: string | null
  template: string | null
  sort: string | null
  view: string | null
  visible: boolean | null
  outgoingLinks: string[]
  properties: Record<string, string | number | boolean | null>
}

/** Extract all [[wiki-links]] from a string. */
function extractWikiLinks(value: string): string[] {
  const matches = value.match(/\[\[[^\]]+\]\]/g)
  return matches ?? []
}

/** Extract wiki-links from a frontmatter value (string or array of strings). */
function wikiLinksFromValue(value: unknown): string[] {
  if (typeof value === 'string') return extractWikiLinks(value)
  if (Array.isArray(value)) {
    return value.flatMap((v) => (typeof v === 'string' ? extractWikiLinks(v) : []))
  }
  return []
}

// Frontmatter keys that map to dedicated VaultEntry fields (skip in generic relationships)
const DEDICATED_KEYS = new Set([
  'aliases', 'is_a', 'is a', 'belongs_to', 'belongs to',
  'related_to', 'related to', 'status', 'title',
])

function getFrontmatterValue(
  frontmatter: Record<string, unknown>,
  keys: string[],
): unknown {
  const normalizedKeys = new Set(keys.map((key) => key.toLowerCase()))
  return Object.entries(frontmatter).find(([key]) => normalizedKeys.has(key.toLowerCase()))?.[1]
}

function parseYamlBool(value: unknown): boolean | null {
  if (typeof value === 'boolean') return value
  if (typeof value !== 'string') return null

  switch (value.toLowerCase()) {
    case 'true':
    case 'yes':
      return true
    case 'false':
    case 'no':
      return false
    default:
      return null
  }
}

function frontmatterString(frontmatter: Record<string, unknown>, ...keys: string[]): string | null {
  const value = getFrontmatterValue(frontmatter, keys)
  return typeof value === 'string' ? value : null
}

function frontmatterStringArray(frontmatter: Record<string, unknown>, ...keys: string[]): string[] {
  const value = getFrontmatterValue(frontmatter, keys)
  if (Array.isArray(value)) return value.map(String)
  if (typeof value === 'string') return [value]
  return []
}

function frontmatterBool(frontmatter: Record<string, unknown>, ...keys: string[]): boolean | null {
  return parseYamlBool(getFrontmatterValue(frontmatter, keys))
}

function markdownTitle(content: string, frontmatter: Record<string, unknown>, fallback: string): string {
  const title = frontmatterString(frontmatter, 'title')
  if (title) return title

  const h1Match = content.match(/^#\s+(.+)$/m)
  return h1Match ? h1Match[1].trim() : fallback
}

function markdownBodyText(content: string): string {
  return content.replace(/^#+\s+.+$/gm, '').replace(/[\n\r]+/g, ' ').trim()
}

function frontmatterWikiLinks(frontmatter: Record<string, unknown>, ...keys: string[]): string[] {
  return frontmatterStringArray(frontmatter, ...keys).flatMap((value) => extractWikiLinks(value))
}

function frontmatterRelationships(frontmatter: Record<string, unknown>): Record<string, string[]> {
  const relationships: Record<string, string[]> = {}
  for (const [key, value] of Object.entries(frontmatter)) {
    if (DEDICATED_KEYS.has(key.toLowerCase())) continue
    const links = wikiLinksFromValue(value)
    if (links.length > 0) relationships[key] = links
  }
  return relationships
}

export function parseMarkdownFile(filePath: string): VaultEntry | null {
  try {
    const raw = fs.readFileSync(filePath, 'utf-8')
    const stats = fs.statSync(filePath)
    const { data, content } = matter(raw)
    const fm = data as Record<string, unknown>

    const filename = path.basename(filePath)
    const basename = filename.replace(/\.md$/, '')

    const title = markdownTitle(content, fm, basename)
    const bodyText = markdownBodyText(content)
    const snippet = bodyText.slice(0, 200)

    return {
      path: filePath,
      filename,
      title,
      isA: frontmatterString(fm, 'is_a', 'is a', 'type'),
      aliases: frontmatterStringArray(fm, 'aliases'),
      belongsTo: frontmatterWikiLinks(fm, 'belongs_to', 'belongs to'),
      relatedTo: frontmatterWikiLinks(fm, 'related_to', 'related to'),
      status: frontmatterString(fm, 'status'),
      archived: frontmatterBool(fm, 'archived') ?? false,
      trashed: frontmatterBool(fm, 'trashed') ?? false,
      trashedAt: null,
      modifiedAt: stats.mtimeMs,
      createdAt: stats.birthtimeMs,
      fileSize: stats.size,
      snippet,
      wordCount: bodyText.split(/\s+/).filter(Boolean).length,
      relationships: frontmatterRelationships(fm),
      icon: frontmatterString(fm, 'icon'),
      color: frontmatterString(fm, 'color'),
      order: fm.order != null ? Number(fm.order) : null,
      sidebarLabel: frontmatterString(fm, 'sidebar label', 'sidebar_label'),
      template: frontmatterString(fm, 'template'),
      sort: frontmatterString(fm, 'sort'),
      view: frontmatterString(fm, 'view'),
      visible: frontmatterBool(fm, 'visible'),
      outgoingLinks: [],
      properties: {},
    }
  } catch {
    return null
  }
}

/** Recursively find all .md files under a directory. */
export function findMarkdownFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const items = fs.readdirSync(dir, { withFileTypes: true })
    for (const item of items) {
      if (item.name.startsWith('.')) continue
      const full = path.join(dir, item.name)
      if (item.isDirectory()) {
        results.push(...findMarkdownFiles(full))
      } else if (item.name.endsWith('.md')) {
        results.push(full)
      }
    }
  } catch {
    // skip unreadable dirs
  }
  return results
}

