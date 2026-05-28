import { invoke } from './tauriRuntime'
import { isTauri, addMockEntry } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { slugifyNoteStem } from '../utils/noteSlug'
import type { AiAgentMessage } from './aiAgentConversation'
import type { AskContextPackage } from './askContextPackage'
import {
  handoffFrontmatter,
  type CrystallizeHandoffMetadata,
} from './crystallizeHandoff'
import { buildCrystallizeMockEntry } from './crystallizeMockEntry'
import {
  buildCrystallizeSourceLabels,
  buildSourceLinkLines,
  sourceNotesFrontmatter,
  wikilinkLabel,
} from './crystallizeProvenance'
import type {
  CrystallizeActiveNotePatch,
  CrystallizeProposal,
  CrystallizeProposalSummary,
} from './crystallizeProposalTypes'
import {
  buildLedgerContract,
  buildLedgerContractLines,
  buildReviewChanges,
  countLedgerFrontmatterFields,
} from './crystallizeProposalReview'
import { isEntryLocalOnly } from './localityPolicy'

export type {
  CrystallizeActiveNotePatch,
  CrystallizeChange,
  CrystallizeLedgerContract,
  CrystallizeProposal,
  CrystallizeProposalSummary,
} from './crystallizeProposalTypes'
export { appendCrystallizePatchToContent, applyCrystallizePatchToContent } from './crystallizeProposalReview'

interface CrystallizeProposalParams {
  askContextPackage?: AskContextPackage | null
  handoffMetadata?: CrystallizeHandoffMetadata | null
  response: string
  sourceEntries?: VaultEntry[]
  sourceLabels?: string[]
  sourceName?: string
  titleSubject?: string
  vaultPath: string
  activeEntry?: VaultEntry | null
  activeNoteContent?: string | null
  now?: Date
}

const CRYSTALLIZED_FOLDER = 'memory/crystallized'
const DEFAULT_MEMORY_REVIEW_DAYS = 90

/** Returns the newest assistant response that can become durable Markdown. */
export function latestCrystallizableResponse(messages: Array<{ response?: string }>): string | null {
  return latestCrystallizableMessage(messages)?.response ?? null
}

/** Returns the newest assistant response with any source-safe ask context package. */
export function latestCrystallizableMessage(
  messages: Array<Pick<AiAgentMessage, 'contextPackage' | 'response'>>,
): { contextPackage?: AskContextPackage; response: string } | null {
  for (const message of [...messages].reverse()) {
    const response = message.response?.trim()
    if (response) return {
      ...(message.contextPackage ? { contextPackage: message.contextPackage } : {}),
      response,
    }
  }
  return null
}

/** Builds the reviewed Markdown artifact for a crystallized AI response. */
export function buildCrystallizeProposal({
  askContextPackage,
  handoffMetadata = null,
  response,
  vaultPath,
  activeEntry,
  activeNoteContent,
  sourceEntries,
  sourceLabels: providedSourceLabels,
  sourceName = 'AI Chat',
  titleSubject,
  now = new Date(),
}: CrystallizeProposalParams): CrystallizeProposal {
  const date = now.toISOString().slice(0, 10)
  const reviewedAt = now.toISOString()
  const sourceLabels = buildCrystallizeSourceLabels({
    activeEntry,
    askContextPackage,
    sourceEntries,
    sourceLabels: providedSourceLabels,
    sourceName,
  })
  const sourceLabel = sourceLabels[0] ?? 'AI chat'
  const ledgerContract = buildLedgerContract(sourceLabels.length, reviewDateAfter(now, DEFAULT_MEMORY_REVIEW_DAYS))
  const subject = titleSubject ?? activeNoteTitleSubject(activeEntry, sourceLabel, sourceName)
  const title = `Crystallized - ${subject} - ${date}`
  const slug = `${slugifyNoteStem(title)}-${now.getTime()}`
  const relativePath = `${CRYSTALLIZED_FOLDER}/${slug}.md`
  const targetPath = `${vaultPath.replace(/\/+$/, '')}/${relativePath}`
  const activeNotePatch = buildActiveNotePatch({
    activeEntry,
    activeNoteContent,
    memoryTitle: title,
    response: response.trim(),
    reviewedAt,
    sourceLabel,
    vaultPath,
  })
  const frontmatter = [
    `title: ${yamlString(title)}`,
    'type: Memory',
    `source: ${yamlString(sourceName)}`,
    `source_note: ${yamlString(sourceLabel)}`,
    ...sourceNotesFrontmatter(sourceLabels),
    ...handoffFrontmatter(handoffMetadata),
    `confidence: ${ledgerContract.confidence}`,
    `memory_status: ${ledgerContract.status}`,
    `memory_review_state: ${ledgerContract.reviewState}`,
    `memory_source_count: ${ledgerContract.sourceCount}`,
    `expires_at: ${ledgerContract.expiresAt}`,
    'contradicted_by: []',
    `last_seen: ${date}`,
    `memory_version: ${ledgerContract.version}`,
    `reviewed_at: ${yamlString(reviewedAt)}`,
    `locality: ${ledgerContract.locality}`,
    'crystallized: true',
  ]
  const sourceLinks = buildSourceLinkLines(sourceLabels, response)
  const ledgerContractLines = buildLedgerContractLines(ledgerContract)
  const markdown = [
    '---',
    ...frontmatter,
    '---',
    '',
    `# ${title}`,
    '',
    '## Source Links',
    '',
    ...sourceLinks,
    '',
    '## Ledger Contract',
    '',
    ...ledgerContractLines,
    '',
    '## Proposed Memory',
    '',
    response.trim(),
    '',
  ].join('\n')

  return {
    title,
    targetPath,
    relativePath,
    sourceName,
    sourceLabel,
    sourceLabels,
    handoffMetadata,
    ledgerContract,
    activeNotePatch,
    changes: buildReviewChanges(
      relativePath,
      sourceLinks,
      frontmatter,
      ledgerContractLines,
      response.trim(),
      activeNotePatch,
    ),
    markdown,
    reviewedAt,
  }
}

