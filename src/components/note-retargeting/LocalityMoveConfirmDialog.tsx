import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

interface LocalityMoveConfirmDialogProps {
  open: boolean
  description: string
  confirmLabel: string
  onCancel: () => void
  onConfirm: () => void
  testIdPrefix: string
}

/**
 * Quiet confirmation shown when a move would change a note's local-only
 * classification (path-based Locality Firewall lane), in either direction.
 */
export function LocalityMoveConfirmDialog({
  open,
  description,
  confirmLabel,
  onCancel,
  onConfirm,
  testIdPrefix,
}: LocalityMoveConfirmDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onCancel()
      }}
    >
      <DialogContent className="max-w-md gap-3" showCloseButton={false}>
        <DialogHeader className="gap-1">
          <DialogTitle>This move changes privacy</DialogTitle>
          <DialogDescription data-testid={`${testIdPrefix}-locality-description`}>
            {description}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            data-testid={`${testIdPrefix}-locality-cancel`}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            data-testid={`${testIdPrefix}-locality-confirm`}
          >
            {confirmLabel}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
