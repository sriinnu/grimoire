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
import type {
  ContextCapsuleNote,
  ContextCapsulePackagePreview,
  ContextCapsulePreview,
} from '../lib/contextCapsule'
import type { ModifiedFile, VaultEntry } from '../types'
import {
  buildContextManifestFromCapsule,
  contextCapsuleSourceId,
  type ContextManifestV1,
} from '../lib/contextManifest'
import type { AiAgentId } from '../lib/aiAgents'
import type { ChitraguptaRecallAttachment } from '../lib/chitraguptaContext'
import { isInspectableCodePath, type CodeSymbolSnapshot } from '../lib/codeIntelligence'
import { AgentRouteDisclosure } from './AgentRouteDisclosure'
import { AgentPreflightGate } from './AgentPreflightGate'
import { ChitraguptaRecallSection } from './ChitraguptaRecallSection'
import { CodeSyntaxSection } from './CodeSyntaxSection'

interface ContextCapsuleDialogProps {
  defaultAiAgent?: AiAgentId
  defaultAiModel?: string | null
  defaultAiProvider?: string | null
  open: boolean
  packagePreview: ContextCapsulePackagePreview
  preview: ContextCapsulePreview
  modifiedFiles?: readonly ModifiedFile[]
  entries?: readonly VaultEntry[]
  activeEntry?: VaultEntry | null
  vaultPath?: string
  onUseContextManifest?: (manifest: ContextManifestV1) => void
  onUseChitraguptaRecall?: (attachment: ChitraguptaRecallAttachment) => void
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
  maximumTokens: number
  pinnedSourceIds: string[]
  revision: number
}

