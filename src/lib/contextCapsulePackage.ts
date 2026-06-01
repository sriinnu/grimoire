import type { ContextCapsulePackagePreview, ContextCapsulePreview } from './contextCapsule'
import { localityEgressLanes } from './localityPolicy'

/** Builds the review-only Markdown package for a sanitized Context Capsule. */
export function buildContextCapsulePackageFromPreview(
  preview: ContextCapsulePreview,
): ContextCapsulePackagePreview {
  const protectedContext = preview.state === 'protected'
  const packageLines = contextCapsulePackageLines(preview, protectedContext)
  const bodyMarkdown = packageLines.join('\n')
  const reviewReceipt = packageReviewReceipt(bodyMarkdown)
  return {
    title: protectedContext ? 'Protected Context Capsule' : 'Context Capsule Package',
    preflight: packagePreflight(preview),
    protectedContext,
    reviewReceipt,
    markdown: insertReviewReceipt(packageLines, reviewReceipt),
  }
}

function contextCapsulePackageLines(preview: ContextCapsulePreview, protectedContext: boolean): string[] {
  return [
    '# Context Capsule Package',
    '',
    `State: ${preview.state}`,
    protectedContext
      ? 'Privacy: Protected active context stayed local. No note title, path, excerpt, or body is included.'
      : 'Privacy: Local-only notes are withheld. This package is review-only until explicit handoff.',
    '',
    '## Rules',
    ...preview.rules.map((rule) => `- ${rule}`),
    ...handoffIntentLines(preview),
    '',
    '## Capsule Manifest',
    ...capsuleManifestLines(preview, protectedContext),
    '',
    '## Egress Matrix',
    ...egressLines(protectedContext),
    '',
    '## Included Notes',
    ...includedNoteLines(preview),
    '',
    '## Project Map',
    `- Relationship edges: ${preview.projectMap.relationshipEdges}`,
    `- Note-list rows in scope: ${preview.counts.noteListItems}`,
    '',
    '## Graph Neighborhood',
    `- Source-safe graph notes: ${preview.projectMap.graphNodes}`,
    `- Source-safe graph edges: ${preview.projectMap.graphEdges}`,
    `- Withheld graph context: ${preview.projectMap.graphOmitted}`,
    '',
    '## Exclusions',
    ...exclusionLines(preview),
    '',
    '## Handoff Checklist',
    '- [ ] Re-check Locality Firewall before agent handoff.',
    '- [ ] Confirm the agent can only access the listed source labels.',
    '- [ ] Keep this package local unless the user explicitly exports it.',
  ]
}

function insertReviewReceipt(lines: string[], reviewReceipt: string): string {
  return [
    lines[0],
    '',
    `Review receipt: ${reviewReceipt}`,
    ...lines.slice(1),
  ].join('\n')
}

function packageReviewReceipt(markdown: string): string {
  let hash = 0x811c9dc5
  for (let index = 0; index < markdown.length; index += 1) {
    hash ^= markdown.charCodeAt(index)
    hash = Math.imul(hash, 0x01000193)
  }
  return `pkg-${(hash >>> 0).toString(16).padStart(8, '0')}`
}

function egressLines(protectedContext: boolean): string[] {
  return localityEgressLanes(protectedContext).map((lane) => (
    `- ${lane.label}: ${lane.state}; ${lane.allowedMaterial}; ${lane.detail}.`
  ))
}

function capsuleManifestLines(preview: ContextCapsulePreview, protectedContext: boolean): string[] {
  const preflight = packagePreflight(preview)
  return [
    `- Review mode: ${protectedContext ? 'blocked-local' : 'review-before-handoff'}`,
    `- Source-safe notes: ${preflight.sourceCount}`,
    `- Held local items: ${preflight.heldLocalCount}`,
    `- Trimmed graph items: ${preflight.trimmedCount}`,
    `- Next gate: ${protectedContext ? 'No agent handoff' : 'User-reviewed package only'}`,
  ]
}

function includedNoteLines(preview: ContextCapsulePreview): string[] {
  if (preview.includedNotes.length === 0) return ['- None']
  return preview.includedNotes.map((note, index) => (
    `- Source ${index + 1}: ${note.kind} / ${note.type} / ${note.title}`
  ))
}

function exclusionLines(preview: ContextCapsulePreview): string[] {
  if (preview.exclusions.length === 0) return ['- None']
  return preview.exclusions.map((item) => `- ${item.label}: ${item.reason}`)
}

function handoffIntentLines(preview: ContextCapsulePreview): string[] {
  if (!preview.handoffIntent) return []
  return ['', '## Handoff Intent', `- ${preview.handoffIntent}: review-before-write Markdown memory.`]
}

function packagePreflight(preview: ContextCapsulePreview): ContextCapsulePackagePreview['preflight'] {
  const trimmedCount = sumExclusions(preview, 'trimmed')
  return {
    heldLocalCount: preview.state === 'protected' ? 1 : sumExclusions(preview) - trimmedCount,
    sourceCount: preview.includedNotes.length,
    trimmedCount,
  }
}

function sumExclusions(preview: ContextCapsulePreview, labelMatch?: string): number {
  return preview.exclusions
    .filter((item) => !labelMatch || item.label.toLowerCase().includes(labelMatch))
    .reduce((total, item) => total + (Number.parseInt(item.reason, 10) || 0), 0)
}
