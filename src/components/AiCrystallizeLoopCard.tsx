import { CheckCircle2, FileClock, ShieldCheck, Sparkles } from 'lucide-react'
import type { ReactNode } from 'react'
import type { CrystallizeProposalSummary } from '../lib/crystallizeProposal'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

interface AiCrystallizeLoopCardProps {
  activeContextProtected: boolean
  blockedReason: string | null
  canCrystallize: boolean
  hasContext: boolean
  hasLatestResponse: boolean
  linkedCount: number
  onCrystallize: () => void
  proposalSummary: CrystallizeProposalSummary | null
}

/** Shows the local context to reviewable Markdown memory loop in the AI panel. */
export function AiCrystallizeLoopCard({
  activeContextProtected,
  blockedReason,
  canCrystallize,
  hasContext,
  hasLatestResponse,
  linkedCount,
  onCrystallize,
  proposalSummary,
}: AiCrystallizeLoopCardProps) {
  const status = statusCopy({ activeContextProtected, blockedReason, canCrystallize, hasLatestResponse })
  const reviewState = activeContextProtected ? 'Protected' : hasLatestResponse ? 'Review diff' : 'Waiting'
  const trail = buildLoopTrail({ activeContextProtected, canCrystallize, hasContext, hasLatestResponse })

  return (
    <section className="border-b border-border px-3 py-2" data-testid="crystallize-loop-card">
      <div className="rounded-md border border-border bg-muted/30 p-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 text-[11px] font-medium text-foreground">
            <Sparkles className="size-3.5 shrink-0 text-muted-foreground" />
            <span>Crystallize Memory</span>
          </div>
          <Button
            type="button"
            variant={canCrystallize ? 'default' : 'outline'}
            size="xs"
            disabled={!canCrystallize}
            onClick={onCrystallize}
            data-testid="crystallize-loop-action"
          >
            {canCrystallize ? 'Review memory' : reviewState}
          </Button>
        </div>
        <p className="mt-1 text-[10px] leading-snug text-muted-foreground">{status}</p>
        <ol className="mt-2 grid grid-cols-4 gap-1" aria-label="Crystallize loop" data-testid="crystallize-loop-trail">
          {trail.map((step) => (
            <li
              key={step.label}
              className={[
                'min-w-0 rounded border px-1.5 py-1 text-center text-[9px] leading-tight',
                step.active
                  ? 'border-primary/30 bg-primary/10 text-foreground'
                  : 'border-border bg-background/50 text-muted-foreground',
              ].join(' ')}
            >
              {step.label}
            </li>
          ))}
        </ol>
        <div className="mt-2 flex flex-wrap gap-1">
          <LoopBadge icon={<FileClock className="size-3" />} label={hasContext ? 'Context ready' : 'No context'} />
          <LoopBadge
            icon={<ShieldCheck className="size-3" />}
            label={activeContextProtected ? 'Local-only gate' : linkedCount > 0 ? `${linkedCount} linked` : 'Council brief'}
          />
          <LoopBadge icon={<CheckCircle2 className="size-3" />} label={reviewState} />
        </div>
        {proposalSummary && canCrystallize ? (
          <div
            className="mt-2 grid gap-1 rounded-md border border-border bg-background/45 px-2 py-1.5 text-[9px] leading-tight text-muted-foreground"
            data-testid="crystallize-review-packet"
          >
            <div className="font-medium text-foreground">Review packet</div>
            <div className="flex flex-wrap gap-1">
              <LoopBadge icon={<FileClock className="size-3" />} label={reviewCount(proposalSummary.hunkCount, 'hunk')} />
              <LoopBadge icon={<ShieldCheck className="size-3" />} label={reviewCount(proposalSummary.sourceCount, 'source')} />
              <LoopBadge
                icon={<CheckCircle2 className="size-3" />}
                label={reviewCount(proposalSummary.ledgerFieldCount, 'ledger field')}
              />
              <LoopBadge icon={<FileClock className="size-3" />} label={`review by ${proposalSummary.expiresAt}`} />
              <LoopBadge
                icon={<ShieldCheck className="size-3" />}
                label={reviewCount(proposalSummary.contradictionCount, 'contradiction')}
              />
              {proposalSummary.taskCount > 0 ? (
                <LoopBadge icon={<CheckCircle2 className="size-3" />} label={reviewCount(proposalSummary.taskCount, 'task hunk')} />
              ) : null}
              <LoopBadge icon={<Sparkles className="size-3" />} label={proposalSummary.targetFolder} />
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}

function buildLoopTrail({
  activeContextProtected,
  canCrystallize,
  hasContext,
  hasLatestResponse,
}: Pick<
  AiCrystallizeLoopCardProps,
  'activeContextProtected' | 'canCrystallize' | 'hasContext' | 'hasLatestResponse'
>) {
  return [
    { label: hasContext ? 'Context' : 'Capture', active: hasContext },
    { label: activeContextProtected ? 'Firewall' : 'Council', active: hasContext && !activeContextProtected },
    { label: 'Answer', active: hasLatestResponse },
    { label: 'Review', active: canCrystallize },
  ]
}

function LoopBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <Badge variant="outline" className="h-5 rounded-md px-1.5 text-[9px]">
      {icon}
      {label}
    </Badge>
  )
}

function reviewCount(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

function statusCopy({
  activeContextProtected,
  blockedReason,
  canCrystallize,
  hasLatestResponse,
}: Pick<
  AiCrystallizeLoopCardProps,
  'activeContextProtected' | 'blockedReason' | 'canCrystallize' | 'hasLatestResponse'
>): string {
  if (canCrystallize) return 'Ready to turn the latest answer into editable Markdown memory.'
  if (activeContextProtected) return 'Protected context stays local; no durable memory write from this note.'
  if (!hasLatestResponse) return 'Ask first, then review the proposed Markdown before it is written.'
  return blockedReason ?? 'Review is paused until the memory proposal is safe to write.'
}
