import type { SidebarSelection, VaultEntry } from '../types'

export interface ProjectFileResult {
  entry: VaultEntry
  label: string
  path: string
  content: string
  preview: string
  markdown: boolean
}

/** Builds a durable default Markdown document for a folder/project note. */
export function createProjectDocContent(title: string): string {
  return `---\ntitle: ${title}\ntype: Note\n---\n# ${title}\n\n`
}

/** Turns a typed search query into a conservative file name stem. */
export function slugifyProjectDocName(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'untitled'
}

/** Derives the selected project folder path from the generated board path. */
export function deriveProjectFolderPath(boardPath: string | null): string | null {
  return boardPath?.replace(/\/BOARD\.md$/i, '') ?? null
}

/** Checks whether a vault path already exists in the loaded entry index. */
export function findExistingProjectPath(entries: VaultEntry[], path: string): boolean {
  const normalizedPath = path.replace(/\\/g, '/').toLowerCase()
  return entries.some((entry) => entry.path.replace(/\\/g, '/').toLowerCase() === normalizedPath)
}

/** Builds Markdown-first search results for the selected folder. */
export function buildProjectFileResults(
  entries: VaultEntry[],
  selection: SidebarSelection,
  contentByPath: ReadonlyMap<string, string>,
  includeSource: boolean,
): ProjectFileResult[] {
  if (selection.kind !== 'folder') return []

  return entries
    .filter((entry) => !entry.archived && isEntryInFolder(entry, selection.path))
    .filter((entry) => includeSource || isMarkdownEntry(entry))
    .map((entry) => {
      const content = contentByPath.get(entry.path) ?? entry.snippet ?? ''
      return {
        entry,
        label: entry.title || stripMarkdownExtension(entry.filename),
        path: entry.path,
        content,
        preview: firstReadableLine(content) ?? entry.snippet ?? '',
        markdown: isMarkdownEntry(entry),
      }
    })
    .sort((left, right) => Number(right.markdown) - Number(left.markdown) || left.label.localeCompare(right.label))
}

/** Filters project file results by label, path, and preview text. */
export function filterProjectFileResults(
  results: ProjectFileResult[],
  query: string,
): ProjectFileResult[] {
  const normalizedQuery = query.trim().toLowerCase()
  if (!normalizedQuery) return results.slice(0, 8)

  return results
    .filter((result) =>
      `${result.label} ${result.path} ${result.preview}`.toLowerCase().includes(normalizedQuery),
    )
    .slice(0, 10)
}

function isMarkdownEntry(entry: VaultEntry): boolean {
  return entry.fileKind === 'markdown' || !entry.fileKind
}

function isEntryInFolder(entry: VaultEntry, folderPath: string): boolean {
  const normalized = entry.path.replace(/\\/g, '/')
  return normalized.includes(`/${folderPath}/`) || normalized.startsWith(`${folderPath}/`)
}

function stripMarkdownExtension(value: string): string {
  return value.replace(/\.md$/i, '')
}

function firstReadableLine(content: string): string | null {
  return content.split(/\r?\n/).find((line) => line.trim() && !line.startsWith('#'))?.trim() ?? null
}
