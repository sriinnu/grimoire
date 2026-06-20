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
      className="grimoire-ai-brief border-b border-border px-4 py-3"
      data-locality={activeContextProtected ? 'protected-local' : 'source-safe'}
      data-testid="ai-intelligence-summary"
    >
      <div className="grimoire-ai-brief__inner rounded-xl border border-border bg-muted/25 p-3.5">
        <div className="flex items-start justify-between gap-2.5">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
              <Sparkles className="size-4 shrink-0 text-[var(--grimoire-signal-accent)]" />
              <span>Assistant brief</span>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-muted-foreground">
              {summaryCopy({ activeContextProtected, heldCount, routeReady, sourceCount })}
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="h-7 shrink-0 px-2.5 text-[13px]"
            aria-expanded={expanded}
            onClick={onToggle}
            data-testid="ai-intelligence-toggle"
          >
            {expanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
            Details
          </Button>
        </div>
        <div className="mt-3 grid grid-cols-5 gap-2" data-testid="ai-crystallize-runway">
          {runway.map((step) => (
            <span
              key={step.label}
              className="grimoire-ai-brief__runway-step rounded-lg border px-2 py-2 text-center text-[12px] leading-tight"
              data-state={step.active ? 'active' : 'pending'}
            >
              {step.label}
            </span>
          ))}
        </div>
        {contextPackageSummary ? (
          <div
            className="grimoire-ai-brief__context-strip mt-3 rounded-xl border px-3 py-2.5"
            data-locality={contextPackageSummary.state === 'protected' ? 'protected-local' : 'source-safe'}
            data-testid="ai-brief-context-packet"
          >
            <div className="flex min-w-0 items-center justify-between gap-2.5">
              <span className="text-[13px] font-semibold text-foreground">Context packet</span>
              <span className="min-w-0 truncate font-mono text-[12px] text-muted-foreground">
                {contextPackageSummary.receipt}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <BriefPacketMetric label="Sources" value={countLabel(sourceCount, 'source')} />
              <BriefPacketMetric label="Held" value={countLabel(heldCount, 'item')} />
              <BriefPacketMetric label="Route" value={contextRouteLabel(contextPackageSummary.state)} />
            </div>
          </div>
        ) : null}
        {canCrystallize && proposalSummary ? (
          <div
            className="grimoire-ai-brief__memory-strip mt-3 rounded-xl border px-3 py-2.5"
            data-testid="ai-brief-crystallize-packet"
          >
            <div className="flex min-w-0 items-center justify-between gap-2.5">
              <span className="text-[13px] font-semibold text-foreground">Memory packet</span>
              <span className="min-w-0 truncate font-mono text-[12px] text-muted-foreground">
                {proposalSummary.loopReceipt}
              </span>
            </div>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <BriefPacketMetric label="Review" value={countLabel(proposalSummary.hunkCount, 'hunk')} />
              <BriefPacketMetric label="Sources" value={countLabel(proposalSummary.sourceCount, 'source')} />
              <BriefPacketMetric label="Lands" value={proposalSummary.targetFolder || 'vault root'} />
            </div>
          </div>
        ) : null}
        <div className="mt-3 flex flex-wrap items-center gap-2">
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
            className="ml-auto h-7 px-2.5 text-[12px]"
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
    <Badge variant="outline" className="h-7 rounded-xl px-2.5 text-[12px]">
      <ShieldCheck className="size-4" />
      {label}
    </Badge>
  )
}

function BriefPacketMetric({ label, value }: { label: string; value: string }) {
  return (
    <span className="min-w-0 rounded-lg border px-2.5 py-2" data-metric={label.toLowerCase()}>
      <span className="block text-[11px] uppercase text-muted-foreground">{label}</span>
      <span className="block truncate text-[13px] font-medium text-foreground">{value}</span>
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
