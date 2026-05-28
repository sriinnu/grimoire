import { fireEvent, render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createAiAgentAvailability } from '../lib/aiAgents'
import { AgentCouncilStrip } from './AgentCouncilStrip'

const statuses = {
  claude_code: createAiAgentAvailability('installed', '1.0.0'),
  codex: createAiAgentAvailability('installed', '0.2.0'),
  chitragupta: createAiAgentAvailability('missing'),
}

describe('AgentCouncilStrip', () => {
  it('shows source-safe contribution badges for public context', () => {
    const onOpenSource = vi.fn()
    const onCrystallizeSynthesis = vi.fn()
    render(
      <AgentCouncilStrip
        statuses={statuses}
        activeAgent="claude_code"
        activeContextProtected={false}
        activeSourceLabel="Public Plan"
        activeSourcePath="plans/public.md"
        linkedContextCount={2}
        onCrystallizeSynthesis={onCrystallizeSynthesis}
        onOpenSource={onOpenSource}
      />,
    )

    const council = screen.getByTestId('agent-council')
    expect(council).toHaveClass('grimoire-agent-council')
    expect(council).toHaveTextContent('Public Plan')
    expect(council).toHaveTextContent('2 linked notes')
    expect(council).toHaveTextContent('Can synthesize the active note with linked context.')
    expect(council).toHaveTextContent('High confidence')
    expect(council).toHaveTextContent('2 sources')
    expect(council).toHaveTextContent('Evidence')
    expect(council).toHaveTextContent('Active note context root.')
    expect(council).toHaveTextContent('Linked notes available for source-safe synthesis.')
    expect(council).toHaveTextContent('Wikilink graph')
    expect(council).toHaveTextContent('Import Autopsy')
    expect(council).toHaveTextContent('No-write manifests show source basenames')
    expect(council).toHaveTextContent('Storage Proof Ledger')
    expect(council).toHaveTextContent('S3/Azure need explicit preview/apply lanes')
    expect(council).toHaveTextContent('Locality Firewall')
    expect(council).toHaveTextContent('local-only files stay withheld from import/export/sync handoff')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Limited council pass')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Public Plan')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('reviewable Markdown')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveTextContent('Review with guardrails')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveTextContent('Stage one reviewable Markdown answer')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveTextContent(/\d+ sources/)
    expect(screen.getByTestId('agent-council-one-answer')).toHaveAttribute('data-answer-state', 'guarded')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveAttribute('data-conflicts', 'true')
    expect(screen.getByTestId('agent-council-map')).toHaveTextContent('Council map')
    expect(screen.getByTestId('agent-council-map')).toHaveTextContent('Source-safe')
    expect(screen.getByTestId('agent-council-map-metrics')).toHaveTextContent('Held local')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Live readiness')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('source-safe')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('proof-boundary')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('private')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('unavailable')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Codex')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Source-safe')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Chitragupta')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Unavailable')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Woosh')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Private')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Import/Export')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Proof boundary')
    expect(screen.getByTestId('agent-council-map-steps')).toHaveTextContent('Context')
    expect(screen.getByTestId('agent-council-map-steps')).toHaveTextContent('Markdown packet ready.')
    expect(screen.getByTestId('agent-council-friction-rail')).toHaveTextContent('Friction')
    expect(screen.getByTestId('agent-council-friction-rail')).toHaveTextContent('Unavailable lanes: Chitragupta.')
    expect(screen.getByTestId('agent-council-friction-rail')).toHaveTextContent('Private lanes require explicit output approval.')
    expect(screen.getByTestId('agent-council-friction-rail')).toHaveTextContent('Review with guardrails')
    expect(within(screen.getByTestId('agent-council-map-lanes')).getByText('Local Search')).toBeInTheDocument()
    expect(screen.getByTestId('agent-council-brief')).toHaveTextContent('Synthesis')
    expect(screen.getByTestId('agent-council-brief')).toHaveClass('grimoire-agent-council__brief')
    expect(screen.getByTestId('agent-council-workflow')).toHaveTextContent('Intake')
    expect(screen.getByTestId('agent-council-workflow')).toHaveTextContent('Council')
    expect(screen.getByTestId('agent-council-workflow')).toHaveTextContent('Review')
    const memberCards = screen.getAllByTestId('agent-council-member')
    expect(memberCards[0]).toHaveClass('grimoire-agent-council__member')
    expect(memberCards[0]).toHaveStyle({ '--motion-stagger-delay': '0ms' })
    expect(memberCards[1]).toHaveStyle({ '--motion-stagger-delay': '28ms' })
    fireEvent.click(screen.getByRole('button', { name: 'Open Public Plan evidence for Local Search' }))
    expect(onOpenSource).toHaveBeenCalledWith('Public Plan')

    fireEvent.click(screen.getByTestId('agent-council-review-synthesis'))
    const preview = screen.getByTestId('agent-council-synthesis-markdown') as HTMLTextAreaElement
    expect(screen.getByTestId('agent-council-synthesis-dialog')).toHaveTextContent('Agent Council synthesis')
    expect(screen.getByTestId('agent-preflight-lanes')).toHaveTextContent('Ready lanes')
    expect(screen.getByTestId('agent-preflight-lanes')).toHaveTextContent('Proof boundary')
    expect(screen.getByTestId('agent-preflight-lanes')).toHaveTextContent('Private gated')
    expect(preview.value).toContain('# Agent Council synthesis')
    expect(preview.value).toContain('## Handoff Gate')
    expect(preview.value).toContain('- Review required: yes')
    expect(preview.value).toContain('Public Plan')
    expect(preview.value).toContain('reviewable Markdown next step')
    expect(preview.value).not.toContain('/Users/')
    fireEvent.click(screen.getByTestId('agent-council-crystallize-synthesis'))
    expect(onCrystallizeSynthesis).toHaveBeenCalledWith(expect.objectContaining({
      markdown: expect.stringContaining('# Agent Council synthesis'),
      protectedContext: false,
    }))
  })

  it('withholds source labels for protected active context', () => {
    render(
      <AgentCouncilStrip
        statuses={statuses}
        activeAgent="chitragupta"
        activeContextProtected
        defaultAiModel="gemini-2.5-pro"
        defaultAiProvider="google"
        activeSourceLabel="Hidden Dream"
        askContextPackage={{
          kind: 'dashboard-ask',
          prompt: 'private ask',
          references: [{ path: '/vault/private/dream.md', title: 'Hidden Dream', type: 'Dream' }],
          sourceLabels: ['Hidden Dream'],
          memoryReferences: [{
            confidence: 'high',
            contradictionLabels: ['Hidden Conflict'],
            lastSeen: '2026-05-25',
            path: '/vault/private/memory.md',
            sourceLabels: ['[[Hidden Dream]]'],
            title: 'Hidden Memory',
          }],
          visibleCount: 1,
          withheld: { protectedMemories: 1, protectedNotes: 1 },
        }}
        linkedContextCount={4}
      />,
    )

    const council = screen.getByTestId('agent-council')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('Chitra')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('provider: google')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('model: gemini-2.5-pro')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('No note payload')
    expect(council).toHaveTextContent('Protected active note')
    expect(council).toHaveTextContent('Locality Firewall withheld title, path, body, and frontmatter.')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Policy-only pass')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Protected note withheld by Locality Firewall.')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveTextContent('Local-only hold')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveTextContent('Keep this note local')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveAttribute('data-answer-state', 'blocked')
    expect(screen.getByTestId('agent-council-map')).toHaveAttribute('data-locality', 'protected-local')
    expect(screen.getByTestId('agent-council-map')).toHaveTextContent('Protected note withheld.')
    expect(screen.getByTestId('agent-council-map')).toHaveTextContent('1 held local.')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('blocked')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('Blocked')
    expect(screen.getByTestId('agent-council-readiness-rail')).toHaveTextContent('No protected packet leaves the vault.')
    expect(screen.getByTestId('agent-council-friction-rail')).toHaveTextContent('Protected content held locally')
    expect(screen.getByTestId('agent-council-friction-rail')).toHaveTextContent('Local-only hold')
    expect(screen.getByTestId('agent-council-workflow')).toHaveTextContent('Protected context withheld.')
    expect(council).not.toHaveTextContent('Hidden Dream')
    expect(council).not.toHaveTextContent('Hidden Conflict')
    expect(council).not.toHaveTextContent('4 linked notes')

    fireEvent.click(screen.getByTestId('agent-council-review-synthesis'))
    const preview = screen.getByTestId('agent-council-synthesis-markdown') as HTMLTextAreaElement
    expect(preview.value).toContain('Protected note withheld by Locality Firewall.')
    expect(preview.value).not.toContain('Hidden Dream')
    expect(preview.value).not.toContain('Hidden Conflict')
  })

  it('renders a dashboard ask package as the current Council pass', () => {
    render(
      <AgentCouncilStrip
        statuses={statuses}
        activeAgent="claude_code"
        activeContextProtected={false}
        askContextPackage={{
          kind: 'dashboard-ask',
          prompt: 'what needs attention?',
          references: [
            { path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' },
            { path: '/vault/projects/import.md', title: 'Import Plan', type: 'Project' },
            { path: '/vault/projects/export.md', title: 'Export Plan', type: 'Project' },
            { path: '/vault/projects/theme.md', title: 'Theme Plan', type: 'Project' },
          ],
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
        }}
      />,
    )

    const council = screen.getByTestId('agent-council')
    expect(council).toHaveTextContent('Grimoire')
    expect(council).toHaveTextContent('Grimoire Memory')
    expect(council).toHaveTextContent('Project surfaced by dashboard ask package.')
    expect(council).toHaveTextContent('Memory ledger record, medium confidence.')
    expect(council).toHaveTextContent('Conflicts: Old Plan')
    expect(council).toHaveTextContent('Memory conflicts: Old Plan.')
    expect(council).toHaveTextContent('3 dashboard items withheld')
    expect(council).toHaveTextContent('1 conflict')
    expect(within(screen.getAllByTestId('agent-council-member')[0]).getByText('Conflicts: Old Plan'))
      .toBeInTheDocument()
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Grimoire')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveTextContent('3 frictions')
    expect(screen.getByTestId('agent-council-one-answer')).toHaveAttribute('data-answer-state', 'guarded')
    expect(screen.getByTestId('agent-council-map')).toHaveTextContent('3 held local.')
    expect(screen.getByTestId('agent-council-map')).toHaveTextContent('3 friction signals.')
    expect(screen.getByTestId('agent-council-friction-rail')).toHaveAttribute('data-conflict-count', '3')
    expect(screen.getByTestId('agent-council-friction-rail')).toHaveTextContent('Memory conflicts: Old Plan.')
    expect(screen.getByTestId('agent-council-brief')).toHaveTextContent('dashboard ask package')

    fireEvent.click(screen.getByTestId('agent-council-review-synthesis'))
    const preview = screen.getByTestId('agent-council-synthesis-markdown') as HTMLTextAreaElement
    expect(preview.value).toContain('Memory conflicts: Old Plan.')
    expect(preview.value).not.toContain('3 dashboard items withheld')
    expect(preview.value).not.toContain('3 graph items withheld')
  })
})
