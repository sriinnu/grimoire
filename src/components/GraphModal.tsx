import { useMemo, useState } from 'react'
import { MagnifyingGlass } from '@phosphor-icons/react'
import { Glyph } from '@/components/glyphs/Glyph'
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
import { buildProviderPromptDraft, mergeNoteReferences } from '../lib/providerPromptPrivacy'
import type { AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import { GraphCouncilReviewDialog, type GraphCouncilReviewDraft } from './GraphCouncilReviewDialog'

interface GraphModalProps {
  open: boolean
  entries: VaultEntry[]
  activePath: string | null
  defaultAiAgent?: AiAgentId
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  aiAgentsStatus?: AiAgentsStatus
  onOpenNote: (entry: VaultEntry) => void
  onClose: () => void
}

/** Shows the vault as an interactive note relationship graph. */
export function GraphModal({
  open,
  entries,
  activePath,
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  aiAgentsStatus,
  onOpenNote,
  onClose,
}: GraphModalProps) {
  return (
    <Dialog open={open} onOpenChange={(nextOpen) => { if (!nextOpen) onClose() }}>
      {open ? (
        <GraphModalContent
          entries={entries}
          activePath={activePath}
          defaultAiAgent={defaultAiAgent}
          defaultAiModel={defaultAiModel}
          defaultAiProvider={defaultAiProvider}
          aiAgentsStatus={aiAgentsStatus}
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
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  aiAgentsStatus,
  onOpenNote,
  onClose,
}: Omit<GraphModalProps, 'open'>) {
  const [query, setQuery] = useState('')
  const [scope, setScope] = useState<GraphScope>('neighborhood')
  const [edgeFilter, setEdgeFilter] = useState<GraphEdgeFilter>('all')
  const [hiddenTypes, setHiddenTypes] = useState<Set<string>>(() => new Set())
  const [councilDraft, setCouncilDraft] = useState<GraphCouncilReviewDraft | null>(null)
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
  const packageRootEntry = layout.nodes.length > 0 ? (selectedEntry ?? activeEntry) : null
  const agentGraphContext = useMemo(
    () => buildAgentGraphContext({ activeEntry: packageRootEntry, entries, graph: renderGraph }),
    [entries, packageRootEntry, renderGraph],
  )
  const stats = edgeStats(typedGraph)
  const heldFromAgents = agentGraphContext.omitted.protectedNodes + agentGraphContext.omitted.protectedEdges

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

  const prepareCouncilAboutSelection = () => {
    if (!selectedNode) return
    const prompt = buildGraphCouncilPrompt({
      agentGraphContext,
      aiAgentsStatus,
      selectedEntry,
      selectedNode,
    })
    setCouncilDraft({
      contextPackage: buildGraphAskContextPackage({
        agentGraphContext,
        prompt: prompt.text,
        selectedReference: prompt.references[0] ?? null,
      }),
      prompt,
    })
  }

  const sendCouncilDraft = (draft: GraphCouncilReviewDraft) => {
    const promptDraft = buildProviderPromptDraft(draft.prompt.text, entries)
    const references = mergeNoteReferences(draft.prompt.references, promptDraft.references)
    queueAiPrompt(promptDraft.text, references, {
      ...draft.contextPackage,
      prompt: promptDraft.text,
      references: mergeNoteReferences(draft.contextPackage.references, promptDraft.references),
    })
    requestOpenAiChat()
    setCouncilDraft(null)
    onClose()
  }

  return (
    <>
      <DialogContent
        className="grimoire-panel-reveal max-h-[calc(100dvh-2rem)] w-[min(1160px,calc(100vw-2rem))] max-w-[min(1160px,calc(100vw-2rem))] grid-rows-[auto_minmax(0,1fr)_auto] gap-4 overflow-hidden sm:max-w-[min(1160px,calc(100vw-2rem))]"
        data-testid="graph-dialog-content"
      >
        <DialogHeader>
          <div className="graph-dialog-title-row">
            <DialogTitle className="flex min-w-0 items-center gap-2">
              <Glyph name="graph" size={18} />
              <span className="truncate">Second Brain Map</span>
            </DialogTitle>
            <div className="graph-dialog-brain-summary" data-testid="graph-dialog-brain-summary">
              <span>{layout.nodes.length} graph nodes</span>
              <span>{agentGraphContext.nodes.length} source-safe</span>
              {heldFromAgents > 0 ? <span>{heldFromAgents} held local</span> : null}
            </div>
          </div>
          <DialogDescription className="sr-only">Notebook relationships and note links.</DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-3 overflow-hidden lg:grid-cols-[1fr_300px]">
          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden">
            <label className="grimoire-graph-filter-shell flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2">
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
              aiAgentsStatus={aiAgentsStatus}
              layout={layout}
              localOnlyNodeIds={localOnlyNodeIds}
              nodeById={nodeById}
              selectedNodeId={selectedNode?.id ?? null}
              onOpenNode={openNode}
              onSelectNode={(node) => setSelectedNodeId(node.id)}
            />
          </div>

          <div className="min-h-0 space-y-3 overflow-y-auto pr-1" data-testid="graph-right-rail">
            <GraphInsightPanel
              activeEntry={activeEntry}
              agentGraphContext={agentGraphContext}
              aiAgentsStatus={aiAgentsStatus}
              defaultAiAgent={defaultAiAgent}
              defaultAiModel={defaultAiModel}
              defaultAiProvider={defaultAiProvider}
              entries={entries}
              nodes={layout.nodes}
              selectedEntry={selectedEntry}
              selectedNode={selectedNode}
              onAskCouncil={prepareCouncilAboutSelection}
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

      <GraphCouncilReviewDialog
        draft={councilDraft}
        open={Boolean(councilDraft)}
        onCancel={() => setCouncilDraft(null)}
        onConfirm={sendCouncilDraft}
      />
    </>
  )
}
