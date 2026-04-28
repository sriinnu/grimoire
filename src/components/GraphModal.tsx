import { useMemo, useState, type CSSProperties } from 'react'
import { Graph, MagnifyingGlass } from '@phosphor-icons/react'
import { cn } from '@/lib/utils'
import type { VaultEntry } from '../types'
import { buildNoteGraph, filterGraphByQuery, type NoteGraph } from '../utils/noteGraph'
import {
  edgeStats,
  filterGraphEdges,
  GRAPH_CENTER_X,
  GRAPH_CENTER_Y,
  GRAPH_VIEWBOX_HEIGHT,
  GRAPH_VIEWBOX_WIDTH,
  layoutGraph,
  limitGraphForDisplay,
  scopeGraph,
  truncateGraphLabel,
  type GraphEdgeFilter,
  type GraphLayout,
  type GraphScope,
  type PositionedGraphNode,
} from '../utils/graphDisplay'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'

interface GraphModalProps {
  open: boolean
  entries: VaultEntry[]
  activePath: string | null
  onOpenNote: (entry: VaultEntry) => void
  onClose: () => void
}

const EDGE_FILTERS: ReadonlyArray<{ value: GraphEdgeFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'relationship', label: 'Relations' },
  { value: 'body-link', label: 'Wikilinks' },
]

/** Shows the vault as an interactive note relationship graph. */
export function GraphModal({ open, entries, activePath, onOpenNote, onClose }: GraphModalProps) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<GraphScope>('neighborhood')
  const [edgeFilter, setEdgeFilter] = useState<GraphEdgeFilter>('all')
  const graph = useMemo(() => buildNoteGraph(entries, activePath), [activePath, entries])
  const effectiveScope = activePath ? scope : 'vault'
  const scopedGraph = useMemo(() => scopeGraph(graph, effectiveScope), [effectiveScope, graph])
  const visibleGraph = useMemo(() => filterGraphByQuery(scopedGraph, query), [query, scopedGraph])
  const displayGraph = useMemo(() => limitGraphForDisplay(visibleGraph), [visibleGraph])
  const renderGraph = useMemo(() => filterGraphEdges(displayGraph, edgeFilter), [displayGraph, edgeFilter])
  const layout = useMemo(() => layoutGraph(renderGraph, entries), [entries, renderGraph])
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes])
  const entryByPath = useMemo(() => new Map(entries.map((entry) => [entry.path, entry])), [entries])
  const stats = edgeStats(displayGraph)

  const openNode = (path: string) => {
    const entry = entryByPath.get(path)
    if (entry) onOpenNote(entry)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-w-[min(1160px,calc(100vw-2rem))] gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Graph size={18} />
            Knowledge graph
          </DialogTitle>
          <DialogDescription className="sr-only">Vault relationships and wikilinks.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 lg:grid-cols-[1fr_260px]">
          <div className="space-y-3">
            <label className="flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
              <MagnifyingGlass size={15} className="text-muted-foreground" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Filter by title or type"
                className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
                data-testid="graph-filter"
              />
            </label>
            <GraphCanvas layout={layout} nodeById={nodeById} onOpenNode={openNode} />
          </div>

          <GraphControlPanel
            activePath={activePath}
            scope={effectiveScope}
            onScopeChange={setScope}
            edgeFilter={edgeFilter}
            onEdgeFilterChange={setEdgeFilter}
            shownNodes={displayGraph.nodes.length}
            totalMatches={visibleGraph.nodes.length}
            shownEdges={renderGraph.edges.length}
            stats={stats}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function GraphCanvas({
  layout,
  nodeById,
  onOpenNode,
}: {
  layout: GraphLayout
  nodeById: Map<string, PositionedGraphNode>
  onOpenNode: (path: string) => void
}) {
  return (
    <div className="overflow-hidden rounded-md border border-border bg-[var(--surface-editor)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
      <svg
        viewBox={`0 0 ${GRAPH_VIEWBOX_WIDTH} ${GRAPH_VIEWBOX_HEIGHT}`}
        className="block h-[min(60vh,640px)] w-full"
        role="img"
        aria-label="Vault relationship graph"
        data-testid="graph-svg"
      >
        <defs>
          <pattern id="graph-grid" width="48" height="48" patternUnits="userSpaceOnUse">
            <path d="M 48 0 L 0 0 0 48" fill="none" stroke="var(--border-subtle)" strokeOpacity="0.5" />
          </pattern>
        </defs>
        <rect width={GRAPH_VIEWBOX_WIDTH} height={GRAPH_VIEWBOX_HEIGHT} fill="var(--surface-editor)" />
        <rect width={GRAPH_VIEWBOX_WIDTH} height={GRAPH_VIEWBOX_HEIGHT} fill="url(#graph-grid)" />
        {layout.edges.map((edge) => {
          const source = nodeById.get(edge.source)
          const target = nodeById.get(edge.target)
          if (!source || !target) return null
          return <GraphEdge key={edge.id} edge={edge} source={source} target={target} />
        })}
        {layout.nodes.map((node) => (
          <GraphNode key={node.id} node={node} onOpenNode={onOpenNode} />
        ))}
        {layout.nodes.length === 0 ? (
          <text x={GRAPH_CENTER_X} y={GRAPH_CENTER_Y} textAnchor="middle" fill="var(--muted-foreground)" fontSize="18">
            No matching notes
          </text>
        ) : null}
      </svg>
    </div>
  )
}

function GraphEdge({
  edge,
  source,
  target,
}: {
  edge: NoteGraph['edges'][number]
  source: PositionedGraphNode
  target: PositionedGraphNode
}) {
  const relationship = edge.kind === 'relationship'
  return (
    <line
      x1={source.x}
      y1={source.y}
      x2={target.x}
      y2={target.y}
      stroke={relationship ? 'var(--primary)' : 'var(--muted-foreground)'}
      strokeDasharray={relationship ? undefined : '5 8'}
      strokeLinecap="round"
      strokeOpacity={relationship ? 0.46 : 0.34}
      strokeWidth={relationship ? 2.4 : 1.4}
    />
  )
}

function GraphNode({ node, onOpenNode }: { node: PositionedGraphNode; onOpenNode: (path: string) => void }) {
  const radius = node.active ? 23 : Math.min(19, 10 + node.degree * 1.7)
  const dimmed = !node.neighborhood && !node.active
  const style = { '--node-color': node.color, '--node-fill': node.lightColor } as CSSProperties

  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={`Open ${node.title}`}
      onClick={() => onOpenNode(node.path)}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpenNode(node.path)
        }
      }}
      data-testid="graph-node"
      className={cn('grimoire-graph-node cursor-pointer', dimmed && 'opacity-70')}
      style={style}
    >
      {node.active ? <circle className="grimoire-graph-node-halo" cx={node.x} cy={node.y} r={36} /> : null}
      <circle
        cx={node.x}
        cy={node.y}
        r={radius}
        fill={node.active ? 'var(--node-color)' : 'var(--node-fill)'}
        stroke="var(--node-color)"
        strokeWidth={node.active ? 3 : 1.7}
      />
      <circle cx={node.x - radius * 0.35} cy={node.y - radius * 0.38} r={Math.max(2.6, radius * 0.18)} fill="rgba(255,255,255,0.42)" />
      <text
        x={node.x}
        y={node.y + 38}
        textAnchor="middle"
        fill="var(--foreground)"
        fontSize="16"
        fontWeight={node.active ? 720 : 600}
        pointerEvents="none"
      >
        {truncateGraphLabel(node.title)}
      </text>
      <text
        x={node.x}
        y={node.y + 57}
        textAnchor="middle"
        fill="var(--muted-foreground)"
        fontSize="12"
        pointerEvents="none"
      >
        {node.type}
      </text>
    </g>
  )
}

