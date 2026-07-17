import type { PointerEvent as ReactPointerEvent } from 'react'
import { CornersOut, MagnifyingGlassMinus, MagnifyingGlassPlus } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { NoteGraph } from '../utils/noteGraph'
import {
  GRAPH_CENTER_X,
  GRAPH_CENTER_Y,
  GRAPH_VIEWBOX_HEIGHT,
  GRAPH_VIEWBOX_WIDTH,
  type GraphLayout,
  type PositionedGraphNode,
} from '../utils/graphDisplay'
import { Button } from './ui/button'
import { GraphNode } from './GraphNode'

// One button press ≈ a couple of wheel notches. In and out are exact inverses.
const ZOOM_STEP = 1.25
// Past this zoom the user has committed to a neighborhood, so every visible
// node earns its label regardless of vault density.
const SHOW_ALL_LABELS_SCALE = 1.4

interface GraphCanvasProps {
  layout: GraphLayout
  localOnlyNodeIds: ReadonlySet<string>
  nodeById: Map<string, PositionedGraphNode>
  selectedNodeId: string | null
  highlightedNodeId?: string | null
  hot?: boolean
  viewportTransform?: string
  viewportScale?: number
  bindSvg?: (el: SVGSVGElement | null) => void
  onNodePointerDown?: (node: PositionedGraphNode, event: ReactPointerEvent) => void
  onBackgroundPointerDown?: (event: ReactPointerEvent) => void
  onZoomBy?: (factor: number) => void
  onResetView?: () => void
  onOpenNode: (path: string) => void
  onSelectNode: (node: PositionedGraphNode) => void
}

/**
 * A local relationship canvas. It deliberately renders document truth only:
 * Markdown wikilinks and frontmatter relationships. Agent state belongs in the
 * Context Inspector, not inside a user's knowledge map.
 */
export function GraphCanvas({
  layout,
  localOnlyNodeIds,
  nodeById,
  selectedNodeId,
  highlightedNodeId,
  hot,
  viewportTransform,
  viewportScale = 1,
  bindSvg,
  onNodePointerDown,
  onBackgroundPointerDown,
  onZoomBy,
  onResetView,
  onOpenNode,
  onSelectNode,
}: GraphCanvasProps) {
  const selectedNode = selectedNodeId ? nodeById.get(selectedNodeId) ?? null : null

  return (
    <div className="graph-canvas-shell grimoire-constellation-focus relative overflow-hidden rounded-md border" data-testid="graph-canvas">
      <div className="relative min-h-0">
        <svg
          ref={bindSvg}
          viewBox={`0 0 ${GRAPH_VIEWBOX_WIDTH} ${GRAPH_VIEWBOX_HEIGHT}`}
          className="block h-[min(60vh,640px)] w-full"
          style={{ touchAction: 'none' }}
          role="img"
          aria-label="Document relationship map"
          data-testid="graph-svg"
          onPointerDown={onBackgroundPointerDown}
          onDoubleClick={onResetView}
        >
          <defs>
            <pattern id="graph-grid" width="48" height="48" patternUnits="userSpaceOnUse">
              <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--grimoire-graph-grid-stroke, var(--border-subtle))" strokeOpacity="0.12" />
            </pattern>
          </defs>
          <rect width={GRAPH_VIEWBOX_WIDTH} height={GRAPH_VIEWBOX_HEIGHT} fill="transparent" />
          <rect width={GRAPH_VIEWBOX_WIDTH} height={GRAPH_VIEWBOX_HEIGHT} fill="url(#graph-grid)" />
          <g transform={viewportTransform} data-testid="graph-viewport">
            {layout.edges.map((edge) => {
              const source = nodeById.get(edge.source)
              const target = nodeById.get(edge.target)
              if (!source || !target) return null
              return (
                <GraphEdge
                  key={edge.id}
                  edge={edge}
                  localOnly={localOnlyNodeIds.has(edge.source) || localOnlyNodeIds.has(edge.target)}
                  selected={Boolean(selectedNode && (edge.source === selectedNode.id || edge.target === selectedNode.id))}
                  source={source}
                  target={target}
                />
              )
            })}
            {layout.nodes.map((node) => (
              <GraphNode
                key={node.id}
                localOnly={localOnlyNodeIds.has(node.id)}
                labelVisible={shouldShowNodeLabel({ node, selected: node.id === selectedNodeId, totalNodes: layout.nodes.length, hot: Boolean(hot), scale: viewportScale })}
                node={node}
                selected={node.id === selectedNodeId}
                highlighted={highlightedNodeId === node.id}
                focusDimmed={highlightedNodeId != null && highlightedNodeId !== node.id}
                onNodePointerDown={onNodePointerDown}
                onOpenNode={onOpenNode}
                onSelectNode={onSelectNode}
              />
            ))}
            {layout.nodes.length === 0 ? (
              <text x={GRAPH_CENTER_X} y={GRAPH_CENTER_Y} textAnchor="middle" fill="var(--muted-foreground)" fontSize="18">
                No matching pages
              </text>
            ) : null}
            {layout.nodes.length === 1 && layout.edges.length === 0 ? (
              <text x={GRAPH_CENTER_X} y={GRAPH_CENTER_Y + 110} textAnchor="middle" fill="var(--muted-foreground)" fontSize="14" data-testid="graph-empty-neighborhood-hint">
                No links yet — add a [[wikilink]] or a relationship property to grow this map.
              </text>
            ) : null}
          </g>
        </svg>
        <div className="graph-canvas-zoom" data-testid="graph-canvas-zoom">
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Zoom in" title="Zoom in" onClick={() => onZoomBy?.(ZOOM_STEP)}>
            <MagnifyingGlassPlus />
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Zoom out" title="Zoom out" onClick={() => onZoomBy?.(1 / ZOOM_STEP)}>
            <MagnifyingGlassMinus />
          </Button>
          <Button type="button" variant="ghost" size="icon-xs" aria-label="Reset view" title="Reset view" onClick={() => onResetView?.()}>
            <CornersOut />
          </Button>
        </div>
      </div>
      <div className="graph-canvas-legend" data-testid="graph-canvas-legend">
        <LegendItem tone="relationship" label="Explicit relationship" />
        <LegendItem tone="wikilink" label="Wikilink" />
        <LegendItem tone="selected" label="Focused page" />
        <LegendItem tone="local" label="Private/local page" />
      </div>
    </div>
  )
}

