import { BookOpenCheck, BrainCircuit, CalendarClock, CalendarDays, Clock3, ListTodo, Lock, Mic, Smartphone } from 'lucide-react'
import type { CSSProperties } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { TimeLoomBucket, TimeLoomSummary } from '../../lib/timeLoom'
import type { TimeLoomGraph, TimeLoomGraphLink, TimeLoomGraphNode } from '../../lib/timeLoomGraph'
import { formatStateCount, formatTypeCount } from '../../utils/notebookCountLabels'
import { PersonalCalendar, type PersonalCalendarDay } from '../personal-calendar'

interface TimeLoomPanelProps {
  crystallizedTodayCount?: number
  summary: TimeLoomSummary
  onCaptureDream?: (date?: Date) => void
  onCaptureJournal: (date?: Date) => void
}

/** Metadata-only day trail for the notebook home. */
export function TimeLoomPanel({
  crystallizedTodayCount = 0,
  summary,
  onCaptureDream,
  onCaptureJournal,
}: TimeLoomPanelProps) {
  const calendarDays = summary.calendarDays.map(timeLoomBucketToCalendarDay)

  return (
    <div
      className="vault-dashboard__panel vault-dashboard__time-loom"
      data-locality="metadata-only"
      data-private-surface="time-loom"
      data-testid="time-loom-panel"
    >
      <div className="vault-dashboard__panel-head">
        <div>
          <div className="vault-dashboard__panel-label">Trail</div>
          <h2>{summary.activeSpanLabel}</h2>
        </div>
        <Clock3 size={18} />
      </div>
      <div className="vault-dashboard__insight-badges">
        <Badge variant="outline" className="rounded-md">
          <CalendarDays className="size-3" />
          Local trail
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
        {summary.mobileEvents > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <Smartphone className="size-3" />
            {summary.mobileEvents} mobile
          </Badge>
        ) : null}
        {summary.memoryReviewEvents > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <BrainCircuit className="size-3" />
            {summary.memoryReviewEvents} memory review
          </Badge>
        ) : null}
        {summary.commitEvents > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <BookOpenCheck className="size-3" />
            {summary.commitEvents} {summary.commitEvents === 1 ? 'saved point' : 'saved points'}
          </Badge>
        ) : null}
        {summary.calendarEvents > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <CalendarClock className="size-3" />
            {summary.calendarEvents} planned
          </Badge>
        ) : null}
        {summary.taskEvents > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <ListTodo className="size-3" />
            {summary.taskEvents} upcoming
          </Badge>
        ) : null}
        {crystallizedTodayCount > 0 ? (
          <Badge variant="outline" className="rounded-md">
            <BookOpenCheck className="size-3" />
            Reviewed today
          </Badge>
        ) : null}
      </div>
      <p className="vault-dashboard__panel-copy">
        Dates, page kinds, planned marks, upcoming flags, mobile captures, voice captures, memory reviews, saved points, reviewed memory, and state only. Private lanes are counted here without exposing titles.
      </p>
      <PersonalCalendar
        days={calendarDays}
        density="compact"
        onCaptureDream={onCaptureDream}
        onCaptureJournal={onCaptureJournal}
      />
      {summary.patterns.length > 0 ? (
        <div className="vault-dashboard__time-patterns" data-testid="time-loom-patterns" aria-label="Metadata-only trail pattern lens">
          {summary.patterns.map((pattern) => (
            <div key={pattern.label} className="vault-dashboard__time-pattern" data-tone={pattern.tone}>
              <span>{pattern.label}</span>
              <strong>{pattern.detail}</strong>
            </div>
          ))}
        </div>
      ) : null}
      <div className="vault-dashboard__time-map" data-testid="time-loom-map" aria-label="Metadata-only trail map">
        {summary.buckets.length > 0 ? summary.buckets.slice(0, 4).map((bucket, index) => (
          <TimeLoomNode key={bucket.dateKey} bucket={bucket} index={index} />
        )) : (
          <div className="vault-dashboard__time-map-empty">Quiet</div>
        )}
      </div>
      <TimeLoomGraphView graph={summary.graph} />
      <div className="vault-dashboard__loop-list">
        {summary.buckets.length > 0 ? summary.buckets.map((bucket) => (
          <TimeLoomRow key={bucket.dateKey} bucket={bucket} />
        )) : (
          <div className="vault-dashboard__empty">No recent trail yet.</div>
        )}
      </div>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="vault-dashboard__panel-action"
        onClick={() => onCaptureJournal()}
        data-testid="time-loom-capture"
      >
        <BookOpenCheck className="size-4" />
        Journal
      </Button>
    </div>
  )
}

function timeLoomBucketToCalendarDay(bucket: TimeLoomBucket): PersonalCalendarDay {
  return {
    dateKey: bucket.dateKey,
    label: bucket.label,
    protectedCount: bucket.protectedCount,
    statusCounts: bucket.statusCounts,
    total: bucket.total,
    typeCounts: bucket.typeCounts,
  }
}

function TimeLoomGraphView({ graph }: { graph: TimeLoomGraph }) {
  if (graph.nodes.length === 0) return null

  return (
    <div
      className="vault-dashboard__time-graph"
      data-testid="time-loom-graph"
      aria-label={graph.privacyNote}
    >
      <div className="vault-dashboard__time-graph-nodes">
        {graph.nodes.map((node) => (
          <TimeLoomGraphNodeView key={node.id} node={node} />
        ))}
      </div>
      <div className="vault-dashboard__time-graph-links" aria-label="Trail count-only links">
        {graph.links.slice(0, 8).map((link) => (
          <TimeLoomGraphLinkView key={link.id} link={link} />
        ))}
      </div>
    </div>
  )
}

function TimeLoomGraphNodeView({ node }: { node: TimeLoomGraphNode }) {
  return (
    <span
      className="vault-dashboard__time-graph-node"
      data-privacy={node.privacy}
      data-tone={node.tone}
    >
      <strong>{node.count}</strong>
      <span>{node.label}</span>
    </span>
  )
}

function TimeLoomGraphLinkView({ link }: { link: TimeLoomGraphLink }) {
  return (
    <span className="vault-dashboard__time-graph-link" data-privacy={link.privacy}>
      {link.label}
    </span>
  )
}

function TimeLoomNode({ bucket, index }: { bucket: TimeLoomBucket; index: number }) {
  const typeText = bucket.typeCounts.slice(0, 2).map((type) => formatTypeCount(type.label, type.count)).join(' / ') || 'Trail'
  const style = { '--motion-stagger-delay': `${index * 38}ms` } as CSSProperties

  return (
    <div
      className={`vault-dashboard__time-node${bucket.protectedCount > 0 ? ' vault-dashboard__time-node--private' : ''}`}
      style={style}
      data-testid="time-loom-node"
      aria-label={`${bucket.label}: ${bucket.total} local marks`}
    >
      <span>{bucket.label}</span>
      <strong>{bucket.total}</strong>
      <small>{typeText}</small>
      {bucket.protectedCount > 0 ? <em>{bucket.protectedCount} private</em> : null}
    </div>
  )
}

function TimeLoomRow({ bucket }: { bucket: TimeLoomBucket }) {
  const typeText = bucket.typeCounts.map((type) => formatTypeCount(type.label, type.count)).join(' / ')
  const statusText = bucket.statusCounts.map((status) => formatStateCount(status.label, status.count)).join(' / ')

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
