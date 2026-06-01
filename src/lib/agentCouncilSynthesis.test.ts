import { describe, expect, it } from 'vitest'
import { buildAgentCouncilSynthesisPacket } from './agentCouncilSynthesis'
import type { AgentCouncilBrief, AgentCouncilMember } from './agentCouncil'
import type { AgentCouncilPassBrief, AgentCouncilWorkflowStep } from './agentCouncilWorkflow'

const publicMember: AgentCouncilMember = {
  id: 'local_search',
  label: 'Local Search',
  role: 'Finds matching Markdown.',
  health: 'ready',
  permission: 'Vault-context notes only',
  stance: 'Ready to contribute source-backed context.',
  contribution: 'Can ground answers in vault Markdown search results.',
  claims: [{
    claim: 'Can ground answers in vault Markdown search results.',
    confidence: 'high',
    conflictsWith: [],
    sourceLabels: ['Public Plan'],
    stance: 'Ready to contribute source-backed context.',
  }],
  evidence: [{
    detail: 'Active note context root.',
    label: 'Public Plan',
    sourceKind: 'active-note',
    targetPath: '/vault/public.md',
  }],
  sources: [{ kind: 'active-note', label: 'Public Plan', targetPath: '/vault/public.md' }],
  active: false,
}

const brief: AgentCouncilBrief = {
  synthesis: 'Council can synthesize the active context.',
  disagreements: ['Memory conflicts: Old Plan.'],
  sourceLabels: ['Public Plan', 'Conflicts: Old Plan'],
}

const passBrief: AgentCouncilPassBrief = {
  title: 'Source-safe council pass',
  scope: 'Public Plan, Conflicts: Old Plan',
  deliverable: 'Synthesize stances into one reviewable Markdown next step.',
  safety: 'Public vault context only.',
}

const workflow: AgentCouncilWorkflowStep[] = [
  { id: 'intake', label: 'Intake', status: 'ready', detail: '2 source labels ready.' },
]

const privateMember: AgentCouncilMember = {
  ...publicMember,
  id: 'chitragupta',
  label: 'Chitragupta',
  health: 'private-local',
  permission: 'Private lane approval required',
  stance: 'Available locally after approval.',
  contribution: 'Keeps memory actions private unless approved.',
  evidence: [{ detail: 'Capability is visible; output requires explicit user approval.', label: 'Private memory lane', sourceKind: 'tool' }],
  sources: [{ kind: 'tool', label: 'Private memory lane' }],
}

const portabilityMember: AgentCouncilMember = {
  ...publicMember,
  id: 'portability_context',
  label: 'Import/Export',
  contribution: 'Can audit Import Autopsy manifests, export exits, storage proof level, and local-only holds before handoff.',
  evidence: [
    { detail: 'No-write manifests show source basenames.', label: 'Import Autopsy', sourceKind: 'tool' },
    { detail: 'Portable exits count local-only withheld files.', label: 'Export Manifest', sourceKind: 'tool' },
    { detail: 'S3/Azure need explicit preview/apply lanes and live proof before ready claims.', label: 'Storage Proof Ledger', sourceKind: 'tool' },
    { detail: 'Local-only files stay withheld from handoff.', label: 'Locality Firewall', sourceKind: 'tool' },
  ],
  sources: [
    { kind: 'tool', label: 'Import Autopsy' },
    { kind: 'tool', label: 'Export Manifest' },
    { kind: 'tool', label: 'Storage Proof Ledger' },
    { kind: 'tool', label: 'Locality Firewall' },
  ],
}

