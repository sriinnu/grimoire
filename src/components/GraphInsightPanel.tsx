import { Bot, BrainCircuit, Code2, GitBranch, Network, Search, ShieldCheck, Sparkles } from 'lucide-react'
import type React from 'react'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import type { PositionedGraphNode } from '../utils/graphDisplay'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { VaultEntry } from '../types'
import { Button } from './ui/button'

interface GraphInsightPanelProps {
  activeEntry: VaultEntry | null
  agentGraphContext: AgentGraphContext
  entries: VaultEntry[]
  nodes: PositionedGraphNode[]
  selectedEntry: VaultEntry | null
  selectedNode: PositionedGraphNode | null
  onAskCouncil: () => void
  onOpenNode: (path: string) => void
}

/** Shows why the current graph view matters and what graph context agents may receive. */
export function GraphInsightPanel({
  activeEntry,
  agentGraphContext,
  entries,
  nodes,
  selectedEntry,
  selectedNode,
  onAskCouncil,
  onOpenNode,
}: GraphInsightPanelProps) {
  const entryByPath = useMemo(() => new Map(entries.map((entry) => [entry.path, entry])), [entries])
  const activeNode = nodes.find((node) => node.active) ?? null
  const selectedLocalOnly = selectedEntry ? resolveEntryLocalityPolicy(selectedEntry).localOnly : false
  const connectors = useMemo(() => (
    [...nodes]
      .filter((node) => !node.active)
      .sort((left, right) => right.degree - left.degree || left.title.localeCompare(right.title))
      .slice(0, 3)
  ), [nodes])
  const omitted = agentGraphContext.omitted
  const held = omitted.protectedNodes + omitted.protectedEdges
  const trimmed = omitted.truncatedNodes + omitted.truncatedEdges

  return (
    <div className="space-y-3">
      <section className="rounded-md border border-border bg-background/80 p-3" data-testid="graph-insight-panel">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Network className="size-3.5" />
          Map intelligence
        </div>
        <div className="mt-3 space-y-2">
          <InsightMetric label="Focus" value={activeNode?.title ?? activeEntry?.title ?? 'Vault map'} />
          <InsightMetric label="Visible" value={`${nodes.length} notes`} />
        </div>
        {connectors.length > 0 ? (
          <div className="mt-3 space-y-2">
            <div className="text-xs font-medium text-muted-foreground">Strong connectors</div>
            <div className="space-y-1">
              {connectors.map((node) => (
                <ConnectorButton
                  key={node.id}
                  localOnly={resolveEntryLocalityPolicy(entryByPath.get(node.path) ?? fallbackEntry(node)).localOnly}
                  node={node}
                  onOpen={() => onOpenNode(node.path)}
                />
              ))}
            </div>
          </div>
        ) : null}
      </section>

      <SelectedNodePanel
        agentGraphContext={agentGraphContext}
        entry={selectedEntry}
        node={selectedNode}
        onAskCouncil={onAskCouncil}
        onOpenNode={onOpenNode}
      />

      <GraphAgentCouncilPanel
        agentGraphContext={agentGraphContext}
        selectedLocalOnly={selectedLocalOnly}
      />

      <section className="rounded-md border border-border bg-muted/35 p-3" data-testid="graph-agent-handoff">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          <Sparkles className="size-3.5" />
          Agent handoff
        </div>
        <div className="mt-3 flex flex-wrap gap-1.5">
          <HandoffBadge
            icon={<ShieldCheck className="size-3" />}
            label={handoffLabel(agentGraphContext)}
          />
          {held > 0 ? <HandoffBadge label={`${held} held local`} /> : null}
          {trimmed > 0 ? <HandoffBadge label={`${trimmed} trimmed`} /> : null}
        </div>
        <p className="mt-2 text-xs leading-5 text-muted-foreground">
          {handoffCopy(agentGraphContext)}
        </p>
      </section>
    </div>
  )
}

type GraphAgentLaneKind = 'local' | 'private' | 'handoff'
type GraphAgentLaneState = 'blocked' | 'guarded' | 'ready' | 'waiting'

