import { BrainCircuit, Network } from 'lucide-react'
import type React from 'react'
import { useMemo } from 'react'
import { Glyph } from './glyphs/Glyph'
import { cn } from '@/lib/utils'
import {
  GRAPH_AGENT_LANES,
  graphAgentLaneCopy,
  resolveGraphAgentLaneState,
  type GraphAgentLane,
  type GraphAgentLaneState,
} from '../lib/graphAgentLanes'
import type { AiAgentId, AiAgentsStatus } from '../lib/aiAgents'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import type { PositionedGraphNode } from '../utils/graphDisplay'
import { resolveEntryLocalityPolicy } from '../lib/localityPolicy'
import type { VaultEntry } from '../types'
import { Button } from './ui/button'
import { GraphAgentCommandCenter } from './GraphAgentCommandCenter'
import { GraphAgentPackagePanel } from './GraphAgentPackagePanel'
import { GraphAgentRunway } from './GraphAgentRunway'

interface GraphInsightPanelProps {
  activeEntry: VaultEntry | null
  agentGraphContext: AgentGraphContext
  defaultAiAgent?: AiAgentId
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  aiAgentsStatus?: AiAgentsStatus
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
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  aiAgentsStatus,
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

  return (
    <div className="space-y-3">
      <GraphAgentCommandCenter
        agentGraphContext={agentGraphContext}
        selectedLocalOnly={selectedLocalOnly}
      >
        <GraphAgentPackagePanel agentGraphContext={agentGraphContext} />

        <GraphAgentRunway
          agentGraphContext={agentGraphContext}
          defaultAiAgent={defaultAiAgent}
          defaultAiModel={defaultAiModel}
          defaultAiProvider={defaultAiProvider}
          aiAgentsStatus={aiAgentsStatus}
          selectedLocalOnly={selectedLocalOnly}
        />

        <GraphAgentCouncilPanel
          agentGraphContext={agentGraphContext}
          aiAgentsStatus={aiAgentsStatus}
          selectedLocalOnly={selectedLocalOnly}
        />
      </GraphAgentCommandCenter>

      <SelectedNodePanel
        agentGraphContext={agentGraphContext}
        aiAgentsStatus={aiAgentsStatus}
        defaultAiAgent={defaultAiAgent}
        entry={selectedEntry}
        node={selectedNode}
        onAskCouncil={onAskCouncil}
        onOpenNode={onOpenNode}
      />

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
    </div>
  )
}

const GRAPH_AGENT_ICONS: Record<GraphAgentLane['id'], React.ReactNode> = {
  claude_code: <Glyph name="aiAgent" size={14} />,
  chitragupta: <BrainCircuit className="size-3.5" />,
  codex: <Glyph name="code" size={14} />,
  graph: <Network className="size-3.5" />,
  search: <Glyph name="search" size={14} />,
}