describe('agentCouncilSynthesis', () => {
  it('builds a source-safe Markdown synthesis packet with sources, friction, and workflow', () => {
    const packet = buildAgentCouncilSynthesisPacket({
      activeContextProtected: false,
      brief,
      members: [publicMember],
      passBrief,
      redTeamReview: {
        counts: { completedTasks: 0, headings: 1, openTasks: 1, words: 50 },
        protectedContext: false,
        protectedReason: null,
        signals: [{
          dimension: 'product',
          finding: 'Unsafe raw finding from note body.',
          label: 'Product',
          nextAction: 'Unsafe raw next action from note body.',
          severity: 'risk',
        }],
        state: 'ready',
        verdict: 'Promising, but one sharp risk needs work before execution.',
      },
      workflow,
    })

    expect(packet.title).toBe('Agent Council synthesis')
    expect(packet.sourceLabels).toEqual(['Public Plan', 'Conflicts: Old Plan'])
    expect(packet.oneAnswer).toMatchObject({
      confidence: 'medium',
      conflictCount: 1,
      sourceCount: 2,
      title: 'Review with guardrails',
    })
    expect(packet.oneAnswer.answer).toContain('Stage one reviewable Markdown answer')
    expect(packet.oneAnswer.answer).toContain('1 friction signal')
    expect(packet.preflight).toEqual({
      gatedLaneCount: 0,
      heldLocalCount: 0,
      mode: 'review-gated',
      proofBoundaryLaneCount: 0,
      readyLaneCount: 1,
      reviewRequired: true,
      sourceCount: 2,
      trimmedCount: 0,
      unavailableLaneCount: 0,
    })
    expect(packet.markdown).toContain('# Agent Council synthesis')
    expect(packet.markdown).toContain('## One Answer')
    expect(packet.markdown).toContain('Confidence: medium')
    expect(packet.markdown).toContain('Next step: Open Review synthesis')
    expect(packet.markdown).toContain('Scope: Public Plan, Conflicts: Old Plan')
    expect(packet.markdown).toContain('- Public Plan')
    expect(packet.markdown).toContain('Claim: high confidence, 1 source.')
    expect(packet.markdown).toContain('- Memory conflicts: Old Plan.')
    expect(packet.markdown).toContain('## Handoff Gate')
    expect(packet.markdown).toContain('- Mode: review-gated')
    expect(packet.markdown).toContain('- Held local: no')
    expect(packet.markdown).toContain('- Review required: yes')
    expect(packet.markdown).toContain('- Intake (ready): 2 source labels ready.')
    expect(packet.markdown).toContain('## Red-Team Next Actions')
    expect(packet.markdown).toContain('- [ ] Product: Add one user-facing outcome and one done condition. (risk)')
    expect(packet.markdown).not.toContain('Unsafe raw next action')
    expect(packet.markdown).not.toContain('/vault/public.md')
  })

  it('does not count private-gated lanes as ready contributors', () => {
    const packet = buildAgentCouncilSynthesisPacket({
      activeContextProtected: false,
      brief,
      members: [publicMember, privateMember],
      passBrief,
      workflow,
    })

    expect(packet.preflight).toMatchObject({
      gatedLaneCount: 1,
      proofBoundaryLaneCount: 0,
      readyLaneCount: 1,
      unavailableLaneCount: 0,
    })
    expect(packet.oneAnswer.answer).toContain('1 ready lane')
    expect(packet.oneAnswer.answer).toContain('1 private lane approval-gated')
  })

  it('keeps protected packets policy-only without private labels or paths', () => {
    const packet = buildAgentCouncilSynthesisPacket({
      activeContextProtected: true,
      brief: {
        synthesis: 'Council can compare capability while protected content stays local.',
        disagreements: ['Privacy gate keeps protected note content out of the pass.'],
        sourceLabels: ['Protected active note'],
      },
      members: [{
        ...publicMember,
        evidence: [{ detail: 'Locality Firewall withheld title, path, body, and frontmatter.', label: 'Protected active note', sourceKind: 'withheld' }],
        sources: [{ kind: 'withheld', label: 'Protected active note' }],
      }],
      passBrief: {
        title: 'Policy-only pass',
        scope: 'Protected note withheld by Locality Firewall.',
        deliverable: 'Return safe next steps without note labels, paths, or bodies.',
        safety: 'No protected content enters agent context.',
      },
      redTeamReview: {
        counts: { completedTasks: 0, headings: 1, openTasks: 1, words: 20 },
        protectedContext: true,
        protectedReason: 'journal',
        signals: [{
          dimension: 'privacy',
          finding: 'Secret local finding',
          label: 'Privacy',
          nextAction: 'Expose /vault/private/secret-plan.md',
          severity: 'risk',
        }],
        state: 'ready',
        verdict: 'Protected note verdict',
      },
      workflow,
    })

    expect(packet.title).toBe('Policy-only Council synthesis')
    expect(packet.protectedContext).toBe(true)
    expect(packet.sourceLabels).toEqual([])
    expect(packet.oneAnswer).toMatchObject({
      confidence: 'blocked',
      sourceCount: 0,
      title: 'Local-only hold',
    })
    expect(packet.oneAnswer.answer).toContain('Keep this note local')
    expect(packet.preflight).toEqual({
      gatedLaneCount: 0,
      heldLocalCount: 1,
      mode: 'policy-only',
      proofBoundaryLaneCount: 0,
      readyLaneCount: 1,
      reviewRequired: true,
      sourceCount: 0,
      trimmedCount: 0,
      unavailableLaneCount: 0,
    })
    expect(packet.markdown).toContain('Protected note withheld by Locality Firewall.')
    expect(packet.markdown).toContain('- No source labels available.')
    expect(packet.markdown).toContain('- Mode: policy-only')
    expect(packet.markdown).toContain('Keep labels, paths, excerpts, and raw note content withheld')
    expect(packet.markdown).not.toContain('secret-plan')
    expect(packet.markdown).not.toContain('/vault/private')
  })

  it('counts withheld dashboard and graph context in the preflight gate', () => {
    const packet = buildAgentCouncilSynthesisPacket({
      activeContextProtected: false,
      brief,
      members: [{
        ...publicMember,
        sources: [
          ...publicMember.sources,
          { kind: 'withheld', label: '3 dashboard items withheld' },
          { kind: 'withheld', label: '2 graph items withheld' },
        ],
      }],
      passBrief,
      workflow,
    })

    expect(packet.preflight.heldLocalCount).toBe(5)
    expect(packet.oneAnswer.answer).toContain('2 source labels')
    expect(packet.markdown).toContain('Protected context withheld')
    expect(packet.markdown).not.toContain('3 dashboard items withheld')
    expect(packet.markdown).not.toContain('2 graph items withheld')
  })

  it('keeps portability evidence as proof-boundary context, not ready provider proof', () => {
    const packet = buildAgentCouncilSynthesisPacket({
      activeContextProtected: false,
      brief,
      members: [publicMember, portabilityMember],
      passBrief,
      workflow,
    })

    expect(packet.preflight).toMatchObject({
      proofBoundaryLaneCount: 1,
      readyLaneCount: 1,
    })
    expect(packet.oneAnswer.answer).toContain('1 proof-boundary lane')
    expect(packet.markdown).toContain('Import Autopsy - No-write manifests show source basenames.')
    expect(packet.markdown).toContain('Export Manifest - Portable exits count local-only withheld files.')
    expect(packet.markdown).toContain('Storage Proof Ledger - S3/Azure need explicit preview/apply lanes')
    expect(packet.markdown).toContain('Locality Firewall - Local-only files stay withheld from handoff.')
    expect(packet.markdown).toContain('- Proof-boundary lanes: 1')
    expect(packet.markdown).not.toMatch(/works 100%|provider-proven/i)
  })
})
