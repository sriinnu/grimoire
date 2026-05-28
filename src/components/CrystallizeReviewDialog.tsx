import { type CSSProperties, useRef, useState } from 'react'
import { FileClock, FileText, ListChecks, ShieldCheck, Sparkles } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  summarizeCrystallizeProposal,
  type CrystallizeChange,
  type CrystallizeProposal,
  type CrystallizeProposalSummary,
} from '../lib/crystallizeProposal'

export interface CrystallizeApplyDraft {
  memoryMarkdown: string
  activeNoteAppendMarkdown?: string | null
}

interface CrystallizeReviewDialogProps {
  open: boolean
  proposal: CrystallizeProposal | null
  blockedReason?: string | null
  applying?: boolean
  error?: string | null
  onApply: (draft: CrystallizeApplyDraft) => void
  onClose: () => void
}

/** Review dialog for turning an AI response into a local Markdown memory note. */
export function CrystallizeReviewDialog({
  open,
  proposal,
  blockedReason,
  applying = false,
  error,
  onApply,
  onClose,
}: CrystallizeReviewDialogProps) {
  const bodyKey = `${proposal?.targetPath ?? 'empty'}:${error ? 'error' : 'ok'}`

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="sm:max-w-[640px]"
        data-testid="crystallize-review-dialog"
      >
        {open ? (
          <CrystallizeReviewBody
            key={bodyKey}
            proposal={proposal}
            blockedReason={blockedReason}
            applying={applying}
            error={error}
            onApply={onApply}
            onClose={onClose}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CrystallizeReviewBody({
  proposal,
  blockedReason,
  applying,
  error,
  onApply,
  onClose,
}: Omit<CrystallizeReviewDialogProps, 'open'>) {
  const draftMarkdownRef = useRef<HTMLTextAreaElement>(null)
  const activeAppendRef = useRef<HTMLTextAreaElement>(null)
  const [acceptState, setAcceptState] = useState({ proposalKey: '', pending: false })
  const proposalKey = proposal?.targetPath ?? ''
  const accepted = !!proposalKey && !error && acceptState.pending && acceptState.proposalKey === proposalKey
  const showAcceptMoment = accepted || applying
  const canApply = !!proposal && !blockedReason && !applying && !accepted
  const activeNoteTarget = proposal?.activeNotePatch?.relativePath
  const summary = summarizeCrystallizeProposal(proposal)

  function handleApply() {
    setAcceptState({ proposalKey, pending: true })
    onApply({
      memoryMarkdown: draftMarkdownRef.current?.value ?? '',
      activeNoteAppendMarkdown: activeAppendRef.current?.value ?? null,
    })
  }

  return (
    <div className={cn('grid gap-4', showAcceptMoment && 'grimoire-crystallize-accept')}>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          Crystallize
        </DialogTitle>
        <DialogDescription>
          Review the local Markdown note before Grimoire writes it into this vault.
        </DialogDescription>
      </DialogHeader>

      <div className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-md">Local Markdown</Badge>
          <Badge variant="outline" className="rounded-md">No Git required</Badge>
          <Badge variant="outline" className="rounded-md">Review before write</Badge>
          {activeNoteTarget ? <Badge variant="outline" className="rounded-md">Active note hunk</Badge> : null}
          {proposal ? <Badge variant="outline" className="rounded-md">{proposal.relativePath}</Badge> : null}
        </div>

        {summary ? (
          <CrystallizeRunway
            summary={summary}
            blocked={!!blockedReason}
            hasActiveNotePatch={!!activeNoteTarget}
          />
        ) : null}

        {blockedReason ? (
          <div className="rounded-md border border-border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
            {blockedReason}
          </div>
        ) : null}

        {summary ? <CrystallizePacketSummary summary={summary} hasActiveNotePatch={!!activeNoteTarget} /> : null}

        {proposal ? <CrystallizeChangeList changes={proposal.changes} /> : null}

        {showAcceptMoment ? (
          <div
            role="status"
            aria-live="polite"
            className="grimoire-crystallize-accept__consequence rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-foreground"
            data-testid="crystallize-accept-status"
          >
            {activeNoteTarget
              ? 'Writing reviewed Markdown into local memory and the active note.'
              : 'Writing reviewed Markdown into local memory.'}
          </div>
        ) : null}

        <div className="grid gap-1">
          <div className="text-xs font-medium text-muted-foreground">Memory note</div>
          <Textarea
            key={proposal?.targetPath ?? 'empty-crystallize-preview'}
            ref={draftMarkdownRef}
            defaultValue={proposal?.markdown ?? ''}
            className="min-h-[280px] resize-none font-mono text-xs"
            data-testid="crystallize-markdown-preview"
          />
        </div>

        {proposal?.activeNotePatch ? (
          <div className="grid gap-1">
            <div className="text-xs font-medium text-muted-foreground">
              Active note append · {proposal.activeNotePatch.relativePath}
            </div>
            <Textarea
              key={`${proposal.activeNotePatch.targetPath}:active-note-append`}
              ref={activeAppendRef}
              defaultValue={proposal.activeNotePatch.appendMarkdown}
              className="min-h-[160px] resize-none font-mono text-xs"
              data-testid="crystallize-active-note-append-preview"
            />
          </div>
        ) : null}

        {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
      </div>

      <DialogFooter>
        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          type="button"
          onClick={handleApply}
          disabled={!canApply}
          data-testid="crystallize-apply"
        >
          <Sparkles className="size-4" />
          {showAcceptMoment ? 'Writing...' : activeNoteTarget ? 'Apply Crystallize' : 'Create Memory Note'}
        </Button>
      </DialogFooter>
    </div>
  )
}

function CrystallizeRunway({
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
      detail: 'Frontmatter plus body contract.',
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
      className="grimoire-crystallize-runway grid gap-2 rounded-md border px-2.5 py-2 sm:grid-cols-2 lg:grid-cols-5"
      data-testid="crystallize-runway"
    >
      {stages.map((stage, index) => {
        const Icon = stage.icon
        return (
          <li
            key={stage.label}
            className="grimoire-control-entrance grimoire-crystallize-runway__stage min-w-0 rounded-md border px-2 py-1.5"
            data-state={stage.state}
            style={{ '--motion-stagger-delay': `${index * 35}ms` } as CSSProperties}
          >
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
              <Icon className="size-3.5 shrink-0" />
              <span>{stage.label}</span>
            </div>
            <div className="truncate text-xs font-semibold text-foreground">{stage.value}</div>
            <div className="text-[10px] leading-snug text-muted-foreground">{stage.detail}</div>
          </li>
        )
      })}
    </ol>
  )
}

function CrystallizePacketSummary({
  summary,
  hasActiveNotePatch,
}: {
  summary: CrystallizeProposalSummary
  hasActiveNotePatch: boolean
}) {
  const cards = [
    {
      label: 'Hunks',
      value: countReviewItem(summary.hunkCount, 'hunk'),
      detail: hasActiveNotePatch ? 'Memory plus active note review.' : 'Memory note review.',
    },
    {
      label: 'Sources',
      value: countReviewItem(summary.sourceCount, 'source'),
      detail: 'Source links stay visible in Markdown.',
    },
    {
      label: 'Ledger',
      value: countReviewItem(summary.ledgerFieldCount, 'field'),
      detail: 'Contract is readable in frontmatter and body.',
    },
    {
      label: 'Target',
      value: summary.targetFolder || 'vault root',
      detail: 'Local vault folder, Git optional.',
    },
    {
      label: 'Tasks',
      value: countReviewItem(summary.taskCount, 'task'),
      detail: 'Open loops stay reviewable.',
    },
  ]

  return (
    <div
      className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5"
      data-testid="crystallize-review-packet"
      aria-label="Crystallize review packet"
    >
      {cards.map(card => (
        <div key={card.label} className="rounded-md border border-border bg-muted/25 px-2.5 py-2">
          <div className="text-[11px] font-semibold uppercase text-muted-foreground">{card.label}</div>
          <div className="text-xs font-medium text-foreground">{card.value}</div>
          <div className="mt-1 text-[11px] leading-snug text-muted-foreground">{card.detail}</div>
        </div>
      ))}
    </div>
  )
}

function CrystallizeChangeList({ changes }: { changes: CrystallizeChange[] }) {
  return (
    <div className="grid gap-2" data-testid="crystallize-change-list">
      {changes.map((change, index) => (
        <div
          key={change.id}
          className="grimoire-control-entrance rounded-md border border-border bg-muted/25 p-2"
          style={{ '--motion-stagger-delay': `${index * 35}ms` } as CSSProperties}
        >
          <div className="mb-1 flex min-w-0 items-center gap-2">
            <Badge variant="secondary" className="rounded-md">{change.label}</Badge>
            <Badge variant="outline" className="rounded-md" data-testid={`crystallize-change-kind-${change.kind}`}>
              {change.kind}
            </Badge>
            <span className="min-w-0 truncate text-[11px] text-muted-foreground">{change.target}</span>
          </div>
          <div className="grid gap-1 text-[11px] md:grid-cols-2">
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

function CrystallizeChangeColumn({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded border border-border bg-background/70 px-2 py-1">
      <div className="mb-0.5 font-medium text-muted-foreground">{label}</div>
      <pre className="max-h-20 overflow-auto whitespace-pre-wrap break-words font-mono text-[10px] leading-snug text-foreground">
        {value}
      </pre>
    </div>
  )
}
