import { GitBranch, ShieldCheck, Sparkles } from 'lucide-react'
import type React from 'react'
import type { AgentGraphContext } from '../utils/agentGraphContext'
import { buildSourceLabelMap, buildSourceLabels } from '../utils/sourceLabels'

interface GraphAgentPackagePanelProps {
  agentGraphContext: AgentGraphContext
}

type PackageBadgeState = 'blocked' | 'guarded' | 'ready' | 'waiting'

/** Source-safe graph package manifest shown before any Agent Council handoff. */
export function GraphAgentPackagePanel({ agentGraphContext }: GraphAgentPackagePanelProps) {
  const omitted = agentGraphContext.omitted
  const held = omitted.protectedNodes + omitted.protectedEdges
  const trimmed = omitted.truncatedNodes + omitted.truncatedEdges
  const labels = sourceLabels(agentGraphContext)
  const edges = edgeLabels(agentGraphContext)
  const state = packageState(agentGraphContext)

  return (
    <section className="graph-agent-surface graph-agent-package grimoire-panel-reveal rounded-md border border-border p-3" data-state={state} data-testid="graph-agent-handoff">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <Sparkles className="size-3.5" />
        Agent package
      </div>
      <div className="graph-agent-package__envelope mt-3 grid gap-2 rounded-md border px-2.5 py-2" data-testid="graph-agent-package-envelope">
        <PackageMetric label="Source preview" state={labels.length > 0 ? 'ready' : 'waiting'} value={previewValue(labels.length, agentGraphContext.nodes.length)} />
        <PackageMetric label="Link preview" state={edges.length > 0 ? 'ready' : 'waiting'} value={previewValue(edges.length, agentGraphContext.edges.length)} />
        <PackageMetric label="Held local" state={held > 0 ? 'guarded' : 'ready'} value={`${held}`} />
        <PackageMetric label="Trimmed" state={trimmed > 0 ? 'guarded' : 'ready'} value={`${trimmed}`} />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <PackageBadge
          icon={<ShieldCheck className="size-3" />}
          label={handoffLabel(agentGraphContext)}
          state={state}
        />
        <PackageBadge label={`${labels.length} previewed / ${agentGraphContext.nodes.length} source labels`} state={labels.length > 0 ? 'ready' : 'waiting'} />
        <PackageBadge label={`${edges.length} previewed / ${agentGraphContext.edges.length} edge manifests`} state={edges.length > 0 ? 'ready' : 'waiting'} />
        {held > 0 ? <PackageBadge label={`${held} held by Locality Firewall`} state="guarded" /> : null}
        {trimmed > 0 ? <PackageBadge label={`${trimmed} trimmed by limit`} state="guarded" /> : null}
      </div>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">
        {handoffCopy(agentGraphContext)}
      </p>
      <div className="mt-3 grid gap-2" data-testid="graph-package-manifest">
        <ManifestList title="Source labels" items={labels} emptyLabel="No source labels ready." state={labels.length > 0 ? 'ready' : 'waiting'} />
        <ManifestList title="Edge manifest" items={edges} emptyLabel="No visible public links." state={edges.length > 0 ? 'ready' : 'waiting'} />
      </div>
    </section>
  )
}

function PackageMetric({
  label,
  state,
  value,
}: {
  label: string
  state: PackageBadgeState
  value: string
}) {
  return (
    <div className="graph-agent-package__metric rounded-md border px-2 py-1.5" data-state={state}>
      <div className="text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-xs font-semibold text-foreground">{value}</div>
    </div>
  )
}

function packageState(context: AgentGraphContext): PackageBadgeState {
  if (context.state === 'protected-active') return 'blocked'
  if (context.state === 'empty') return 'waiting'
  return 'ready'
}

function sourceLabels(context: AgentGraphContext): string[] {
  if (context.state !== 'ready') return []
  return buildSourceLabels(context.nodes).slice(0, 4)
}

function edgeLabels(context: AgentGraphContext): string[] {
  if (context.state !== 'ready') return []
  const labelsByPath = buildSourceLabelMap(context.nodes)
  return context.edges.slice(0, 3).map((edge) => {
    const sourceLabel = labelsByPath.get(edge.sourcePath) ?? edge.sourceTitle
    const targetLabel = labelsByPath.get(edge.targetPath) ?? edge.targetTitle
    return `${sourceLabel} -> ${targetLabel}`
  })
}

function previewValue(previewed: number, total: number): string {
  return `${previewed} shown / ${total} total`
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
  return `${context.nodes.length} notes and ${context.edges.length} links are eligible for source-safe handoff review.`
}

function ManifestList({
  emptyLabel,
  items,
  state,
  title,
}: {
  emptyLabel: string
  items: string[]
  state: PackageBadgeState
  title: string
}) {
  return (
    <div className="graph-agent-card rounded-md border border-border px-2.5 py-2" data-state={state}>
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
        <GitBranch className="size-3" />
        {title}
      </div>
      <div className="mt-1 flex flex-wrap gap-1">
        {items.length > 0 ? items.map((item) => (
          <span key={item} className="graph-agent-chip max-w-full rounded-full border border-border px-2 py-0.5 text-[10px] text-foreground" data-state={state}>
            <span className="block max-w-[180px] truncate">{item}</span>
          </span>
        )) : (
          <span className="text-[11px] text-muted-foreground">{emptyLabel}</span>
        )}
      </div>
    </div>
  )
}

function PackageBadge({ icon, label, state }: { icon?: React.ReactNode; label: string; state: PackageBadgeState }) {
  return (
    <span className="graph-agent-chip inline-flex items-center gap-1 rounded-full border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground" data-state={state}>
      {icon}
      {label}
    </span>
  )
}
