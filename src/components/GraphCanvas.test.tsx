import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
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
  it('renders document relationships without agent routing or package state', () => {
    const alpha = node({ active: true, path: '/vault/alpha.md', title: 'Alpha', x: 220, y: 220 })
    const beta = node({ path: '/vault/beta.md', title: 'Beta', x: 420, y: 220 })
    const dream = node({ path: '/vault/dream.md', title: 'Private Dream', type: 'Dream', x: 320, y: 360 })
    const layout: GraphLayout = {
      nodes: [alpha, beta, dream],
      edges: [
        { id: 'alpha-beta', kind: 'relationship', label: 'related_to', source: alpha.path, target: beta.path },
        { id: 'alpha-dream', kind: 'body-link', label: 'Wikilink', source: alpha.path, target: dream.path },
      ],
    }

    const { container } = render(
      <GraphCanvas
        layout={layout}
        localOnlyNodeIds={new Set([dream.path])}
        nodeById={new Map(layout.nodes.map((item) => [item.id, item]))}
        selectedNodeId={beta.path}
        onOpenNode={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    )

    expect(screen.getByRole('img', { name: 'Document relationship map' })).toBeInTheDocument()
    // The dialog header and control panel own the stats; no duplicate HUD card on the canvas.
    expect(screen.queryByTestId('graph-canvas-hud')).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Select Private Dream, private/local' })).toHaveClass('grimoire-graph-node--local')
    expect(screen.getByTestId('graph-canvas-legend')).toHaveTextContent('Explicit relationship')
    expect(screen.getByTestId('graph-canvas-legend')).toHaveTextContent('Wikilink')
    expect(screen.queryByTestId('graph-canvas-agent-rail')).not.toBeInTheDocument()
    expect(screen.queryByTestId('graph-agent-orbit')).not.toBeInTheDocument()
    expect(container.querySelectorAll('path.grimoire-graph-edge')).toHaveLength(2)
    expect(container.querySelector('.grimoire-graph-edge--relationship')).toBeInTheDocument()
  })

  it('keeps low-value labels quiet in a dense vault while leaving every document selectable', () => {
    const active = node({ active: true, path: '/vault/active.md', title: 'Active', x: 220, y: 220 })
    const connector = node({ degree: 14, path: '/vault/connector.md', title: 'Connector', x: 300, y: 260 })
    const quiet = node({ degree: 1, path: '/vault/quiet.md', title: 'Quiet', x: 340, y: 280 })
    const filler = Array.from({ length: 37 }, (_, index) => node({ path: `/vault/filler-${index}.md`, title: `Filler ${index}`, x: 360 + index, y: 300 + index }))
    const layout: GraphLayout = { nodes: [active, connector, quiet, ...filler], edges: [] }

    render(
      <GraphCanvas
        layout={layout}
        localOnlyNodeIds={new Set()}
        nodeById={new Map(layout.nodes.map((item) => [item.id, item]))}
        selectedNodeId={active.path}
        onOpenNode={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Select Active' })).toHaveAttribute('data-label-visible', 'true')
    expect(screen.getByRole('button', { name: 'Select Connector' })).toHaveAttribute('data-label-visible', 'true')
    expect(screen.getByRole('button', { name: 'Select Quiet' })).toHaveAttribute('data-label-visible', 'false')
    expect(screen.getAllByTestId('graph-node')).toHaveLength(layout.nodes.length)
  })

  it('lifts the label quota once the user zooms into a neighborhood', () => {
    const active = node({ active: true, path: '/vault/active.md', title: 'Active', x: 220, y: 220 })
    const quiet = node({ degree: 1, path: '/vault/quiet.md', title: 'Quiet', x: 340, y: 280 })
    const filler = Array.from({ length: 40 }, (_, index) => node({ path: `/vault/filler-${index}.md`, title: `Filler ${index}`, x: 360 + index, y: 300 + index }))
    const layout: GraphLayout = { nodes: [active, quiet, ...filler], edges: [] }

    render(
      <GraphCanvas
        layout={layout}
        localOnlyNodeIds={new Set()}
        nodeById={new Map(layout.nodes.map((item) => [item.id, item]))}
        selectedNodeId={active.path}
        viewportScale={1.5}
        onOpenNode={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    )

    expect(screen.getByRole('button', { name: 'Select Quiet' })).toHaveAttribute('data-label-visible', 'true')
  })

  it('offers visible zoom controls wired to the viewport', () => {
    const alpha = node({ path: '/vault/alpha.md', title: 'Alpha' })
    const layout: GraphLayout = { nodes: [alpha], edges: [] }
    const onZoomBy = vi.fn()
    const onResetView = vi.fn()

    render(
      <GraphCanvas
        layout={layout}
        localOnlyNodeIds={new Set()}
        nodeById={new Map(layout.nodes.map((item) => [item.id, item]))}
        selectedNodeId={null}
        onZoomBy={onZoomBy}
        onResetView={onResetView}
        onOpenNode={vi.fn()}
        onSelectNode={vi.fn()}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    expect(onZoomBy).toHaveBeenLastCalledWith(1.25)
    fireEvent.click(screen.getByRole('button', { name: 'Zoom out' }))
    expect(onZoomBy).toHaveBeenLastCalledWith(1 / 1.25)
    fireEvent.click(screen.getByRole('button', { name: 'Reset view' }))
    expect(onResetView).toHaveBeenCalledTimes(1)
  })
})
