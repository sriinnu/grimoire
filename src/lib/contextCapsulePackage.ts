import type { ContextCapsulePackagePreview, ContextCapsulePreview } from './contextCapsule'
import { localityEgressLanes } from './localityPolicy'

/** Builds the review-only Markdown package for a sanitized Context Capsule. */
export function buildContextCapsulePackageFromPreview(
  preview: ContextCapsulePreview,
): ContextCapsulePackagePreview {
  const protectedContext = preview.state === 'protected'
  return {
    title: protectedContext ? 'Protected Context Capsule' : 'Context Capsule Package',
    preflight: packagePreflight(preview),
    protectedContext,
    markdown: [
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
    ].join('\n'),
  }
}

function egressLines(protectedContext: boolean): string[] {
  return localityEgressLanes(protectedContext).map((lane) => (
    `- ${lane.label}: ${lane.state}; ${lane.allowedMaterial}; ${lane.detail}.`
  ))
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
