import { Brain, Feather, ListChecks, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { CaptureKind } from '../../utils/dashboardCapture'
import type { DashboardSummary } from '../../utils/dashboardModel'
import './DailyFlowRail.css'

interface DailyFlowRailProps {
  attentionActionLabel: string | null
  canUseAttentionAction: boolean
  onAttentionAction: () => void
  onSeedPrompt: (kind: CaptureKind) => void
  summary: Pick<DashboardSummary,
    'hasDreamToday' | 'hasJournalToday' | 'memoryQueueCount' | 'openLoopCount'
  >
}

const flowSteps = [
  { kind: 'note', label: 'Capture', detail: 'Drop the thought.', icon: Feather },
  { kind: 'journal', label: 'Reflect', detail: 'Tell the truth.', icon: Brain },
  { kind: 'task', label: 'Organize', detail: 'Pick the next move.', icon: ListChecks },
  { kind: 'ask', label: 'Crystallize', detail: 'Ask, then review.', icon: Sparkles },
] as const

/** Keeps the dashboard's daily loop visible without exposing private note contents. */
export function DailyFlowRail({
  attentionActionLabel,
  canUseAttentionAction,
  onAttentionAction,
  onSeedPrompt,
  summary,
}: DailyFlowRailProps) {
  function runStep(kind: CaptureKind) {
    if (kind === 'task' && canUseAttentionAction) {
      onAttentionAction()
      return
    }
    onSeedPrompt(kind)
  }

  return (
    <section className="vault-dashboard__flow" data-testid="dashboard-daily-flow">
      <div className="vault-dashboard__flow-copy">
        <div className="vault-dashboard__panel-label">Daily Flow</div>
        <h2>Capture, reflect, organize, crystallize.</h2>
        <div className="vault-dashboard__flow-states" aria-label="Daily flow state">
          <span>{summary.hasJournalToday ? 'Journal touched' : 'Journal due'}</span>
          <span>{summary.hasDreamToday ? 'Dream caught' : 'Dream open'}</span>
          <span>{summary.openLoopCount} loops</span>
          <span>{summary.memoryQueueCount} memory reviews</span>
        </div>
      </div>
      <div className="vault-dashboard__flow-steps">
        {flowSteps.map(({ detail, icon: Icon, kind, label }) => (
          <Button
            key={kind}
            type="button"
            variant="ghost"
            className="vault-dashboard__flow-step"
            onClick={() => runStep(kind)}
          >
            <Icon size={16} />
            <span>
              <strong>{label}</strong>
              <small>{kind === 'task' && attentionActionLabel ? attentionActionLabel : detail}</small>
            </span>
          </Button>
        ))}
      </div>
    </section>
  )
}