interface GraphAgentLaneDefinition {
  icon: React.ReactNode
  kind: GraphAgentLaneKind
  name: string
  role: string
}

const GRAPH_AGENT_LANES: GraphAgentLaneDefinition[] = [
  { icon: <Search className="size-3.5" />, kind: 'local', name: 'Local search', role: 'Nearby text' },
  { icon: <Network className="size-3.5" />, kind: 'local', name: 'Vault graph', role: 'Links and gaps' },
  { icon: <BrainCircuit className="size-3.5" />, kind: 'private', name: 'Chitragupta', role: 'Private memory' },
  { icon: <Code2 className="size-3.5" />, kind: 'handoff', name: 'Codex', role: 'Patch path' },
  { icon: <Bot className="size-3.5" />, kind: 'handoff', name: 'Claude', role: 'Second stance' },
]

function GraphAgentCouncilPanel({
  agentGraphContext,
  selectedLocalOnly,
}: {
  agentGraphContext: AgentGraphContext
  selectedLocalOnly: boolean
}) {
  const lanes = GRAPH_AGENT_LANES.map((lane) => ({
    ...lane,
    copy: laneCopy(lane, agentGraphContext, selectedLocalOnly),
    state: laneState(lane, agentGraphContext, selectedLocalOnly),
  }))

  return (
    <section className="rounded-md border border-border bg-background/80 p-3" data-testid="graph-agent-council">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Sparkles className="size-3.5" />
        Council lanes
      </div>
      <div className="mt-3 space-y-1.5">
        {lanes.map((lane) => (
          <div
            key={lane.name}
            className="grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-border bg-muted/30 px-2.5 py-2"
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">{lane.icon}</span>
              <span className="min-w-0">
                <span className="block truncate text-xs font-semibold text-foreground">{lane.name}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{lane.role}</span>
              </span>
            </div>
            <span className={laneBadgeClass(lane.state)}>{lane.copy}</span>
          </div>
        ))}
      </div>
    </section>
  )
}

function laneState(
  lane: GraphAgentLaneDefinition,
  context: AgentGraphContext,
  selectedLocalOnly: boolean,
): GraphAgentLaneState {
  if (context.state === 'empty') return 'waiting'
  if (context.state === 'protected-active' || selectedLocalOnly) {
    return lane.kind === 'handoff' ? 'blocked' : 'guarded'
  }
  return lane.kind === 'private' ? 'guarded' : 'ready'
}

function laneCopy(
  lane: GraphAgentLaneDefinition,
  context: AgentGraphContext,
  selectedLocalOnly: boolean,
): string {
  const state = laneState(lane, context, selectedLocalOnly)
  if (state === 'waiting') return 'Waiting'
  if (state === 'blocked') return 'Blocked'
  if (state === 'guarded') return lane.kind === 'private' ? 'Private' : 'Local only'
  return 'Source-safe'
}

function laneBadgeClass(state: GraphAgentLaneState): string {
  return cn(
    'inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[10px] font-semibold',
    state === 'ready' && 'border-primary/35 bg-primary/10 text-foreground',
    state === 'guarded' && 'border-border bg-background text-muted-foreground',
    state === 'blocked' && 'border-destructive/30 bg-destructive/10 text-muted-foreground',
    state === 'waiting' && 'border-border bg-background text-muted-foreground',
  )
}

