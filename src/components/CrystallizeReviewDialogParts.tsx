import { type CSSProperties } from 'react'
import { FileClock, FileText, ListChecks, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import type { CrystallizeChange, CrystallizeProposalSummary } from '../lib/crystallizeProposal'

export function CrystallizeRunway({
  blocked,
  hasActiveNotePatch,
  summary,
}: {
  blocked: boolean
  hasActiveNotePatch: boolean
  summary: CrystallizeProposalSummary
}) {
  const stages = [
    {
      detail: 'Safe labels only.',
      icon: FileClock,
      label: 'Sources',
      state: 'ready',
      value: countReviewItem(summary.sourceCount, 'source'),
    },
    {
      detail: blocked ? 'Held local.' : 'No Git or cloud needed.',
      icon: ShieldCheck,
      label: 'Firewall',
      state: blocked ? 'blocked' : 'ready',
      value: blocked ? 'Blocked' : 'Local',
    },
    {
      detail: 'Expiry and contradiction slots.',
      icon: Sparkles,
      label: 'Ledger',
      state: 'ready',
      value: countReviewItem(summary.ledgerFieldCount, 'field'),
    },
    {
      detail: hasActiveNotePatch ? 'Memory plus active note.' : 'Memory note only.',
      icon: ListChecks,
      label: 'Editable diff',
      state: 'ready',
      value: countReviewItem(summary.hunkCount, 'hunk'),
    },
    {
      detail: 'Readable outside Grimoire.',
      icon: FileText,
      label: 'Lands as',
      state: 'ready',
      value: summary.targetFolder || 'vault root',
    },
  ]

  return (
    <ol
      aria-label="Crystallize source-safe runway"
      className="grimoire-crystallize-runway grid gap-2.5 rounded-xl border px-3 py-2.5 sm:grid-cols-2 lg:grid-cols-5"
      data-testid="crystallize-runway"
    >
      {stages.map((stage, index) => {
        const Icon = stage.icon
        return (
          <li
            key={stage.label}
            className="grimoire-control-entrance grimoire-crystallize-runway__stage min-w-0 rounded-xl border px-3 py-2.5"
            data-state={stage.state}
            style={{ '--motion-stagger-delay': `${index * 35}ms` } as CSSProperties}
          >
            <div className="flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
              <Icon className="size-4 shrink-0" />
              <span>{stage.label}</span>
            </div>
            <div className="truncate text-[13px] font-semibold text-foreground">{stage.value}</div>
            <div className="text-[13px] leading-snug text-muted-foreground">{stage.detail}</div>
          </li>
        )
      })}
    </ol>
  )
}

export function CrystallizePacketSummary({
  summary,
  hasActiveNotePatch,
}: {
  summary: CrystallizeProposalSummary
  hasActiveNotePatch: boolean
}) {
  const cards = [
    {
      detail: activeNoteReviewDetail(summary, hasActiveNotePatch),
      label: 'Hunks',
      value: countReviewItem(summary.hunkCount, 'hunk'),
    },
    {
      detail: 'Source links stay visible in Markdown.',
      label: 'Sources',
      value: countReviewItem(summary.sourceCount, 'source'),
    },
    {
      detail: `${summary.loopStepCount} local steps; no Git or remote.`,
      label: 'Receipt',
      value: summary.loopReceipt,
    },
    {
      detail: `Review by ${summary.expiresAt}; ${countReviewItem(summary.contradictionCount, 'contradiction')}.`,
      label: 'Ledger',
      value: countReviewItem(summary.ledgerFieldCount, 'field'),
    },
    {
      detail: 'Local vault folder, Git optional.',
      label: 'Target',
      value: summary.targetFolder || 'vault root',
    },
    {
      detail: 'Open loops stay reviewable.',
      label: 'Tasks',
      value: countReviewItem(summary.taskCount, 'task'),
    },
  ]

  return (
    <div
      className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-6"
      data-testid="crystallize-review-packet"
      aria-label="Crystallize review packet"
    >
      {cards.map(card => (
        <div key={card.label} className="rounded-xl border border-border bg-muted/25 px-3 py-2.5">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">{card.label}</div>
          <div className="text-[13px] font-medium text-foreground">{card.value}</div>
          <div className="mt-2 text-[13px] leading-snug text-muted-foreground">{card.detail}</div>
        </div>
      ))}
    </div>
  )
}

export function CrystallizeChangeList({ changes }: { changes: CrystallizeChange[] }) {
  return (
    <div className="grid gap-2.5" data-testid="crystallize-change-list">
      {changes.map((change, index) => (
        <div
          key={change.id}
          className="grimoire-control-entrance rounded-xl border border-border bg-muted/25 p-3.5"
          style={{ '--motion-stagger-delay': `${index * 35}ms` } as CSSProperties}
        >
          <div className="mb-2 flex min-w-0 items-center gap-2.5">
            <Badge variant="secondary" className="rounded-md">{change.label}</Badge>
            <Badge variant="outline" className="rounded-md" data-testid={`crystallize-change-kind-${change.kind}`}>
              {change.kind}
            </Badge>
            <span className="min-w-0 truncate text-[13px] text-muted-foreground">{change.target}</span>
          </div>
          <div className="grid gap-2 text-[13px] md:grid-cols-2">
            <CrystallizeChangeColumn label="Before" value={change.before} />
            <CrystallizeChangeColumn label="After" value={change.after} />
          </div>
        </div>
      ))}
    </div>
  )
}

function countReviewItem(count: number, singular: string): string {
  return `${count} ${count === 1 ? singular : `${singular}s`}`
}

function activeNoteReviewDetail(summary: CrystallizeProposalSummary, hasActiveNotePatch: boolean): string {
  if (!hasActiveNotePatch) return 'Memory note review.'
  const target = summary.activeNoteTarget ?? 'active note'
  return `${countReviewItem(summary.activeNoteHunkCount, 'active-note hunk')} will update ${target}.`
}

function CrystallizeChangeColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-lg border border-border bg-background/70 px-3 py-2">
      <div className="mb-1 font-medium text-muted-foreground">{label}</div>
      <pre className="max-h-20 overflow-auto whitespace-pre-wrap break-words font-mono text-[13px] leading-snug text-foreground">
        {value}
      </pre>
    </div>
  )
}
