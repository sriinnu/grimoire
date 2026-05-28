import { describe, expect, it } from 'vitest'
import { createAiAgentAvailability, type AiAgentsStatus } from './aiAgents'
import { buildAgentCouncilBrief, buildAgentCouncilMembers } from './agentCouncil'
import { buildAgentCouncilPassBrief, buildAgentCouncilWorkflow } from './agentCouncilWorkflow'
import type { AgentGraphContext } from '../utils/agentGraphContext'

const statuses: AiAgentsStatus = {
  claude_code: createAiAgentAvailability('installed', '1.0.0'),
  codex: createAiAgentAvailability('missing'),
  chitragupta: createAiAgentAvailability('checking'),
}

const graphContext: AgentGraphContext = {
  state: 'ready',
  nodes: [
    { active: true, degree: 1, path: 'plans/public.md', title: 'Public Plan', type: 'Note' },
    { active: false, degree: 1, path: 'plans/neighbor.md', title: 'Neighbor Note', type: 'Note' },
  ],
  edges: [
    {
      kind: 'body-link',
      label: 'Wikilink',
      sourcePath: 'plans/public.md',
      sourceTitle: 'Public Plan',
      targetPath: 'plans/neighbor.md',
      targetTitle: 'Neighbor Note',
    },
  ],
  omitted: {
    protectedEdges: 0,
    protectedNodes: 0,
    truncatedEdges: 0,
    truncatedNodes: 0,
  },
  totals: {
    visibleEdges: 1,
    visibleNodes: 2,
  },
}

