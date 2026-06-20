import { useRef, useState } from 'react'
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
import {
  summarizeCrystallizeProposal,
  type CrystallizeProposal,
} from '../lib/crystallizeProposal'
import { validateCrystallizeMemoryMarkdown } from '../lib/crystallizeReviewValidation'
import {
  CrystallizeChangeList,
  CrystallizePacketSummary,
  CrystallizeRunway,
} from './CrystallizeReviewDialogParts'

export interface CrystallizeApplyDraft {
  memoryMarkdown: string
  activeNoteFrontmatterMarkdown?: string | null
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
        className="flex max-h-[85dvh] flex-col overflow-y-hidden sm:max-w-[640px]"
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
  const activeFrontmatterRef = useRef<HTMLTextAreaElement>(null)
  const activeAppendRef = useRef<HTMLTextAreaElement>(null)
  const [memoryMarkdown, setMemoryMarkdown] = useState(proposal?.markdown ?? '')
  const [acceptState, setAcceptState] = useState({ proposalKey: '', pending: false })
  const proposalKey = proposal?.targetPath ?? ''
  const accepted = !!proposalKey && !error && acceptState.pending && acceptState.proposalKey === proposalKey
  const showAcceptMoment = accepted || applying
  const memoryValidation = validateCrystallizeMemoryMarkdown(memoryMarkdown)
  const canApply = !!proposal && !blockedReason && !applying && !accepted && memoryValidation.ok
  const activeNoteTarget = proposal?.activeNotePatch?.relativePath
  const summary = summarizeCrystallizeProposal(proposal)

  function handleApply() {
    setAcceptState({ proposalKey, pending: true })
    onApply({
      memoryMarkdown,
      activeNoteFrontmatterMarkdown: activeFrontmatterRef.current?.value ?? null,
      activeNoteAppendMarkdown: activeAppendRef.current?.value ?? null,
    })
  }

  return (
    <div className={cn('flex min-h-0 flex-1 flex-col gap-4', showAcceptMoment && 'grimoire-crystallize-accept')}>
      <DialogHeader className="shrink-0">
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="size-4" />
          Crystallize
        </DialogTitle>
        <DialogDescription>
          Review the local Markdown note before Grimoire writes it into this vault.
        </DialogDescription>
      </DialogHeader>

      <div className="grid min-h-0 flex-1 gap-3 overflow-y-auto pr-0.5">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="rounded-md">Local Markdown</Badge>
          <Badge variant="outline" className="rounded-md">No Git required</Badge>
          <Badge variant="outline" className="rounded-md">Review before write</Badge>
          {activeNoteTarget ? <Badge variant="outline" className="rounded-md">Active note hunks</Badge> : null}
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
            value={memoryMarkdown}
            onChange={event => setMemoryMarkdown(event.currentTarget.value)}
            className="min-h-[280px] resize-none font-mono text-xs"
            data-testid="crystallize-markdown-preview"
          />
          {!memoryValidation.ok ? (
            <div
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-2 py-1.5 text-xs text-destructive"
              data-testid="crystallize-contract-warning"
            >
              Restore the Memory Ledger contract before writing: {memoryValidation.missingFields.join(', ')}.
            </div>
          ) : null}
        </div>

        {proposal?.activeNotePatch ? (
          <div className="grid gap-2">
            <div className="grid gap-1">
              <div className="text-xs font-medium text-muted-foreground">
                Active note frontmatter · {proposal.activeNotePatch.relativePath}
              </div>
              <Textarea
                key={`${proposal.activeNotePatch.targetPath}:active-note-frontmatter`}
                ref={activeFrontmatterRef}
                defaultValue={proposal.activeNotePatch.frontmatterMarkdown}
                className="min-h-[96px] resize-none font-mono text-xs"
                data-testid="crystallize-active-note-frontmatter-preview"
              />
            </div>
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
          </div>
        ) : null}

        {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
      </div>

      <DialogFooter className="shrink-0 border-t border-border/60 pt-4">
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
