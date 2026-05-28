import type { CrystallizeHandoffMetadata } from './crystallizeHandoff'

export interface CrystallizeProposal {
  title: string
  targetPath: string
  relativePath: string
  sourceName: string
  sourceLabel: string
  sourceLabels: string[]
  handoffMetadata: CrystallizeHandoffMetadata | null
  ledgerContract: CrystallizeLedgerContract
  activeNotePatch: CrystallizeActiveNotePatch | null
  changes: CrystallizeChange[]
  markdown: string
  reviewedAt: string
}

export interface CrystallizeLedgerContract {
  contradictedBy: string[]
  confidence: 'proposed'
  expiresAt: string
  locality: 'vault'
  reviewState: 'reviewed'
  sourceCount: number
  status: 'proposed'
  version: number
}

export interface CrystallizeActiveNotePatch {
  targetPath: string
  relativePath: string
  frontmatterMarkdown: string
  appendMarkdown: string
}

export interface CrystallizeChange {
  id: string
  kind: 'file' | 'frontmatter' | 'backlink' | 'body' | 'task' | 'note'
  label: string
  target: string
  before: string
  after: string
}

export interface CrystallizeProposalSummary {
  contradictionCount: number
  expiresAt: string
  hunkCount: number
  ledgerFieldCount: number
  sourceCount: number
  targetFolder: string
  taskCount: number
}
