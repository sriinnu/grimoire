import { PackageCheck, ShieldCheck } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import type { ContextCapsulePackagePreview } from '../lib/contextCapsule'

interface ContextCapsuleDialogProps {
  open: boolean
  packagePreview: ContextCapsulePackagePreview
  onClose: () => void
}

/** Read-only review dialog for a local context capsule package. */
export function ContextCapsuleDialog({ open, packagePreview, onClose }: ContextCapsuleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[640px]"
        data-testid="context-capsule-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="size-4" />
            {packagePreview.title}
          </DialogTitle>
          <DialogDescription>
            Inspect the local context package before any agent handoff, export, sync, or file write.
          </DialogDescription>
        </DialogHeader>

        <div className="grid min-h-0 gap-3 overflow-hidden">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-md">
              Review only
            </Badge>
            <Badge variant="outline" className="rounded-md">
              No handoff
            </Badge>
            <Badge variant="outline" className="rounded-md">
              <ShieldCheck className="size-3" />
              {packagePreview.protectedContext ? 'Protected local context' : 'Source-safe'}
            </Badge>
          </div>

          <Textarea
            readOnly
            aria-label="Context Capsule Markdown package preview"
            value={packagePreview.markdown}
            className="min-h-[260px] resize-none overflow-auto font-mono text-xs"
            data-testid="context-capsule-markdown"
          />
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
