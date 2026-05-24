import { fireEvent, render, screen } from '@testing-library/react'
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
    render(
      <AgentCouncilStrip
        statuses={statuses}
        activeAgent="claude_code"
        activeContextProtected={false}
        activeSourceLabel="Public Plan"
        activeSourcePath="plans/public.md"
        linkedContextCount={2}
        onOpenSource={onOpenSource}
      />,
    )

    const council = screen.getByTestId('agent-council')
    expect(council).toHaveClass('grimoire-agent-council')
    expect(council).toHaveTextContent('Public Plan')
    expect(council).toHaveTextContent('2 linked notes')
    expect(council).toHaveTextContent('Can synthesize the active note with linked context.')
    expect(council).toHaveTextContent('Wikilink graph')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Limited council pass')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Public Plan')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('reviewable Markdown')
    expect(screen.getByTestId('agent-council-brief')).toHaveTextContent('Synthesis')
    expect(screen.getByTestId('agent-council-brief')).toHaveClass('grimoire-agent-council__brief')
    expect(screen.getByTestId('agent-council-workflow')).toHaveTextContent('Intake')
    expect(screen.getByTestId('agent-council-workflow')).toHaveTextContent('Council')
    expect(screen.getByTestId('agent-council-workflow')).toHaveTextContent('Review')
    const memberCards = screen.getAllByTestId('agent-council-member')
    expect(memberCards[0]).toHaveClass('grimoire-agent-council__member')
    expect(memberCards[0]).toHaveStyle({ '--motion-stagger-delay': '0ms' })
    expect(memberCards[1]).toHaveStyle({ '--motion-stagger-delay': '28ms' })
    fireEvent.click(screen.getAllByRole('button', { name: 'Public Plan' })[0])
    expect(onOpenSource).toHaveBeenCalledWith('plans/public.md')
  })

  it('withholds source labels for protected active context', () => {
    render(
      <AgentCouncilStrip
        statuses={statuses}
        activeAgent="chitragupta"
        activeContextProtected
        activeSourceLabel="Hidden Dream"
        linkedContextCount={4}
      />,
    )

    const council = screen.getByTestId('agent-council')
    expect(council).toHaveTextContent('Protected active note')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Policy-only pass')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Protected note withheld by Locality Firewall.')
    expect(screen.getByTestId('agent-council-brief')).toHaveTextContent('Privacy gate keeps protected note')
    expect(screen.getByTestId('agent-council-workflow')).toHaveTextContent('Protected context withheld.')
    expect(council).not.toHaveTextContent('Hidden Dream')
    expect(council).not.toHaveTextContent('4 linked notes')
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
          references: [{ path: '/vault/projects/grimoire.md', title: 'Grimoire', type: 'Project' }],
          sourceLabels: ['Grimoire', 'Grimoire Memory'],
          memoryReferences: [{
            confidence: 'medium',
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
    expect(council).toHaveTextContent('3 dashboard items withheld')
    expect(screen.getByTestId('agent-council-pass')).toHaveTextContent('Grimoire')
    expect(screen.getByTestId('agent-council-brief')).toHaveTextContent('dashboard ask package')
  })
})
