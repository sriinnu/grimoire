import { FileCheck2 } from 'lucide-react'
import { Glyph } from './glyphs/Glyph'
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
import type { RedTeamPatchPlan } from '../lib/redTeamPatchPlan'

interface RedTeamPlanDialogProps {
  open: boolean
  plan: RedTeamPatchPlan
  onClose: () => void
}

/** Read-only preview for the local red-team Markdown patch plan. */
export function RedTeamPlanDialog({ open, plan, onClose }: RedTeamPlanDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[640px]"
        data-testid="red-team-plan-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="size-4" />
            {plan.title}
          </DialogTitle>
          <DialogDescription>
            Inspect the local Markdown patch plan before any note, task, agent, export, or sync action.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md">
              Review only
            </Badge>
            <Badge variant="outline" className="rounded-md">
              No write
            </Badge>
            <Badge variant="outline" className="rounded-md">
              <Glyph name="shield" size={12} />
              {plan.protectedContext ? 'Protected local context' : 'Source-safe'}
            </Badge>
          </div>

          <Textarea
            readOnly
            aria-label="Red-Team Markdown patch plan preview"
            value={plan.markdown}
            className="min-h-[220px] resize-none overflow-auto font-mono text-xs"
            data-testid="red-team-plan-markdown"
          />

          <div className="grid gap-1 text-xs text-muted-foreground" data-testid="red-team-plan-checks">
            {plan.checks.map((check) => (
              <div key={check} className="rounded-md border border-border bg-muted/25 px-2 py-1">
                {check}
              </div>
            ))}
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
