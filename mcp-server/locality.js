import fs from 'node:fs/promises'
import path from 'node:path'
import matter from 'gray-matter'

const LOCAL_ONLY_FIELD_KEYS = new Set(['localonly', 'nosync', 'neversync', 'private'])
const LOCAL_ONLY_TYPE_NAMES = new Set(['dream', 'dreams', 'health', 'journal', 'journals', 'private', 'therapy'])
const LOCAL_ONLY_PATH_SEGMENTS = new Set(['dream', 'dreams', 'health', 'journal', 'journals', 'local-only', 'private', 'therapy'])
const TRUE_LOCALITY_VALUES = new Set(['1', 'always', 'local', 'local-only', 'local_only', 'private', 'true', 'yes'])

/** Returns true when a vault-relative path is protected by its lane/folder. */
export function isLocalOnlyRelativePath(relativePath) {
  return relativePath
    .split(/[\\/]/)
    .filter(Boolean)
    .some(segment => LOCAL_ONLY_PATH_SEGMENTS.has(segment.toLowerCase()))
}

/** Returns true when parsed frontmatter marks a note as protected. */
export function frontmatterMarksLocalOnly(frontmatter = {}) {
  return Object.entries(frontmatter).some(([key, value]) => {
    const normalizedKey = normalizeKey(key)
    if (LOCAL_ONLY_FIELD_KEYS.has(normalizedKey)) return valueMarksTrue(value)
    if (normalizedKey === 'type' || normalizedKey === 'isa') return valueMatchesLocalOnlyType(value)
    return false
  })
}

/** Returns true when a Markdown file must be withheld from MCP agent reads. */
export async function isLocalOnlyMarkdownFile(vaultRoot, filePath, rawContent) {
  const relativePath = path.relative(vaultRoot, filePath)
  if (isLocalOnlyRelativePath(relativePath)) return true
  if (!isMarkdownFile(filePath)) return false

  const raw = rawContent ?? await fs.readFile(filePath, 'utf-8')
  return frontmatterMarksLocalOnly(matter(raw).data)
}

/** Reads a file only after the Locality Firewall allows it. */
export async function readVisibleMarkdownFile(vaultRoot, filePath, allowLocalOnly = false) {
  const raw = await fs.readFile(filePath, 'utf-8')
  if (!allowLocalOnly && await isLocalOnlyMarkdownFile(vaultRoot, filePath, raw)) {
    throw new Error('Note withheld by Locality Firewall')
  }
  return raw
}

/** Filters Markdown files through the Locality Firewall. */
export async function visibleMarkdownFiles(vaultRoot, files, allowLocalOnly = false) {
  if (allowLocalOnly) return files

  const visible = []
  for (const filePath of files) {
    if (!await isLocalOnlyMarkdownFile(vaultRoot, filePath)) visible.push(filePath)
  }
  return visible
}

function isMarkdownFile(filePath) {
  return ['.md', '.markdown', '.mdown', '.mkd'].includes(path.extname(filePath).toLowerCase())
}

function normalizeKey(value) {
  return value.toLowerCase().replace(/[_\s-]/g, '')
}

function normalizeValue(value) {
  return String(value).trim().toLowerCase()
}

function valueMarksTrue(value) {
  if (value === true || value === 1) return true
  if (typeof value === 'string') return TRUE_LOCALITY_VALUES.has(normalizeValue(value))
  if (Array.isArray(value)) return value.some(valueMarksTrue)
  return false
}

function valueMatchesLocalOnlyType(value) {
  if (typeof value === 'string') return LOCAL_ONLY_TYPE_NAMES.has(normalizeValue(value))
  if (Array.isArray(value)) return value.some(valueMatchesLocalOnlyType)
  return false
}
