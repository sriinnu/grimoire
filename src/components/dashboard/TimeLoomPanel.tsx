import { CalendarClock, CalendarDays, Clock3, GitCommitHorizontal, Lock, Mic, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TimeLoomBucket, TimeLoomSummary } from '../../lib/timeLoom'

interface TimeLoomPanelProps {
  summary: TimeLoomSummary
  onCaptureJournal: () => void
}

/** Metadata-only temporal graph preview for the dashboard. */
export function TimeLoomPanel({ summary, onCaptureJournal }: TimeLoomPanelProps) {
  return (
    <div className="vault-dashboard__panel" data-testid="time-loom-panel">
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label">Time Loom</div>
          <h2>{summary.activeSpanLabel}</h2>
        </div>
        <Clock3 size={18} />
      </div>
      <div className="vault-dashboard__dream-forge-badges">
        <Badge variant="outline" className="rounded-md">
          <CalendarDays className="size-3" />
          Local timeline
        </Badge>
        <Badge variant="outline" className="rounded-md">
          <Lock className="size-3" />
          {summary.protectedEvents} private
        </Badge>
        {summary.voiceEvents > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <Mic className="size-3" />
            {summary.voiceEvents} voice
          </Badge>
        ) : null}
        {summary.commitEvents > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <GitCommitHorizontal className="size-3" />
            {summary.commitEvents} {summary.commitEvents === 1 ? 'commit' : 'commits'}
          </Badge>
        ) : null}
        {summary.calendarEvents > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <CalendarClock className="size-3" />
            {summary.calendarEvents} scheduled
          </Badge>
        ) : null}
      </div>
      <p className="vault-dashboard__panel-copy">
        Dates, types, scheduled events, voice captures, commits, and status only. Private lanes are counted here without exposing titles.
      </p>
      <div className="vault-dashboard__loop-list">
        {summary.buckets.length > 0 ? summary.buckets.map((bucket) => (
          <TimeLoomRow key={bucket.dateKey} bucket={bucket} />
        )) : (
          <div className="vault-dashboard__empty">No recent timeline yet.</div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="vault-dashboard__panel-action"
        onClick={onCaptureJournal}
        data-testid="time-loom-capture"
      >
        <Sparkles className="size-4" />
        Journal
      </Button>
    </div>
  )
}

function TimeLoomRow({ bucket }: { bucket: TimeLoomBucket }) {
  const typeText = bucket.typeCounts.map((type) => `${type.label} ${type.count}`).join(' / ')
  const statusText = bucket.statusCounts.map((status) => `${status.label} ${status.count}`).join(' / ')

  return (
    <div className="vault-dashboard__loop-row">
      <span>{bucket.label}</span>
      <strong>
        {bucket.total} - {typeText} - {statusText}
        {bucket.protectedCount > 0 ? ` - ${bucket.protectedCount} private` : ''}
      </strong>
    </div>
  )
}
