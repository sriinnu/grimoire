import { useMemo, useState } from 'react'
import { Graph, MagnifyingGlass } from '@phosphor-icons/react'
import type { VaultEntry } from '../types'
import { buildNoteGraph, filterGraphByQuery, type NoteGraph } from '../utils/noteGraph'
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

interface PositionedNode {
  id: string
  path: string
  title: string
  type: string
  degree: number
  active: boolean
  x: number
  y: number
}

interface GraphLayout {
  nodes: PositionedNode[]
  edges: NoteGraph['edges']
}

const VIEWBOX_WIDTH = 1000
const VIEWBOX_HEIGHT = 620
const CENTER_X = VIEWBOX_WIDTH / 2
const CENTER_Y = VIEWBOX_HEIGHT / 2
const MAX_VISIBLE_NODES = 180

function sortNodesForLayout(graph: NoteGraph): NoteGraph['nodes'] {
  return [...graph.nodes].sort((a, b) => {
    if (a.active !== b.active) return a.active ? -1 : 1
    if (a.degree !== b.degree) return b.degree - a.degree
    return a.title.localeCompare(b.title)
  })
}

function layoutGraph(graph: NoteGraph): GraphLayout {
  const nodes = sortNodesForLayout(graph)
  const positioned = nodes.map((node, index) => {
    if (index === 0) return { ...node, x: CENTER_X, y: CENTER_Y }

    const ringIndex = Math.floor((index - 1) / 14)
    const ringStart = ringIndex * 14 + 1
    const positionInRing = index - ringStart
    const nodesInRing = Math.min(14, nodes.length - ringStart)
    const angle = (-Math.PI / 2) + (positionInRing / Math.max(nodesInRing, 1)) * Math.PI * 2
    const radius = 128 + ringIndex * 118

    return {
      ...node,
      x: CENTER_X + Math.cos(angle) * radius,
      y: CENTER_Y + Math.sin(angle) * radius,
    }
  })

  return { nodes: positioned, edges: graph.edges }
}

function activeNeighborhood(graph: NoteGraph): Set<string> {
  const active = graph.nodes.find((node) => node.active)
  if (!active) return new Set()

  const ids = new Set([active.id])
  for (const edge of graph.edges) {
    if (edge.source === active.id) ids.add(edge.target)
    if (edge.target === active.id) ids.add(edge.source)
  }
  return ids
}

function limitGraphForDisplay(graph: NoteGraph): NoteGraph {
  if (graph.nodes.length <= MAX_VISIBLE_NODES) return graph

  const neighborhood = activeNeighborhood(graph)
  const visibleIds = new Set(
    [...graph.nodes]
      .sort((a, b) => {
        if (a.active !== b.active) return a.active ? -1 : 1
        if (neighborhood.has(a.id) !== neighborhood.has(b.id)) return neighborhood.has(a.id) ? -1 : 1
        if (a.degree !== b.degree) return b.degree - a.degree
        return a.title.localeCompare(b.title)
      })
      .slice(0, MAX_VISIBLE_NODES)
      .map((node) => node.id),
  )

  return {
    nodes: graph.nodes.filter((node) => visibleIds.has(node.id)),
    edges: graph.edges.filter((edge) => visibleIds.has(edge.source) && visibleIds.has(edge.target)),
  }
}

function truncateLabel(label: string): string {
  return label.length > 22 ? `${label.slice(0, 21)}…` : label
}

/** Shows the vault as an interactive note relationship graph. */
export function GraphModal({ open, entries, activePath, onOpenNote, onClose }: GraphModalProps) {
  const [query, setQuery] = useState('')
  const graph = useMemo(() => buildNoteGraph(entries, activePath), [activePath, entries])
  const visibleGraph = useMemo(() => filterGraphByQuery(graph, query), [graph, query])
  const displayGraph = useMemo(() => limitGraphForDisplay(visibleGraph), [visibleGraph])
  const layout = useMemo(() => layoutGraph(displayGraph), [displayGraph])
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes])
  const entryByPath = useMemo(() => new Map(entries.map((entry) => [entry.path, entry])), [entries])

  const openNode = (path: string) => {
    const entry = entryByPath.get(path)
    if (entry) onOpenNote(entry)
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      <DialogContent className="max-w-[min(1120px,calc(100vw-2rem))] gap-4">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Graph size={18} />
            Knowledge graph
          </DialogTitle>
          <DialogDescription className="sr-only">Vault relationships and wikilinks.</DialogDescription>
        </DialogHeader>

        <label className="flex items-center gap-2 rounded-md border border-border px-3 py-2">
          <MagnifyingGlass size={15} className="text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter graph by title or type"
            className="h-7 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0"
            data-testid="graph-filter"
          />
        </label>

        <div className="grid gap-3 md:grid-cols-[1fr_220px]">
          <div className="overflow-hidden rounded-md border border-border bg-[var(--surface-editor)]">
            <svg
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              className="block h-[min(58vh,620px)] w-full"
              role="img"
              aria-label="Vault relationship graph"
              data-testid="graph-svg"
            >
              <rect width={VIEWBOX_WIDTH} height={VIEWBOX_HEIGHT} fill="var(--surface-editor)" />
              {layout.edges.map((edge) => {
                const source = nodeById.get(edge.source)
                const target = nodeById.get(edge.target)
                if (!source || !target) return null
                return (
                  <line
                    key={edge.id}
                    x1={source.x}
                    y1={source.y}
                    x2={target.x}
                    y2={target.y}
                    stroke={edge.kind === 'relationship' ? 'var(--primary)' : 'var(--border-strong)'}
                    strokeOpacity={edge.kind === 'relationship' ? 0.42 : 0.34}
                    strokeWidth={edge.kind === 'relationship' ? 2.2 : 1.4}
                  />
                )
              })}
              {layout.nodes.map((node) => (
                <g
                  key={node.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Open ${node.title}`}
                  onClick={() => openNode(node.path)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') openNode(node.path)
                  }}
                  data-testid="graph-node"
                  className="cursor-pointer"
                >
                  <circle
                    cx={node.x}
                    cy={node.y}
                    r={node.active ? 22 : Math.min(18, 9 + node.degree * 1.6)}
                    fill={node.active ? 'var(--primary)' : 'var(--surface-card)'}
                    stroke={node.active ? 'var(--primary)' : 'var(--border-strong)'}
                    strokeWidth={node.active ? 3 : 1.5}
                  />
                  <text
                    x={node.x}
                    y={node.y + 38}
                    textAnchor="middle"
                    fill="var(--foreground)"
                    fontSize="17"
                    fontWeight={node.active ? 700 : 560}
                  >
                    {truncateLabel(node.title)}
                  </text>
                  <text
                    x={node.x}
                    y={node.y + 58}
                    textAnchor="middle"
                    fill="var(--muted-foreground)"
                    fontSize="12"
                  >
                    {node.type}
                  </text>
                </g>
              ))}
            </svg>
          </div>

          <div className="rounded-md border border-border p-3">
            <div className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">Graph</div>
            <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
              <Metric label="Shown" value={displayGraph.nodes.length} />
              <Metric label="Links" value={displayGraph.edges.length} />
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              of {visibleGraph.nodes.length} matching notes
            </div>
            <div className="mt-4 space-y-2 text-xs text-muted-foreground">
              <LegendSwatch color="var(--primary)" label="Relationships" />
              <LegendSwatch color="var(--border-strong)" label="Wikilinks" />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function LegendSwatch({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="h-0.5 w-7 rounded-full" style={{ background: color }} />
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
