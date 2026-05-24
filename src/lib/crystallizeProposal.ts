import { invoke } from './tauriRuntime'
import { isTauri, addMockEntry } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { slugifyNoteStem } from '../utils/noteSlug'
import { extractOutgoingLinks } from '../utils/wikilinks'
import type { AiAgentMessage } from './aiAgentConversation'
import type { AskContextPackage } from './askContextPackage'

export interface CrystallizeProposal {
  title: string
  targetPath: string
  relativePath: string
  sourceLabel: string
  sourceLabels: string[]
  changes: CrystallizeChange[]
  markdown: string
  reviewedAt: string
}

export interface CrystallizeChange {
  id: string
  kind: 'file' | 'frontmatter' | 'backlink' | 'body' | 'task'
  label: string
  target: string
  before: string
  after: string
}

export interface CrystallizeProposalSummary {
  hunkCount: number
  sourceCount: number
  targetFolder: string
  taskCount: number
}

interface CrystallizeProposalParams {
  askContextPackage?: AskContextPackage | null
  response: string
  vaultPath: string
  activeEntry?: VaultEntry | null
  now?: Date
}

const CRYSTALLIZED_FOLDER = 'memory/crystallized'

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
  response,
  vaultPath,
  activeEntry,
  now = new Date(),
}: CrystallizeProposalParams): CrystallizeProposal {
  const date = now.toISOString().slice(0, 10)
  const reviewedAt = now.toISOString()
  const sourceLabels = buildSourceLabels(activeEntry, askContextPackage)
  const sourceLabel = sourceLabels[0] ?? 'AI chat'
  const title = `Crystallized - ${activeEntry?.title ?? 'AI Chat'} - ${date}`
  const slug = `${slugifyNoteStem(title)}-${now.getTime()}`
  const relativePath = `${CRYSTALLIZED_FOLDER}/${slug}.md`
  const targetPath = `${vaultPath.replace(/\/+$/, '')}/${relativePath}`
  const frontmatter = [
    `title: ${yamlString(title)}`,
    'type: Memory',
    'source: AI Chat',
    `source_note: ${yamlString(sourceLabel)}`,
    ...sourceNotesFrontmatter(sourceLabels),
    'confidence: proposed',
    `last_seen: ${date}`,
    'memory_version: 1',
    `reviewed_at: ${yamlString(reviewedAt)}`,
    'locality: vault',
    'crystallized: true',
  ]
  const sourceLinks = buildSourceLinkLines(sourceLabels, response)
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
    '## Proposed Memory',
    '',
    response.trim(),
    '',
  ].join('\n')

  return {
    title,
    targetPath,
    relativePath,
    sourceLabel,
    sourceLabels,
    changes: buildReviewChanges(relativePath, sourceLinks, frontmatter, response.trim()),
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

  addMockEntry(buildMockEntry(proposal), proposal.markdown)
}

/** Summarizes the review packet without exposing source note body text. */
export function summarizeCrystallizeProposal(proposal: CrystallizeProposal | null): CrystallizeProposalSummary | null {
  if (!proposal) return null
  const sourceCount = proposal.changes
    .find(change => change.id === 'link-sources')
    ?.after
    .split('\n')
    .filter(line => line.trim().startsWith('- '))
    .length ?? 0
  return {
    hunkCount: proposal.changes.length,
    sourceCount,
    targetFolder: proposal.relativePath.split('/').slice(0, -1).join('/'),
    taskCount: proposal.changes.filter(change => change.kind === 'task').length,
  }
}

