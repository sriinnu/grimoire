import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Glyph } from '@/components/glyphs/Glyph'
import type { VaultEntry } from '../types'
import { buildNoteGraphCached, filterGraphByQuery } from '../utils/noteGraph'
import {
  edgeStats,
  filterGraphByNodeTypes,
  filterGraphEdges,
  graphTypeStats,
  layoutGraph,
  limitGraphForDisplay,
  scopeGraph,
  type GraphEdgeFilter,
  type GraphScope,
} from '../utils/graphDisplay'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { Button } from './ui/button'
import { useForceSimulation } from '../hooks/useForceSimulation'
import { GraphCanvas } from './GraphCanvas'
import { GraphControlPanel } from './GraphControlPanel'
import { GraphRelationshipInspector } from './GraphRelationshipInspector'
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

/** Opens a relationship-first map for navigating the local Markdown vault. */
export function GraphModal({ open, entries, activePath, onOpenNote, onClose }: GraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      {open ? <GraphModalContent entries={entries} activePath={activePath} onOpenNote={onOpenNote} onClose={onClose} /> : null}
    </Dialog>
  )
}

function GraphModalContent({
  entries,
  activePath,
  onOpenNote,
  onClose,
}: Omit<GraphModalProps, 'open'>) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<GraphScope>('neighborhood')
  const [edgeFilter, setEdgeFilter] = useState<GraphEdgeFilter>('all')
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(() => new Set())
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [highlightedNodeId, setHighlightedNodeId] = useState<string | null>(null)
  const graph = useMemo(() => buildNoteGraphCached(entries, activePath), [activePath, entries])
  const effectiveScope = activePath ? scope : 'vault'
  const scopedGraph = useMemo(() => scopeGraph(graph, effectiveScope), [effectiveScope, graph])
  const visibleGraph = useMemo(() => filterGraphByQuery(scopedGraph, query), [query, scopedGraph])
  const displayGraph = useMemo(() => limitGraphForDisplay(visibleGraph), [visibleGraph])
  const typeStats = useMemo(() => graphTypeStats(displayGraph, entries), [displayGraph, entries])
  const typedGraph = useMemo(() => filterGraphByNodeTypes(displayGraph, hiddenTypes), [displayGraph, hiddenTypes])
  const renderGraph = useMemo(() => filterGraphEdges(typedGraph, edgeFilter), [typedGraph, edgeFilter])
  const layout = useMemo(() => layoutGraph(renderGraph, entries), [entries, renderGraph])
  const pinnedId = useMemo(() => layout.nodes.find((node) => node.active)?.id ?? null, [layout.nodes])
  const sim = useForceSimulation(layout, { pinnedId })
  const entryByPath = useMemo(() => new Map(entries.map((entry) => [entry.path, entry])), [entries])
  const localOnlyNodeIds = useMemo(() => new Set(
    entries.filter((entry) => resolveEntryLocalityPolicy(entry).localOnly).map((entry) => entry.path),
  ), [entries])
  // Focus means something: the user's pick, or failing that the active note.
  // No fallback to an arbitrary node — the inspector's empty state is honest.
  const selectedNode = (selectedNodeId ? sim.nodeById.get(selectedNodeId) : null)
    ?? sim.nodes.find((node) => node.active)
    ?? null
  const stats = edgeStats(typedGraph)

  const toggleType = (type: string) => {
    setHiddenTypes((current) => {
      const next = new Set(current)
      if (next.has(type)) next.delete(type)
      else next.add(type)
      return next
    })
  }
  const openNode = (path: string) => {
    const entry = entryByPath.get(path)
    if (entry) onOpenNote(entry)
  }

  return (
    <DialogContent
      className="grimoire-panel-reveal max-h-[calc(100dvh-2rem)] w-[min(1160px,calc(100vw-2rem))] max-w-[min(1160px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden sm:max-w-[min(1160px,calc(100vw-2rem))]"
      data-testid="graph-dialog-content"
    >
      <DialogHeader>
        <div className="graph-dialog-title-row pr-8">
          <DialogTitle className="flex min-w-0 items-center gap-2">
            <Glyph name="graph" size={18} />
            <span className="truncate">Document relationships</span>
          </DialogTitle>
          <div className="graph-dialog-brain-summary" data-testid="graph-dialog-summary">
            <span>{layout.nodes.length} {layout.nodes.length === 1 ? 'page' : 'pages'}</span>
            <span>{layout.edges.length} {layout.edges.length === 1 ? 'connection' : 'connections'}</span>
            {activePath ? <span>{effectiveScope === 'neighborhood' ? 'Focused neighborhood' : 'Vault overview'}</span> : null}
          </div>
        </div>
        <DialogDescription>
          Follow explicit frontmatter relationships and Markdown links through this local vault.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 gap-3 overflow-hidden lg:grid-cols-[1fr_320px]">
        <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
          <label className="grimoire-graph-filter-shell flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
            <MagnifyingGlass size={15} className="text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter pages by title or type"
              className="h-7 border-0 bg-transparent px-2 shadow-none focus-visible:ring-0"
              data-testid="graph-filter"
            />
          </label>
          <GraphCanvas
            layout={{ nodes: sim.nodes, edges: layout.edges }}
            localOnlyNodeIds={localOnlyNodeIds}
            nodeById={sim.nodeById}
            selectedNodeId={selectedNode?.id ?? null}
            highlightedNodeId={highlightedNodeId}
            hot={sim.hot}
            viewportTransform={sim.viewportTransform}
            bindSvg={sim.bindSvg}
            viewportScale={sim.viewportScale}
            onNodePointerDown={sim.onNodePointerDown}
            onBackgroundPointerDown={sim.onBackgroundPointerDown}
            onZoomBy={sim.zoomBy}
            onResetView={sim.resetView}
            onOpenNode={openNode}
            onSelectNode={(node) => setSelectedNodeId(node.id)}
          />
        </div>

        <div className="min-h-0 space-y-3 overflow-y-auto pr-1" data-testid="graph-right-rail">
          <GraphRelationshipInspector
            entries={entries}
            edges={layout.edges}
            selectedNode={selectedNode}
            onHighlightNode={setHighlightedNodeId}
            onOpenNode={openNode}
          />
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
            typeStats={typeStats}
            hiddenTypes={hiddenTypes}
            onToggleType={toggleType}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  )
}