function GraphAgentCouncilPanel({
  agentGraphContext,
  aiAgentsStatus,
  selectedLocalOnly,
}: {
  agentGraphContext: AgentGraphContext
  aiAgentsStatus?: AiAgentsStatus
  selectedLocalOnly: boolean
}) {
  const policyProtected = agentGraphContext.state === 'protected-active' || selectedLocalOnly
  const lanes = GRAPH_AGENT_LANES.map((lane) => ({
    ...lane,
    copy: graphAgentLaneCopy(
      lane,
      resolveGraphAgentLaneState(lane, agentGraphContext.state, selectedLocalOnly, aiAgentsStatus),
      aiAgentsStatus,
      policyProtected,
    ),
    state: resolveGraphAgentLaneState(lane, agentGraphContext.state, selectedLocalOnly, aiAgentsStatus),
  }))

  return (
    <section className="graph-agent-surface rounded-md border border-border p-3" data-testid="graph-agent-council">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Glyph name="sparkle" size={14} />
        Council lanes
      </div>
      <div className="mt-3 space-y-1.5">
        {lanes.map((lane) => (
          <div
            key={lane.id}
            className="grimoire-agent-council__graph-lane grid grid-cols-[minmax(0,1fr)_auto] gap-2 rounded-md border border-border px-2.5 py-2"
            data-graph-agent-lane={lane.id}
            data-state={lane.state}
          >
            <div className="flex min-w-0 items-start gap-2">
              <span className="mt-0.5 text-muted-foreground">{GRAPH_AGENT_ICONS[lane.id]}</span>
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

function laneBadgeClass(state: GraphAgentLaneState): string {
  return cn(
    'inline-flex h-6 shrink-0 items-center rounded-full border px-2 text-[10px] font-semibold',
    'graph-agent-chip',
    state === 'ready' && 'border-primary/35 text-foreground',
    state === 'guarded' && 'border-border text-muted-foreground',
    state === 'blocked' && 'border-destructive/30 text-muted-foreground',
    state === 'waiting' && 'border-border text-muted-foreground',
  )
}

function SelectedNodePanel({
  agentGraphContext,
  aiAgentsStatus,
  defaultAiAgent,
  entry,
  node,
  onAskCouncil,
  onOpenNode,
}: {
  agentGraphContext: AgentGraphContext
  aiAgentsStatus?: AiAgentsStatus
  defaultAiAgent?: AiAgentId
  entry: VaultEntry | null
  node: PositionedGraphNode | null
  onAskCouncil: () => void
  onOpenNode: (path: string) => void
}) {
  if (!node) return null

  const localOnly = entry ? resolveEntryLocalityPolicy(entry).localOnly : false
  const routeStatus = defaultAiAgent && aiAgentsStatus ? aiAgentsStatus[defaultAiAgent]?.status : null
  const routeUnavailable = routeStatus === 'missing' || routeStatus === 'checking'
  const sourcePackageReady = agentGraphContext.state === 'ready' && !localOnly
  const canAskCouncil = sourcePackageReady && !routeUnavailable
  const title = localOnly ? 'Protected local note' : node.title
  const detail = localOnly ? 'Local-only / withheld from agents' : `${node.type} / ${node.degree} graph links`
  const held = agentGraphContext.omitted.protectedNodes + agentGraphContext.omitted.protectedEdges
  const sourceLabelCount = sourcePackageReady ? selectedPackageReferenceCount(agentGraphContext, entry, node) : 0

  return (
    <section className="rounded-md border border-border bg-background/80 p-3" data-testid="graph-selected-node">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Glyph name="gitHistory" size={14} />
        Selected node
      </div>
      <div className="graph-surface-inner mt-3 rounded-md border border-border bg-muted/35 px-2.5 py-2">
        <div className="truncate text-sm font-semibold text-foreground">{title}</div>
        <div className="mt-1 text-xs text-muted-foreground">{detail}</div>
      </div>
      <div className="graph-surface-inner mt-2 rounded-md border border-border bg-muted/25 px-2.5 py-2 text-[11px] leading-4 text-muted-foreground">
        {selectedNodeCouncilCopy({
          held,
          routeStatus,
          sourceLabelCount,
          sourcePackageReady,
        })}
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
          {selectedNodeBlockedCopy({ localOnly, routeStatus })}
        </p>
      ) : null}
    </section>
  )
}

function selectedNodeCouncilCopy({
  held,
  routeStatus,
  sourceLabelCount,
  sourcePackageReady,
}: {
  held: number
  routeStatus: AiAgentsStatus[AiAgentId]['status'] | null
  sourceLabelCount: number
  sourcePackageReady: boolean
}): string {
  if (!sourcePackageReady) return 'Council handoff is blocked until this selection is source-safe.'
  if (routeStatus === 'missing') return `${sourceLabelCount} source labels ready, but the selected agent route is missing.`
  if (routeStatus === 'checking') return `${sourceLabelCount} source labels ready, but the selected agent route is still checking.`
  return `${sourceLabelCount} source labels eligible for Council${held > 0 ? `, ${held} held from agents` : ''}.`
}

function selectedNodeBlockedCopy({
  localOnly,
  routeStatus,
}: {
  localOnly: boolean
  routeStatus: AiAgentsStatus[AiAgentId]['status'] | null
}): string {
  if (localOnly) return 'Locality Firewall blocks this node from agent handoff.'
  if (routeStatus === 'missing') return 'Install or switch the selected agent route before Council handoff.'
  if (routeStatus === 'checking') return 'Wait for agent route health before Council handoff.'
  return 'Open a public active note to prepare an agent package.'
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

function InsightMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="graph-surface-inner rounded-md border border-border bg-muted/35 px-2.5 py-2">
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
