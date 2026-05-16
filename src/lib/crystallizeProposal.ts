import { invoke } from '@tauri-apps/api/core'
import { isTauri, addMockEntry } from '../mock-tauri'
import type { VaultEntry } from '../types'
import { slugifyNoteStem } from '../utils/noteSlug'

export interface CrystallizeProposal {
  title: string
  targetPath: string
  relativePath: string
  sourceLabel: string
  markdown: string
}

interface CrystallizeProposalParams {
  response: string
  vaultPath: string
  activeEntry?: VaultEntry | null
  now?: Date
}

const CRYSTALLIZED_FOLDER = 'memory/crystallized'

/** Returns the newest assistant response that can become durable Markdown. */
export function latestCrystallizableResponse(messages: Array<{ response?: string }>): string | null {
  for (const message of [...messages].reverse()) {
    const response = message.response?.trim()
    if (response) return response
  }
  return null
}

/** Builds the reviewed Markdown artifact for a crystallized AI response. */
export function buildCrystallizeProposal({
  response,
  vaultPath,
  activeEntry,
  now = new Date(),
}: CrystallizeProposalParams): CrystallizeProposal {
  const date = now.toISOString().slice(0, 10)
  const sourceLabel = activeEntry?.title ? `[[${activeEntry.title}]]` : 'AI chat'
  const title = `Crystallized - ${activeEntry?.title ?? 'AI Chat'} - ${date}`
  const slug = `${slugifyNoteStem(title)}-${now.getTime()}`
  const relativePath = `${CRYSTALLIZED_FOLDER}/${slug}.md`
  const targetPath = `${vaultPath.replace(/\/+$/, '')}/${relativePath}`
  const markdown = [
    '---',
    `title: ${yamlString(title)}`,
    'type: Memory',
    'source: AI Chat',
    `source_note: ${yamlString(sourceLabel)}`,
    'confidence: proposed',
    `last_seen: ${date}`,
    'locality: vault',
    'crystallized: true',
    '---',
    '',
    `# ${title}`,
    '',
    `Source: ${sourceLabel}`,
    '',
    '## Proposed Memory',
    '',
    response.trim(),
    '',
  ].join('\n')

  return { title, targetPath, relativePath, sourceLabel, markdown }
}

/** Persists a reviewed crystallized note to the local vault. */
export async function persistCrystallizedNote(proposal: CrystallizeProposal): Promise<void> {
  if (isTauri()) {
    await invoke<void>('create_note_content', { path: proposal.targetPath, content: proposal.markdown })
    return
  }

  addMockEntry(buildMockEntry(proposal), proposal.markdown)
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
      confidence: 'proposed',
      locality: 'vault',
      crystallized: true,
    },
    hasH1: true,
    fileKind: 'markdown',
  }
}

function yamlString(value: string): string {
  return JSON.stringify(value)
}
