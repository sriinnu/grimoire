import { FileSearch, FileStack, Network, PackageCheck, ShieldCheck } from 'lucide-react'
import type { ReactNode } from 'react'
import type { ContextCapsulePreview } from '../lib/contextCapsule'
import type { AiAgentId } from '../lib/aiAgents'
import { localityEgressLanes } from '../lib/localityPolicy'
import { AgentRouteDisclosure } from './AgentRouteDisclosure'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface ContextCapsuleCardProps {
  defaultAiAgent?: AiAgentId
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  preview: ContextCapsulePreview
  reviewReceipt?: string
  onReviewPackage?: () => void
}

/** Shows the local context package that would be handed to an agent. */
export function ContextCapsuleCard({
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  preview,
  reviewReceipt,
  onReviewPackage,
}: ContextCapsuleCardProps) {
  const stateLabel = preview.state === 'protected'
    ? 'Protected'
    : preview.state === 'empty' ? 'Empty' : 'Preview'
  const trimmedCount = exclusionCount(preview.exclusions, 'trimmed')
  const heldLocalCount = preview.state === 'protected'
    ? 1
    : Math.max(0, exclusionCount(preview.exclusions) - trimmedCount)
  const safeSourceCount = preview.includedNotes.length
  const route = capsuleRoute({ heldLocalCount, preview, safeSourceCount, trimmedCount })
  const egressLanes = localityEgressLanes(preview.state === 'protected')

  return (
    <section className="border-b border-border px-4 py-3" data-testid="context-capsule-card">
      <div className="grimoire-context-capsule rounded-xl border border-border bg-muted/25 p-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
            <PackageCheck className="size-4 shrink-0 text-muted-foreground" />
            <span>Context Capsule</span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {reviewReceipt ? (
              <Badge
                variant="outline"
                className="h-7 rounded-xl px-2.5 font-mono text-[12px]"
                data-testid="context-capsule-receipt"
              >
                {reviewReceipt}
              </Badge>
            ) : null}
            <Badge variant={preview.state === 'protected' ? 'secondary' : 'outline'} className="h-7 rounded-xl px-2.5 text-[13px]">
              {stateLabel}
            </Badge>
          </div>
        </div>
        {onReviewPackage ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-3 w-full justify-start"
            onClick={onReviewPackage}
            data-testid="context-capsule-review"
          >
            <FileSearch className="size-4" />
            Review capsule package
          </Button>
        ) : null}

        {defaultAiAgent ? (
          <AgentRouteDisclosure
            agent={defaultAiAgent}
            className="mt-3"
            contextProtected={preview.state === 'protected'}
            model={defaultAiModel}
            provider={defaultAiProvider}
          />
        ) : null}

        {preview.handoffIntent ? (
          <div
            className="mt-3 rounded-xl border border-[var(--grimoire-signal-border)] bg-[var(--grimoire-signal-bg)] px-3 py-2.5 text-[13px] leading-snug text-[var(--grimoire-signal-text)]"
            data-testid="context-capsule-intent"
          >
            <span className="font-semibold">{preview.handoffIntent}</span>
            <span className="ml-1 text-muted-foreground">review-before-write Markdown memory</span>
          </div>
        ) : null}

        <div
          className="grimoire-context-capsule__route mt-3 rounded-xl border border-[var(--grimoire-signal-border)] bg-[var(--grimoire-signal-bg)] p-3.5"
          data-locality={preview.state === 'protected' ? 'protected-local' : 'source-safe'}
          data-testid="context-capsule-route"
        >
          <div className="flex items-center justify-between gap-2.5 text-[13px] font-medium text-[var(--grimoire-signal-text)]">
            <span>Package route</span>
            <span>{preview.state === 'protected' ? 'No handoff' : 'Review first'}</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {route.map((step) => (
              <div
                key={step.id}
                className="grimoire-context-capsule__step rounded-xl border border-border bg-background/55 px-2.5 py-2.5"
                data-status={step.status}
              >
                <div className="flex items-center gap-2 text-[12px] font-medium text-foreground">
                  <span className={`size-2 rounded-full ${routeDotClass(step.status)}`} />
                  <span className="truncate">{step.label}</span>
                </div>
                <div className="mt-2 line-clamp-2 text-[12px] leading-snug text-muted-foreground">
                  {step.detail}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-2" data-testid="context-capsule-egress">
            {egressLanes.map((lane) => (
              <div
                key={lane.id}
                className="grimoire-context-capsule__step flex min-w-0 items-center justify-between gap-2.5 rounded-xl border border-border bg-background/55 px-2.5 py-2"
                data-egress-state={lane.stateKey}
              >
                <span className="truncate text-[12px] font-medium text-foreground">{lane.label}</span>
                <span className="shrink-0 text-[12px] text-muted-foreground">{lane.state}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <CapsuleStat label="Notes" value={preview.counts.selectedNotes} />
          <CapsuleStat label="Linked" value={preview.counts.linkedNotes} />
          <CapsuleStat label="List" value={preview.counts.noteListItems} />
          <CapsuleStat label="Held" value={heldLocalCount} />
        </div>

        <div className="mt-3 flex flex-wrap gap-2">
          <CapsuleBadge icon={<ShieldCheck className="size-4" />} label={preview.rules[1]} />
          <CapsuleBadge icon={<Network className="size-4" />} label={`${preview.projectMap.graphNodes} graph notes`} />
          <CapsuleBadge icon={<Network className="size-4" />} label={`${preview.projectMap.graphEdges} graph edges`} />
          {preview.projectMap.graphOmitted > 0 ? (
            <CapsuleBadge icon={<ShieldCheck className="size-4" />} label={`${preview.projectMap.graphOmitted} graph held`} />
          ) : null}
          <CapsuleBadge icon={<FileStack className="size-4" />} label={preview.rules[2]} />
        </div>

        {preview.includedNotes.length > 0 ? (
          <div className="mt-3 flex flex-wrap gap-2" data-testid="context-capsule-included">
            {preview.includedNotes.slice(0, 3).map((note) => (
              <Badge key={note.path} variant="secondary" className="max-w-full rounded-xl text-[13px]">
                <span className="truncate">{note.title}</span>
              </Badge>
            ))}
          </div>
        ) : null}

        {preview.exclusions.length > 0 ? (
          <div className="mt-3 grid gap-2" data-testid="context-capsule-exclusions">
            {preview.exclusions.slice(0, 3).map((item) => (
              <div key={item.label} className="flex min-w-0 items-center justify-between gap-2.5 text-[13px] text-muted-foreground">
                <span className="truncate">{item.label}</span>
                <span className="shrink-0">{item.reason}</span>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

interface CapsuleRouteStep {
  detail: string
  id: string
  label: string
  status: 'ready' | 'limited' | 'blocked' | 'review'
}

function capsuleRoute({
  heldLocalCount,
  preview,
  safeSourceCount,
  trimmedCount,
}: {
  heldLocalCount: number
  preview: ContextCapsulePreview
  safeSourceCount: number
  trimmedCount: number
}): CapsuleRouteStep[] {
  return [
    {
      id: 'gather',
      label: 'Gather',
      status: preview.state === 'empty' ? 'limited' : preview.state === 'protected' ? 'blocked' : 'ready',
      detail: preview.state === 'protected' ? 'Active note held.' : countLabel(safeSourceCount, 'source'),
    },
    {
      id: 'firewall',
      label: 'Firewall',
      status: heldLocalCount > 0 ? 'review' : 'ready',
      detail: heldLocalCount > 0 ? `${heldLocalCount} held local.` : 'No holds.',
    },
    {
      id: 'map',
      label: 'Map',
      status: trimmedCount > 0 ? 'limited' : 'ready',
      detail: `${preview.projectMap.graphNodes} nodes / ${preview.projectMap.graphEdges} edges.`,
    },
    {
      id: 'review',
      label: 'Review',
      status: preview.state === 'protected' ? 'blocked' : 'review',
      detail: preview.state === 'protected' ? 'Handoff blocked.' : 'Markdown preview.',
    },
  ]
}

function exclusionCount(exclusions: ContextCapsulePreview['exclusions'], labelMatch?: string): number {
  return exclusions
    .filter((item) => !labelMatch || item.label.toLowerCase().includes(labelMatch))
    .reduce((total, item) => total + (Number.parseInt(item.reason, 10) || 1), 0)
}

function routeDotClass(status: CapsuleRouteStep['status']): string {
  if (status === 'ready') return 'bg-[var(--grimoire-signal-accent)]'
  if (status === 'blocked') return 'bg-[var(--status-bar-danger-fg,var(--destructive))]'
  if (status === 'review') return 'bg-[var(--grimoire-private-local-accent)]'
  return 'bg-[var(--status-bar-warning-fg,var(--primary))]'
}

function countLabel(count: number, singular: string): string {
  return `${count} ${singular}${count === 1 ? '' : 's'}.`
}

function CapsuleStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="grimoire-context-capsule__stat rounded-xl bg-background/60 px-3 py-2"
      data-testid={`context-capsule-stat-${label.toLowerCase()}`}
    >
      <div className="text-[11px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="text-[22px] font-semibold text-foreground">{value}</div>
    </div>
  )
}

function CapsuleBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Badge variant="outline" className="h-7 max-w-full rounded-xl px-2.5 text-[12px]">
      {icon}
      <span className="truncate">{label}</span>
    </Badge>
  )
}
