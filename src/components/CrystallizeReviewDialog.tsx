import { type CSSProperties, useRef, useState } from 'react'
import { Sparkles } from 'lucide-react'
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
import type { CrystallizeChange, CrystallizeProposal } from '../lib/crystallizeProposal'

interface CrystallizeReviewDialogProps {
  open: boolean
  proposal: CrystallizeProposal | null
  blockedReason?: string | null
  applying?: boolean
  error?: string | null
  onApply: (markdown: string) => void
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
  const [acceptState, setAcceptState] = useState({ proposalKey: '', pending: false })
  const proposalKey = proposal?.targetPath ?? ''
  const accepted = !!proposalKey && !error && acceptState.pending && acceptState.proposalKey === proposalKey
  const showAcceptMoment = accepted || applying
  const canApply = !!proposal && !blockedReason && !applying && !accepted

  function handleApply() {
    setAcceptState({ proposalKey, pending: true })
    onApply(draftMarkdownRef.current?.value ?? '')
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
          {proposal ? <Badge variant="outline" className="rounded-md">{proposal.relativePath}</Badge> : null}
        </div>

        {blockedReason ? (
          <div className="rounded-md border border-border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
            {blockedReason}
          </div>
        ) : null}

        {proposal ? <CrystallizeChangeList changes={proposal.changes} /> : null}

        {showAcceptMoment ? (
          <div
            role="status"
            aria-live="polite"
            className="grimoire-crystallize-accept__consequence rounded-md border border-primary/25 bg-primary/10 px-3 py-2 text-sm text-foreground"
            data-testid="crystallize-accept-status"
          >
            Writing reviewed Markdown into local memory.
          </div>
        ) : null}

        <Textarea
          key={proposal?.targetPath ?? 'empty-crystallize-preview'}
          ref={draftMarkdownRef}
          defaultValue={proposal?.markdown ?? ''}
          className="min-h-[320px] resize-none font-mono text-xs"
          data-testid="crystallize-markdown-preview"
        />

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
          {showAcceptMoment ? 'Writing Memory...' : 'Create Memory Note'}
        </Button>
      </DialogFooter>
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
