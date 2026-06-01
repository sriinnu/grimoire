/** Machine-readable handoff metadata for reviewed Crystallize Memory notes. */
export interface CrystallizeHandoffMetadata {
  kind: 'agent_council'
  localHold: boolean
  mode: 'review-gated'
  privateGatedLaneCount: number
  readyLaneCount: number
  sourceCount: number
  unavailableLaneCount: number
}

/** Frontmatter lines that keep an accepted handoff inspectable as Markdown. */
export function handoffFrontmatter(metadata: CrystallizeHandoffMetadata | null): string[] {
  if (!metadata) return []
  assertReviewGatedHandoff(metadata)
  return [
    `handoff: ${metadata.kind}`,
    `handoff_mode: ${JSON.stringify(metadata.mode)}`,
    `handoff_ready_lanes: ${metadata.readyLaneCount}`,
    `handoff_private_gated_lanes: ${metadata.privateGatedLaneCount}`,
    `handoff_unavailable_lanes: ${metadata.unavailableLaneCount}`,
    `handoff_local_hold: ${metadata.localHold}`,
    `handoff_source_count: ${metadata.sourceCount}`,
  ]
}

/** Mock-entry properties mirror the Markdown frontmatter used by native writes. */
export function handoffProperties(metadata: CrystallizeHandoffMetadata | null): Record<string, string | number | boolean> {
  if (!metadata) return {}
  assertReviewGatedHandoff(metadata)
  return {
    handoff: metadata.kind,
    handoff_mode: metadata.mode,
    handoff_ready_lanes: metadata.readyLaneCount,
    handoff_private_gated_lanes: metadata.privateGatedLaneCount,
    handoff_unavailable_lanes: metadata.unavailableLaneCount,
    handoff_local_hold: metadata.localHold,
    handoff_source_count: metadata.sourceCount,
  }
}

function assertReviewGatedHandoff(metadata: CrystallizeHandoffMetadata): void {
  if ((metadata as { mode: string }).mode !== 'review-gated') {
    throw new Error('Only review-gated Council packets can become durable handoff metadata.')
  }
}