/** Persists a reviewed crystallized note to the local vault. */
export async function persistCrystallizedNote(proposal: CrystallizeProposal): Promise<void> {
  if (isTauri()) {
    await invoke<void>('create_note_content', { path: proposal.targetPath, content: proposal.markdown })
    return
  }

  addMockEntry(buildCrystallizeMockEntry(proposal), proposal.markdown)
}

/** Summarizes the review packet without exposing source note body text. */
export function summarizeCrystallizeProposal(proposal: CrystallizeProposal | null): CrystallizeProposalSummary | null {
  if (!proposal) return null
  const activeNoteHunks = proposal.changes.filter(change => change.target === proposal.activeNotePatch?.relativePath)
  const sourceCount = proposal.changes
    .find(change => change.id === 'link-sources')
    ?.after
    .split('\n')
    .filter(line => line.trim().startsWith('- '))
    .length ?? 0
  return {
    activeNoteHunkCount: activeNoteHunks.length,
    activeNoteTarget: proposal.activeNotePatch?.relativePath ?? null,
    contradictionCount: proposal.ledgerContract.contradictedBy.length,
    expiresAt: proposal.ledgerContract.expiresAt,
    hunkCount: proposal.changes.length,
    ledgerFieldCount: countLedgerFrontmatterFields(proposal),
    sourceCount,
    targetFolder: proposal.relativePath.split('/').slice(0, -1).join('/'),
    taskCount: proposal.changes.filter(change => change.kind === 'task').length,
    writeContract: {
      format: 'Markdown',
      requiresGit: false,
      requiresRemoteSync: false,
      reviewGate: 'before-write',
      visibility: 'human-reviewed',
    },
  }
}

function reviewDateAfter(now: Date, days: number): string {
  const next = new Date(now.getTime())
  next.setUTCDate(next.getUTCDate() + days)
  return next.toISOString().slice(0, 10)
}

function activeNoteTitleSubject(
  activeEntry: VaultEntry | null | undefined,
  sourceLabel: string,
  sourceName: string,
): string {
  if (!activeEntry) return sourceName
  if (isEntryLocalOnly(activeEntry)) return sourceLabel
  return activeEntry.title || sourceName
}

function buildActiveNotePatch({
  activeEntry,
  activeNoteContent,
  memoryTitle,
  response,
  reviewedAt,
  sourceLabel,
  vaultPath,
}: {
  activeEntry?: VaultEntry | null
  activeNoteContent?: string | null
  memoryTitle: string
  response: string
  reviewedAt: string
  sourceLabel: string
  vaultPath: string
}): CrystallizeActiveNotePatch | null {
  if (!activeEntry || activeNoteContent == null) return null

  const reviewedDate = reviewedAt.slice(0, 10)
  const memoryLink = wikilinkLabel(memoryTitle)
  const frontmatterMarkdown = [
    `last_crystallized_at: ${yamlString(reviewedAt)}`,
    'crystallized_memories:',
    `  - ${yamlString(memoryLink)}`,
  ].join('\n')
  const appendMarkdown = [
    '## Crystallized Follow-up',
    '',
    `- Memory: ${memoryLink}`,
    `- Source: ${sourceLabel}`,
    `- Reviewed: ${reviewedDate}`,
    '',
    response,
  ].join('\n')

  return {
    targetPath: activeEntry.path,
    relativePath: relativeToVaultPath(activeEntry.path, vaultPath),
    frontmatterMarkdown,
    appendMarkdown,
  }
}

function relativeToVaultPath(path: string, vaultPath: string): string {
  const normalizedVault = vaultPath.replace(/\/+$/, '')
  if (normalizedVault && path.startsWith(`${normalizedVault}/`)) {
    return path.slice(normalizedVault.length + 1)
  }
  return path.replace(/^\/+/, '')
}

function yamlString(value: string): string {
  return JSON.stringify(value)
}
