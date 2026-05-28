import type {
  CrystallizeActiveNotePatch,
  CrystallizeChange,
  CrystallizeLedgerContract,
  CrystallizeProposal,
} from './crystallizeProposalTypes'
import { splitFrontmatter } from '../utils/wikilinks'

/** Appends a reviewed Crystallize hunk to the active note without disturbing frontmatter. */
export function appendCrystallizePatchToContent(content: string, appendMarkdown: string): string {
  const patch = appendMarkdown.trim()
  if (!patch) return content

  const base = content.replace(/[ \t]+$/gm, '').replace(/\s*$/, '')
  return `${base}${base ? '\n\n' : ''}${patch}\n`
}

/** Applies reviewed Crystallize metadata and body hunks to the active note. */
export function applyCrystallizePatchToContent(
  content: string,
  frontmatterMarkdown: string | null | undefined,
  appendMarkdown: string | null | undefined,
): string {
  const withFrontmatter = mergeCrystallizeFrontmatter(content, frontmatterMarkdown ?? '')
  return appendCrystallizePatchToContent(withFrontmatter, appendMarkdown ?? '')
}

export function buildReviewChanges(
  relativePath: string,
  sourceLinks: string[],
  frontmatter: string[],
  ledgerContractLines: string[],
  response: string,
  activeNotePatch: CrystallizeActiveNotePatch | null,
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
      id: 'write-ledger-contract',
      kind: 'body',
      label: 'Write ledger contract',
      target: relativePath,
      before: '(no ledger contract)',
      after: ledgerContractLines.join('\n'),
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
  if (activeNotePatch) {
    changes.push({
      id: 'update-active-note-frontmatter',
      kind: 'frontmatter',
      label: 'Update active note metadata',
      target: activeNotePatch.relativePath,
      before: '(no Crystallize metadata)',
      after: activeNotePatch.frontmatterMarkdown,
    })
    changes.push({
      id: 'append-active-note',
      kind: 'note',
      label: 'Append active note',
      target: activeNotePatch.relativePath,
      before: '(no crystallized follow-up block)',
      after: activeNotePatch.appendMarkdown,
    })
  }
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

export function buildLedgerContract(sourceCount: number, expiresAt: string): CrystallizeLedgerContract {
  return {
    contradictedBy: [],
    confidence: 'proposed',
    expiresAt,
    locality: 'vault',
    reviewState: 'reviewed',
    sourceCount,
    status: 'proposed',
    version: 1,
  }
}

export function buildLedgerContractLines(contract: CrystallizeLedgerContract): string[] {
  return [
    `- Status: ${contract.status}`,
    `- Confidence: ${contract.confidence}`,
    `- Review state: ${contract.reviewState}`,
    `- Source count: ${contract.sourceCount}`,
    `- Expires on: ${contract.expiresAt}`,
    `- Contradicted by: ${contract.contradictedBy.length > 0 ? contract.contradictedBy.join(', ') : 'none'}`,
    `- Locality: ${contract.locality}`,
    `- Version: ${contract.version}`,
  ]
}

export function countLedgerFrontmatterFields(proposal: CrystallizeProposal): number {
  const frontmatter = proposal.changes.find(change => change.id === 'write-frontmatter')?.after ?? ''
  return frontmatter
    .split('\n')
    .filter(line => /^(confidence|memory_status|memory_review_state|memory_source_count|expires_at|contradicted_by|memory_version|reviewed_at|locality):/.test(line))
    .length
}

function extractTaskLines(value: string): string[] {
  return value
    .split('\n')
    .map(line => line.trim())
    .filter(line => /^[-*]\s+\[[ xX]\]\s+\S/.test(line))
}

function mergeCrystallizeFrontmatter(content: string, patchMarkdown: string): string {
  const patch = patchMarkdown.trim()
  if (!patch) return content

  const [frontmatter, body] = splitFrontmatter(content)
  if (!frontmatter) return `---\n${patch}\n---\n\n${content.replace(/^\n+/, '')}`

  const merged = mergeFrontmatterBody(frontmatterBody(frontmatter), patch)
  return `---\n${merged}\n---\n${body}`
}

function frontmatterBody(frontmatter: string): string {
  return frontmatter
    .replace(/^---[ \t]*\r?\n/, '')
    .replace(/\r?\n---[ \t]*(?:\r?\n)?$/, '')
    .trim()
}

function mergeFrontmatterBody(existing: string, patch: string): string {
  const lines = existing ? existing.split('\n') : []
  for (const block of parseFrontmatterBlocks(patch)) {
    if (block.key === 'crystallized_memories') {
      mergeMemoryListBlock(lines, block)
    } else {
      upsertBlock(lines, block)
    }
  }
  return lines.join('\n')
}

interface FrontmatterBlock {
  key: string
  lines: string[]
}

function parseFrontmatterBlocks(markdown: string): FrontmatterBlock[] {
  const blocks: FrontmatterBlock[] = []
  for (const line of markdown.split('\n').filter(Boolean)) {
    const key = parseTopLevelKey(line)
    if (key) {
      blocks.push({ key, lines: [line] })
      continue
    }
    blocks.at(-1)?.lines.push(line)
  }
  return blocks
}

function upsertBlock(lines: string[], block: FrontmatterBlock): void {
  const index = lines.findIndex(line => parseTopLevelKey(line) === block.key)
  if (index === -1) {
    lines.push(...block.lines)
    return
  }
  lines.splice(index, findBlockEnd(lines, index) - index, ...block.lines)
}

function mergeMemoryListBlock(lines: string[], block: FrontmatterBlock): void {
  const keyIndex = lines.findIndex(line => parseTopLevelKey(line) === block.key)
  const patchItems = listItemsFromBlock(block.lines)
  if (keyIndex === -1) {
    lines.push(...formatMemoryList(patchItems))
    return
  }

  const blockEnd = findBlockEnd(lines, keyIndex)
  const mergedItems = [...listItemsFromBlock(lines.slice(keyIndex, blockEnd))]
  for (const item of patchItems) {
    if (!mergedItems.includes(item)) mergedItems.push(item)
  }
  lines.splice(keyIndex, blockEnd - keyIndex, ...formatMemoryList(mergedItems))
}

function findBlockEnd(lines: string[], keyIndex: number): number {
  for (let index = keyIndex + 1; index < lines.length; index += 1) {
    if (parseTopLevelKey(lines[index])) return index
  }
  return lines.length
}

function listItemsFromBlock(lines: string[]): string[] {
  if (lines.length === 0) return []
  const firstValue = lines[0].slice(lines[0].indexOf(':') + 1).trim()
  if (firstValue.startsWith('[') && firstValue.endsWith(']')) {
    return firstValue.slice(1, -1).split(',').map(item => item.trim()).filter(Boolean)
  }
  if (firstValue) return [firstValue]
  return lines.slice(1)
    .map(line => line.match(/^\s*-\s+(.+)$/)?.[1]?.trim())
    .filter((item): item is string => !!item)
}

function formatMemoryList(items: string[]): string[] {
  return ['crystallized_memories:', ...items.map(item => `  - ${item}`)]
}

function parseTopLevelKey(line: string): string | null {
  if (/^\s/.test(line)) return null
  return line.match(/^([^:\n]+):/)?.[1]?.trim() ?? null
}
