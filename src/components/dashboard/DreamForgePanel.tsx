import { Lock, MoonStar, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { DreamForgeSignal, DreamForgeSummary } from '../../lib/dreamForge'

interface DreamForgePanelProps {
  summary: DreamForgeSummary
  onCaptureDream: () => void
}

/** Private-only dashboard surface for dream and journal pattern signals. */
export function DreamForgePanel({ summary, onCaptureDream }: DreamForgePanelProps) {
  return (
    <div className="vault-dashboard__panel vault-dashboard__dream-forge" data-testid="dream-forge-panel">
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label">Dream Forge</div>
          <h2>{summary.dreamCount > 0 ? 'Private pattern scan' : 'Start the dream lane'}</h2>
        </div>
        <MoonStar size={18} />
      </div>
      <div className="vault-dashboard__dream-forge-badges">
        {summary.privacy.badges.map((badge, index) => (
          <Badge key={badge} variant="outline" className="rounded-md">
            {index === 0 ? <Lock className="size-3" /> : null}
            {badge}
          </Badge>
        ))}
        <Badge variant="outline" className="rounded-md">
          <ShieldCheck className="size-3" />
          {summary.protectedCount} protected
        </Badge>
      </div>
      <p className="vault-dashboard__panel-copy">
        {summary.latestDreamTitle
          ? `Latest dream: ${summary.latestDreamTitle}`
          : 'Dreams and journals stay private by default. Capture first; analysis stays here.'}
      </p>
      <SignalRow label="Symbols" signals={summary.symbols} empty="No symbols yet" />
      <SignalRow label="Weather" signals={summary.emotionalWeather} empty="No emotional weather yet" />
      <SignalRow label="People" signals={summary.recurringPeople} empty="No recurring people yet" />
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="vault-dashboard__panel-action"
        onClick={onCaptureDream}
        data-testid="dream-forge-capture"
      >
        <Sparkles className="size-4" />
        Catch a dream
      </Button>
    </div>
  )
}

function SignalRow({
  empty,
  label,
  signals,
}: {
  empty: string
  label: string
  signals: DreamForgeSignal[]
}) {
  return (
    <div className="vault-dashboard__dream-forge-row">
      <span>{label}</span>
      <strong>
        {signals.length > 0
          ? signals.map((signal) => `${signal.label} ${signal.count > 1 ? `x${signal.count}` : ''}`.trim()).join(' / ')
          : empty}
      </strong>
    </div>
  )
}
