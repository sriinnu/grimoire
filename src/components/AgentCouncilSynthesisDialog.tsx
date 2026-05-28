import { FileCheck2, ShieldCheck } from 'lucide-react'
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
import type { AgentCouncilSynthesisPacket } from '../lib/agentCouncilSynthesis'
import { AgentPreflightGate } from './AgentPreflightGate'

interface AgentCouncilSynthesisDialogProps {
  open: boolean
  packet: AgentCouncilSynthesisPacket
  onCrystallize?: () => void
  onClose: () => void
}

/** Read-only review dialog for the current source-safe Agent Council synthesis. */
export function AgentCouncilSynthesisDialog({
  open,
  packet,
  onCrystallize,
  onClose,
}: AgentCouncilSynthesisDialogProps) {
  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[680px]"
        data-testid="agent-council-synthesis-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileCheck2 className="size-4" />
            {packet.title}
          </DialogTitle>
          <DialogDescription>
            Review the synthesized Council packet before it becomes durable Markdown.
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
              <ShieldCheck className="size-3" />
              {packet.protectedContext ? 'Protected local context' : 'Source-safe'}
            </Badge>
          </div>

          <AgentPreflightGate
            gatedLaneCount={packet.preflight.gatedLaneCount}
            heldLocalCount={packet.preflight.heldLocalCount}
            label="Locality Firewall preflight"
            protectedContext={packet.protectedContext}
            readyLaneCount={packet.preflight.readyLaneCount}
            sourceCount={packet.preflight.sourceCount}
            trimmedCount={packet.preflight.trimmedCount}
            unavailableLaneCount={packet.preflight.unavailableLaneCount}
          />

          <Textarea
            readOnly
            aria-label="Agent Council Markdown synthesis preview"
            value={packet.markdown}
            className="min-h-[300px] resize-none overflow-auto font-mono text-xs"
            data-testid="agent-council-synthesis-markdown"
          />
        </div>

        <DialogFooter>
          {onCrystallize ? (
            <Button
              type="button"
              disabled={packet.protectedContext}
              onClick={onCrystallize}
              data-testid="agent-council-crystallize-synthesis"
            >
              Crystallize packet
            </Button>
          ) : null}
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
