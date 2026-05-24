/**
 * Shared types for project intelligence imported from the Karya Board work.
 */

export type ProjectDocumentKind =
  | 'readme'
  | 'architecture'
  | 'spec'
  | 'todo'
  | 'review'
  | 'notes'

export interface ProjectDocumentCandidate {
  /** Path relative to the project root. */
  relativePath: string
  /** Markdown or text content used for title and preview extraction. */
  content: string
  /** Last modified timestamp, when the caller has one. */
  updatedAt?: number
}

export interface ProjectDocumentSummary {
  /** Curated document kind for dashboard/editor surfacing. */
  kind: ProjectDocumentKind
  /** Human-friendly title derived from the first heading or file name. */
  title: string
  /** Path relative to the project root. */
  relativePath: string
  /** Short readable excerpt. */
  preview: string
  /** Last modified timestamp. */
  updatedAt: number
}

export type ProjectIssuePriority = 'low' | 'medium' | 'high' | 'critical'

export type ProjectIssueType = 'todo' | 'fixme' | 'hack' | 'note'

export type ProjectIssueStatus = 'open' | 'in_progress' | 'done'

export type ProjectIssueSource = 'manual' | 'scanner' | 'ai' | 'agent' | 'karya'

export interface ExtractedProjectIssue {
  /** Human-readable work item title. */
  title: string
  /** Optional longer body, reserved for richer extraction later. */
  description: string | null
  /** Priority inferred from text. */
  priority: ProjectIssuePriority
  /** Source file where the issue was found. */
  sourceFile: string
  /** Exact vault entry path when the scanner knows it. */
  sourcePath?: string
  /** One-based line number in the source file. */
  sourceLine: number
  /** Source marker that produced the issue. */
  type: ProjectIssueType
}

export interface ProjectBoardIssue {
  /** Stable issue identifier. */
  id: string
  /** Owning project identifier. */
  projectId: string
  /** Human-readable work item title. */
  title: string
  /** Current lifecycle state. */
  status: ProjectIssueStatus
  /** Issue priority. */
  priority: ProjectIssuePriority
  /** Where this issue came from. */
  source: ProjectIssueSource
  /** Optional source file path. */
  sourceFile?: string
  /** Optional one-based line number in the source file. */
  sourceLine?: number
  /** Optional longer issue body. */
  description?: string | null
}

export interface ProjectBoardProject {
  /** Stable project identifier. */
  id: string
  /** Human-friendly project name. */
  name: string
  /** Project root path, when known. */
  path?: string
}

export interface ProjectAnalytics {
  /** Non-done high urgency issues. */
  urgentCount: number
  /** Completed work percentage across tracked issues. */
  completionRate: number
  /** Number of surfaced documents. */
  docsCount: number
  /** Number of scanner-generated issues. */
  scannerIssues: number
  /** Number of manual issues. */
  manualIssues: number
  /** Number of AI-created issues. */
  aiIssues: number
  /** Whether a README-like document exists. */
  hasReadme: boolean
  /** Whether an architecture/design document exists. */
  hasArchitecture: boolean
  /** Whether a spec/requirements document exists. */
  hasSpec: boolean
}
