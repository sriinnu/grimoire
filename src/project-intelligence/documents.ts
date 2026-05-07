import type {
  ProjectAnalytics,
  ProjectBoardIssue,
  ProjectDocumentCandidate,
  ProjectDocumentKind,
  ProjectDocumentSummary,
} from './types'

const DOCUMENT_MATCHERS: ReadonlyArray<{
  kind: ProjectDocumentKind
  pattern: RegExp
}> = [
  { kind: 'readme', pattern: /^readme(?:\.[^.]+)?\.md$/i },
  { kind: 'architecture', pattern: /^(?:architecture|arch|design|overview)(?:\.[^.]+)?\.md$/i },
  { kind: 'spec', pattern: /^(?:project-spec|spec|requirements|prd)(?:\.[^.]+)?\.md$/i },
  { kind: 'todo', pattern: /^(?:todo(?:-\d{4}-\d{2}-\d{2})?|.*-todo|.*-checklist|checklist)(?:\.[^.]+)?\.md$/i },
  { kind: 'review', pattern: /^(?:review(?:-\d{4}-\d{2}-\d{2})?|.*-review|current-status|status)(?:\.[^.]+)?\.md$/i },
  { kind: 'notes', pattern: /^(?:roadmap|adr|notes|context|guide|workflow|research|integration)(?:\.[^.]+)?\.md$/i },
]

const MAX_DOCUMENTS = 8

/**
 * Classifies a markdown file name into the curated project document kinds
 * Grimoire should surface before generic notes.
 */
export function classifyProjectDocument(fileName: string): ProjectDocumentKind | null {
  const baseName = fileName.split(/[\\/]/).pop() ?? fileName
  return DOCUMENT_MATCHERS.find((matcher) => matcher.pattern.test(baseName))?.kind ?? null
}

/**
 * Builds dashboard-ready document summaries from caller-provided file content.
 * File walking stays in Tauri/Rust; this module only owns the portable logic.
 */
export function buildProjectDocumentSummaries(
  candidates: ProjectDocumentCandidate[],
  limit = MAX_DOCUMENTS,
): ProjectDocumentSummary[] {
  const matches = new Map<string, ProjectDocumentSummary>()

  for (const candidate of candidates) {
    const kind = classifyProjectDocument(candidate.relativePath)
    if (!kind || matches.has(candidate.relativePath)) {
      continue
    }

    matches.set(candidate.relativePath, {
      kind,
      title: deriveProjectDocumentTitle(candidate.relativePath, candidate.content),
      relativePath: candidate.relativePath,
      preview: extractProjectDocumentPreview(candidate.content),
      updatedAt: candidate.updatedAt ?? 0,
    })
  }

  return Array.from(matches.values())
    .sort(compareProjectDocuments)
    .slice(0, limit)
}

/**
 * Derives a readable title from the first markdown heading or the file stem.
 */
export function deriveProjectDocumentTitle(relativePath: string, content: string): string {
  const heading = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find((line) => /^#{1,6}\s+\S/.test(line))

  if (heading) {
    return heading.replace(/^#{1,6}\s+/, '').trim()
  }

  const fileName = relativePath.split(/[\\/]/).pop() ?? relativePath
  return fileName
    .replace(/\.md$/i, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

/**
 * Extracts a compact preview without headings, task checkboxes, or fence noise.
 */
export function extractProjectDocumentPreview(content: string, maxLength = 220): string {
  const preview = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(
      (line) =>
        line.length > 0 &&
        !line.startsWith('#') &&
        !line.startsWith('```') &&
        !line.startsWith('- ['),
    )
    .slice(0, 3)
    .join(' ')

  return preview.length > maxLength
    ? `${preview.slice(0, Math.max(0, maxLength - 3)).trimEnd()}...`
    : preview
}

/**
 * Creates the same project-level signals Karya used for dashboard triage.
 */
export function buildProjectAnalytics(
  issues: ProjectBoardIssue[],
  documents: ProjectDocumentSummary[],
): ProjectAnalytics {
  const completed = issues.filter((issue) => issue.status === 'done').length
  const kinds = new Set(documents.map((document) => document.kind))

  return {
    urgentCount: issues.filter(
      (issue) =>
        issue.status !== 'done' && (issue.priority === 'critical' || issue.priority === 'high'),
    ).length,
    completionRate: issues.length === 0 ? 0 : Math.round((completed / issues.length) * 100),
    docsCount: documents.length,
    scannerIssues: issues.filter((issue) => issue.source === 'scanner').length,
    manualIssues: issues.filter((issue) => issue.source === 'manual').length,
    aiIssues: issues.filter((issue) => issue.source === 'ai' || issue.source === 'agent').length,
    hasReadme: kinds.has('readme'),
    hasArchitecture: kinds.has('architecture'),
    hasSpec: kinds.has('spec'),
  }
}

function compareProjectDocuments(
  left: ProjectDocumentSummary,
  right: ProjectDocumentSummary,
): number {
  const kindOrder = documentKindRank(left.kind) - documentKindRank(right.kind)
  if (kindOrder !== 0) {
    return kindOrder
  }

  const updatedOrder = right.updatedAt - left.updatedAt
  return updatedOrder !== 0 ? updatedOrder : left.relativePath.localeCompare(right.relativePath)
}

function documentKindRank(kind: ProjectDocumentKind): number {
  if (kind === 'readme') return 0
  if (kind === 'architecture') return 1
  if (kind === 'spec') return 2
  if (kind === 'todo') return 3
  if (kind === 'review') return 4
  return 5
}

