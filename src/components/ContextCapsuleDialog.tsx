import { useState } from 'react'
import { ClipboardCheck, Copy, PackageCheck, Pin, RefreshCw, ShieldCheck, X } from 'lucide-react'
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
import type {
  ContextCapsuleNote,
  ContextCapsulePackagePreview,
  ContextCapsulePreview,
} from '../lib/contextCapsule'
import { buildContextManifestFromCapsule, contextCapsuleSourceId } from '../lib/contextManifest'
import type { AiAgentId } from '../lib/aiAgents'
import { AgentRouteDisclosure } from './AgentRouteDisclosure'
import { AgentPreflightGate } from './AgentPreflightGate'

interface ContextCapsuleDialogProps {
  defaultAiAgent?: AiAgentId
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  open: boolean
  packagePreview: ContextCapsulePackagePreview
  preview: ContextCapsulePreview
  onClose: () => void
}

type CopyState = 'idle' | 'copied' | 'failed' | 'unavailable'

interface CopyStateSnapshot {
  markdown: string
  open: boolean
  state: CopyState
}

interface ManifestReviewSnapshot {
  createdAt: string
  excludedSourceIds: string[]
  pinnedSourceIds: string[]
  revision: number
}

/** Read-only review dialog for a local context capsule package. */
export function ContextCapsuleDialog({
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  open,
  packagePreview,
  preview,
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
  const [storedManifestReview, setStoredManifestReview] = useState<ManifestReviewSnapshot>(() => (
    newManifestReview()
  ))
  const manifestReview = storedManifestReview
  const manifest = buildContextManifestFromCapsule({
    preview,
    manifestId: `${packagePreview.reviewReceipt}:context:${manifestReview.revision}`,
    requestId: `context-review:${packagePreview.reviewReceipt}`,
    createdAt: manifestReview.createdAt,
    pinnedSourceIds: new Set(manifestReview.pinnedSourceIds),
    excludedSourceIds: new Set(manifestReview.excludedSourceIds),
  })

  function updateManifestReview(update: (current: ManifestReviewSnapshot) => ManifestReviewSnapshot) {
    setStoredManifestReview(update)
  }

  function togglePinned(sourceId: string) {
    updateManifestReview((current) => {
      const pinned = new Set(current.pinnedSourceIds)
      const excluded = new Set(current.excludedSourceIds)
      if (pinned.has(sourceId)) pinned.delete(sourceId)
      else {
        pinned.add(sourceId)
        excluded.delete(sourceId)
      }
      return { ...current, pinnedSourceIds: [...pinned], excludedSourceIds: [...excluded] }
    })
  }

  function toggleExcluded(sourceId: string) {
    updateManifestReview((current) => {
      const excluded = new Set(current.excludedSourceIds)
      const pinned = new Set(current.pinnedSourceIds)
      if (excluded.has(sourceId)) excluded.delete(sourceId)
      else {
        excluded.add(sourceId)
        pinned.delete(sourceId)
      }
      return { ...current, excludedSourceIds: [...excluded], pinnedSourceIds: [...pinned] }
    })
  }

  function rebuildManifest() {
    updateManifestReview((current) => ({
      ...current,
      createdAt: new Date().toISOString(),
      revision: current.revision + 1,
    }))
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
            <Badge
              variant="outline"
              className="rounded-md font-mono text-[10px]"
              data-testid="context-capsule-review-receipt"
            >
              {packagePreview.reviewReceipt}
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

          <div
            className="grid grid-cols-2 gap-2 rounded-md border border-[var(--grimoire-signal-border)] bg-[var(--grimoire-signal-bg)] p-2 sm:grid-cols-4"
            data-locality={packagePreview.protectedContext ? 'protected-local' : 'source-safe'}
            data-testid="context-capsule-manifest"
          >
            <ManifestMetric
              label="Mode"
              value={packagePreview.protectedContext ? 'Blocked' : 'Review'}
            />
            <ManifestMetric
              label="Sources"
              value={String(manifest.recalled.length + manifest.code.length + manifest.pinned.length)}
            />
            <ManifestMetric
              label="Pinned"
              value={String(manifest.pinned.length)}
            />
            <ManifestMetric
              label="Excluded"
              value={String(manifest.excluded.length)}
            />
          </div>

          {preview.includedNotes.length > 0 ? (
            <div className="grid gap-1.5" data-testid="context-manifest-sources">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">Context sources</span>
                <Button type="button" size="sm" variant="ghost" onClick={rebuildManifest}>
                  <RefreshCw className="size-3.5" />
                  Rebuild
                </Button>
              </div>
              <div className="grid max-h-36 gap-1 overflow-auto rounded-md border border-border p-1">
                {preview.includedNotes.map((note) => (
                  <ManifestSourceRow
                    key={contextCapsuleSourceId(note)}
                    excluded={manifestReview.excludedSourceIds.includes(contextCapsuleSourceId(note))}
                    note={note}
                    pinned={manifestReview.pinnedSourceIds.includes(contextCapsuleSourceId(note))}
                    onToggleExcluded={toggleExcluded}
                    onTogglePinned={togglePinned}
                  />
                ))}
              </div>
            </div>
          ) : null}

          <details className="min-h-0 overflow-auto rounded-md border border-border px-2 py-1.5">
            <summary className="cursor-pointer text-xs font-medium text-foreground">
              Structured Context Manifest
            </summary>
            <pre
              className="mt-2 max-h-52 overflow-auto whitespace-pre-wrap break-all text-[10px] text-muted-foreground"
              data-testid="context-manifest-json"
            >
              {JSON.stringify(manifest, null, 2)}
            </pre>
          </details>

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

function ManifestSourceRow({
  excluded,
  note,
  pinned,
  onToggleExcluded,
  onTogglePinned,
}: {
  excluded: boolean
  note: ContextCapsuleNote
  pinned: boolean
  onToggleExcluded: (sourceId: string) => void
  onTogglePinned: (sourceId: string) => void
}) {
  const sourceId = contextCapsuleSourceId(note)
  return (
    <div className="flex min-w-0 items-center gap-2 rounded-sm px-2 py-1 hover:bg-muted/50">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs text-foreground">{note.title}</div>
        <div className="truncate text-[10px] text-muted-foreground">{note.kind} · {note.path}</div>
      </div>
      <Button
        type="button"
        size="icon-sm"
        variant={pinned ? 'secondary' : 'ghost'}
        aria-label={`${pinned ? 'Unpin' : 'Pin'} ${note.title}`}
        aria-pressed={pinned}
        onClick={() => onTogglePinned(sourceId)}
      >
        <Pin className="size-3.5" />
      </Button>
      <Button
        type="button"
        size="icon-sm"
        variant={excluded ? 'destructive' : 'ghost'}
        aria-label={`${excluded ? 'Include' : 'Exclude'} ${note.title}`}
        aria-pressed={excluded}
        onClick={() => onToggleExcluded(sourceId)}
      >
        <X className="size-3.5" />
      </Button>
    </div>
  )
}

function newManifestReview(): ManifestReviewSnapshot {
  return {
    createdAt: new Date().toISOString(),
    excludedSourceIds: [],
    pinnedSourceIds: [],
    revision: 1,
  }
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

function ManifestMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0 rounded-md border border-border bg-background/55 px-2 py-1">
      <div className="text-[9px] uppercase tracking-[0.08em] text-muted-foreground">{label}</div>
      <div className="truncate text-xs font-medium text-foreground">{value}</div>
    </div>
  )
}
