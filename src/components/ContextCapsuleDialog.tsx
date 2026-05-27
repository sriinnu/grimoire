import { useState } from 'react'
import { ClipboardCheck, Copy, PackageCheck, ShieldCheck } from 'lucide-react'
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
import type { AiAgentId } from '../lib/aiAgents'
import { AgentRouteDisclosure } from './AgentRouteDisclosure'
import { AgentPreflightGate } from './AgentPreflightGate'

interface ContextCapsuleDialogProps {
  defaultAiAgent?: AiAgentId
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  open: boolean
  packagePreview: ContextCapsulePackagePreview
  onClose: () => void
}

type CopyState = 'idle' | 'copied' | 'failed' | 'unavailable'

interface CopyStateSnapshot {
  markdown: string
  open: boolean
  state: CopyState
}

/** Read-only review dialog for a local context capsule package. */
export function ContextCapsuleDialog({
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  open,
  packagePreview,
  onClose,
}: ContextCapsuleDialogProps) {
  const [copySnapshot, setCopySnapshot] = useState<CopyStateSnapshot>(() => ({
    markdown: packagePreview.markdown,
    open,
    state: 'idle',
  }))
  const copyState =
    copySnapshot.markdown === packagePreview.markdown && copySnapshot.open === open ? copySnapshot.state : 'idle'
  const setCurrentCopyState = (state: CopyState) => {
    setCopySnapshot({ markdown: packagePreview.markdown, open, state })
  }

  async function copyMarkdownPackage() {
    if (!navigator.clipboard?.writeText) {
      setCurrentCopyState('unavailable')
      return
    }
    try {
      await navigator.clipboard.writeText(packagePreview.markdown)
      setCurrentCopyState('copied')
    } catch {
      setCurrentCopyState('failed')
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose() }}>
      <DialogContent
        showCloseButton={false}
        className="grimoire-context-capsule-dialog grid max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[640px]"
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

          {defaultAiAgent ? (
            <AgentRouteDisclosure
              agent={defaultAiAgent}
              contextProtected={packagePreview.protectedContext}
              model={defaultAiModel}
              provider={defaultAiProvider}
            />
          ) : null}

          <AgentPreflightGate
            heldLocalCount={packagePreview.preflight.heldLocalCount}
            label="Locality Firewall preflight"
            protectedContext={packagePreview.protectedContext}
            sourceCount={packagePreview.preflight.sourceCount}
            trimmedCount={packagePreview.preflight.trimmedCount}
          />

          <Textarea
            readOnly
            aria-label="Context Capsule Markdown package preview"
            value={packagePreview.markdown}
            className="min-h-[260px] resize-none overflow-auto font-mono text-xs"
            data-testid="context-capsule-markdown"
          />
        </div>

        <DialogFooter>
          <div className="mr-auto flex min-w-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyMarkdownPackage}
              data-testid="context-capsule-copy"
            >
              {copyState === 'copied' ? <ClipboardCheck className="size-3.5" /> : <Copy className="size-3.5" />}
              {copyButtonLabel(copyState)}
            </Button>
            <span
              className="truncate text-[11px] text-muted-foreground"
              aria-live="polite"
              data-testid="context-capsule-copy-status"
            >
              {copyStatus(copyState)}
            </span>
          </div>
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function copyButtonLabel(state: CopyState): string {
  if (state === 'copied') return 'Copied'
  if (state === 'failed') return 'Retry copy'
  return 'Copy Markdown'
}

function copyStatus(state: CopyState): string {
  if (state === 'copied') return 'Portable package copied locally.'
  if (state === 'failed') return 'Copy failed. Package stayed local.'
  if (state === 'unavailable') return 'Clipboard unavailable. Package stayed local.'
  return 'Portable, review-only Markdown.'
}
