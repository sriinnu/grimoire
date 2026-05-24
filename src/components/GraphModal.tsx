import { useMemo, useState } from 'react'
import { Graph, MagnifyingGlass } from '@phosphor-icons/react'
import type { VaultEntry } from '../types'
import { buildNoteGraph, filterGraphByQuery } from '../utils/noteGraph'
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
import { Button } from './ui/button'
import { GraphCanvas } from './GraphCanvas'
import { GraphControlPanel } from './GraphControlPanel'
import { GraphInsightPanel } from './GraphInsightPanel'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog'
import { Input } from './ui/input'
import { buildAgentGraphContext } from '../utils/agentGraphContext'
import { buildGraphCouncilPrompt } from '../utils/graphCouncilPrompt'
import { queueAiPrompt, requestOpenAiChat } from '../utils/aiPromptBridge'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import { buildGraphAskContextPackage } from '../lib/askContextPackage'

interface GraphModalProps {
  open: boolean
  entries: VaultEntry[]
  activePath: string | null
  onOpenNote: (entry: VaultEntry) => void
  onClose: () => void
}

/** Shows the vault as an interactive note relationship graph. */
export function GraphModal({ open, entries, activePath, onOpenNote, onClose }: GraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      {open ? (
        <GraphModalContent
          entries={entries}
          activePath={activePath}
          onOpenNote={onOpenNote}
          onClose={onClose}
        />
      ) : null}
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
  const graph = useMemo(() => buildNoteGraph(entries, activePath), [activePath, entries])
  const effectiveScope = activePath ? scope : 'vault'
  const scopedGraph = useMemo(() => scopeGraph(graph, effectiveScope), [effectiveScope, graph])
  const visibleGraph = useMemo(() => filterGraphByQuery(scopedGraph, query), [query, scopedGraph])
  const displayGraph = useMemo(() => limitGraphForDisplay(visibleGraph), [visibleGraph])
  const typeStats = useMemo(() => graphTypeStats(displayGraph, entries), [displayGraph, entries])
  const typedGraph = useMemo(() => filterGraphByNodeTypes(displayGraph, hiddenTypes), [displayGraph, hiddenTypes])
  const renderGraph = useMemo(() => filterGraphEdges(typedGraph, edgeFilter), [typedGraph, edgeFilter])
  const layout = useMemo(() => layoutGraph(renderGraph, entries), [entries, renderGraph])
  const nodeById = useMemo(() => new Map(layout.nodes.map((node) => [node.id, node])), [layout.nodes])
  const entryByPath = useMemo(() => new Map(entries.map((entry) => [entry.path, entry])), [entries])
  const localOnlyNodeIds = useMemo(() => new Set(
    entries
      .filter((entry) => resolveEntryLocalityPolicy(entry).localOnly)
      .map((entry) => entry.path),
  ), [entries])
  const selectedNode = (selectedNodeId ? nodeById.get(selectedNodeId) : null)
    ?? layout.nodes.find((node) => node.active)
    ?? layout.nodes[0]
    ?? null
  const selectedEntry = selectedNode ? entryByPath.get(selectedNode.path) ?? null : null
  const activeEntry = activePath ? entryByPath.get(activePath) ?? null : null
  const packageRootEntry = selectedEntry ?? activeEntry
  const agentGraphContext = useMemo(
    () => buildAgentGraphContext({ activeEntry: packageRootEntry, entries, graph: renderGraph }),
    [entries, packageRootEntry, renderGraph],
  )
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

  const askCouncilAboutSelection = () => {
    if (!selectedNode) return
    const prompt = buildGraphCouncilPrompt({
      agentGraphContext,
      selectedEntry,
      selectedNode,
    })
    queueAiPrompt(prompt.text, prompt.references, buildGraphAskContextPackage({
      agentGraphContext,
      prompt: prompt.text,
      selectedReference: prompt.references[0] ?? null,
    }))
    requestOpenAiChat()
  }

  return (
    <DialogContent className="grimoire-panel-reveal max-w-[min(1160px,calc(100vw-2rem))] gap-4">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Graph size={18} />
          Knowledge graph
        </DialogTitle>
        <DialogDescription className="sr-only">Vault relationships and Spelllinks.</DialogDescription>
      </DialogHeader>

      <div className="grid gap-3 lg:grid-cols-[1fr_300px]">
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
          <GraphCanvas
            agentGraphContext={agentGraphContext}
            layout={layout}
            localOnlyNodeIds={localOnlyNodeIds}
            nodeById={nodeById}
            selectedNodeId={selectedNode?.id ?? null}
            onOpenNode={openNode}
            onSelectNode={(node) => setSelectedNodeId(node.id)}
          />
        </div>

        <div className="space-y-3">
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
          <GraphInsightPanel
            activeEntry={activeEntry}
            agentGraphContext={agentGraphContext}
            entries={entries}
            nodes={layout.nodes}
            selectedEntry={selectedEntry}
            selectedNode={selectedNode}
            onAskCouncil={askCouncilAboutSelection}
            onOpenNode={openNode}
          />
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Close</Button>
      </DialogFooter>
    </DialogContent>
  )
}
