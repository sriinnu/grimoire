import type {
  CrystallizeActiveNotePatch,
  CrystallizeChange,
  CrystallizeLedgerContract,
  CrystallizeProposal,
} from './crystallizeProposalTypes'

/** Appends a reviewed Crystallize hunk to the active note without disturbing frontmatter. */
export function appendCrystallizePatchToContent(content: string, appendMarkdown: string): string {
  const patch = appendMarkdown.trim()
  if (!patch) return content

  const base = content.replace(/[ \t]+$/gm, '').replace(/\s*$/, '')
  return `${base}${base ? '\n\n' : ''}${patch}\n`
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
