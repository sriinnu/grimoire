import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { createAiAgentAvailability } from '../lib/aiAgents'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import type { GraphLayout, PositionedGraphNode } from '../utils/graphDisplay'
import { GraphCanvas } from './GraphCanvas'

function node(overrides: Partial<PositionedGraphNode>): PositionedGraphNode {
  return {
    active: false,
    color: '#2563eb',
    degree: 1,
    id: overrides.path ?? '/vault/note.md',
    lightColor: '#dbeafe',
    neighborhood: true,
    path: overrides.path ?? '/vault/note.md',
    title: overrides.title ?? 'Note',
    type: overrides.type ?? 'Note',
    x: overrides.x ?? 100,
    y: overrides.y ?? 100,
    ...overrides,
  }
}

describe('GraphCanvas', () => {
  it('marks selected, source-safe, and local-only graph paths directly on the canvas', () => {
    const alpha = node({ active: true, path: '/vault/alpha.md', title: 'Alpha', x: 220, y: 220 })
    const beta = node({ path: '/vault/beta.md', title: 'Beta', x: 420, y: 220 })
    const secret = node({ path: '/vault/dream.md', title: 'Secret Dream', type: 'Dream', x: 320, y: 360 })
    const layout: GraphLayout = {
      nodes: [alpha, beta, secret],
      edges: [
        {
          id: `${alpha.path}->${beta.path}:body-link:Wikilink`,
          kind: 'body-link',
          label: 'Wikilink',
          source: alpha.path,
          target: beta.path,
        },
        {
          id: `${alpha.path}->${secret.path}:body-link:Wikilink`,
          kind: 'body-link',
          label: 'Wikilink',
          source: alpha.path,
          target: secret.path,
        },
      ],
    }
    const agentGraphContext: AgentGraphContext = {
      edges: [{
        kind: 'body-link',
        label: 'Wikilink',
        sourcePath: alpha.path,
        sourceTitle: 'Alpha',
        targetPath: beta.path,
        targetTitle: 'Beta',
      }],
      nodes: [
        { active: true, degree: 1, path: alpha.path, title: 'Alpha', type: 'Note' },
        { active: false, degree: 1, path: beta.path, title: 'Beta', type: 'Note' },
      ],
      omitted: { protectedEdges: 1, protectedNodes: 1, truncatedEdges: 0, truncatedNodes: 0 },
      state: 'ready',
      totals: { visibleEdges: 1, visibleNodes: 2 },
    }

    const { container } = render(
      <GraphCanvas
        agentGraphContext={agentGraphContext}
        layout={layout}
        localOnlyNodeIds={new Set([secret.path])}
        nodeById={new Map(layout.nodes.map((item) => [item.id, item]))}
        selectedNodeId={beta.path}
        onOpenNode={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    )

    expect(screen.getByTestId('graph-canvas-legend')).toHaveTextContent('Source-safe node')
    expect(screen.getByTestId('graph-canvas-legend')).toHaveTextContent('Agent package')
    expect(screen.getByTestId('graph-canvas-legend')).toHaveTextContent('Local-only visible')
    expect(screen.getByTestId('graph-canvas-legend')).toHaveTextContent('Route health')
    expect(screen.getByTestId('graph-canvas-agent-rail').querySelectorAll('span')).toHaveLength(5)
    expect(screen.getByTestId('graph-canvas-agent-rail').querySelector('[data-agent="claude_code"]')).not.toBeNull()
    expect(screen.getByTestId('graph-canvas-agent-rail').querySelector('[data-agent="claude"]')).toBeNull()
    expect(screen.getByTestId('graph-canvas-agent-rail').querySelectorAll('[data-state="ready"]')).toHaveLength(4)
    expect(screen.getByTestId('graph-canvas-agent-rail').querySelectorAll('[data-state="guarded"]')).toHaveLength(1)
    expect(screen.getByTestId('graph-canvas-agent-summary')).toHaveTextContent('4 source-safe · 1 local/private')
    expect(screen.getByLabelText('Chitragupta: Private. Private memory.')).toHaveAttribute('data-state', 'guarded')
    expect(screen.getByLabelText('Codex: Source-safe. Patch path.')).toHaveAttribute('data-state', 'ready')
    expect(screen.getByTestId('graph-package-tethers').querySelectorAll('line')).toHaveLength(1)
    expect(screen.getByTestId('graph-agent-orbit').querySelectorAll('[data-testid="graph-agent-orbit-lane"]')).toHaveLength(5)
    expect(screen.getByTestId('graph-agent-orbit').querySelectorAll('[data-testid="graph-agent-orbit-connector"]')).toHaveLength(5)
    expect(screen.getAllByTestId('graph-agent-orbit-lane').filter((lane) => lane.getAttribute('data-state') === 'ready')).toHaveLength(4)
    expect(screen.getAllByTestId('graph-agent-orbit-connector').filter((lane) => lane.getAttribute('data-state') === 'ready')).toHaveLength(4)
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-testid="graph-agent-orbit-connector"][data-state="guarded"]')).toHaveAttribute('stroke-dasharray', '2 6')
    expect(screen.getByRole('button', { name: 'Select Beta' })).toHaveClass('grimoire-graph-node--source-safe')
    expect(screen.getByRole('button', { name: 'Select Secret Dream local-only visible here, withheld from agents' })).toHaveClass('grimoire-graph-node--local')
    expect(screen.getByText('Beta - source-safe, eligible for agent package')).toBeInTheDocument()
    expect(screen.getByText('Secret Dream - local-only, visible here and withheld from agents')).toBeInTheDocument()
    expect(screen.getAllByText('Source-safe graph node. This note can be included in an inspected agent package.')).toHaveLength(2)
    expect(screen.getByText('Local-only graph node. The title can be inspected here, but the note is held from agent packages.')).toBeInTheDocument()
    expect(container.querySelector('line.grimoire-graph-edge--source-safe')).toHaveClass('grimoire-graph-edge--selected')
    expect(container.querySelector('line.grimoire-graph-edge--local')).not.toHaveClass('grimoire-graph-edge--source-safe')
    expect(container.querySelectorAll('.grimoire-graph-node-council-badge')).toHaveLength(2)
    expect(screen.getByTestId('graph-node-local-badge').querySelector('rect')).not.toBeNull()
    expect(screen.getByTestId('graph-node-local-badge').querySelector('path')).not.toBeNull()
    expect(screen.getByTestId('graph-node-local-badge').textContent).toBe('')
  })

  it('does not tether protected graph selections into an agent package', () => {
    const alpha = node({ path: '/vault/alpha.md', title: 'Alpha', x: 220, y: 220 })
    const secret = node({ path: '/vault/dream.md', title: 'Secret Dream', type: 'Dream', x: 320, y: 360 })
    const layout: GraphLayout = {
      nodes: [alpha, secret],
      edges: [],
    }
    const agentGraphContext: AgentGraphContext = {
      edges: [],
      nodes: [{ active: false, degree: 1, path: alpha.path, title: 'Alpha', type: 'Note' }],
      omitted: { protectedEdges: 1, protectedNodes: 1, truncatedEdges: 0, truncatedNodes: 0 },
      state: 'ready',
      totals: { visibleEdges: 0, visibleNodes: 1 },
    }

    render(
      <GraphCanvas
        agentGraphContext={agentGraphContext}
        aiAgentsStatus={{
          chitragupta: createAiAgentAvailability('installed'),
          codex: createAiAgentAvailability('installed'),
          claude_code: createAiAgentAvailability('checking'),
        }}
        layout={layout}
        localOnlyNodeIds={new Set([secret.path])}
        nodeById={new Map(layout.nodes.map((item) => [item.id, item]))}
        selectedNodeId={secret.path}
        onOpenNode={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    )

    expect(screen.queryByTestId('graph-package-tethers')).not.toBeInTheDocument()
    expect(screen.getByTestId('graph-canvas-selected-summary')).toHaveTextContent('Selected protected')
    expect(screen.getByTestId('graph-canvas-agent-summary')).toHaveTextContent('0 source-safe · 3 local/private · 2 blocked')
    expect(screen.getByTestId('graph-canvas-agent-rail').querySelectorAll('[data-state="blocked"]')).toHaveLength(2)
    expect(screen.getAllByTestId('graph-agent-orbit-lane').filter((lane) => lane.getAttribute('data-state') === 'blocked')).toHaveLength(2)
    expect(screen.getAllByTestId('graph-agent-orbit-connector').filter((lane) => lane.getAttribute('data-state') === 'blocked')).toHaveLength(2)
    expect(screen.getByTestId('graph-canvas-agent-rail').querySelector('[data-agent="claude_code"]')).toHaveTextContent('Blocked')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="claude_code"]')).toHaveAttribute('data-label', 'Blocked')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-testid="graph-agent-orbit-connector"][data-state="blocked"]')).toHaveAttribute('stroke-dasharray', '5 5')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="claude_code"]')).toHaveAttribute('data-availability', 'checking')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="search"]')).toHaveAttribute('data-availability', 'local')
    expect(screen.getByTestId('graph-agent-orbit').textContent).not.toContain('Secret Dream')
  })

  it('shows AI-backed graph lane CLI status without treating local graph lanes as broken', () => {
    const alpha = node({ active: true, path: '/vault/alpha.md', title: 'Alpha', x: 220, y: 220 })
    const beta = node({ path: '/vault/beta.md', title: 'Beta', x: 420, y: 220 })
    const layout: GraphLayout = { nodes: [alpha, beta], edges: [] }
    const agentGraphContext: AgentGraphContext = {
      edges: [],
      nodes: [
        { active: true, degree: 1, path: alpha.path, title: 'Alpha', type: 'Note' },
        { active: false, degree: 1, path: beta.path, title: 'Beta', type: 'Note' },
      ],
      omitted: { protectedEdges: 0, protectedNodes: 0, truncatedEdges: 0, truncatedNodes: 0 },
      state: 'ready',
      totals: { visibleEdges: 0, visibleNodes: 2 },
    }

    render(
      <GraphCanvas
        agentGraphContext={agentGraphContext}
        aiAgentsStatus={{
          chitragupta: createAiAgentAvailability('missing'),
          codex: createAiAgentAvailability('installed', '0.1.0'),
          claude_code: createAiAgentAvailability('checking'),
        }}
        layout={layout}
        localOnlyNodeIds={new Set()}
        nodeById={new Map(layout.nodes.map((item) => [item.id, item]))}
        selectedNodeId={alpha.path}
        onOpenNode={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    )

    expect(screen.getByTestId('graph-canvas-agent-summary')).toHaveTextContent('3 source-safe · 1 blocked · 1 waiting')
    expect(screen.getByLabelText('Chitragupta: Missing. Private memory.')).toHaveAttribute('data-state', 'blocked')
    expect(screen.getByLabelText('Claude Code: Checking. Second stance.')).toHaveAttribute('data-state', 'waiting')
    expect(screen.getByLabelText('Codex: Source-safe. Patch path.')).toHaveAttribute('data-state', 'ready')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="chitragupta"]')).toHaveAttribute('data-state', 'blocked')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="chitragupta"]')).toHaveAttribute('data-label', 'Missing')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="chitragupta"]')).toHaveAttribute('data-availability', 'missing')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="claude_code"]')).toHaveAttribute('data-state', 'waiting')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="claude_code"]')).toHaveAttribute('data-label', 'Checking')
    expect(screen.getByTestId('graph-agent-orbit').querySelector('[data-agent="claude_code"]')).toHaveAttribute('data-availability', 'checking')
  })
})