/** Inspect the local Context Manifest before it can be handed to an agent. */
export function ContextCapsuleDialog({
  defaultAiAgent,
  defaultAiModel,
  defaultAiProvider,
  open,
  packagePreview,
  preview,
  modifiedFiles,
  entries,
  activeEntry,
  vaultPath,
  onUseContextManifest,
  onUseChitraguptaRecall,
  onClose,
}: ContextCapsuleDialogProps) {
  const [codeSymbols, setCodeSymbols] = useState<CodeSymbolSnapshot | null>(null)
  const [chitraguptaRecall, setChitraguptaRecall] = useState<ChitraguptaRecallAttachment | null>(null)
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
    maximumTokens: manifestReview.maximumTokens,
    pinnedSourceIds: new Set(manifestReview.pinnedSourceIds),
    excludedSourceIds: new Set(manifestReview.excludedSourceIds),
    workspace: {
      modifiedFiles,
      entries,
      codeSymbols,
      activeCodePath: activeEntry && isInspectableCodePath(activeEntry.path) ? activeEntry.path : undefined,
      chitraguptaRecall,
    },
  })
  const gitChangeCount = manifest.code.filter(item => item.kind === 'git-diff').length
  const symbolCount = manifest.code.filter(item => item.kind === 'symbol').length

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

  function setMaximumTokens(maximumTokens: number) {
    updateManifestReview((current) => ({
      ...current,
      maximumTokens,
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
        className="grimoire-context-capsule-dialog grimoire-context-surface grid h-[min(760px,calc(100dvh-2rem))] max-h-[calc(100dvh-2rem)] grid-rows-[auto_minmax(0,1fr)_auto] overflow-hidden sm:max-w-[640px]"
        data-testid="context-capsule-dialog"
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackageCheck className="size-4" />
            Context Inspector
          </DialogTitle>
          <DialogDescription>
            Inspect every local source before any agent handoff, export, sync, or file write.
          </DialogDescription>
        </DialogHeader>

        <div
          className="grid min-h-0 content-start gap-3 overflow-y-scroll overscroll-contain pr-2"
          data-testid="context-capsule-scroll-region"
        >
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="grimoire-context-pill rounded-md font-semibold" data-tone="active">
              Local inspection
            </Badge>
            <Badge variant="outline" className="grimoire-context-pill rounded-md font-semibold">
              No agent run
            </Badge>
            <Badge variant="outline" className="grimoire-context-pill rounded-md font-semibold">
              <ShieldCheck className="size-3" />
              {packagePreview.protectedContext ? 'Protected local context' : 'Source-safe'}
            </Badge>
            <Badge
              variant="outline"
              className="grimoire-context-pill rounded-md font-mono text-[10px] font-semibold"
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

          <ChitraguptaRecallSection
            protectedContext={packagePreview.protectedContext}
            reviewReceipt={packagePreview.reviewReceipt}
            vaultPath={vaultPath}
            onBuiltRecall={setChitraguptaRecall}
            onUseRecall={onUseChitraguptaRecall}
          />

          <CodeSyntaxSection
            activeEntry={activeEntry}
            protectedContext={packagePreview.protectedContext}
            vaultPath={vaultPath}
            onInspected={setCodeSymbols}
          />

          <div
            className="grimoire-context-surface grid grid-cols-2 gap-2 rounded-md border border-[var(--grimoire-signal-border)] p-2 sm:grid-cols-5"
            style={{ background: 'var(--surface-panel)' }}
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
            <ManifestMetric
              label="Budget"
              value={`${formatTokenCount(manifest.budget.usedTokens)} / ${formatTokenCount(manifest.budget.maximumTokens)}`}
            />
          </div>

          <div className="grimoire-context-surface flex flex-wrap items-center gap-1.5" data-testid="context-manifest-budget">
            <span className="grimoire-context-label mr-1 text-[11px] font-semibold">Context budget</span>
            {[2_000, 4_000, 8_000, 16_000].map((maximumTokens) => (
              <Button
                key={maximumTokens}
                type="button"
                size="xs"
                variant={manifestReview.maximumTokens === maximumTokens ? 'secondary' : 'outline'}
                className="grimoire-context-pill h-6 rounded-md px-2 text-[10px] font-semibold"
                aria-pressed={manifestReview.maximumTokens === maximumTokens}
                data-tone={manifestReview.maximumTokens === maximumTokens ? 'active' : undefined}
                onClick={() => setMaximumTokens(maximumTokens)}
              >
                {formatTokenCount(maximumTokens)}
              </Button>
            ))}
            <span className="grimoire-context-secondary basis-full text-[10px] leading-4">
              Estimated metadata only. Source bodies stay local until you review and approve a tool read.
            </span>
          </div>

          {gitChangeCount > 0 ? (
            <div
              className="grimoire-context-surface flex items-center justify-between rounded-md border border-border bg-[var(--surface-card)] px-2.5 py-2 text-xs"
              data-testid="context-manifest-workspace"
            >
              <span className="font-medium text-foreground">Working tree</span>
              <span className="grimoire-context-secondary font-medium">
                {gitChangeCount} visible Git {gitChangeCount === 1 ? 'change' : 'changes'}
              </span>
            </div>
          ) : null}

          {symbolCount > 0 ? (
            <div
              className="grimoire-context-surface flex items-center justify-between rounded-md border border-border bg-[var(--surface-card)] px-2.5 py-2 text-xs"
              data-testid="context-manifest-code-symbols"
            >
              <span className="font-medium text-foreground">Reviewed code symbols</span>
              <span className="grimoire-context-secondary font-medium">
                {symbolCount} local Tree-sitter {symbolCount === 1 ? 'fact' : 'facts'}
              </span>
            </div>
          ) : null}

          {preview.includedNotes.length > 0 ? (
            <div className="grid gap-1.5" data-testid="context-manifest-sources">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-medium text-foreground">Sources in this review</span>
                <Button type="button" size="sm" variant="ghost" onClick={rebuildManifest}>
                  <RefreshCw className="size-3.5" />
                  Rebuild
                </Button>
              </div>
              <div className="grid max-h-48 gap-1 overflow-y-auto overscroll-contain rounded-md border border-border p-1" data-testid="context-manifest-source-list">
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

          <ContextReviewSummary
            protectedContext={packagePreview.protectedContext}
            sourceCount={preview.includedNotes.length}
          />

          {onUseContextManifest ? (
            <div className="grimoire-context-next-request grid gap-2 rounded-md border border-border px-3 py-3" data-testid="context-next-request">
              <div>
                <div className="text-xs font-semibold text-foreground">Ready for the next request</div>
                <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                  Attach this review when you are ready. Nothing is sent from this screen.
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                variant="secondary"
                className="justify-self-start text-xs font-semibold"
                onClick={() => onUseContextManifest(manifest)}
                data-testid="use-context-manifest"
              >
                Attach to next request
              </Button>
            </div>
          ) : null}

          <details className="grimoire-context-technical-details rounded-md border border-border px-3 py-2">
            <summary className="cursor-pointer text-xs font-medium text-foreground">
              Technical details
              <span className="ml-1 font-normal text-muted-foreground">(JSON manifest)</span>
            </summary>
            <pre
              className="mt-2 max-h-52 overflow-y-auto overflow-x-hidden whitespace-pre-wrap break-words text-[10px] leading-4 text-muted-foreground"
              data-testid="context-manifest-json"
            >
              {JSON.stringify(manifest, null, 2)}
            </pre>
          </details>
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
    <div className="flex min-w-0 items-center gap-2 rounded-sm px-2 py-1.5 hover:bg-muted/50" data-testid="context-manifest-source-row">
      <div className="min-w-0 flex-1">
        <div className="truncate text-xs font-medium text-foreground">{note.title}</div>
        <div className="truncate text-[10px]" style={{ color: 'var(--text-secondary)' }}>{note.kind} · {note.path}</div>
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
    maximumTokens: 8_000,
    pinnedSourceIds: [],
    revision: 1,
  }
}

function formatTokenCount(tokens: number): string {
  return tokens >= 1_000 ? `${Math.round(tokens / 1_000)}k` : String(tokens)
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

function ContextReviewSummary({
  protectedContext,
  sourceCount,
}: {
  protectedContext: boolean
  sourceCount: number
}) {
  const sourceLabel = `${sourceCount} ${sourceCount === 1 ? 'source' : 'sources'}`

  return (
    <section className="grimoire-context-review-summary rounded-md border border-border px-3 py-3" data-testid="context-review-summary">
      <div className="text-xs font-semibold text-foreground">What Grimoire will use</div>
      <p className="mt-1 text-[12px] leading-5 text-muted-foreground">
        {protectedContext
          ? 'This review contains protected local context. It stays on this Mac until you explicitly change the boundary.'
          : `This review contains ${sourceLabel}: their labels, paths, and review state. Note bodies and private lanes stay on this Mac.`}
      </p>
    </section>
  )
}

function ManifestMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="grimoire-context-pill min-w-0 rounded-md border px-2 py-1">
      <div className="grimoire-context-secondary text-[10px] font-semibold uppercase tracking-[0.08em]">{label}</div>
      <div className="grimoire-context-label truncate text-xs font-semibold">{value}</div>
    </div>
  )
}
