import type { AgentCouncilSynthesisPacket } from './agentCouncilSynthesis'
import type { CrystallizeHandoffMetadata } from './crystallizeHandoff'

/** Converts a source-safe Council packet into durable, non-counting handoff metadata. */
export function councilCrystallizeHandoffMetadata(
  packet: AgentCouncilSynthesisPacket,
): CrystallizeHandoffMetadata | null {
  if (packet.protectedContext || packet.preflight.mode !== 'review-gated') return null
  return {
    kind: 'agent_council',
    localHold: packet.preflight.heldLocalCount > 0,
    mode: 'review-gated',
    privateGatedLaneCount: packet.preflight.gatedLaneCount,
    readyLaneCount: packet.preflight.readyLaneCount,
    sourceCount: packet.preflight.sourceCount,
    unavailableLaneCount: packet.preflight.unavailableLaneCount,
  }
}

/** Removes exact protected-context counts from Markdown that may become portable Memory. */
export function councilCrystallizeMarkdown(packet: AgentCouncilSynthesisPacket): string {
  const localHold = packet.preflight.heldLocalCount > 0 ? 'yes' : 'no'
  return packet.markdown
    .replace(/^-\s+Held local:\s+\d+$/m, `- Held local: ${localHold}`)
    .replace(/\b\d+\s+(dashboard|graph)\s+items\s+withheld\b/gi, 'protected context withheld')
    .replace(/\b\d+\s+protected or trimmed graph items\b/gi, 'protected or trimmed graph items')
}