function SelectedNodePanel({
  agentGraphContext,
  entry,
  node,
  onAskCouncil,
  onOpenNode,
}: {
  agentGraphContext: AgentGraphContext
  entry: VaultEntry | null
  node: PositionedGraphNode | null
  onAskCouncil: () => void
  onOpenNode: (path: string) => void
}) {
  if (!node) return null

  const localOnly = entry ? resolveEntryLocalityPolicy(entry).localOnly : false
  const canAskCouncil = agentGraphContext.state === 'ready' && !localOnly
  const title = localOnly ? 'Protected local note' : node.title
  const detail = localOnly ? 'Local-only / withheld from agents' : `${node.type} / ${node.degree} graph links`
  const held = agentGraphContext.omitted.protectedNodes + agentGraphContext.omitted.protectedEdges
  const sourceLabelCount = canAskCouncil ? selectedPackageReferenceCount(agentGraphContext, entry, node) : 0

  return (
    <section className="rounded-md border border-border bg-background/80 p-3" data-testid="graph-selected-node">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <GitBranch className="size-3.5" />
        Selected node
      </div>
      <div className="mt-3 rounded-md border border-border bg-muted/35 px-2.5 py-2">
        <div className="truncate text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </div>
      <div className="mt-2 rounded-md border border-border bg-muted/25 px-2.5 py-2 text-[11px] leading-4 text-muted-foreground">
        {canAskCouncil
          ? `${sourceLabelCount} source labels ready for Council${held > 0 ? `, ${held} held local` : ''}.`
          : 'Council handoff is blocked until this selection is source-safe.'}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-8"
          onClick={() => onOpenNode(node.path)}
        >
          Open
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          className="h-8"
          disabled={!canAskCouncil}
          onClick={onAskCouncil}
        >
          Ask Council
        </Button>
      </div>
      {!canAskCouncil ? (
        <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
          {localOnly
            ? 'Locality Firewall blocks this node from agent handoff.'
            : 'Open a public active note to prepare an agent package.'}
        </p>
      ) : null}
    </section>
  )
}

function selectedPackageReferenceCount(
  context: AgentGraphContext,
  entry: VaultEntry | null,
  node: PositionedGraphNode,
): number {
  const references = new Set<string>()
  references.add(entry?.path ?? node.path)
  for (const graphNode of context.nodes) references.add(graphNode.path)
  return Math.min(8, references.size)
}

function fallbackEntry(node: PositionedGraphNode): VaultEntry {
  return {
    aliases: [],
    archived: false,
    belongsTo: [],
    color: null,
    createdAt: null,
    favorite: false,
    favoriteIndex: null,
    fileSize: 0,
    filename: node.path.split('/').pop() ?? node.title,
    hasH1: false,
    icon: null,
    isA: node.type,
    listPropertiesDisplay: [],
    modifiedAt: null,
    order: null,
    organized: false,
    outgoingLinks: [],
    path: node.path,
    properties: {},
    relatedTo: [],
    relationships: {},
    sidebarLabel: null,
    snippet: '',
    sort: null,
    status: null,
    template: null,
    title: node.title,
    view: null,
    visible: null,
    wordCount: 0,
  }
}

function handoffLabel(context: AgentGraphContext): string {
  if (context.state === 'protected-active') return 'Blocked'
  if (context.state === 'empty') return 'No package'
  return 'Source-safe'
}

function handoffCopy(context: AgentGraphContext): string {
  if (context.state === 'protected-active') {
    return 'The active note is local-only, so graph labels and paths are withheld from agents.'
  }
  if (context.state === 'empty') {
    return 'Open a note to package its graph neighborhood for an inspectable agent handoff.'
  }
  return `${context.nodes.length} notes and ${context.edges.length} links can be sent with source labels.`
}

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-muted/35 px-2.5 py-2">
      <div className="text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-1 truncate text-sm font-semibold text-foreground">{value}</div>
    </div>
  )
}

function ConnectorButton({
  localOnly,
  node,
  onOpen,
}: {
  localOnly: boolean
  node: PositionedGraphNode
  onOpen: () => void
}) {
  const title = localOnly ? 'Protected local note' : node.title
  const detail = localOnly ? `Local-only / ${node.degree} links` : `${node.type} / ${node.degree} links`

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-auto w-full justify-between gap-2 rounded-md px-2 py-1.5 text-left"
      onClick={onOpen}
    >
      <span className="min-w-0">
        <span className="block truncate text-xs font-semibold text-foreground">{title}</span>
        <span className="block truncate text-[11px] text-muted-foreground">{detail}</span>
      </span>
      {localOnly ? <span className="shrink-0 rounded-full border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground">Local</span> : null}
    </Button>
  )
}

function HandoffBadge({ icon, label }: { icon?: React.ReactNode; label: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-[11px] font-medium text-muted-foreground">
      {icon}
      {label}
    </span>
  )
}
