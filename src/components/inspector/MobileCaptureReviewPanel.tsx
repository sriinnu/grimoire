import { Ban, Check, GitMerge, MoveRight, Paperclip, Shield, Smartphone, Trash2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import type { VaultEntry } from '../../types'
import { buildMobileCaptureReviewUpdates, mobileCaptureReviewOutcomeLabel, type MobileCaptureReviewOutcome } from '../../lib/mobileCaptureReview'
import { buildMobileReviewItem, mobileReviewState } from '../../lib/mobileCaptureMetadata'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'

type ReviewPropertyWriter = (key: string, value: string | number | boolean | string[] | null) => Promise<void>

interface MobileCaptureReviewPanelProps {
  entry: VaultEntry
  onUpdateReviewProperty?: ReviewPropertyWriter
  reviewedAt?: () => Date
}

const REVIEW_ACTIONS: { icon: ReactNode; outcome: MobileCaptureReviewOutcome; variant: 'default' | 'destructive' | 'outline' | 'secondary' }[] = [
  { icon: <Check className="size-3" />, outcome: 'accepted', variant: 'default' },
  { icon: <GitMerge className="size-3" />, outcome: 'merged', variant: 'secondary' },
  { icon: <MoveRight className="size-3" />, outcome: 'moved', variant: 'secondary' },
  { icon: <Ban className="size-3" />, outcome: 'blocked', variant: 'outline' },
  { icon: <Trash2 className="size-3" />, outcome: 'discarded', variant: 'destructive' },
]

/** Inspector action gate for review-pending iPhone/iPad Markdown capture drafts. */
export function MobileCaptureReviewPanel({
  entry,
  onUpdateReviewProperty,
  reviewedAt = () => new Date(),
}: MobileCaptureReviewPanelProps) {
  const state = mobileReviewState(entry)
  const [pendingOutcome, setPendingOutcome] = useState<MobileCaptureReviewOutcome | null>(null)
  const [error, setError] = useState<string | null>(null)
  const mountedRef = useRef(true)
  const reviewItem = useMemo(() => buildMobileReviewItem(entry), [entry])
  const capturedLabel = useMemo(() => formatCapturedAt(reviewItem.capturedAt), [reviewItem.capturedAt])
  const attachmentCount = attachmentCountLabel(entry)

  useEffect(() => {
    return () => {
      mountedRef.current = false
    }
  }, [])

  const applyOutcome = useCallback(async (outcome: MobileCaptureReviewOutcome) => {
    if (!onUpdateReviewProperty || pendingOutcome) return
    setPendingOutcome(outcome)
    setError(null)
    try {
      for (const update of buildMobileCaptureReviewUpdates(outcome, reviewedAt())) {
        await onUpdateReviewProperty(update.key, update.value)
      }
    } catch {
      if (mountedRef.current) setError('Could not write review metadata.')
    } finally {
      if (mountedRef.current) setPendingOutcome(null)
    }
  }, [onUpdateReviewProperty, pendingOutcome, reviewedAt])

  if (state === null) return null

  return (
    <section
      className="inspector-card grimoire-mobile-review"
      data-mobile-review-state={state}
      data-testid="mobile-capture-review-panel"
      aria-label="Mobile Capture Review"
    >
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="font-mono-overline flex items-center gap-1 text-muted-foreground">
          <Smartphone className="size-3" />
          Mobile Review
        </h4>
        <Badge variant={state === 'blocked' ? 'outline' : 'secondary'} className="h-5 rounded-md px-1.5 text-[10px]">
          {state}
        </Badge>
      </div>

      <div className="grimoire-mobile-review__summary mb-2 rounded-md border px-2 py-2 text-[12px] leading-relaxed">
        <span className="font-medium text-foreground">Markdown-owned gate.</span>
        <span> Review writes frontmatter only; agent, export, and sync still pass the Locality Firewall.</span>
      </div>

      <div className="mb-2 grid grid-cols-3 gap-1.5 text-[11px]">
        <ReviewStat icon={<Shield className="size-3" />} label="Lane" value={reviewItem.lane} />
        <ReviewStat icon={<Smartphone className="size-3" />} label="Captured" value={capturedLabel} />
        <ReviewStat icon={<Paperclip className="size-3" />} label="Assets" value={attachmentCount} />
      </div>

      {onUpdateReviewProperty ? (
        <div className="flex flex-wrap gap-1.5" aria-label="Mobile review actions">
          {REVIEW_ACTIONS.map((action) => (
            <Button
              key={action.outcome}
              type="button"
              size="xs"
              variant={action.variant}
              disabled={pendingOutcome !== null}
              onClick={() => void applyOutcome(action.outcome)}
            >
              {action.icon}
              {pendingOutcome === action.outcome ? 'Writing' : mobileCaptureReviewOutcomeLabel(action.outcome)}
            </Button>
          ))}
        </div>
      ) : null}
      {error ? <p className="mt-2 text-[11px] text-destructive">{error}</p> : null}
    </section>
  )
}

function ReviewStat({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="grimoire-mobile-review__stat min-w-0 rounded-md border px-2 py-1.5">
      <span className="mb-0.5 flex items-center gap-1 text-muted-foreground">
        {icon}
        {label}
      </span>
      <span className="block truncate font-medium text-foreground">{value}</span>
    </div>
  )
}

function formatCapturedAt(timestamp: number | null): string {
  if (!timestamp) return 'Unknown'
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(new Date(timestamp * 1000))
}

function attachmentCountLabel(entry: VaultEntry): string {
  const value = entry.properties?.attachment_count
  const count = typeof value === 'number' ? value : Number.parseInt(String(value ?? '0'), 10)
  if (!Number.isFinite(count) || count <= 0) return 'None'
  return String(count)
}
