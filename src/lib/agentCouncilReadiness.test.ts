import { describe, expect, it } from 'vitest'
import type { AgentCouncilMember } from './agentCouncilTypes'
import {
  buildAgentCouncilReadiness,
  summarizeAgentCouncilReadiness,
} from './agentCouncilReadiness'

function member(
  id: string,
  label: string,
  health: AgentCouncilMember['health'],
): AgentCouncilMember {
  return {
    id,
    label,
    active: false,
    claims: [],
    contribution: '',
    evidence: [],
    health,
    permission: '',
    role: '',
    sources: [],
    stance: '',
  }
}

describe('agent council readiness', () => {
  it('names source-safe, private, and unavailable lanes for public packets', () => {
    const lanes = buildAgentCouncilReadiness([
      member('codex', 'Codex', 'ready'),
      member('chitragupta', 'Chitragupta', 'missing'),
      member('woosh', 'Woosh', 'private-local'),
      member('local_search', 'Local Search', 'ready'),
      member('portability_context', 'Import/Export', 'ready'),
    ], false)

    expect(lanes).toEqual([
      expect.objectContaining({ detail: 'Receives source-safe labels only.', label: 'Codex', state: 'ready', status: 'Source-safe' }),
      expect.objectContaining({ label: 'Chitragupta', state: 'unavailable', status: 'Unavailable' }),
      expect.objectContaining({ label: 'Woosh', state: 'private', status: 'Private' }),
      expect.objectContaining({ detail: 'Runs against local metadata and source labels.', label: 'Local Search', status: 'Local' }),
      expect.objectContaining({
        detail: 'Shows preview/apply evidence; live provider proof is still pending.',
        label: 'Import/Export',
        state: 'proof',
        status: 'Proof boundary',
      }),
    ])
    expect(summarizeAgentCouncilReadiness(lanes)).toEqual({
      blocked: 0,
      private: 1,
      proof: 1,
      ready: 2,
      unavailable: 1,
      waiting: 0,
    })
  })

  it('blocks external lanes when active context is protected', () => {
    const lanes = buildAgentCouncilReadiness([
      member('codex', 'Codex', 'ready'),
      member('vault_graph', 'Vault Graph', 'ready'),
    ], true)

    expect(lanes[0]).toEqual(expect.objectContaining({
      detail: 'No protected packet leaves the vault.',
      state: 'blocked',
      status: 'Blocked',
    }))
    expect(lanes[1]).toEqual(expect.objectContaining({
      detail: 'Runs against local metadata and source labels.',
      state: 'ready',
      status: 'Local',
    }))
  })
})
