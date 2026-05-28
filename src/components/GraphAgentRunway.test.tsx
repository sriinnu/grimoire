import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { createAiAgentAvailability } from '../lib/aiAgents'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { GraphAgentRunway } from './GraphAgentRunway'

const readyContext: AgentGraphContext = {
  edges: [{
    kind: 'body-link',
    label: 'Wikilink',
    sourcePath: '/vault/alpha.md',
    sourceTitle: 'Alpha',
    targetPath: '/vault/beta.md',
    targetTitle: 'Beta',
  }],
  nodes: [
    { active: true, degree: 1, path: '/vault/alpha.md', title: 'Alpha', type: 'Note' },
    { active: false, degree: 1, path: '/vault/beta.md', title: 'Beta', type: 'Note' },
  ],
  omitted: { protectedEdges: 0, protectedNodes: 0, truncatedEdges: 0, truncatedNodes: 0 },
  state: 'ready',
  totals: { visibleEdges: 1, visibleNodes: 2 },
}

describe('GraphAgentRunway', () => {
  it('marks the graph-to-agent path with theme-addressable source-safe states', () => {
    render(
      <GraphAgentRunway
        agentGraphContext={readyContext}
        defaultAiAgent="chitragupta"
        defaultAiModel="gemini-2.5-pro"
        defaultAiProvider="google"
        selectedLocalOnly={false}
      />,
    )

    const runway = screen.getByTestId('graph-agent-runway')
    const summary = screen.getByTestId('graph-agent-runway-summary')
    expect(runway).toHaveAttribute('data-state', 'ready')
    expect(summary.querySelectorAll('.graph-agent-runway__metric[data-state="ready"]')).toHaveLength(3)
    expect(summary).toHaveTextContent('2 labels / 1 links')
    expect(summary).toHaveTextContent('Markdown diff')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('provider: google')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('Source-safe packet')
    expect(runway.querySelectorAll('.graph-agent-card[data-state="ready"]')).toHaveLength(3)
    expect(runway.querySelectorAll('.graph-agent-card[data-state="guarded"]')).toHaveLength(2)
    expect(runway.querySelectorAll('.graph-agent-chip[data-state="ready"]')).toHaveLength(3)
    expect(runway).toHaveTextContent('Codex / Claude Code')
    expect(runway).toHaveTextContent('Source-safe')
  })

  it('blocks external agents when the selected graph node is local-only', () => {
    render(
      <GraphAgentRunway
        agentGraphContext={readyContext}
        defaultAiAgent="chitragupta"
        defaultAiProvider="google"
        selectedLocalOnly={true}
      />,
    )

    const runway = screen.getByTestId('graph-agent-runway')
    const summary = screen.getByTestId('graph-agent-runway-summary')
    expect(runway).toHaveAttribute('data-state', 'guarded')
    expect(summary).toHaveTextContent('Locality firewall')
    expect(summary).toHaveTextContent('Guarded review')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('No note payload')
    expect(runway.querySelectorAll('.graph-agent-card[data-state="blocked"]')).toHaveLength(1)
    expect(runway.querySelectorAll('.graph-agent-card[data-state="guarded"]')).toHaveLength(4)
    expect(runway).toHaveTextContent('External agents are blocked by the Locality Firewall.')
  })

  it('shows the selected route CLI health separately from graph package eligibility', () => {
    render(
      <GraphAgentRunway
        agentGraphContext={readyContext}
        aiAgentsStatus={{
          chitragupta: createAiAgentAvailability('missing'),
          codex: createAiAgentAvailability('installed'),
          claude_code: createAiAgentAvailability('installed'),
        }}
        defaultAiAgent="chitragupta"
        defaultAiProvider="google"
        selectedLocalOnly={false}
      />,
    )

    const runway = screen.getByTestId('graph-agent-runway')
    const summary = screen.getByTestId('graph-agent-runway-summary')
    expect(runway).toHaveAttribute('data-state', 'blocked')
    expect(summary).toHaveTextContent('Agent missing')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('CLI missing')
    expect(runway).toHaveTextContent('Codex / Claude Code')
    expect(runway).toHaveTextContent('Source-safe')
  })

  it('keeps Locality Firewall as the primary runway state while route status is checking', () => {
    render(
      <GraphAgentRunway
        agentGraphContext={readyContext}
        aiAgentsStatus={{
          chitragupta: createAiAgentAvailability('checking'),
          codex: createAiAgentAvailability('installed'),
          claude_code: createAiAgentAvailability('installed'),
        }}
        defaultAiAgent="chitragupta"
        selectedLocalOnly={true}
      />,
    )

    const runway = screen.getByTestId('graph-agent-runway')
    const summary = screen.getByTestId('graph-agent-runway-summary')
    expect(runway).toHaveAttribute('data-state', 'guarded')
    expect(summary).toHaveTextContent('Locality firewall')
    expect(summary).toHaveTextContent('Guarded review')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('No note payload')
    expect(screen.getByTestId('agent-route-disclosure')).toHaveTextContent('CLI checking')
  })

  it('still discloses CLI health when Codex has no explicit model route', () => {
    render(
      <GraphAgentRunway
        agentGraphContext={readyContext}
        aiAgentsStatus={{
          chitragupta: createAiAgentAvailability('installed'),
          codex: createAiAgentAvailability('missing'),
          claude_code: createAiAgentAvailability('installed'),
        }}
        defaultAiAgent="codex"
        selectedLocalOnly={false}
      />,
    )

    const route = screen.getByTestId('agent-route-disclosure')
    expect(route).toHaveTextContent('Codex')
    expect(route).toHaveTextContent('CLI default route')
    expect(route).toHaveTextContent('CLI missing')
  })
})
