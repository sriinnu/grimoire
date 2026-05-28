import { ArrowRight, BrainCircuit, CalendarClock, GitCommitHorizontal, Lock, Mic, MoonStar, NotebookPen, Smartphone } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TimeLoomGuidance, TimeLoomSourceLane } from '../../lib/timeLoomGuidance'

interface DailyThreadRailProps {
  guidance: TimeLoomGuidance
  onCaptureDream: () => void
  onCaptureJournal: () => void
  onStartAsk: (promptSeed?: string) => void
}

const laneIcons = {
  calendar: CalendarClock,
  commit: GitCommitHorizontal,
  dream: MoonStar,
  journal: NotebookPen,
  memory: BrainCircuit,
  mobile: Smartphone,
  private: Lock,
  voice: Mic,
} satisfies Record<TimeLoomSourceLane['id'], typeof Lock>

/** Source-safe next-action rail for the dashboard's daily mind-OS loop. */
export function DailyThreadRail({
  guidance,
  onCaptureDream,
  onCaptureJournal,
  onStartAsk,
}: DailyThreadRailProps) {
  const runAction = actionForGuidance(guidance, {
    ask: onStartAsk,
    dream: onCaptureDream,
    journal: onCaptureJournal,
  })

  return (
    <div
      className="vault-dashboard__daily-thread"
      data-locality="metadata-only"
      data-private-surface="daily-thread"
      data-testid="daily-thread-rail"
    >
      <div className="vault-dashboard__daily-thread-copy">
        <Badge variant="outline" className="rounded-md">
          <Lock className="size-3" />
          Local thread
        </Badge>
        <span>{guidance.nextLabel}</span>
        <strong>{guidance.nextDetail}</strong>
      </div>
      <div className="vault-dashboard__daily-thread-lanes" aria-label="Daily Thread source-safe lanes">
        {guidance.sourceLanes.map((lane) => (
          <DailyThreadLane key={lane.id} lane={lane} />
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" className="vault-dashboard__daily-thread-action" onClick={runAction}>
        {guidance.actionLabel}
        <ArrowRight className="size-4" />
      </Button>
    </div>
  )
}

function actionForGuidance(
  guidance: TimeLoomGuidance,
  actions: {
    ask: (promptSeed?: string) => void
    dream: () => void
    journal: () => void
  },
) {
  if (guidance.actionKind === 'ask') return () => actions.ask(guidance.promptSeed)
  if (guidance.actionKind === 'dream') return actions.dream
  return actions.journal
}

function DailyThreadLane({ lane }: { lane: TimeLoomSourceLane }) {
  const Icon = laneIcons[lane.id]
  return (
    <span className="vault-dashboard__daily-thread-lane" data-state={lane.state}>
      <Icon size={13} />
      <strong>{lane.count}</strong>
      <em>{lane.label}</em>
      <small>{lane.detail}</small>
    </span>
  )
}
