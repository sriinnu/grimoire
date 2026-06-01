import type { VaultEntry } from '../types'
import { handoffProperties, type CrystallizeHandoffMetadata } from './crystallizeHandoff'
import type { CrystallizeLedgerContract } from './crystallizeProposalTypes'

type MockProperty = VaultEntry['properties'][string]

interface CrystallizeMockProposal {
  handoffMetadata: CrystallizeHandoffMetadata | null
  ledgerContract: CrystallizeLedgerContract
  markdown: string
  relativePath: string
  reviewedAt: string
  sourceLabel: string
  sourceLabels: string[]
  sourceName: string
  targetPath: string
  title: string
}

/** Builds a mock vault entry from the accepted Markdown so previews match edited frontmatter. */
export function buildCrystallizeMockEntry(proposal: CrystallizeMockProposal): VaultEntry {
  const now = Math.floor(Date.now() / 1000)
  const parsedProperties = parseFrontmatterProperties(proposal.markdown)
  const properties = Object.keys(parsedProperties).length > 0 ? parsedProperties : fallbackProperties(proposal)
  return {
    path: proposal.targetPath,
    filename: proposal.relativePath.split('/').pop() ?? 'crystallized.md',
    title: stringProperty(properties.title) ?? proposal.title,
    isA: stringProperty(properties.type) ?? 'Memory',
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
    properties,
    hasH1: true,
    fileKind: 'markdown',
  }
}

function fallbackProperties(proposal: CrystallizeMockProposal): VaultEntry['properties'] {
  return {
    source: proposal.sourceName,
    source_note: proposal.sourceLabel,
    ...(proposal.sourceLabels.length > 1 ? { source_notes: proposal.sourceLabels } : {}),
    ...handoffProperties(proposal.handoffMetadata),
    confidence: 'proposed',
    memory_status: 'proposed',
    memory_review_state: 'reviewed',
    memory_source_count: proposal.sourceLabels.length,
    expires_at: proposal.ledgerContract.expiresAt,
    contradicted_by: proposal.ledgerContract.contradictedBy,
    memory_version: 1,
    reviewed_at: proposal.reviewedAt,
    locality: 'vault',
    crystallized: true,
  }
}

function parseFrontmatterProperties(markdown: string): VaultEntry['properties'] {
  const match = /^---\n([\s\S]*?)\n---/.exec(markdown)
  if (!match) return {}
  const lines = match[1].split('\n')
  const properties: VaultEntry['properties'] = {}
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    const keyMatch = /^([A-Za-z0-9_-]+):(?:\s*(.*))?$/.exec(line)
    if (!keyMatch) continue
    const [, key, rawValue = ''] = keyMatch
    if (rawValue.trim() === '') {
      const list: string[] = []
      while (/^\s+-\s+/.test(lines[index + 1] ?? '')) {
        index += 1
        list.push(String(parseScalar(lines[index].replace(/^\s+-\s+/, ''))))
      }
      properties[key] = list
      continue
    }
    properties[key] = parseScalar(rawValue)
  }
  return properties
}

function parseScalar(value: string): MockProperty {
  const trimmed = value.trim()
  if (trimmed === 'true') return true
  if (trimmed === 'false') return false
  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) return Number(trimmed)
  try {
    const parsed = JSON.parse(trimmed)
    if (Array.isArray(parsed) && parsed.every(item => typeof item === 'string')) return parsed
    return typeof parsed === 'string' || typeof parsed === 'number' || typeof parsed === 'boolean' ? parsed : trimmed
  } catch {
    return trimmed
  }
}

function stringProperty(value: MockProperty): string | null {
  return typeof value === 'string' ? value : null
}
