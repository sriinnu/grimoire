import { ChevronDown, ChevronRight, ShieldCheck, Sparkles } from 'lucide-react'
import type { CrystallizeProposalSummary } from '../lib/crystallizeProposal'
import type { ContextCapsuleState } from '../lib/contextCapsule'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface ContextPackageSummary {
  receipt: string
  state: ContextCapsuleState
}

interface AiPanelIntelligenceSummaryProps {
  activeContextProtected: boolean
  canCrystallize: boolean
  contextPackageSummary?: ContextPackageSummary | null
  expanded: boolean
  graphNodeCount: number
  hasContext: boolean
  hasLatestResponse: boolean
  heldCount: number
  proposalSummary?: CrystallizeProposalSummary | null
  routeReady: boolean
  sourceCount: number
  onCrystallize: () => void
  onToggle: () => void
}

/** Compact AI panel brief that keeps diagnostics behind an explicit review step. */
export function AiPanelIntelligenceSummary({
  activeContextProtected,
  canCrystallize,
  contextPackageSummary,
  expanded,
  graphNodeCount,
  hasContext,
  hasLatestResponse,
  heldCount,
  proposalSummary,
  routeReady,
  sourceCount,
  onCrystallize,
  onToggle,
}: AiPanelIntelligenceSummaryProps) {
  const localityLabel = activeContextProtected ? 'Local hold' : 'Source-safe'
  const memoryLabel = canCrystallize ? 'Diff ready' : hasLatestResponse ? 'Review blocked' : 'Awaiting answer'
  const runway = buildCrystallizeRunway({ activeContextProtected, canCrystallize, hasContext, hasLatestResponse })

  return (
    <section
      className="grimoire-ai-brief border-b border-border px-3 py-2"
      data-locality={activeContextProtected ? 'protected-local' : 'source-safe'}
      data-testid="ai-intelligence-summary"
    >
      <div className="grimoire-ai-brief__inner rounded-md border border-border bg-muted/25 p-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-foreground">
              <Sparkles className="size-3.5 shrink-0 text-[var(--grimoire-signal-accent)]" />
              <span>Assistant brief</span>
            </div>
            <p className="mt-1 line-clamp-2 text-[10px] leading-snug text-muted-foreground">
              {summaryCopy({ activeContextProtected, heldCount, routeReady, sourceCount })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-6 shrink-0 px-1.5 text-[10px]"
            aria-expanded={expanded}
            onClick={onToggle}
            data-testid="ai-intelligence-toggle"
          >
            {expanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            Details
          </Button>
        </div>
        <div className="mt-2 grid grid-cols-5 gap-1" data-testid="ai-crystallize-runway">
          {runway.map((step) => (
            <span
              key={step.label}
              className="grimoire-ai-brief__runway-step rounded border px-1 py-1 text-center text-[9px] leading-tight"
              data-state={step.active ? 'active' : 'pending'}
            >
              {step.label}
            </span>
          ))}
        </div>
        {contextPackageSummary ? (
          <div
            className="grimoire-ai-brief__context-strip mt-2 rounded-md border px-2 py-1.5"
            data-locality={contextPackageSummary.state === 'protected' ? 'protected-local' : 'source-safe'}
            data-testid="ai-brief-context-packet"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-foreground">Context packet</span>
              <span className="min-w-0 truncate font-mono text-[9px] text-muted-foreground">
                {contextPackageSummary.receipt}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1">
              <BriefPacketMetric label="Sources" value={countLabel(sourceCount, 'source')} />
              <BriefPacketMetric label="Held" value={countLabel(heldCount, 'item')} />
              <BriefPacketMetric label="Route" value={contextRouteLabel(contextPackageSummary.state)} />
            </div>
          </div>
        ) : null}
        {canCrystallize && proposalSummary ? (
          <div
            className="grimoire-ai-brief__memory-strip mt-2 rounded-md border px-2 py-1.5"
            data-testid="ai-brief-crystallize-packet"
          >
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-[10px] font-semibold text-foreground">Memory packet</span>
              <span className="min-w-0 truncate font-mono text-[9px] text-muted-foreground">
                {proposalSummary.loopReceipt}
              </span>
            </div>
            <div className="mt-1 grid grid-cols-3 gap-1">
              <BriefPacketMetric label="Review" value={countLabel(proposalSummary.hunkCount, 'hunk')} />
              <BriefPacketMetric label="Sources" value={countLabel(proposalSummary.sourceCount, 'source')} />
              <BriefPacketMetric label="Lands" value={proposalSummary.targetFolder || 'vault root'} />
            </div>
          </div>
        ) : null}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <BriefBadge label={localityLabel} />
          <BriefBadge label={countLabel(sourceCount, 'source')} />
          <BriefBadge label={`${graphNodeCount} graph`} />
          <BriefBadge label={routeReady ? 'Route ready' : 'Route missing'} />
          <BriefBadge label={memoryLabel} />
          {heldCount > 0 ? <BriefBadge label={`${heldCount} held`} /> : null}
          <Button
            type="button"
            variant={canCrystallize ? 'default' : 'outline'}
            size="xs"
            className="ml-auto h-5 px-1.5 text-[9px]"
            disabled={!canCrystallize}
            onClick={onCrystallize}
            data-testid="ai-brief-crystallize"
          >
            {canCrystallize ? 'Review memory' : activeContextProtected ? 'Local gate' : 'Need answer'}
          </Button>
        </div>
      </div>
    </section>
  )
}

function BriefBadge({ label }: { label: string }) {
  return (
    <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[9px]">
      <ShieldCheck className="size-3" />
      {label}
    </Badge>
  )
}

function BriefPacketMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 rounded border px-1.5 py-1" data-metric={label.toLowerCase()}>
      <span className="block text-[8px] uppercase text-muted-foreground">{label}</span>
      <span className="block truncate text-[9px] font-medium text-foreground">{value}</span>
    </span>
  )
}

function buildCrystallizeRunway({
  activeContextProtected,
  canCrystallize,
  hasContext,
  hasLatestResponse,
}: Pick<
  AiPanelIntelligenceSummaryProps,
  'activeContextProtected' | 'canCrystallize' | 'hasContext' | 'hasLatestResponse'
>) {
  return [
    { label: hasContext ? 'Context' : 'Capture', active: hasContext },
    { label: activeContextProtected ? 'Firewall' : 'Council', active: hasContext && !activeContextProtected },
    { label: 'Answer', active: hasLatestResponse },
    { label: 'Review', active: canCrystallize },
    { label: 'Memory', active: canCrystallize },
  ]
}

function countLabel(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

function contextRouteLabel(state: ContextCapsuleState): string {
  if (state === 'protected') return 'No handoff'
  if (state === 'empty') return 'No packet'
  return 'Review first'
}

function summaryCopy({
  activeContextProtected,
  heldCount,
  routeReady,
  sourceCount,
}: {
  activeContextProtected: boolean
  heldCount: number
  routeReady: boolean
  sourceCount: number
}): string {
  if (activeContextProtected) return 'Private context is visible locally; handoff details stay behind review.'
  if (!routeReady) return 'Context is staged, but the selected agent route needs setup before handoff.'
  if (heldCount > 0) return `${sourceCount} safe sources staged; ${heldCount} local items stay withheld.`
  return `${sourceCount} safe sources staged. Open details only when you need the full Council map.`
}
