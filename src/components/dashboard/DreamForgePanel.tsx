import { CloudOff, EyeOff, Lock, MoonStar, ShieldCheck, Sparkles } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type {
  DreamForgePrivacyReport,
  DreamForgeRhythmPoint,
  DreamForgeSignal,
  DreamForgeSummary,
  DreamForgeTimelinePoint,
} from '../../lib/dreamForge'
import { relativeDate } from '../../utils/noteListHelpers'
import './DreamForgePanel.css'

interface DreamForgePanelProps {
  privacyReport?: DreamForgePrivacyReport
  summary: DreamForgeSummary
  onCaptureDream: () => void
}

/** Private-only dashboard surface for dream and journal pattern signals. */
export function DreamForgePanel({ privacyReport, summary, onCaptureDream }: DreamForgePanelProps) {
  const signalGroups = [
    { empty: 'No symbols yet', label: 'Symbols', signals: summary.symbols },
    { empty: 'No emotional weather yet', label: 'Weather', signals: summary.emotionalWeather },
    { empty: 'No recurring people yet', label: 'People', signals: summary.recurringPeople },
  ]
  const privateMapSignals = signalGroups.flatMap((group) => group.signals.map((signal) => signal.label)).slice(0, 4)
  const signalCount = signalGroups.reduce((total, group) => total + group.signals.length, 0)
  const recordCount = summary.dreamCount + summary.journalCount

  return (
    <div
      className="vault-dashboard__panel vault-dashboard__dream-forge"
      data-locality="local-only"
      data-private-surface="dream-forge"
      data-testid="dream-forge-panel"
    >
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label">Dream Forge</div>
          <h2>{summary.dreamCount > 0 ? 'Private pattern scan' : 'Start the dream lane'}</h2>
        </div>
        <MoonStar size={18} />
      </div>
      <div className="vault-dashboard__insight-badges vault-dashboard__dream-forge-badges">
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
        {privacyReport ? (
          <>
            <Badge variant="outline" className="rounded-md">
              Egress blocked
            </Badge>
            <Badge variant="outline" className="rounded-md">
              {privacyReport.withheldSignalLabels} signal labels held
            </Badge>
          </>
        ) : null}
      </div>
      <div
        className="vault-dashboard__dream-contract"
        data-testid="dream-forge-privacy-contract"
        aria-label="Dream Forge private lens contract"
      >
        <div className="vault-dashboard__dream-contract-orb" aria-hidden="true">
          <MoonStar size={18} />
        </div>
        <DreamContractMetric label="Records" value={recordCount} detail={`${summary.dreamCount} dream / ${summary.journalCount} journal`} />
        <DreamContractMetric label="Held local" value={summary.protectedCount} detail="egress blocked" />
        <DreamContractMetric label="Signals" value={signalCount} detail="frontmatter only" />
      </div>
      <div className="vault-dashboard__dream-field" data-testid="dream-forge-private-map" aria-label="Private dream signal map">
        <MoonStar className="vault-dashboard__dream-field-core" size={22} aria-hidden="true" />
        {(privateMapSignals.length > 0 ? privateMapSignals : ['Quiet', 'Waiting', 'Local']).map((label, index) => (
          <span key={`${label}-${index}`} className={`vault-dashboard__dream-field-signal vault-dashboard__dream-field-signal--${index + 1}`}>
            {label}
          </span>
        ))}
      </div>
      <div className="vault-dashboard__dream-gate" data-testid="dream-forge-privacy-gate">
        <span>
          <EyeOff size={13} />
          Bodies held
        </span>
        <span>
          <Lock size={13} />
          Paths hidden
        </span>
        <span>
          <CloudOff size={13} />
          No cloud
        </span>
      </div>
      <DreamRhythmRail rhythm={summary.rhythm} />
      <DreamTimelineRail timeline={summary.timeline} />
      <p className="vault-dashboard__panel-copy">
        {summary.latestDreamAt
          ? `Latest dream captured ${relativeDate(summary.latestDreamAt)}`
          : 'Dreams and journals stay private by default. Capture first; analysis stays here.'}
      </p>
      {signalGroups.map((group) => (
        <SignalRow key={group.label} label={group.label} signals={group.signals} empty={group.empty} />
      ))}
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

function DreamContractMetric({
  detail,
  label,
  value,
}: {
  detail: string
  label: string
  value: number
}) {
  return (
    <div className="vault-dashboard__dream-contract-metric">
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{detail}</small>
    </div>
  )
}

function DreamTimelineRail({ timeline }: { timeline: DreamForgeTimelinePoint[] }) {
  const peak = Math.max(1, ...timeline.map((point) => point.dreamCount + point.journalCount + point.signalCount))
  return (
    <div
      className="vault-dashboard__dream-timeline"
      data-testid="dream-forge-timeline"
      aria-label="Private dream timeline"
    >
      {timeline.map((point) => {
        const total = point.dreamCount + point.journalCount
        const level = total + point.signalCount === 0 ? 0 : Math.max(14, Math.round(((total + point.signalCount) / peak) * 100))
        return (
          <div
            key={point.label}
            className="vault-dashboard__dream-timeline-point"
            data-state={point.state}
            style={{ '--dream-timeline-level': `${level}%` } as CSSProperties}
          >
            <span>{point.label}</span>
            <strong>{total}</strong>
            <small>
              {point.signalCount} signals / {point.protectedCount} held
            </small>
          </div>
        )
      })}
    </div>
  )
}

function DreamRhythmRail({ rhythm }: { rhythm: DreamForgeRhythmPoint[] }) {
  const peak = Math.max(1, ...rhythm.map((point) => point.dreamCount + point.journalCount))
  return (
    <div
      className="vault-dashboard__dream-rhythm"
      data-testid="dream-forge-rhythm"
      aria-label="Private dream rhythm"
    >
      {rhythm.map((point) => {
        const total = point.dreamCount + point.journalCount
        const level = total === 0 ? 0 : Math.max(16, Math.round((total / peak) * 100))
        return (
          <div
            key={point.label}
            className="vault-dashboard__dream-rhythm-point"
            data-tone={point.tone}
            style={{ '--dream-rhythm-level': `${level}%` } as CSSProperties}
          >
            <span>{point.label}</span>
            <strong>{total}</strong>
            <small>
              {point.dreamCount} dream / {point.journalCount} journal / {point.protectedCount} held
            </small>
          </div>
        )
      })}
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
