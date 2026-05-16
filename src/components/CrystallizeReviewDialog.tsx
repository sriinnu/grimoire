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
import type { CrystallizeProposal } from '../lib/crystallizeProposal'

interface CrystallizeReviewDialogProps {
  open: boolean
  proposal: CrystallizeProposal | null
  blockedReason?: string | null
  applying?: boolean
  error?: string | null
  onApply: () => void
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
  const canApply = !!proposal && !blockedReason && !applying

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent showCloseButton={false} className="sm:max-w-[640px]" data-testid="crystallize-review-dialog">
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
            {proposal ? <Badge variant="outline" className="rounded-md">{proposal.relativePath}</Badge> : null}
          </div>

          {blockedReason ? (
            <div className="rounded-md border border-border bg-muted/35 px-3 py-2 text-sm text-muted-foreground">
              {blockedReason}
            </div>
          ) : null}

          <Textarea
            readOnly
            value={proposal?.markdown ?? ''}
            className="min-h-[320px] resize-none font-mono text-xs"
            data-testid="crystallize-markdown-preview"
          />

          {error ? <div className="text-sm font-medium text-destructive">{error}</div> : null}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={onApply} disabled={!canApply} data-testid="crystallize-apply">
            <Sparkles className="size-4" />
            {applying ? 'Creating...' : 'Create Memory Note'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