function buildMockEntry(proposal: CrystallizeProposal): VaultEntry {
  const now = Math.floor(Date.now() / 1000)
  return {
    path: proposal.targetPath,
    filename: proposal.relativePath.split('/').pop() ?? 'crystallized.md',
    title: proposal.title,
    isA: 'Memory',
    aliases: [],
    belongsTo: [],
    relatedTo: [],
    status: null,
    archived: false,
    modifiedAt: now,
    createdAt: now,
    fileSize: proposal.markdown.length,
    snippet: 'Crystallized AI memory',
    wordCount: proposal.markdown.trim().split(/\s+/).length,
    relationships: {},
    icon: null,
    color: null,
    order: null,
    sidebarLabel: null,
    template: null,
    sort: null,
    view: null,
    visible: null,
    organized: true,
    favorite: false,
    favoriteIndex: null,
    listPropertiesDisplay: [],
    outgoingLinks: [],
    properties: {
      source: 'AI Chat',
      source_note: proposal.sourceLabel,
      ...(proposal.sourceLabels.length > 1 ? { source_notes: proposal.sourceLabels } : {}),
      confidence: 'proposed',
      memory_version: 1,
      reviewed_at: proposal.reviewedAt,
      locality: 'vault',
      crystallized: true,
    },
    hasH1: true,
    fileKind: 'markdown',
  }
}

function buildReviewChanges(
  relativePath: string,
  sourceLinks: string[],
  frontmatter: string[],
  response: string,
): CrystallizeChange[] {
  const taskLines = extractTaskLines(response)
  const changes: CrystallizeChange[] = [
    {
      id: 'create-memory-note',
      kind: 'file',
      label: 'Create Memory note',
      target: relativePath,
      before: '(no file)',
      after: `Create ${relativePath}`,
    },
    {
      id: 'write-frontmatter',
      kind: 'frontmatter',
      label: 'Write ledger frontmatter',
      target: relativePath,
      before: '(no frontmatter)',
      after: frontmatter.join('\n'),
    },
    {
      id: 'link-sources',
      kind: 'backlink',
      label: 'Write source backlinks',
      target: relativePath,
      before: '(no source links)',
      after: sourceLinks.join('\n'),
    },
    {
      id: 'write-memory-body',
      kind: 'body',
      label: 'Write memory body',
      target: relativePath,
      before: '(no proposed memory)',
      after: response,
    },
  ]
  if (taskLines.length > 0) {
    changes.push({
      id: 'preserve-tasks',
      kind: 'task',
      label: 'Preserve checklist tasks',
      target: relativePath,
      before: '(no extracted tasks)',
      after: taskLines.join('\n'),
    })
  }
  return changes
}

function buildSourceLabels(activeEntry?: VaultEntry | null, askContextPackage?: AskContextPackage | null): string[] {
  if (activeEntry?.title) return [wikilinkLabel(activeEntry.title)]
  if (askContextPackage && askContextPackage.sourceLabels.length > 0) {
    return askContextPackage.sourceLabels.map(wikilinkLabel)
  }
  return ['AI chat']
}

function sourceNotesFrontmatter(sourceLabels: string[]): string[] {
  if (sourceLabels.length <= 1) return []
  return [
    'source_notes:',
    ...sourceLabels.map((label) => `  - ${yamlString(label)}`),
  ]
}

function buildSourceLinkLines(sourceLabels: string[], response: string): string[] {
  const seen = new Set<string>()
  const labels = [...sourceLabels, ...extractOutgoingLinks(response).map(target => `[[${target}]]`)]
  return labels.filter((label) => {
    const normalized = normalizeLinkLabel(label)
    if (!normalized || seen.has(normalized)) return false
    seen.add(normalized)
    return true
  }).map(label => `- ${label}`)
}

function wikilinkLabel(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed === 'AI chat') return 'AI chat'
  if (/^\[\[.+\]\]$/.test(trimmed)) return trimmed
  return `[[${trimmed}]]`
}

function extractTaskLines(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^[-*]\s+\[[ xX]\]\s+\S/.test(line))
}

function normalizeLinkLabel(value: string): string {
  return value
    .replace(/^\[\[/, '')
    .replace(/\]\]$/, '')
    .split('|')[0]
    .trim()
    .toLowerCase()
}

function yamlString(value: string): string {
  return JSON.stringify(value)
}
