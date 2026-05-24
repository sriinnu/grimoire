import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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

    expect(screen.getByTestId('graph-canvas-legend')).toHaveTextContent('Council-ready')
    expect(screen.getByTestId('graph-canvas-legend')).toHaveTextContent('Local-only held')
    expect(screen.getByRole('button', { name: 'Select Beta' })).toHaveClass('grimoire-graph-node--source-safe')
    expect(screen.getByRole('button', { name: 'Select Secret Dream local-only' })).toHaveClass('grimoire-graph-node--local')
    expect(container.querySelector('line.grimoire-graph-edge--source-safe')).toHaveClass('grimoire-graph-edge--selected')
    expect(container.querySelector('line.grimoire-graph-edge--local')).not.toHaveClass('grimoire-graph-edge--source-safe')
  })
})