function shouldShowNodeLabel({
  node,
  selected,
  totalNodes,
  hot,
  scale,
}: {
  node: PositionedGraphNode
  selected: boolean
  totalNodes: number
  hot: boolean
  scale: number
}): boolean {
  if (hot) return node.active || selected
  if (node.active || selected) return true
  // Semantic zoom: fewer nodes on screen means every label can afford to speak.
  if (scale >= SHOW_ALL_LABELS_SCALE) return true
  if (totalNodes <= 18) return true
  if (totalNodes <= 36) return node.neighborhood && node.degree >= 2
  return node.degree >= 8
}

function GraphEdge({
  edge,
  localOnly,
  selected,
  source,
  target,
}: {
  edge: NoteGraph['edges'][number]
  localOnly: boolean
  selected: boolean
  source: PositionedGraphNode
  target: PositionedGraphNode
}) {
  const relationship = edge.kind === 'relationship'
  const dx = target.x - source.x
  const dy = target.y - source.y
  const len = Math.hypot(dx, dy) || 1
  const bow = Math.min(len * 0.16, 60)
  const cx = (source.x + target.x) / 2 - (dy / len) * bow
  const cy = (source.y + target.y) / 2 + (dx / len) * bow
  return (
    <path
      className={cn(
        'grimoire-graph-edge',
        relationship && 'grimoire-graph-edge--relationship',
        localOnly && 'grimoire-graph-edge--local',
        selected && 'grimoire-graph-edge--selected',
      )}
      d={`M ${source.x} ${source.y} Q ${cx} ${cy} ${target.x} ${target.y}`}
      fill="none"
      vectorEffect="non-scaling-stroke"
      stroke={localOnly
        ? 'var(--grimoire-graph-edge-local, var(--destructive))'
        : relationship
          ? 'var(--grimoire-graph-edge-relationship, var(--primary))'
          : 'var(--grimoire-graph-edge-wikilink, var(--muted-foreground))'}
      strokeDasharray={localOnly ? '2 8' : relationship ? undefined : '5 8'}
      strokeLinecap="round"
      strokeOpacity={selected ? 0.68 : localOnly ? 0.32 : 0.4}
      strokeWidth={selected ? 3.1 : relationship ? 2.4 : 1.4}
    />
  )
}

function LegendItem({ label, tone }: { label: string; tone: 'local' | 'relationship' | 'selected' | 'wikilink' }) {
  return (
    <span className="graph-canvas-legend__item" data-tone={tone}>
      <span className="graph-canvas-legend__mark" />
      {label}
    </span>
  )
}
