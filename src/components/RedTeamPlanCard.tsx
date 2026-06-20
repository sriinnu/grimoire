import { AlertTriangle, FileCheck2, ListChecks, ShieldCheck, Swords } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import type { RedTeamPlanReview, RedTeamSeverity } from '../lib/redTeamPlan'

interface RedTeamPlanCardProps {
  review: RedTeamPlanReview
  onReviewPlan?: () => void
}

/** Local red-team critique card for the active note or plan. */
export function RedTeamPlanCard({ review, onReviewPlan }: RedTeamPlanCardProps) {
  const riskCount = review.signals.filter((signal) => signal.severity === 'risk').length
  const stateLabel = review.protectedContext ? 'Local-only' : review.state === 'empty' ? 'No note' : 'Local pass'
  const canReviewPlan = review.state === 'ready' && !!onReviewPlan

  return (
    <section className="border-b border-border px-4 py-3" data-testid="red-team-plan-card">
      <div className="rounded-xl border border-border bg-muted/25 p-3.5">
        <div className="flex items-center justify-between gap-2.5">
          <div className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-foreground">
            <Swords className="size-4 shrink-0 text-muted-foreground" />
            <span>Red-Team My Plan</span>
          </div>
          <Badge variant={riskCount > 0 ? 'secondary' : 'outline'} className="h-7 rounded-xl px-2.5 text-[13px]">
            {stateLabel}
          </Badge>
        </div>
        <p className="mt-2 text-[13px] leading-snug text-muted-foreground">{review.verdict}</p>
        {canReviewPlan ? (
          <Button
            type="button"
            variant="outline"
            size="xs"
            className="mt-3 w-full justify-start"
            onClick={onReviewPlan}
            data-testid="red-team-review-plan"
          >
            <FileCheck2 className="size-4" />
            Review Markdown patch plan
          </Button>
        ) : null}
        <div className="mt-3 flex flex-wrap gap-2">
          <Badge variant="outline" className="h-7 rounded-xl px-2.5 text-[12px]">
            <ListChecks className="size-4" />
            {review.counts.openTasks} open
          </Badge>
          <Badge variant="outline" className="h-7 rounded-xl px-2.5 text-[12px]">
            <ShieldCheck className="size-4" />
            {review.protectedContext ? 'Protected' : 'Source-safe'}
          </Badge>
          <Badge variant="outline" className="h-7 rounded-xl px-2.5 text-[12px]">
            <AlertTriangle className="size-4" />
            {riskCount} risks
          </Badge>
        </div>
        {review.signals.length > 0 ? (
          <div className="mt-3 grid gap-2" data-testid="red-team-signals">
            {review.signals.map((signal) => (
              <div key={signal.dimension} className="rounded-xl bg-background/55 px-3 py-2">
                <div className="flex items-center justify-between gap-2.5">
                  <span className="text-[13px] font-medium text-foreground">{signal.label}</span>
                  <span className={`text-[12px] ${severityClass(signal.severity)}`}>{signal.severity}</span>
                </div>
                <p className="mt-1 text-[13px] leading-snug text-muted-foreground">{signal.finding}</p>
                <p className="mt-1 text-[13px] leading-snug text-foreground">{signal.nextAction}</p>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  )
}

function severityClass(severity: RedTeamSeverity): string {
  if (severity === 'risk') return 'text-destructive'
  if (severity === 'watch') return 'text-[var(--accent-orange)]'
  return 'text-[var(--accent-green)]'
}
