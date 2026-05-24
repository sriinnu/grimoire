import type { SidebarSelection, VaultEntry } from '../types'
import { generateProjectBoardMarkdown } from './boardGenerator'
import { buildProjectAnalytics, buildProjectDocumentSummaries } from './documents'
import { parseProjectIssuesFromContent } from './issueParser'
import type {
  ExtractedProjectIssue,
  ProjectAnalytics,
  ProjectBoardIssue,
  ProjectBoardProject,
  ProjectDocumentSummary,
} from './types'

export interface GrimoireProjectDocument extends ProjectDocumentSummary {
  entry: VaultEntry
}

export interface GrimoireProjectIntelligence {
  folderPath: string
  project: ProjectBoardProject
  documents: GrimoireProjectDocument[]
  issues: ExtractedProjectIssue[]
  analytics: ProjectAnalytics
  boardMarkdown: string
  boardPath: string | null
  markdownCount: number
  otherCount: number
}

const PROJECT_ID = 'current-folder'

export type ProjectContentByPath = ReadonlyMap<string, string> | Readonly<Record<string, string>>

/**
 * Builds project intelligence from the vault entries already loaded in Grimoire.
 * When full content is available, TODO and document extraction use it; otherwise
 * this falls back to indexed snippets so folder views still render immediately.
 */
export function buildGrimoireProjectIntelligence(
  entries: VaultEntry[],
  selection: SidebarSelection,
  contentByPath?: ProjectContentByPath,
): GrimoireProjectIntelligence | null {
  if (selection.kind !== 'folder') return null

  const folderEntries = entries.filter((entry) => isEntryInFolder(entry, selection.path))
  const activeEntries = folderEntries.filter((entry) => !entry.archived)
  const markdownEntries = activeEntries.filter(isMarkdownEntry)
  const otherEntries = activeEntries.filter((entry) => !isMarkdownEntry(entry))

  const documentsByPath = new Map(markdownEntries.map((entry) => [relativePath(entry.path), entry]))
  const documentSummaries = buildProjectDocumentSummaries(
    markdownEntries.map((entry) => ({
      relativePath: relativePath(entry.path),
      content: candidateContent(entry, contentByPath),
      updatedAt: entry.modifiedAt ?? entry.createdAt ?? 0,
    })),
  )
  const documents = documentSummaries
    .map((summary) => {
      const entry = documentsByPath.get(summary.relativePath)
      return entry ? { ...summary, entry } : null
    })
    .filter((document): document is GrimoireProjectDocument => document !== null)

  const issues = activeEntries.flatMap((entry) =>
    parseProjectIssuesFromContent(candidateContent(entry, contentByPath), relativePath(entry.path))
      .map((issue) => ({ ...issue, sourcePath: entry.path })),
  )
  const project = {
    id: PROJECT_ID,
    name: projectName(selection.path),
    path: selection.path,
  }
  const boardIssues = issues.map((issue): ProjectBoardIssue => ({
    id: scannerIssueId(PROJECT_ID, issue),
    projectId: PROJECT_ID,
    title: issue.title,
    status: 'open',
    priority: issue.priority,
    source: 'scanner',
    sourceFile: issue.sourceFile,
    sourceLine: issue.sourceLine,
    description: issue.description,
  }))

  return {
    folderPath: selection.path,
    project,
    documents,
    issues,
    analytics: buildProjectAnalytics(boardIssues, documents),
    boardMarkdown: generateProjectBoardMarkdown({ projects: [project], issues: boardIssues }),
    boardPath: deriveProjectBoardPath(folderEntries, selection.path),
    markdownCount: markdownEntries.length,
    otherCount: otherEntries.length,
  }
}

/**
 * Derives a durable `BOARD.md` path for a selected folder from loaded entries.
 */
export function deriveProjectBoardPath(entries: VaultEntry[], folderPath: string): string | null {
  const normalizedFolder = folderPath.replace(/^\/+|\/+$/g, '')
  const folderNeedle = `/${normalizedFolder}/`
  const entryPath = entries.map((entry) => entry.path.replace(/\\/g, '/')).find((path) => path.includes(folderNeedle))
  if (!entryPath) return null

  const folderStart = entryPath.indexOf(folderNeedle)
  return `${entryPath.slice(0, folderStart)}${folderNeedle}BOARD.md`
}

function candidateContent(entry: VaultEntry, contentByPath?: ProjectContentByPath): string {
  const fullContent = lookupContent(contentByPath, entry.path)
  if (fullContent !== null) return fullContent

  const heading = entry.hasH1 ? '' : `# ${entry.title}\n`
  return `${heading}${entry.snippet ?? ''}`
}

function lookupContent(contentByPath: ProjectContentByPath | undefined, path: string): string | null {
  if (!contentByPath) return null
  const maybeGet = (contentByPath as { get?: unknown }).get
  if (typeof maybeGet === 'function') return maybeGet.call(contentByPath, path) ?? null
  const record = contentByPath as Readonly<Record<string, string>>
  return Object.prototype.hasOwnProperty.call(record, path) ? record[path] : null
}

function isMarkdownEntry(entry: VaultEntry): boolean {
  return entry.fileKind === 'markdown' || !entry.fileKind
}

function isEntryInFolder(entry: VaultEntry, folderPath: string): boolean {
  const normalized = entry.path.replace(/\\/g, '/')
  return normalized.includes(`/${folderPath}/`) || normalized.startsWith(`${folderPath}/`)
}

function relativePath(path: string): string {
  return path.replace(/\\/g, '/').split('/').slice(-3).join('/')
}

function projectName(folderPath: string): string {
  const name = folderPath.split('/').filter(Boolean).pop() ?? folderPath
  return name
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function scannerIssueId(projectId: string, issue: ExtractedProjectIssue): string {
  const basis = `${projectId}|${issue.sourceFile}|${issue.sourceLine}|${issue.type}|${issue.title}`
  let hash = 2166136261
  for (let index = 0; index < basis.length; index += 1) {
    hash ^= basis.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return `scanner-${(hash >>> 0).toString(36)}`
}