function GraphControlPanel({
  activePath,
  scope,
  onScopeChange,
  edgeFilter,
  onEdgeFilterChange,
  shownNodes,
  totalMatches,
  shownEdges,
  stats,
}: {
  activePath: string | null
  scope: GraphScope
  onScopeChange: (scope: GraphScope) => void
  edgeFilter: GraphEdgeFilter
  onEdgeFilterChange: (filter: GraphEdgeFilter) => void
  shownNodes: number
  totalMatches: number
  shownEdges: number
  stats: { relationships: number; wikilinks: number }
}) {
  return (
    <div className="rounded-md border border-border bg-background/80 p-3">
      <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Graph</div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Metric label="Notes" value={shownNodes} />
        <Metric label="Links" value={shownEdges} />
      </div>
      <div className="mt-2 text-xs text-muted-foreground">
        {shownNodes === totalMatches ? `${totalMatches} matching notes` : `${shownNodes} of ${totalMatches} matching notes`}
      </div>

      <ControlGroup label="Scope">
        <SegmentButton selected={scope === 'neighborhood'} disabled={!activePath} onClick={() => onScopeChange('neighborhood')}>
          Nearby
        </SegmentButton>
        <SegmentButton selected={scope === 'vault'} onClick={() => onScopeChange('vault')}>
          Vault
        </SegmentButton>
      </ControlGroup>

      <ControlGroup label="Edges">
        {EDGE_FILTERS.map((filter) => (
          <SegmentButton
            key={filter.value}
            selected={edgeFilter === filter.value}
            onClick={() => onEdgeFilterChange(filter.value)}
          >
            {filter.label}
          </SegmentButton>
        ))}
      </ControlGroup>

      <div className="mt-4 space-y-2 text-xs text-muted-foreground">
        <LegendSwatch color="var(--primary)" label={`${stats.relationships} relationships`} />
        <LegendSwatch color="var(--muted-foreground)" dashed={true} label={`${stats.wikilinks} wikilinks`} />
      </div>
    </div>
  )
}

function ControlGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 space-y-2">
      <div className="text-xs font-medium text-muted-foreground">{label}</div>
      <div className="grid gap-1 rounded-md bg-muted p-1" role="radiogroup" aria-label={label}>
        {children}
      </div>
    </div>
  )
}

function SegmentButton({
  children,
  disabled = false,
  selected,
  onClick,
}: {
  children: React.ReactNode
  disabled?: boolean
  selected: boolean
  onClick: () => void
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      role="radio"
      aria-checked={selected}
      disabled={disabled}
      className={cn(
        'h-7 justify-start px-2 text-xs',
        selected ? 'bg-background text-foreground shadow-xs hover:bg-background' : 'text-muted-foreground',
      )}
      onClick={onClick}
    >
      {children}
    </Button>
  )
}

function LegendSwatch({ color, dashed = false, label }: { color: string; dashed?: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span
        className="h-0.5 w-7 rounded-full"
        style={{ background: dashed ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 10px)` : color }}
      />
      <span>{label}</span>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted p-2">
      <div className="text-lg font-semibold text-foreground">{value}</div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  )
}
