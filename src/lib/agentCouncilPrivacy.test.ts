import { describe, expect, it } from 'vitest'
import { buildAgentCouncilBrief, buildAgentCouncilMembers } from './agentCouncil'
import { buildAgentCouncilPassBrief, buildAgentCouncilWorkflow } from './agentCouncilWorkflow'
import { createAiAgentAvailability, type AiAgentsStatus } from './aiAgents'

const statuses: AiAgentsStatus = {
  chitragupta: createAiAgentAvailability('checking'),
  claude_code: createAiAgentAvailability('installed', '1.0.0'),
  codex: createAiAgentAvailability('missing'),
}

describe('agentCouncil privacy', () => {
  it('withholds protected active-note context from every council member', () => {
    const protectedPackage = {
      kind: 'dashboard-ask' as const,
      prompt: 'private ask',
      references: [{ path: '/vault/private/plan.md', title: 'Hidden Plan', type: 'Journal' }],
      sourceLabels: ['Hidden Plan'],
      memoryReferences: [{
        confidence: 'high',
        contradictionLabels: ['Hidden Conflict'],
        lastSeen: '2026-05-25',
        path: '/vault/private/memory.md',
        sourceLabels: ['[[Hidden Plan]]'],
        title: 'Hidden Memory',
      }],
      visibleCount: 1,
      withheld: { protectedMemories: 1, protectedNotes: 1 },
    }
    const members = buildAgentCouncilMembers({
      statuses,
      activeAgent: 'chitragupta',
      activeContextProtected: true,
      askContextPackage: protectedPackage,
    })
    const brief = buildAgentCouncilBrief(members, true, protectedPackage)

    expect(members.every((member) => member.permission.includes('withheld'))).toBe(true)
    expect(members.every((member) => member.sources.some((source) => source.kind === 'withheld')
      || member.id === 'portability_context'
      || member.id === 'woosh'
      || member.id === 'tring_cli')).toBe(true)
    expect(JSON.stringify(members)).not.toContain('/Users/')
    expect(JSON.stringify(members)).not.toMatch(/token|secret|password|api[_-]?key/i)
    expect(JSON.stringify({ brief, members })).not.toContain('Hidden')

    const workflow = buildAgentCouncilWorkflow({
      activeContextProtected: true,
      brief,
      members,
    })
    const passBrief = buildAgentCouncilPassBrief({
      activeContextProtected: true,
      brief,
      members,
    })

    expect(workflow[0]).toMatchObject({
      detail: 'Protected context withheld.',
      id: 'intake',
      status: 'blocked',
    })
    expect(passBrief).toMatchObject({
      safety: 'No protected content enters agent context.',
      scope: 'Protected note withheld by Locality Firewall.',
      title: 'Policy-only pass',
    })
  })
})