describe('agentCouncil', () => {
  it('builds CLI, local-context, and private-lane members', () => {
    const members = buildAgentCouncilMembers({
      statuses,
      activeAgent: 'claude_code',
      activeContextProtected: false,
      activeSourceLabel: 'Public Plan',
      activeSourcePath: 'plans/public.md',
      graphContext,
      linkedContextCount: 2,
    })

    expect(members.map((member) => member.label)).toEqual([
      'Claude Code',
      'Codex',
      'Local Search',
      'Vault Graph',
      'Red Team',
      'Import/Export',
      'Chitragupta',
      'Woosh',
      'Tring CLI',
    ])
    expect(members.find((member) => member.label === 'Claude Code')).toMatchObject({
      active: true,
      health: 'ready',
      stance: 'Current speaker.',
    })
    expect(members.find((member) => member.label === 'Codex')?.health).toBe('missing')
    expect(members.find((member) => member.label === 'Chitragupta')).toMatchObject({
      health: 'checking',
      permission: 'Private memory lane; contract-gated outputs',
      stance: 'Checking private local memory contract; no handoff yet.',
    })
    expect(members.find((member) => member.label === 'Chitragupta')?.contribution).toContain('MCP contract')
    expect(members.find((member) => member.label === 'Chitragupta')?.sources).toContainEqual({
      kind: 'tool',
      label: 'Chitragupta MCP contract',
    })
    expect(members.find((member) => member.label === 'Chitragupta')?.stance).not.toContain('Available for a council pass')
    expect(members.find((member) => member.label === 'Woosh')?.health).toBe('private-local')
    expect(members.find((member) => member.label === 'Claude Code')?.sources).toEqual([
      { kind: 'active-note', label: 'Public Plan', navigationTarget: 'Public Plan', targetPath: 'plans/public.md' },
      { kind: 'linked-context', label: '2 linked notes' },
    ])
    expect(members.find((member) => member.label === 'Claude Code')?.claims[0]).toMatchObject({
      confidence: 'high',
      sourceLabels: ['Public Plan', '2 linked notes'],
    })
    expect(members.find((member) => member.label === 'Local Search')?.evidence).toContainEqual(expect.objectContaining({
      detail: 'Active note context root.',
      label: 'Public Plan',
      sourceKind: 'active-note',
      targetPath: 'plans/public.md',
    }))
    expect(members.find((member) => member.label === 'Vault Graph')?.sources).toContainEqual(expect.objectContaining({
      kind: 'graph-node',
      label: 'Neighbor Note',
      targetPath: 'plans/neighbor.md',
    }))
    expect(members.find((member) => member.label === 'Vault Graph')?.evidence).toContainEqual(expect.objectContaining({
      detail: 'Wikilink edge.',
      label: 'Public Plan -> Neighbor Note',
      sourceKind: 'graph-node',
      targetPath: 'plans/neighbor.md',
    }))
    expect(members.find((member) => member.label === 'Vault Graph')?.sources).toContainEqual({
      kind: 'tool',
      label: 'Wikilink graph',
    })
    expect(members.find((member) => member.label === 'Red Team')?.contribution).toContain('once a note is open')
    expect(members.find((member) => member.label === 'Red Team')?.sources).toContainEqual({
      kind: 'tool',
      label: 'Red-Team My Plan',
    })
  })

  it('adds source-safe red-team critique signals to the Council pass', () => {
    const members = buildAgentCouncilMembers({
      statuses,
      activeAgent: 'claude_code',
      activeContextProtected: false,
      activeSourceLabel: 'Public Plan',
      activeSourcePath: 'plans/public.md',
      redTeamReview: {
        counts: { completedTasks: 0, headings: 1, openTasks: 3, words: 120 },
        protectedContext: false,
        protectedReason: null,
        signals: [
          {
            dimension: 'product',
            finding: 'The plan can drift.',
            label: 'Product',
            nextAction: 'Add acceptance criteria.',
            severity: 'risk',
          },
          {
            dimension: 'privacy',
            finding: 'No obvious egress hole.',
            label: 'Privacy',
            nextAction: 'Keep local-first defaults explicit.',
            severity: 'clear',
          },
        ],
        state: 'ready',
        verdict: 'Promising, but one sharp risk needs work before execution.',
      },
    })
    const redTeam = members.find((member) => member.label === 'Red Team')

    expect(redTeam?.contribution).toBe('Found 1 risk before execution.')
    expect(redTeam?.sources).toContainEqual({ kind: 'red-team', label: 'Product: risk' })
    expect(redTeam?.claims[0]).toMatchObject({
      confidence: 'high',
      sourceLabels: ['Public Plan', 'Red-Team My Plan', 'Product: risk'],
    })
  })

  it('builds a source-safe brief with disagreement signals', () => {
    const members = buildAgentCouncilMembers({
      statuses,
      activeAgent: 'claude_code',
      activeContextProtected: false,
      activeSourceLabel: 'Public Plan',
      activeSourcePath: 'plans/public.md',
      graphContext,
      linkedContextCount: 2,
    })

    const brief = buildAgentCouncilBrief(members, false)

    expect(brief.synthesis).toContain('active context')
    expect(brief.sourceLabels).toContain('Public Plan')
    expect(brief.sourceLabels).toContain('Neighbor Note')
    expect(brief.disagreements).toContain('Unavailable lanes: Codex.')
    expect(brief.disagreements).toContain('Pending lanes: Chitragupta.')
    expect(brief.disagreements).toContain('Private lanes require explicit output approval.')
  })

  it('builds a visible workflow from sources, lane health, and friction', () => {
    const members = buildAgentCouncilMembers({
      statuses,
      activeAgent: 'claude_code',
      activeContextProtected: false,
      activeSourceLabel: 'Public Plan',
      activeSourcePath: 'plans/public.md',
      graphContext,
      linkedContextCount: 2,
    })
    const brief = buildAgentCouncilBrief(members, false)

    const workflow = buildAgentCouncilWorkflow({
      activeContextProtected: false,
      brief,
      members,
    })

    expect(workflow.map((step) => [step.id, step.status])).toEqual([
      ['intake', 'ready'],
      ['council', 'limited'],
      ['synthesis', 'limited'],
      ['review', 'review'],
    ])
    expect(workflow.find((step) => step.id === 'council')?.detail).toContain('waiting')
  })

  it('builds a source-safe current pass brief', () => {
    const members = buildAgentCouncilMembers({
      statuses,
      activeAgent: 'claude_code',
      activeContextProtected: false,
      activeSourceLabel: 'Public Plan',
      activeSourcePath: 'plans/public.md',
      graphContext,
      linkedContextCount: 2,
    })
    const brief = buildAgentCouncilBrief(members, false)

    const passBrief = buildAgentCouncilPassBrief({
      activeContextProtected: false,
      brief,
      members,
    })

    expect(passBrief.title).toBe('Limited council pass')
    expect(passBrief.scope).toContain('Public Plan')
    expect(passBrief.scope).toContain('Neighbor Note')
    expect(passBrief.deliverable).toContain('reviewable Markdown')
    expect(passBrief.safety).toContain('private lanes require explicit approval')
  })

  it('uses dashboard ask packages as source-safe Council scope', () => {
    const askContextPackage = {
      kind: 'dashboard-ask' as const,
      prompt: 'what needs attention?',
      references: [{ path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' }],
      sourceLabels: ['Grimoire', 'Grimoire Memory'],
      memoryReferences: [{
        confidence: 'medium',
        contradictionLabels: ['Old Plan'],
        lastSeen: '2026-05-24',
        path: '/vault/memory/grimoire.md',
        sourceLabels: ['[[Grimoire]]'],
        title: 'Grimoire Memory',
      }],
      visibleCount: 5,
      withheld: { protectedMemories: 1, protectedNotes: 2 },
    }
    const members = buildAgentCouncilMembers({
      statuses,
      activeAgent: 'claude_code',
      activeContextProtected: false,
      askContextPackage,
    })
    const brief = buildAgentCouncilBrief(members, false, askContextPackage)
    const passBrief = buildAgentCouncilPassBrief({ activeContextProtected: false, brief, members })

    expect(members.find((member) => member.label === 'Claude Code')?.contribution)
      .toContain('1 ask source, 1 memory record, and 1 memory conflict')
    expect(members.find((member) => member.label === 'Claude Code')?.claims[0]).toMatchObject({
      conflictsWith: ['Old Plan'],
      sourceLabels: ['Grimoire', 'Grimoire Memory'],
    })
    expect(members.find((member) => member.label === 'Local Search')?.evidence).toContainEqual(expect.objectContaining({
      detail: 'Project surfaced by dashboard ask package.',
      label: 'Grimoire',
      sourceKind: 'ask-context',
      targetPath: '/vault/projects/grimoire.md',
    }))
    expect(members.find((member) => member.label === 'Claude Code')?.sources).toEqual([
      { kind: 'ask-context', label: 'Grimoire', navigationTarget: 'Grimoire', targetPath: '/vault/projects/grimoire.md' },
      {
        kind: 'memory-ledger',
        label: 'Grimoire Memory',
        navigationTarget: 'Grimoire Memory',
        targetPath: '/vault/memory/grimoire.md',
      },
      { kind: 'memory-conflict', label: 'Conflicts: Old Plan' },
      { kind: 'withheld', label: '3 dashboard items withheld' },
    ])
    expect(brief.disagreements).toContain('Memory conflicts: Old Plan.')
    expect(brief.synthesis).toContain('dashboard ask package')
    expect(passBrief.scope).toContain('Grimoire')
    expect(passBrief.scope).toContain('Grimoire Memory')
  })

  it('uses graph Council packages as source-safe Council scope', () => {
    const askContextPackage = {
      kind: 'graph-council' as const,
      prompt: 'ask graph council',
      references: [{ path: '/vault/beta.md', title: 'Beta', type: 'Reference' }],
      sourceLabels: ['Beta'],
      memoryReferences: [],
      visibleCount: 2,
      withheld: { protectedMemories: 0, protectedNotes: 1 },
      graph: {
        edges: [{ kind: 'body-link', label: 'Wikilink', sourceTitle: 'Alpha', targetTitle: 'Beta' }],
        protectedEdges: 2,
        truncatedEdges: 0,
        truncatedNodes: 0,
        visibleEdges: 3,
        visibleNodes: 2,
      },
    }
    const members = buildAgentCouncilMembers({
      statuses,
      activeAgent: 'claude_code',
      activeContextProtected: false,
      askContextPackage,
    })
    const brief = buildAgentCouncilBrief(members, false, askContextPackage)

    expect(members.find((member) => member.label === 'Claude Code')?.sources).toContainEqual({
      kind: 'withheld',
      label: '3 graph items withheld',
    })
    expect(members.find((member) => member.label === 'Vault Graph')?.evidence).toContainEqual({
      detail: 'Wikilink package edge.',
      label: 'Alpha -> Beta',
      sourceKind: 'graph-node',
    })
    expect(brief.synthesis).toContain('graph Council package')
    expect(brief.synthesis).not.toContain('dashboard ask package')
  })

  it('treats installed Chitragupta as a private contract lane instead of a generic ready CLI lane', () => {
    const members = buildAgentCouncilMembers({
      statuses: {
        ...statuses,
        chitragupta: createAiAgentAvailability('installed', '1.2.3'),
      },
      activeAgent: 'chitragupta',
      activeContextProtected: false,
      activeSourceLabel: 'Public Plan',
      activeSourcePath: 'plans/public.md',
    })
    const chitragupta = members.find((member) => member.id === 'chitragupta')

    expect(chitragupta).toMatchObject({
      active: true,
      health: 'private-local',
      permission: 'Private memory lane; contract-gated outputs',
      stance: 'Private memory contract is local; outputs require explicit approval.',
    })
    expect(chitragupta?.role).toContain('Local memory')
    expect(chitragupta?.sources).toContainEqual({ kind: 'tool', label: 'Locality Firewall' })
  })

})
